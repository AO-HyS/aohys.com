export type CloudflarePagesDomainStatus =
  | "initializing"
  | "pending"
  | "active"
  | "deactivated"
  | "blocked"
  | "error";

interface CloudflarePagesDomainCheck {
  status?: CloudflarePagesDomainStatus;
  error_message?: string;
}

export interface CloudflarePagesDomain {
  name: string;
  status: CloudflarePagesDomainStatus;
  validation_data?: CloudflarePagesDomainCheck;
  verification_data?: CloudflarePagesDomainCheck;
}

interface CloudflareApiError {
  code?: number;
  message?: string;
}

interface CloudflareApiEnvelope<T> {
  success: boolean;
  result: T;
  errors?: CloudflareApiError[];
}

export interface EnsureCloudflarePagesDomainOptions {
  accountId: string;
  apiToken: string;
  projectName: string;
  domainName: string;
  fetchImpl?: typeof fetch;
  maxPollAttempts?: number;
  pollIntervalMs?: number;
  maxRequestAttempts?: number;
  requestTimeoutMs?: number;
  retryDelayMs?: number;
  overallTimeoutMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
}

export interface EnsureCloudflarePagesDomainResult {
  domain: CloudflarePagesDomain;
  created: boolean;
}

const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";
const TERMINAL_FAILURE_STATUSES = new Set<CloudflarePagesDomainStatus>([
  "deactivated",
  "blocked",
  "error",
]);
const RETRYABLE_VALIDATION_STATUSES = new Set<CloudflarePagesDomainStatus>([
  "deactivated",
  "error",
]);

function assertRequired(value: string, name: string): void {
  if (!value.trim()) {
    throw new Error(`${name} is required to reconcile a Cloudflare Pages domain.`);
  }
}

function domainFailure(domain: CloudflarePagesDomain): Error {
  const details = [
    domain.validation_data?.error_message,
    domain.verification_data?.error_message,
  ].filter((message): message is string => Boolean(message));
  const suffix = details.length > 0 ? `: ${details.join("; ")}` : ".";

  return new Error(
    `Cloudflare Pages domain ${domain.name} entered terminal status ${domain.status}${suffix}`,
  );
}

function apiFailure(
  status: number,
  errors: CloudflareApiError[] | undefined,
  redact: (value: string) => string,
): Error {
  const details = errors
    ?.map((error) => error.message)
    .filter((message): message is string => Boolean(message))
    .join("; ");

  return new Error(
    redact(
      `Cloudflare Pages API request failed with HTTP ${status}${details ? `: ${details}` : "."}`,
    ),
  );
}

export interface CloudflareProductionDomainConfig {
  accountId: string;
  apiToken: string;
  projectName: "aohys-com";
  domainName: "aohys.com";
}

export function parseCloudflareProductionDomainEnvironment(
  values: Record<string, string | undefined>,
): CloudflareProductionDomainConfig {
  if (values.AOHYS_ENV !== "production") {
    throw new Error("Cloudflare Pages domain reconciliation may run only with AOHYS_ENV=production.");
  }

  const required = (name: string): string => {
    const value = values[name]?.trim();
    if (!value) {
      throw new Error(`${name} is required to reconcile the production Pages domain.`);
    }
    return value;
  };
  const publicSiteUrl = required("PUBLIC_SITE_URL");

  if (publicSiteUrl !== "https://aohys.com") {
    throw new Error("Production Pages domain reconciliation requires PUBLIC_SITE_URL=https://aohys.com.");
  }
  if (required("CLOUDFLARE_PROJECT_NAME") !== "aohys-com") {
    throw new Error(
      "Production Pages domain reconciliation requires CLOUDFLARE_PROJECT_NAME=aohys-com.",
    );
  }

  return {
    accountId: required("CLOUDFLARE_ACCOUNT_ID"),
    apiToken: required("CLOUDFLARE_API_TOKEN"),
    projectName: "aohys-com",
    domainName: "aohys.com",
  };
}

export async function ensureCloudflarePagesDomain(
  options: EnsureCloudflarePagesDomainOptions,
): Promise<EnsureCloudflarePagesDomainResult> {
  assertRequired(options.accountId, "CLOUDFLARE_ACCOUNT_ID");
  assertRequired(options.apiToken, "CLOUDFLARE_API_TOKEN");
  assertRequired(options.projectName, "CLOUDFLARE_PROJECT_NAME");
  assertRequired(options.domainName, "domainName");

  const fetchImpl = options.fetchImpl ?? fetch;
  const maxPollAttempts = options.maxPollAttempts ?? 60;
  const pollIntervalMs = options.pollIntervalMs ?? 5_000;
  const maxRequestAttempts = options.maxRequestAttempts ?? 3;
  const requestTimeoutMs = options.requestTimeoutMs ?? 15_000;
  const retryDelayMs = options.retryDelayMs ?? 1_000;
  const overallTimeoutMs = options.overallTimeoutMs ?? 10 * 60_000;
  const now = options.now ?? Date.now;
  const deadline = now() + overallTimeoutMs;
  const sleep =
    options.sleep ??
    ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const projectPath = `/accounts/${encodeURIComponent(options.accountId)}/pages/projects/${encodeURIComponent(options.projectName)}/domains`;
  const exactDomainPath = `${projectPath}/${encodeURIComponent(options.domainName)}`;
  const redact = (value: string) => value.replaceAll(options.apiToken, "[redacted]");

  async function waitWithinDeadline(milliseconds: number): Promise<void> {
    const remaining = deadline - now();
    if (remaining <= 0) {
      throw new Error(`Cloudflare Pages domain ${options.domainName} reconciliation timed out.`);
    }
    await sleep(Math.min(milliseconds, remaining));
  }

  async function request<T>(
    path: string,
    init?: { method?: "GET" | "POST" | "PATCH"; body?: Record<string, string> },
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRequestAttempts; attempt += 1) {
      const remaining = deadline - now();
      if (remaining <= 0) {
        throw new Error(`Cloudflare Pages domain ${options.domainName} reconciliation timed out.`);
      }

      let response: Response;
      try {
        response = await fetchImpl(`${CLOUDFLARE_API_BASE_URL}${path}`, {
          method: init?.method ?? "GET",
          headers: {
            Authorization: `Bearer ${options.apiToken}`,
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
          },
          body: init?.body ? JSON.stringify(init.body) : undefined,
          signal: AbortSignal.timeout(Math.min(requestTimeoutMs, remaining)),
        });
      } catch (error) {
        if (attempt + 1 < maxRequestAttempts) {
          await waitWithinDeadline(retryDelayMs * 2 ** attempt);
          continue;
        }
        const detail = error instanceof Error ? error.message : "unknown network error";
        throw new Error(redact(`Cloudflare Pages API request could not complete: ${detail}`));
      }

      if ((response.status === 429 || response.status >= 500) && attempt + 1 < maxRequestAttempts) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterSeconds = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
        const delay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
          ? retryAfterSeconds * 1_000
          : retryDelayMs * 2 ** attempt;
        await response.body?.cancel();
        await waitWithinDeadline(delay);
        continue;
      }

      const payload = await response.text();
      let envelope: CloudflareApiEnvelope<T> | undefined;
      try {
        envelope = JSON.parse(payload) as CloudflareApiEnvelope<T>;
      } catch {
        throw new Error(`Cloudflare Pages API returned malformed JSON with HTTP ${response.status}.`);
      }

      if (!response.ok || !envelope.success) {
        throw apiFailure(response.status, envelope.errors, redact);
      }

      return envelope.result;
    }

    throw new Error("Cloudflare Pages API request exhausted its retry budget.");
  }

  const listDomains = () => request<CloudflarePagesDomain[]>(projectPath);
  const findDomain = async () =>
    (await listDomains()).find((domain) => domain.name === options.domainName);

  let domain = await findDomain();
  let created = false;
  let validationRetried = false;

  if (!domain) {
    try {
      domain = await request<CloudflarePagesDomain>(projectPath, {
        method: "POST",
        body: { name: options.domainName },
      });
      created = true;
    } catch (creationError) {
      domain = await findDomain();
      if (!domain) {
        throw creationError;
      }
    }
  }

  async function retryValidationOrThrow(
    currentDomain: CloudflarePagesDomain,
  ): Promise<CloudflarePagesDomain> {
    if (!RETRYABLE_VALIDATION_STATUSES.has(currentDomain.status) || validationRetried) {
      throw domainFailure(currentDomain);
    }

    validationRetried = true;
    return request<CloudflarePagesDomain>(exactDomainPath, { method: "PATCH" });
  }

  if (domain.status === "active") {
    return { domain, created };
  }
  if (TERMINAL_FAILURE_STATUSES.has(domain.status)) {
    domain = await retryValidationOrThrow(domain);
    if (domain.status === "active") {
      return { domain, created };
    }
    if (TERMINAL_FAILURE_STATUSES.has(domain.status)) {
      throw domainFailure(domain);
    }
  }

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    await waitWithinDeadline(pollIntervalMs);
    domain = await request<CloudflarePagesDomain>(exactDomainPath);

    if (domain.status === "active") {
      return { domain, created };
    }
    if (TERMINAL_FAILURE_STATUSES.has(domain.status)) {
      domain = await retryValidationOrThrow(domain);
      if (domain.status === "active") {
        return { domain, created };
      }
      if (TERMINAL_FAILURE_STATUSES.has(domain.status)) {
        throw domainFailure(domain);
      }
    }
  }

  throw new Error(
    `Cloudflare Pages domain ${options.domainName} did not become active after ${maxPollAttempts} checks.`,
  );
}
