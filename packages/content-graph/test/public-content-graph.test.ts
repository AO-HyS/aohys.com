import { describe, expect, it } from "vitest";
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

describe("Public Content Graph", () => {
  it("uses English as the default locale and Spanish as the secondary locale", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(LOCALES).toEqual(["en", "es"]);
  });

  it("resolves stable content IDs to localized public routes", () => {
    expect(getLocalizedPath("home", "en")).toBe("/");
    expect(getLocalizedPath("home", "es")).toBe("/es/");
    expect(getLocalizedPath("architecture", "en")).toBe("/architecture");
    expect(getLocalizedPath("architecture", "es")).toBe("/es/arquitectura");
    expect(getLocalizedPath("case-study:enterprise-systems", "en")).toBe(
      "/case-studies/enterprise-systems",
    );
    expect(getLocalizedPath("case-study:enterprise-systems", "es")).toBe(
      "/es/casos/sistemas-enterprise",
    );
  });

  it("resolves public paths without resolving private dashboard paths", () => {
    const homeRoute = resolvePublicPath("/");
    expect(homeRoute).not.toBeNull();
    expect(homeRoute?.id).toBe("home");
    expect(homeRoute?.locale).toBe("en");
    expect(homeRoute?.variant.path).toBe("/");

    const spanishHomeRoute = resolvePublicPath("/es/");
    expect(spanishHomeRoute).not.toBeNull();
    expect(spanishHomeRoute?.id).toBe("home");
    expect(spanishHomeRoute?.locale).toBe("es");
    expect(spanishHomeRoute?.variant.path).toBe("/es/");

    const casaRocaSpanishRoute = resolvePublicPath("/es/casos/casa-roca");
    expect(casaRocaSpanishRoute).not.toBeNull();
    expect(casaRocaSpanishRoute?.id).toBe("case-study:casa-roca");
    expect(casaRocaSpanishRoute?.locale).toBe("es");

    expect(resolvePublicPath("/dashboard")).toBeNull();
    expect(isPrivateRoute("/dashboard/media")).toBe(true);
    expect(isPrivateRoute("/case-studies")).toBe(false);
  });

  it("returns canonical SEO metadata and language alternates", () => {
    expect(getLanguageAlternates("resume")).toEqual({
      en: "https://aohys.com/resume",
      es: "https://aohys.com/es/cv",
      "x-default": "https://aohys.com/resume",
    });

    const seo = getSeoMetadata("contact", "es");
    expect(seo.lang).toBe("es");
    expect(seo.canonicalUrl).toBe("https://aohys.com/es/contacto");
    expect(seo.alternates.en).toBe("https://aohys.com/contact");
    expect(seo.alternates.es).toBe("https://aohys.com/es/contacto");
    expect(seo.title).toMatch(/AOHYS|Alejandro/);
    expect(seo.description).toMatch(/WhatsApp|correo|proyecto|conversaci[oó]n/i);
  });

  it("derives sitemap entries from graph eligibility", () => {
    const publicRoutes = getPublicRouteMap();
    expect(publicRoutes).toHaveLength(22);
    expect(new Set(publicRoutes.map((route) => `${route.id}:${route.locale}`)).size).toBe(22);
    expect(publicRoutes.every((route) => route.node.sitemap.include === true)).toBe(true);

    const sitemapUrls = getSitemapEntries().map((entry) => entry.url);
    expect(sitemapUrls).toContain("https://aohys.com/");
    expect(sitemapUrls).toContain("https://aohys.com/es/");
    expect(sitemapUrls).toContain("https://aohys.com/es/casos/sistemas-enterprise");
    expect(sitemapUrls.some((url) => url.includes("/dashboard"))).toBe(false);
  });

  it("fails explicitly when a locale variant is missing", () => {
    expect(() =>
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
    ).toThrow(MissingLocaleVariantError);
  });
});
