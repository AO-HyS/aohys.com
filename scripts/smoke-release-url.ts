import {
  buildCloudflarePagesDeployPlan,
  type ReleaseDeploymentEnvironment,
} from "@aohys/release-train";

const RELEASE_ENVIRONMENTS = ["preview", "production"] as const;
const MAX_FETCH_ATTEMPTS = 6;
const FETCH_RETRY_DELAY_MS = 5_000;

function parseEnvironment(input: string | undefined): ReleaseDeploymentEnvironment {
  if (RELEASE_ENVIRONMENTS.includes(input as ReleaseDeploymentEnvironment)) {
    return input as ReleaseDeploymentEnvironment;
  }

  throw new Error("Usage: tsx scripts/smoke-release-url.ts <preview|production>");
}

function normalizeUrl(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function formatFetchError(error: unknown): string {
  if (error instanceof Error) {
    return error.cause instanceof Error ? `${error.message}: ${error.cause.message}` : error.message;
  }

  return String(error);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function fetchWithRetries(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;

      if (attempt < MAX_FETCH_ATTEMPTS) {
        await wait(FETCH_RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `Unable to fetch ${url} after ${MAX_FETCH_ATTEMPTS} attempts. ${formatFetchError(lastError)}`,
  );
}

async function fetchText(url: string): Promise<{ status: number; url: string; body: string }> {
  const response = await fetchWithRetries(url, {
    headers: {
      "user-agent": "aohys-release-smoke/1.0",
    },
    redirect: "follow",
  });

  return {
    status: response.status,
    url: response.url,
    body: await response.text(),
  };
}

async function assertCanonicalRedirect(sourceUrl: string): Promise<void> {
  const response = await fetchWithRetries(sourceUrl, {
    headers: {
      "user-agent": "aohys-release-smoke/1.0",
    },
    redirect: "manual",
  });
  const location = response.headers.get("location");

  if (![301, 302, 308].includes(response.status) || !location?.startsWith("https://aohys.com/")) {
    throw new Error(
      `Expected ${sourceUrl} to redirect to https://aohys.com/. Received ${response.status} ${location ?? "without Location header"}.`,
    );
  }
}

try {
  const environment = parseEnvironment(process.argv[2]);
  const plan = buildCloudflarePagesDeployPlan(environment);
  const baseUrl = normalizeUrl(process.env.SMOKE_BASE_URL?.trim() || process.env.PUBLIC_SITE_URL?.trim() || plan.siteUrl);
  const result = await fetchText(baseUrl);

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Expected ${baseUrl} to return a 2xx response. Received ${result.status}.`);
  }

  if (!result.body.includes('data-site-shell="public"')) {
    throw new Error(`Expected ${baseUrl} to render the public site shell.`);
  }

  if (!result.body.includes(`rel="canonical" href="${normalizeUrl(plan.canonicalUrl)}"`)) {
    throw new Error(`Expected ${baseUrl} to render the ${plan.canonicalUrl} canonical URL.`);
  }

  const redirectUrl = process.env.SMOKE_CANONICAL_REDIRECT_URL?.trim();
  if (redirectUrl) {
    await assertCanonicalRedirect(redirectUrl);
  }

  console.log(`${environment} smoke check passed at ${result.url}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
