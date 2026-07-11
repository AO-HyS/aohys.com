import type { DashboardAccessEnvironment } from "../../apps/site/src/dashboard-access.js";

const FALLBACK_PRIVATE_HTML_HEADERS = {
  "cache-control": "no-store",
  "content-type": "text/html; charset=utf-8",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-robots-tag": "noindex, nofollow",
} as const;

function normalizeDashboardPath(request: Request): string {
  const pathname = new URL(request.url).pathname;
  const normalized = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
  return normalized || "/dashboard";
}

function unavailableDashboardHtml(): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<meta name="robots" content="noindex,nofollow" />',
    "<title>Dashboard unavailable | AOHYS</title>",
    "</head>",
    '<body data-dashboard-shell="unavailable">',
    "<main>",
    "<h1>Dashboard is temporarily unavailable</h1>",
    "<p>The private dashboard could not be loaded. Public pages and lead intake remain separate.</p>",
    "</main>",
    "</body>",
    "</html>",
  ].join("");
}

async function reportDashboardFunctionFailure(
  request: Request,
  env: DashboardAccessEnvironment,
  error: unknown,
): Promise<void> {
  try {
    const { capturePostHogServerEvent } = await import("../../apps/site/src/posthog-server.js");
    await capturePostHogServerEvent(env, {
      event: "dashboard_runtime_exception",
      distinctId: `dashboard:${env.AOHYS_ENV ?? "preview"}`,
      properties: {
        environment: env.AOHYS_ENV ?? "preview",
        source: "cloudflare_pages_dashboard",
        path: normalizeDashboardPath(request),
        errorType: error instanceof Error ? error.name : "UnknownError",
      },
    });
  } catch {
    // Fallback reporting is best-effort; the Function must still avoid a raw 1101.
  }
}

export async function onRequest(context: {
  request: Request;
  env: DashboardAccessEnvironment;
}): Promise<Response> {
  try {
    const { safeHandleDashboardRequest } = await import("../../apps/site/src/dashboard-access.js");
    return await safeHandleDashboardRequest(context.request, context.env);
  } catch (error) {
    await reportDashboardFunctionFailure(context.request, context.env, error);

    return new Response(unavailableDashboardHtml(), {
      status: 502,
      headers: FALLBACK_PRIVATE_HTML_HEADERS,
    });
  }
}
