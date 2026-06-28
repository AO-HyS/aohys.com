import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getPublicRouteMap, getSeoMetadata, getSitemapEntries } from "@aohys/content-graph";
import { describe, expect, it } from "vitest";

const siteRoot = process.cwd();
const distRoot = path.join(siteRoot, "dist");

function readDist(relativePath: string) {
  const absolutePath = path.join(distRoot, relativePath);
  expect(existsSync(absolutePath), `${relativePath} must exist in dist`).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

function routeHtmlPath(routePath: string) {
  if (routePath === "/") {
    return "index.html";
  }

  return path.join(routePath.replace(/^\/|\/$/g, ""), "index.html");
}

function includesAlternate(html: string, hreflang: string, href: string) {
  return html.includes(`rel="alternate" hreflang="${hreflang}" href="${href}"`);
}

describe("built public routes", () => {
  it("renders every graph route with canonical SEO and language alternates", () => {
    const routes = getPublicRouteMap();
    expect(routes).toHaveLength(22);

    for (const route of routes) {
      const html = readDist(routeHtmlPath(route.path));
      const seo = getSeoMetadata(route.id, route.locale);

      expect(html).toContain(`<html lang="${route.locale}"`);
      expect(html).toContain(`name="description" content="${seo.description}"`);
      expect(html).toContain(`rel="canonical" href="${seo.canonicalUrl}"`);
      expect(includesAlternate(html, "en", seo.alternates.en)).toBe(true);
      expect(includesAlternate(html, "es", seo.alternates.es)).toBe(true);
      expect(includesAlternate(html, "x-default", seo.alternates["x-default"])).toBe(true);
      expect(html).toContain(`<title>${seo.title}</title>`);
      expect(html).not.toMatch(/lorem|todo|placeholder/i);
    }
  });

  it("keeps localized home navigation and route smoke behavior intact", () => {
    const homeHtml = readDist("index.html");
    const spanishHomeHtml = readDist("es/index.html");

    expect(homeHtml).toContain("Start a conversation");
    expect(spanishHomeHtml).toContain("Hablemos");
    expect(spanishHomeHtml).not.toContain('href="/case-studies"');
    expect(spanishHomeHtml).toContain('href="/es/casos"');
  });

  it("emits sitemap and robots behavior from the public graph", () => {
    const sitemap = readDist("sitemap.xml");
    const robots = readDist("robots.txt");

    for (const entry of getSitemapEntries()) {
      expect(sitemap).toContain(`<loc>${entry.url}</loc>`);
    }

    expect(sitemap).not.toContain("/dashboard");
    expect(sitemap).toContain('hreflang="es" href="https://aohys.com/es/"');
    expect(robots).toContain("Disallow: /dashboard");
    expect(robots).toContain("Sitemap: https://aohys.com/sitemap.xml");
  });
});
