const POSTHOG_INGEST_ORIGIN = "https://us.i.posthog.com";
const POSTHOG_ASSET_ORIGIN = "https://us-assets.i.posthog.com";
const ALLOWED_METHODS = new Set(["GET", "POST", "OPTIONS"]);

export interface PostHogProxyEnvironment {
  AOHYS_ENV?: string;
}

function targetUrl(requestUrl: URL): URL {
  const upstreamPath = requestUrl.pathname.replace(/^\/ingest/, "") || "/";
  const origin = upstreamPath.startsWith("/static/") || upstreamPath.startsWith("/array/")
    ? POSTHOG_ASSET_ORIGIN
    : POSTHOG_INGEST_ORIGIN;
  return new URL(`${upstreamPath}${requestUrl.search}`, origin);
}

export async function handlePostHogProxyRequest(
  request: Request,
  environment: PostHogProxyEnvironment,
  transport: typeof fetch = fetch,
): Promise<Response> {
  const requestUrl = new URL(request.url);

  if (environment.AOHYS_ENV !== "production" || requestUrl.hostname !== "aohys.com") {
    return new Response(null, { status: 404 });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response(null, { status: 405, headers: { allow: "GET, POST, OPTIONS" } });
  }

  const headers = new Headers(request.headers);
  headers.delete("authorization");
  headers.delete("cookie");
  headers.delete("host");
  headers.delete("x-forwarded-for");

  const upstream = await transport(targetUrl(requestUrl), {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "OPTIONS" ? undefined : request.body,
    redirect: "manual",
  });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("set-cookie");
  responseHeaders.set("cache-control", request.method === "GET" ? "public, max-age=300" : "no-store");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
