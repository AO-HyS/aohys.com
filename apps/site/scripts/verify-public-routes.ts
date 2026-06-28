import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  getPublicRouteMap,
  getSeoMetadata,
  getSitemapEntries,
} from "@aohys/content-graph";

const siteRoot = process.cwd();
const distRoot = path.join(siteRoot, "dist");
const failures: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) {
    failures.push(message);
  }
}

function readDist(relativePath: string): string {
  const absolutePath = path.join(distRoot, relativePath);

  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath} must exist in dist`);
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function routeHtmlPath(routePath: string): string {
  if (routePath === "/") {
    return "index.html";
  }

  return path.join(routePath.replace(/^\/|\/$/g, ""), "index.html");
}

function includesAlternate(html: string, hreflang: string, href: string): boolean {
  return html.includes(`rel="alternate" hreflang="${hreflang}" href="${href}"`);
}

const routes = getPublicRouteMap();
check(routes.length === 22, "public route map must expose 11 bilingual route pairs");

for (const route of routes) {
  const html = readDist(routeHtmlPath(route.path));
  const seo = getSeoMetadata(route.id, route.locale);

  check(html.includes(`<html lang="${route.locale}"`), `${route.path} must declare lang=${route.locale}`);
  check(html.includes(`name="description" content="${seo.description}"`), `${route.path} must emit graph SEO description`);
  check(html.includes(`rel="canonical" href="${seo.canonicalUrl}"`), `${route.path} must emit graph canonical URL`);
  check(includesAlternate(html, "en", seo.alternates.en), `${route.path} must emit English alternate`);
  check(includesAlternate(html, "es", seo.alternates.es), `${route.path} must emit Spanish alternate`);
  check(includesAlternate(html, "x-default", seo.alternates["x-default"]), `${route.path} must emit x-default alternate`);
  check(html.includes(`<title>${seo.title}</title>`), `${route.path} must emit graph title`);
  check(!/lorem|todo|placeholder/i.test(html), `${route.path} must not contain placeholder copy`);
}

const homeHtml = readDist("index.html");
const spanishHomeHtml = readDist("es/index.html");
check(homeHtml.includes("Start a conversation"), "/ must keep the English primary CTA");
check(spanishHomeHtml.includes("Hablemos"), "/es/ must keep the Spanish primary CTA");
check(spanishHomeHtml.includes('href="/case-studies"') === false, "/es/ nav must not leak English selected-work path");
check(spanishHomeHtml.includes('href="/es/casos"'), "/es/ nav must link localized case-study index");

const sitemap = readDist("sitemap.xml");
for (const entry of getSitemapEntries()) {
  check(sitemap.includes(`<loc>${entry.url}</loc>`), `sitemap must include ${entry.url}`);
}
check(!sitemap.includes("/dashboard"), "sitemap must not include dashboard routes");
check(sitemap.includes('hreflang="es" href="https://aohys.com/es/"'), "sitemap must include Spanish home alternate");

const robots = readDist("robots.txt");
check(robots.includes("Disallow: /dashboard"), "robots.txt must disallow the private dashboard");
check(robots.includes("Sitemap: https://aohys.com/sitemap.xml"), "robots.txt must point at the sitemap");

if (failures.length > 0) {
  console.error("Public route verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public route verification passed.");
