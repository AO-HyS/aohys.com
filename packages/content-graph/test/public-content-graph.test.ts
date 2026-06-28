import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  MissingLocaleVariantError,
  getArchitecturePageContent,
  getHomePageContent,
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

  it("returns graph-backed home narrative with localized case-study paths and safe evidence", () => {
    const englishHome = getHomePageContent("en");
    const spanishHome = getHomePageContent("es");

    expect(englishHome.headline).toContain("Alejandro Ortiz Corro");
    expect(englishHome.selectedOutcomes).toHaveLength(4);
    expect(englishHome.selectedOutcomes.map((outcome) => outcome.path)).toEqual([
      "/case-studies/casa-roca",
      "/case-studies/the-barber-central",
      "/case-studies/nutri-plan",
      "/case-studies/enterprise-systems",
    ]);
    expect(englishHome.selectedOutcomes.every((outcome) => outcome.evidence.publicSafe)).toBe(true);
    expect(englishHome.selectedOutcomes.every((outcome) => outcome.evidence.altText.length > 20)).toBe(
      true,
    );
    expect(spanishHome.selectedOutcomes[0]?.path).toBe("/es/casos/casa-roca");
    expect(spanishHome.whatsappHref).toMatch(/^https:\/\/wa\.me\/52/);
  });

  it("returns architecture page content with source and architecture document links", () => {
    const englishArchitecture = getArchitecturePageContent("en");
    const spanishArchitecture = getArchitecturePageContent("es");

    expect(englishArchitecture.heading).toBe("Public source sample, private client work.");
    expect(englishArchitecture.sourceLinks.map((link) => link.href)).toEqual([
      "https://github.com/AO-HyS/aohys.com",
      "https://github.com/AO-HyS/aohys.com/blob/develop/README.md",
      "https://github.com/AO-HyS/aohys.com/blob/develop/docs/release-train.md",
      "https://github.com/AO-HyS/aohys.com/blob/develop/docs/environment-contract.md",
      "https://github.com/AO-HyS/aohys.com/blob/develop/docs/public-content-graph.md",
    ]);
    expect(englishArchitecture.sections.map((section) => section.title)).toContain("Release Train");
    expect(englishArchitecture.sections.map((section) => section.title)).toContain("Environment Contract");
    expect(englishArchitecture.sections.map((section) => section.title)).toContain("Public Content Graph");
    expect(englishArchitecture.sections.every((section) => section.body.length > 40)).toBe(true);
    expect(spanishArchitecture.heading).toBe("Muestra pública, trabajo privado.");
    expect(spanishArchitecture.sourceLinks[0]?.href).toBe("https://github.com/AO-HyS/aohys.com");
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
