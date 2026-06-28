import { getSitemapEntries } from "@aohys/content-graph";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function GET() {
  const entries = getSitemapEntries()
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
${Object.entries(entry.alternates)
  .map(
    ([hreflang, href]) =>
      `    <xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}" />`,
  )
  .join("\n")}
${entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>\n` : ""}${entry.priority ? `    <priority>${entry.priority.toFixed(2)}</priority>\n` : ""}  </url>`,
    )
    .join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
      },
    },
  );
}
