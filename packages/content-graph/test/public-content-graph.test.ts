import assert from "node:assert/strict";
import {
  DEFAULT_LOCALE,
  LOCALES,
  MissingLocaleVariantError,
  getLanguageAlternates,
  getLocaleVariant,
  getLocalizedPath,
  getPublicRouteMap,
  getSeoMetadata,
  getSitemapEntries,
  isPrivateRoute,
  resolvePublicPath,
} from "../src/index.js";

assert.equal(DEFAULT_LOCALE, "en");
assert.deepEqual(LOCALES, ["en", "es"]);

assert.equal(getLocalizedPath("home", "en"), "/");
assert.equal(getLocalizedPath("home", "es"), "/es/");
assert.equal(getLocalizedPath("architecture", "en"), "/architecture");
assert.equal(getLocalizedPath("architecture", "es"), "/es/arquitectura");
assert.equal(getLocalizedPath("case-study:enterprise-systems", "en"), "/case-studies/enterprise-systems");
assert.equal(getLocalizedPath("case-study:enterprise-systems", "es"), "/es/casos/sistemas-enterprise");

const homeRoute = resolvePublicPath("/");
assert.ok(homeRoute);
assert.equal(homeRoute.id, "home");
assert.equal(homeRoute.locale, "en");
assert.equal(homeRoute.variant.path, "/");

const spanishHomeRoute = resolvePublicPath("/es/");
assert.ok(spanishHomeRoute);
assert.equal(spanishHomeRoute.id, "home");
assert.equal(spanishHomeRoute.locale, "es");
assert.equal(spanishHomeRoute.variant.path, "/es/");

const casaRocaSpanishRoute = resolvePublicPath("/es/casos/casa-roca");
assert.ok(casaRocaSpanishRoute);
assert.equal(casaRocaSpanishRoute.id, "case-study:casa-roca");
assert.equal(casaRocaSpanishRoute.locale, "es");

assert.equal(resolvePublicPath("/dashboard"), null);
assert.equal(isPrivateRoute("/dashboard/media"), true);
assert.equal(isPrivateRoute("/case-studies"), false);

const alternates = getLanguageAlternates("resume");
assert.deepEqual(alternates, {
  en: "https://aohys.com/resume",
  es: "https://aohys.com/es/cv",
  "x-default": "https://aohys.com/resume",
});

const seo = getSeoMetadata("contact", "es");
assert.equal(seo.lang, "es");
assert.equal(seo.canonicalUrl, "https://aohys.com/es/contacto");
assert.equal(seo.alternates.en, "https://aohys.com/contact");
assert.equal(seo.alternates.es, "https://aohys.com/es/contacto");
assert.match(seo.title, /AOHYS|Alejandro/);
assert.match(seo.description, /WhatsApp|correo|proyecto|conversaci[oó]n/i);

const publicRoutes = getPublicRouteMap();
assert.equal(publicRoutes.length, 22);
assert.equal(new Set(publicRoutes.map((route) => `${route.id}:${route.locale}`)).size, 22);
assert.ok(publicRoutes.every((route) => route.node.sitemap.include === true));

const sitemapUrls = getSitemapEntries().map((entry) => entry.url);
assert.ok(sitemapUrls.includes("https://aohys.com/"));
assert.ok(sitemapUrls.includes("https://aohys.com/es/"));
assert.ok(sitemapUrls.includes("https://aohys.com/es/casos/sistemas-enterprise"));
assert.equal(sitemapUrls.some((url) => url.includes("/dashboard")), false);

assert.throws(
  () =>
    getLocaleVariant(
      {
        id: "broken-node",
        type: "page",
        status: "published",
        sitemap: { include: true },
        variants: {
          en: {
            locale: "en",
            path: "/broken",
            title: "Broken",
            summary: "Broken node",
            seoTitle: "Broken",
            seoDescription: "Broken node",
          },
        },
      },
      "es",
    ),
  MissingLocaleVariantError,
);
