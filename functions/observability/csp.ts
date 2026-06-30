import type { CspReportEnvironment } from "../../apps/site/src/csp-reporting.js";

const FALLBACK_PRIVATE_NO_STORE_HEADERS = {
  "cache-control": "no-store",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-robots-tag": "noindex, nofollow",
} as const;

export async function onRequest(context: {
  request: Request;
  env: CspReportEnvironment;
}): Promise<Response> {
  try {
    const { handleCspReportRequest } = await import("../../apps/site/src/csp-reporting.js");
    return handleCspReportRequest(context.request, context.env);
  } catch {
    return new Response(null, {
      status: 204,
      headers: FALLBACK_PRIVATE_NO_STORE_HEADERS,
    });
  }
}
