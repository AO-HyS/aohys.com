const POSTHOG_INGEST_ORIGIN = "https://us.i.posthog.com";
const POSTHOG_ASSET_ORIGIN = "https://us-assets.i.posthog.com";
const ALLOWED_METHODS = new Set(["GET", "POST", "OPTIONS"]);

export interface PostHogProxyEnvironment {
  AOHYS_ENV?: string;
}

function targetUrl(
  requestUrl: URL,
): { target: URL; asset: boolean } | undefined {
  if (!requestUrl.pathname.startsWith("/ingest/")) return undefined;
  const upstreamPath = requestUrl.pathname.replace(/^\/ingest/, "") || "/";
  if (!upstreamPath.startsWith("/") || upstreamPath.startsWith("//"))
    return undefined;
  const asset =
    upstreamPath.startsWith("/static/") || upstreamPath.startsWith("/array/");
  const origin = asset ? POSTHOG_ASSET_ORIGIN : POSTHOG_INGEST_ORIGIN;
  const target = new URL(origin);
  target.pathname = upstreamPath;
  target.search = requestUrl.search;
  return target.origin === origin ? { target, asset } : undefined;
}

function safeResponseHeaders(
  upstream: Response,
  asset: boolean,
  method: string,
): Headers | undefined {
  const headers = new Headers();
  for (const name of ["etag", "last-modified", "vary"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const upstreamContentType =
    upstream.headers.get("content-type")?.toLowerCase() ?? "";
  if (asset) {
    const allowed = [
      "application/javascript",
      "text/javascript",
      "application/json",
      "text/css",
    ].find((contentType) => upstreamContentType.startsWith(contentType));
    if (!allowed) return undefined;
    headers.set("content-type", `${allowed}; charset=utf-8`);
  } else {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  headers.set(
    "cache-control",
    method === "GET" ? "public, max-age=300" : "no-store",
  );
  headers.set("x-content-type-options", "nosniff");
  headers.set("cross-origin-resource-policy", "same-origin");
  return headers;
}

export async function handlePostHogProxyRequest(
  request: Request,
  environment: PostHogProxyEnvironment,
  transport: typeof fetch = fetch,
): Promise<Response> {
  const requestUrl = new URL(request.url);

  if (
    environment.AOHYS_ENV !== "production" ||
    requestUrl.hostname !== "aohys.com"
  ) {
    return new Response(null, { status: 404 });
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return new Response(null, {
      status: 405,
      headers: { allow: "GET, POST, OPTIONS" },
    });
  }

  const routing = targetUrl(requestUrl);
  if (!routing) return new Response(null, { status: 400 });

  const headers = new Headers(request.headers);
  headers.delete("authorization");
  headers.delete("cookie");
  headers.delete("host");
  headers.delete("x-forwarded-for");

  const upstream = await transport(routing.target, {
    method: request.method,
    headers,
    ...(request.method === "GET" || request.method === "OPTIONS"
      ? {}
      : { body: request.body }),
    redirect: "manual",
  });
  const responseHeaders = safeResponseHeaders(
    upstream,
    routing.asset,
    request.method,
  );
  if (!responseHeaders) {
    return new Response('{"error":"invalid upstream telemetry response"}', {
      status: 502,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
