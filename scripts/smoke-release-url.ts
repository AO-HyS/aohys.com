import {
  buildCloudflarePagesDeployPlan,
  type ReleaseDeploymentEnvironment,
} from "@aohys/release-train";

const RELEASE_ENVIRONMENTS = ["preview", "production"] as const;

function parseEnvironment(input: string | undefined): ReleaseDeploymentEnvironment {
  if (RELEASE_ENVIRONMENTS.includes(input as ReleaseDeploymentEnvironment)) {
    return input as ReleaseDeploymentEnvironment;
  }

  throw new Error("Usage: tsx scripts/smoke-release-url.ts <preview|production>");
}

function normalizeUrl(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

async function fetchText(url: string): Promise<{ status: number; url: string; body: string }> {
  const response = await fetch(url, {
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
  const response = await fetch(sourceUrl, {
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
