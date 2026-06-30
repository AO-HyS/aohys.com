import type { CspReportEnvironment } from "../../apps/site/src/csp-reporting.js";

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
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  }
}
