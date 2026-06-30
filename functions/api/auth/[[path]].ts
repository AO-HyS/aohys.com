import type { AuthProxyEnvironment } from "../../../apps/site/src/auth-proxy.js";

const AUTH_PROXY_FALLBACK_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
} as const;

export async function onRequest(context: {
  request: Request;
  env: AuthProxyEnvironment;
  params: { path?: string | string[] };
}): Promise<Response> {
  try {
    const { proxyAuthRequest } = await import("../../../apps/site/src/auth-proxy.js");
    return proxyAuthRequest(context.request, context.env, context.params.path);
  } catch {
    return new Response(JSON.stringify({ error: "Auth proxy is temporarily unavailable." }), {
      status: 503,
      headers: AUTH_PROXY_FALLBACK_HEADERS,
    });
  }
}
