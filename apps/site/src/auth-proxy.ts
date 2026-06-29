export interface AuthProxyEnvironment {
  CONVEX_SITE_URL?: string;
}

export type AuthProxyFetch = typeof fetch;

export async function proxyAuthRequest(
  request: Request,
  environment: AuthProxyEnvironment,
  pathParam: string | string[] | undefined,
  proxyFetch: AuthProxyFetch = fetch,
): Promise<Response> {
  const convexSiteUrl = environment.CONVEX_SITE_URL?.replace(/\/$/, "");

  if (!convexSiteUrl) {
    return new Response(JSON.stringify({ error: "Auth provider is not configured." }), {
      status: 503,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const incomingUrl = new URL(request.url);
  const path = Array.isArray(pathParam) ? pathParam.join("/") : pathParam ?? "";
  const targetUrl = new URL(`/api/auth/${path}`, convexSiteUrl);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  const forwardedProto = incomingUrl.protocol.replace(":", "");

  headers.set("x-forwarded-host", incomingUrl.host);
  headers.set("x-forwarded-proto", forwardedProto);
  headers.set("x-better-auth-forwarded-host", incomingUrl.host);
  headers.set("x-better-auth-forwarded-proto", forwardedProto);

  return proxyFetch(new Request(targetUrl.toString(), {
    body: request.body,
    duplex: "half",
    headers,
    method: request.method,
    redirect: request.redirect,
  } as RequestInit & { duplex: "half" }));
}
