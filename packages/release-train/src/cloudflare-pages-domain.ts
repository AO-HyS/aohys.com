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
  result?: T;
  errors?: CloudflareApiError[];
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Cloudflare Pages API result has an invalid ${field}.`);
  }
  return value;
}

function isDomainStatus(value: unknown): value is CloudflarePagesDomainStatus {
  return (
    typeof value === "string" &&
    [
      "initializing",
      "pending",
      "active",
      "deactivated",
      "blocked",
      "error",
    ].includes(value)
  );
}

function parseDomainCheck(
  value: unknown,
  field: string,
): CloudflarePagesDomainCheck {
  if (!isRecord(value))
    throw new Error(`Cloudflare Pages API result has invalid ${field}.`);
  if (value.status !== undefined && !isDomainStatus(value.status)) {
    throw new Error(`Cloudflare Pages API result has invalid ${field} status.`);
  }
  if (
    value.error_message !== undefined &&
    typeof value.error_message !== "string"
  ) {
    throw new Error(
      `Cloudflare Pages API result has invalid ${field} error message.`,
    );
  }
  return {
    ...(value.status ? { status: value.status } : {}),
    ...(typeof value.error_message === "string"
      ? { error_message: value.error_message }
      : {}),
  };
}

function parseDomain(value: unknown): CloudflarePagesDomain {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    !isDomainStatus(value.status)
  ) {
    throw new Error("Cloudflare Pages API result is not a valid Pages domain.");
  }
  return {
    name: value.name,
    status: value.status,
    ...(value.validation_data !== undefined
      ? {
          validation_data: parseDomainCheck(
            value.validation_data,
            "validation_data",
          ),
        }
      : {}),
    ...(value.verification_data !== undefined
      ? {
          verification_data: parseDomainCheck(
            value.verification_data,
            "verification_data",
          ),
        }
      : {}),
  };
}

function parseZone(value: unknown): CloudflareZone {
  if (!isRecord(value))
    throw new Error("Cloudflare Pages API result is not a valid zone.");
  return {
    id: requiredString(value.id, "zone id"),
    name: requiredString(value.name, "zone name"),
    status: requiredString(value.status, "zone status"),
  };
}

function parseDnsRecord(value: unknown): CloudflareDnsRecord {
  if (!isRecord(value))
    throw new Error("Cloudflare Pages API result is not a valid DNS record.");
  return {
    id: requiredString(value.id, "DNS record id"),
    name: requiredString(value.name, "DNS record name"),
    type: requiredString(value.type, "DNS record type"),
    content: requiredString(value.content, "DNS record content"),
    ...(typeof value.proxied === "boolean" ? { proxied: value.proxied } : {}),
  };
}

function parseArray<T>(value: unknown, parseItem: (item: unknown) => T): T[] {
  if (!Array.isArray(value))
    throw new Error("Cloudflare Pages API result must be an array.");
  return value.map(parseItem);
}

export function parseCloudflareApiEnvelope<T>(
  serialized: string,
  parseResult: (value: unknown) => T,
): CloudflareApiEnvelope<T> {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error("Cloudflare Pages API returned malformed JSON.");
  }
  if (
    !isRecord(value) ||
    typeof value.success !== "boolean" ||
    (value.success && !("result" in value))
  ) {
    throw new Error(
      "Cloudflare Pages API returned an invalid response envelope.",
    );
  }
  const errors = Array.isArray(value.errors)
    ? value.errors.map((error): CloudflareApiError => {
        if (!isRecord(error))
          throw new Error(
            "Cloudflare Pages API returned an invalid error entry.",
          );
        return {
          ...(typeof error.code === "number" ? { code: error.code } : {}),
          ...(typeof error.message === "string"
            ? { message: error.message }
            : {}),
        };
      })
    : undefined;
  return {
    success: value.success,
    ...(value.success ? { result: parseResult(value.result) } : {}),
    ...(errors ? { errors } : {}),
  };
}

interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

interface CloudflareDnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  proxied?: boolean;
}

export interface EnsureCloudflarePagesDomainOptions {
  accountId: string;
  apiToken: string;
  projectName: string;
  domainName: string;
  reconcileDns?: boolean;
  dnsZoneAccount?: "external" | "pages-account";
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
    throw new Error(
      `${name} is required to reconcile a Cloudflare Pages domain.`,
    );
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
    throw new Error(
      "Cloudflare Pages domain reconciliation may run only with AOHYS_ENV=production.",
    );
  }

  const required = (name: string): string => {
    const value = values[name]?.trim();
    if (!value) {
      throw new Error(
        `${name} is required to reconcile the production Pages domain.`,
      );
    }
    return value;
  };
  const publicSiteUrl = required("PUBLIC_SITE_URL");

  if (publicSiteUrl !== "https://aohys.com") {
    throw new Error(
      "Production Pages domain reconciliation requires PUBLIC_SITE_URL=https://aohys.com.",
    );
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
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const projectPath = `/accounts/${encodeURIComponent(options.accountId)}/pages/projects/${encodeURIComponent(options.projectName)}/domains`;
  const exactDomainPath = `${projectPath}/${encodeURIComponent(options.domainName)}`;
  const redact = (value: string) =>
    value.replaceAll(options.apiToken, "[redacted]");

  async function waitWithinDeadline(milliseconds: number): Promise<void> {
    const remaining = deadline - now();
    if (remaining <= 0) {
      throw new Error(
        `Cloudflare Pages domain ${options.domainName} reconciliation timed out.`,
      );
    }
    await sleep(Math.min(milliseconds, remaining));
  }

  async function request<T>(
    path: string,
    parseResult: (value: unknown) => T,
    init?: {
      method?: "GET" | "POST" | "PATCH";
      body?: Record<string, unknown>;
      retry?: boolean;
    },
  ): Promise<T> {
    const requestAttemptLimit = init?.retry === false ? 1 : maxRequestAttempts;
    for (let attempt = 0; attempt < requestAttemptLimit; attempt += 1) {
      const remaining = deadline - now();
      if (remaining <= 0) {
        throw new Error(
          `Cloudflare Pages domain ${options.domainName} reconciliation timed out.`,
        );
      }

      let response: Response;
      try {
        response = await fetchImpl(`${CLOUDFLARE_API_BASE_URL}${path}`, {
          method: init?.method ?? "GET",
          headers: {
            Authorization: `Bearer ${options.apiToken}`,
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
          },
          ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
          signal: AbortSignal.timeout(Math.min(requestTimeoutMs, remaining)),
        });
      } catch (error) {
        if (attempt + 1 < requestAttemptLimit) {
          await waitWithinDeadline(retryDelayMs * 2 ** attempt);
          continue;
        }
        const detail =
          error instanceof Error ? error.message : "unknown network error";
        throw new Error(
          redact(`Cloudflare Pages API request could not complete: ${detail}`),
        );
      }

      if (
        (response.status === 429 || response.status >= 500) &&
        attempt + 1 < requestAttemptLimit
      ) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterSeconds =
          retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
        const delay =
          Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
            ? retryAfterSeconds * 1_000
            : retryDelayMs * 2 ** attempt;
        await response.body?.cancel();
        await waitWithinDeadline(delay);
        continue;
      }

      const payload = await response.text();
      let envelope: CloudflareApiEnvelope<T>;
      try {
        envelope = parseCloudflareApiEnvelope(payload, parseResult);
      } catch {
        throw new Error(
          `Cloudflare Pages API returned malformed JSON with HTTP ${response.status}.`,
        );
      }

      if (!response.ok || !envelope.success) {
        throw apiFailure(response.status, envelope.errors, redact);
      }

      if (envelope.result === undefined) {
        throw new Error(
          "Cloudflare Pages API returned a successful envelope without a result.",
        );
      }
      return envelope.result;
    }

    throw new Error("Cloudflare Pages API request exhausted its retry budget.");
  }

  const listDomains = () =>
    request(projectPath, (value) => parseArray(value, parseDomain));
  const findDomain = async () =>
    (await listDomains()).find((domain) => domain.name === options.domainName);

  async function reconcileApexDnsRecord(): Promise<void> {
    const zones = await request(
      `/zones?name=${encodeURIComponent(options.domainName)}&account.id=${encodeURIComponent(options.accountId)}&status=active`,
      (value) => parseArray(value, parseZone),
    );
    const zone = zones.find(
      (candidate) =>
        candidate.name === options.domainName && candidate.status === "active",
    );

    if (!zone) {
      throw new Error(
        `Cloudflare zone ${options.domainName} is not active in the Pages project account.`,
      );
    }

    const expectedTarget = `${options.projectName}.pages.dev`;
    const recordsPath = `/zones/${encodeURIComponent(zone.id)}/dns_records?name=${encodeURIComponent(options.domainName)}`;
    const readRoutingRecords = async () =>
      (
        await request(recordsPath, (value) => parseArray(value, parseDnsRecord))
      ).filter((record) => ["A", "AAAA", "CNAME"].includes(record.type));

    function hasExpectedRecord(records: CloudflareDnsRecord[]): boolean {
      return records.some(
        (record) =>
          record.type === "CNAME" &&
          record.name === options.domainName &&
          record.content.replace(/\.$/, "") === expectedTarget &&
          record.proxied === true,
      );
    }

    function assertNoConflictingRecords(records: CloudflareDnsRecord[]): void {
      if (records.length === 0) return;
      const recordTypes = [
        ...new Set(records.map((record) => record.type)),
      ].join(", ");
      throw new Error(
        `Cloudflare zone ${options.domainName} has conflicting apex routing records (${recordTypes}); refusing to overwrite them.`,
      );
    }

    const routingRecords = await readRoutingRecords();
    if (hasExpectedRecord(routingRecords)) return;
    assertNoConflictingRecords(routingRecords);

    try {
      await request(
        `/zones/${encodeURIComponent(zone.id)}/dns_records`,
        parseDnsRecord,
        {
          method: "POST",
          retry: false,
          body: {
            type: "CNAME",
            name: options.domainName,
            content: expectedTarget,
            proxied: true,
            ttl: 1,
            comment: "Managed by the AOHYS production release train",
          },
        },
      );
    } catch (creationError) {
      const recordsAfterFailure = await readRoutingRecords();
      if (hasExpectedRecord(recordsAfterFailure)) return;
      assertNoConflictingRecords(recordsAfterFailure);
      throw creationError;
    }
  }

  let domain = await findDomain();
  let created = false;
  let validationRetried = false;

  if (!domain) {
    try {
      domain = await request(projectPath, parseDomain, {
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
    if (
      !RETRYABLE_VALIDATION_STATUSES.has(currentDomain.status) ||
      validationRetried
    ) {
      throw domainFailure(currentDomain);
    }

    validationRetried = true;
    return request(exactDomainPath, parseDomain, { method: "PATCH" });
  }

  if (domain.status === "blocked") {
    throw domainFailure(domain);
  }
  const dnsManagement = !options.reconcileDns
    ? undefined
    : options.dnsZoneAccount === "external"
      ? "external"
      : await reconcileApexDnsRecord();
  if (dnsManagement === "external" && domain.status !== "active") {
    validationRetried = true;
    domain = await request(exactDomainPath, parseDomain, { method: "PATCH" });
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
    domain = await request(exactDomainPath, parseDomain);

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
