import type { CspReportEnvironment } from "../../apps/site/src/csp-reporting.js";
import { PRIVATE_NO_STORE_HEADERS } from "../../apps/site/src/security-headers.js";

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
      headers: PRIVATE_NO_STORE_HEADERS,
    });
  }
}
