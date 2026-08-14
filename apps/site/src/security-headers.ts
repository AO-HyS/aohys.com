export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "script-src-elem 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' blob: data: https:",
  "connect-src 'self' https://*.convex.site https://*.convex.cloud wss://*.convex.cloud https://upload.imagedelivery.net",
  "form-action 'self' https://*.convex.site mailto:",
  "report-uri /observability/csp",
].join("; ");

export const BASE_SECURITY_HEADERS = {
  "content-security-policy": CONTENT_SECURITY_POLICY,
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
} as const;

export const CLOUDFLARE_PAGES_STATIC_HEADERS = [
  ["X-Content-Type-Options", BASE_SECURITY_HEADERS["x-content-type-options"]],
  ["Referrer-Policy", BASE_SECURITY_HEADERS["referrer-policy"]],
  ["X-Frame-Options", BASE_SECURITY_HEADERS["x-frame-options"]],
  ["Permissions-Policy", BASE_SECURITY_HEADERS["permissions-policy"]],
  ["Content-Security-Policy", BASE_SECURITY_HEADERS["content-security-policy"]],
] as const;

export function renderCloudflarePagesStaticHeaders(): string {
  return [
    "/*",
    ...CLOUDFLARE_PAGES_STATIC_HEADERS.map(
      ([name, value]) => `  ${name}: ${value}`,
    ),
    "",
    "/_astro/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
    "/images/*",
    "  Cache-Control: public, max-age=604800, stale-while-revalidate=86400",
    "",
    "/sitemap.xml",
    "  Cache-Control: public, max-age=3600, stale-while-revalidate=86400",
    "",
    "/robots.txt",
    "  Cache-Control: public, max-age=3600, stale-while-revalidate=86400",
    "",
  ].join("\n");
}

export const PRIVATE_NO_STORE_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
} as const;

export const PRIVATE_HTML_HEADERS = {
  ...PRIVATE_NO_STORE_HEADERS,
  "content-type": "text/html; charset=utf-8",
} as const;
