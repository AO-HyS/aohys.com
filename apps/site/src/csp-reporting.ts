import type { EnvironmentName } from "@aohys/environment";
import {
  capturePostHogServerEvent,
  type PostHogServerEnvironment,
  type PostHogServerTransport,
} from "./posthog-server.js";

export interface CspReportEnvironment extends PostHogServerEnvironment {
  AOHYS_ENV?: string;
}

type CspReportPayload = {
  "csp-report"?: Record<string, unknown>;
} & Record<string, unknown>;

const CSP_REPORT_HEADERS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
} as const;

function normalizeEnvironment(value: string | undefined): EnvironmentName {
  return value === "production" || value === "preview" || value === "local"
    ? value
    : "preview";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function pathFromUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).pathname || "/";
  } catch {
    return undefined;
  }
}

function hostFromBlockedUri(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  if (["inline", "eval", "self"].includes(value)) {
    return value;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return value.slice(0, 80);
  }
}

function reportBody(payload: CspReportPayload): Record<string, unknown> {
  return payload["csp-report"] && typeof payload["csp-report"] === "object"
    ? payload["csp-report"]
    : payload;
}

async function readReportPayload(request: Request): Promise<CspReportPayload> {
  try {
    return await request.json() as CspReportPayload;
  } catch {
    return {};
  }
}

export async function handleCspReportRequest(
  request: Request,
  environment: CspReportEnvironment,
  transport: PostHogServerTransport = fetch,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: {
        ...CSP_REPORT_HEADERS,
        allow: "POST",
      },
    });
  }

  const url = new URL(request.url);
  const payload = reportBody(await readReportPayload(request));
  const reportEnvironment = normalizeEnvironment(environment.AOHYS_ENV);
  const documentUri = stringValue(payload["document-uri"]);
  const blockedUri = stringValue(payload["blocked-uri"]);

  try {
    await capturePostHogServerEvent(
      environment,
      {
        event: "csp_violation_reported",
        distinctId: `csp:${reportEnvironment}`,
        properties: {
          environment: reportEnvironment,
          source: "cloudflare_pages_csp_report",
          path: url.pathname,
          documentPath: pathFromUrl(documentUri),
          violatedDirective: stringValue(payload["violated-directive"]),
          effectiveDirective: stringValue(payload["effective-directive"]),
          blockedHost: hostFromBlockedUri(blockedUri),
          disposition: stringValue(payload.disposition),
        },
      },
      transport,
    );
  } catch {
    // CSP reporting must not break the visitor path or create retry storms.
  }

  return new Response(null, {
    status: 204,
    headers: CSP_REPORT_HEADERS,
  });
}
