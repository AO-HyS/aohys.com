import { PRIVATE_ROUTE_PREFIXES, SITE_URL } from "@aohys/content-graph";

export function GET() {
  const disallowRules = PRIVATE_ROUTE_PREFIXES.map((prefix) => `Disallow: ${prefix}`).join("\n");

  return new Response(
    `User-agent: *
Allow: /
${disallowRules}

Sitemap: ${SITE_URL}/sitemap.xml
`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
