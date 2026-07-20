import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import enContent from "../src/locales/en.json" with { type: "json" };
import esContent from "../src/locales/es.json" with { type: "json" };
import {
  DEFAULT_LOCALE,
  LOCALES,
  MissingLocaleVariantError,
  STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID,
  assertPublicClaimsSafe,
  findForbiddenPublicClaims,
  getArchitecturePageContent,
  getCaseStudyIndexContent,
  getCaseStudyPageContent,
  getHomePageContent,
  getLanguageAlternates,
  getLocaleVariant,
  getLocalizedPath,
  getPracticePageContent,
  getPublicNavigation,
  getPublicRouteMap,
  getResumePageContent,
  getSeoMetadata,
  getSitemapEntries,
  isPrivateRoute,
  resolvePublicPath,
} from "../src/index.js";
import { STATIC_CASE_STUDY_ROUTES } from "../src/static-case-study-routes.js";

const staticCaseStudyIds = [
  "case-study:eteria",
  "case-study:engineering-practice",
  "case-study:enterprise-systems",
  "case-study:the-barber-central",
  "case-study:nutri-plan",
  "case-study:casa-roca",
] as const;

it("keeps the lightweight static route registry aligned with locale content", () => {
  const expected = ([
    ["en", enContent],
    ["es", esContent],
  ] as const).flatMap(([locale, dictionary]) =>
    Object.entries(dictionary)
      .filter(([contentId]) => contentId.startsWith("case-study:"))
      .map(([contentId, entry]) => ({
        contentId,
        locale,
        path: entry.path,
        localizedSlug: entry.path.split("/").at(-1) ?? "",
      }))
  ).sort((left, right) => `${left.locale}:${left.contentId}`.localeCompare(`${right.locale}:${right.contentId}`));
  const registry = [...STATIC_CASE_STUDY_ROUTES]
    .sort((left, right) => `${left.locale}:${left.contentId}`.localeCompare(`${right.locale}:${right.contentId}`));
  expect(registry).toEqual(expected);
});

function dynamicCaseStudyEntry(locale: "en" | "es") {
  const isSpanish = locale === "es";

  return {
    path: isSpanish ? "/es/casos/dashboard-alpha" : "/case-studies/dashboard-alpha",
    title: isSpanish ? "Dashboard Alpha ES" : "Dashboard Alpha",
    summary: isSpanish
      ? "Caso publicado desde dashboard con contenido localizado completo."
      : "A dashboard-published case study with complete localized public content.",
    seoDescription: isSpanish
      ? "Caso dinamico publicado desde dashboard para validar rutas publicas localizadas."
      : "Dynamic dashboard-published case study for validating localized public routes.",
    caseStudyContent: {
      statusLabel: isSpanish ? "Proyecto publicado" : "Published project",
      overview: isSpanish
        ? "El dashboard publico este caso con las secciones necesarias."
        : "The dashboard published this case with the required sections.",
      problem: {
        title: isSpanish ? "Oportunidad" : "Opportunity",
        body: isSpanish ? "Podía convertirse en una página pública." : "It could become a public page.",
      },
      businessOutcome: {
        title: isSpanish ? "Resultado" : "Business outcome",
        body: isSpanish ? "El caso ya aparece en el sitio publico." : "The case appears on the public site.",
      },
      role: {
        title: isSpanish ? "Rol" : "Role",
        body: isSpanish ? "Publicacion segura desde dashboard." : "Safe dashboard publication.",
      },
      constraints: {
        title: isSpanish ? "Consideraciones de diseño" : "Design considerations",
        body: isSpanish ? "Contenido público y claro." : "Clear public content.",
      },
      architectureDecisions: {
        title: isSpanish ? "Arquitectura" : "Architecture decisions",
        body: isSpanish ? "Usa el grafo publico." : "Uses the public graph.",
      },
      executionHighlights: {
        title: isSpanish ? "Ejecucion" : "Execution highlights",
        body: isSpanish ? "Publicado con manifest generado." : "Published with a generated manifest.",
      },
      qualitySecurityPerformance: {
        title: isSpanish ? "Calidad" : "Quality, security, and performance",
        body: isSpanish ? "Solo contenido seguro." : "Only safe content.",
      },
      publicEvidenceTitle: isSpanish ? "Enlaces publicos" : "Public links",
      publicEvidence: [
        {
          label: isSpanish ? "Sitio en vivo" : "Live site",
          description: isSpanish ? "Abrir Dashboard Alpha." : "Open Dashboard Alpha.",
          href: "https://example.com/dashboard-alpha",
          altText: isSpanish ? "Dashboard Alpha publicado" : "Dashboard Alpha published",
          kind: "public-site",
          publicSafe: true,
        },
      ],
      confidentialityNote: {
        title: isSpanish ? "Nota" : "Confidentiality note",
        body: isSpanish ? "Los datos privados no se publican." : "Private data is not published.",
      },
    },
  };
}

describe("Public Content Graph", () => {
  it("uses English as the default locale and Spanish as the secondary locale", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(LOCALES).toEqual(["en", "es"]);
  });

  it("uses dedicated static evidence for the engineering practice case study", () => {
    expect(STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID["case-study:engineering-practice"]).toEqual({
      src: "/images/proof/engineering-practice-release-cycle.svg",
      kind: "diagram",
    });
    expect(STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID["case-study:engineering-practice"]?.src).not.toBe(
      STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID["case-study:enterprise-systems"]?.src,
    );
  });

  it("uses a public-safe ETERIA landing asset as the lead project evidence", () => {
    expect(STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID["case-study:eteria"]).toEqual({
      src: "/images/proof/eteria-ivory-linen-hero.webp?v=e2ec0ccc",
      alt: "ETERIA public landing page linen art direction",
      kind: "landing",
    });
  });

  it("resolves stable content IDs to localized public routes", () => {
    expect(getLocalizedPath("home", "en")).toBe("/");
    expect(getLocalizedPath("home", "es")).toBe("/es/");
    expect(getLocalizedPath("architecture", "en")).toBe("/architecture");
    expect(getLocalizedPath("architecture", "es")).toBe("/es/arquitectura");
    expect(getLocalizedPath("case-study:eteria", "en")).toBe(
      "/case-studies/eteria",
    );
    expect(getLocalizedPath("case-study:eteria", "es")).toBe(
      "/es/casos/eteria",
    );
    expect(getLocalizedPath("case-study:enterprise-systems", "en")).toBe(
      "/case-studies/enterprise-systems",
    );
    expect(getLocalizedPath("case-study:enterprise-systems", "es")).toBe(
      "/es/casos/sistemas-enterprise",
    );
    expect(getLocalizedPath("case-study:engineering-practice", "en")).toBe(
      "/case-studies/engineering-practice",
    );
    expect(getLocalizedPath("case-study:engineering-practice", "es")).toBe(
      "/es/casos/practica-de-ingenieria",
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
      es: "https://aohys.com/es/curriculum",
      "x-default": "https://aohys.com/resume",
    });

    const seo = getSeoMetadata("contact", "es");
    expect(seo.lang).toBe("es");
    expect(seo.canonicalUrl).toBe("https://aohys.com/es/contacto");
    expect(seo.alternates.en).toBe("https://aohys.com/contact");
    expect(seo.alternates.es).toBe("https://aohys.com/es/contacto");
    expect(seo.title).toMatch(/AOHYS|Alejandro/);
    expect(seo.description).toMatch(/WhatsApp|correo|proyecto|conversaci[oó]n/i);
    expect(seo.socialImage).toEqual({
      url: "https://aohys.com/images/generated/aohys-hero-system-map.png",
      alt: "Mapa del sistema de ingeniería de producto AOHYS",
    });
    expect(seo.structuredData).toBeUndefined();

    const projectSeo = getSeoMetadata("case-study:casa-roca", "en");
    expect(projectSeo.socialImage).toEqual({
      url: "https://aohys.com/images/proof/casa-roca-value-v2.jpg",
      alt: "Casa Roca guest experience and conversion path preview on AOHYS",
    });

    const homeSeo = getSeoMetadata("home", "en");
    expect(homeSeo.structuredData).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: "https://aohys.com/",
      name: "AOHYS",
    });

    const resumeSeo = getSeoMetadata("resume", "es");
    expect(resumeSeo.structuredData).toMatchObject({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: "https://aohys.com/es/curriculum",
      inLanguage: "es",
      mainEntity: {
        "@type": "Person",
        name: "Alejandro Ortiz Corro",
        jobTitle: "Senior Software Engineer · Desarrollo de producto AI-native",
        sameAs: ["https://www.linkedin.com/in/alejandrortizcrr/", "https://github.com/corrortiz"],
      },
    });
    expect(resumeSeo.structuredData && "mainEntity" in resumeSeo.structuredData
      ? resumeSeo.structuredData.mainEntity
      : {}).not.toHaveProperty("image");
  });

  it("derives sitemap entries from graph eligibility", () => {
    const publicRoutes = getPublicRouteMap();
    expect(publicRoutes).toHaveLength(26);
    expect(new Set(publicRoutes.map((route) => `${route.id}:${route.locale}`)).size).toBe(26);
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

    expect(englishHome.headline).toBe("Senior Software Engineer · AI-Native Product Development");
    expect(spanishHome.headline).toBe("Senior Software Engineer · Desarrollo de producto AI-native");
    expect(englishHome.deck).toMatch(/business goals.*product systems.*ship/i);
    expect(spanishHome.deck).toMatch(/objetivos de negocio.*sistemas de producto.*producci[oó]n/i);
    expect(englishHome.architectureStages.map((stage) => stage.label)).toEqual([
      "Business communication",
      "End-to-end product engineering",
      "Backend systems",
      "AI-native delivery",
      "System architecture",
    ]);
    expect(spanishHome.architectureStages.map((stage) => stage.label)).toEqual([
      "Comunicación con negocio",
      "Product engineering end-to-end",
      "Sistemas backend",
      "Delivery AI-native",
      "Arquitectura de sistemas",
    ]);
    expect(englishHome.selectedOutcomes).toHaveLength(6);
    expect(englishHome.selectedOutcomes.map((outcome) => outcome.path)).toEqual([
      "/case-studies/eteria",
      "/case-studies/engineering-practice",
      "/case-studies/enterprise-systems",
      "/case-studies/the-barber-central",
      "/case-studies/nutri-plan",
      "/case-studies/casa-roca",
    ]);
    expect(englishHome.selectedOutcomes.every((outcome) => outcome.evidence.publicSafe)).toBe(true);
    expect(englishHome.selectedOutcomes.every((outcome) => outcome.evidence.altText.length > 20)).toBe(
      true,
    );
    expect(spanishHome.selectedOutcomes[0]?.path).toBe("/es/casos/eteria");
    expect(spanishHome.whatsappHref).toMatch(/^https:\/\/wa\.me\/52/);
  });

  it("returns the graph-backed AOHYS public information architecture", () => {
    const englishNavigation = getPublicNavigation("en");
    const spanishNavigation = getPublicNavigation("es");

    expect(englishNavigation.items.map((item) => item.slotId)).toEqual([
      "solutions",
      "agents",
      "pricing",
      "docs",
      "blog",
    ]);
    expect(englishNavigation.items.map((item) => item.label)).toEqual([
      "Work",
      "Services",
      "About",
      "Architecture",
      "Start a conversation",
    ]);
    expect(englishNavigation.items.map((item) => item.href)).toEqual([
      "/case-studies",
      "/practice",
      "/resume",
      "/architecture",
      "/contact",
    ]);
    expect(spanishNavigation.items.map((item) => item.href)).toEqual([
      "/es/casos",
      "/es/practica",
      "/es/curriculum",
      "/es/arquitectura",
      "/es/contacto",
    ]);
    expect(englishNavigation.actions.map((action) => [action.slotId, action.href])).toEqual([
      ["login", "/dashboard"],
      ["signup", "/contact"],
    ]);
    expect(englishNavigation.dropdown.items).toHaveLength(4);
    expect(englishNavigation.dropdown.items.map((item) => item.href)).toEqual([
      "/case-studies/eteria",
      "/case-studies/engineering-practice",
      "/architecture",
      "/practice",
    ]);
    expect(englishNavigation.dropdown.preview.codeLines.join("\n")).toContain("aohys.publish");
  });

  it("creates locale entries and public manifest ids for new dashboard case studies", async () => {
    const {
      applyProjectDraft,
      publicProjectIdsFromDictionaries,
    } = await import("../../../scripts/apply-dashboard-published-content.js");
    const dictionaries: Record<"en" | "es", Record<string, any>> = {
      en: {},
      es: {},
    };
    const contentId = "case-study:dashboard-alpha";

    expect(applyProjectDraft(dictionaries.en, {
      contentId,
      locale: "en",
      title: "Dashboard Alpha",
      summary: "A dashboard-published project.",
      seoDescription: "A public dashboard-published project case study.",
      projectUrl: "https://example.com/dashboard-alpha",
      ctaLabel: "Open project",
      ctaHref: "https://example.com/dashboard-alpha",
      achievements: "Reached public launch.\n\nCreated a safe case study.",
      structureNotes: "Uses generated content graph entries.\n\nKeeps private data out.",
      publishedAt: 123,
    })).toBe(true);

    expect(publicProjectIdsFromDictionaries(dictionaries, [contentId])).toEqual([]);
    expect(dictionaries.en[contentId]).toMatchObject({
      path: "/case-studies/dashboard-alpha",
      title: "Dashboard Alpha",
      primaryActionLabel: "Open project",
      caseStudyContent: {
        statusLabel: "Product system",
        publicEvidenceTitle: "Project links",
        constraints: {
          body: "Project scope, data ownership, integration seams, and release constraints stay explicit as the system evolves.",
        },
        confidentialityNote: {
          body: "Client details remain private.",
        },
        publicEvidence: [
          {
            href: "https://example.com/dashboard-alpha",
            publicSafe: true,
          },
        ],
      },
    });

    expect(applyProjectDraft(dictionaries.es, {
      contentId,
      locale: "es",
      localizedSlug: "panel-alfa",
      title: "Dashboard Alpha ES",
      summary: "Un proyecto publicado desde dashboard.",
      seoDescription: "Un caso publico publicado desde dashboard.",
      projectUrl: "https://example.com/dashboard-alpha",
      ctaLabel: "Abrir proyecto",
      ctaHref: "/es/casos/panel-alfa",
      achievements: "Llego a publicacion.\n\nCreo un caso seguro.",
      structureNotes: "Usa entradas generadas del grafo.\n\nMantiene datos privados fuera.",
      publishedAt: 124,
    })).toBe(true);

    expect(dictionaries.es[contentId].path).toBe("/es/casos/panel-alfa");
    expect(dictionaries.es[contentId].primaryActionContentId).toBe(contentId);

    expect(publicProjectIdsFromDictionaries(dictionaries, [
      "case-study:casa-roca",
      contentId,
      contentId,
    ])).toEqual([contentId]);
  });

  it("rejects unsafe public project URLs from dashboard drafts", async () => {
    const { applyProjectDraft } = await import("../../../scripts/apply-dashboard-published-content.js");
    const dictionary: Record<string, any> = {};

    expect(() => applyProjectDraft(dictionary, {
      contentId: "case-study:unsafe-link",
      locale: "en",
      title: "Unsafe link",
      summary: "This draft must not publish.",
      seoDescription: "A draft with an unsafe public URL.",
      projectUrl: "javascript:alert(document.domain)",
      ctaLabel: "Open",
      ctaHref: "/contact",
      achievements: "None.",
      structureNotes: "None.",
      publishedAt: 123,
    })).toThrow("Unsafe public project URL for case-study:unsafe-link");
    expect(dictionary).toEqual({});

    for (const projectUrl of [
      "http://127.0.0.1:3000/dashboard/admin",
      "https://localhost/dashboard/admin",
      "https://localhost./dashboard/admin",
      "https://service.internal/private",
      "https://service.internal./private",
      "https://printer.home.arpa/private",
    ]) {
      expect(() => applyProjectDraft(dictionary, {
        contentId: "case-study:private-link",
        locale: "en",
        title: "Private link",
        summary: "This draft must not publish.",
        seoDescription: "A draft with a private public URL.",
        projectUrl,
        ctaLabel: "Open",
        ctaHref: "/contact",
        achievements: "None.",
        structureNotes: "None.",
        publishedAt: 123,
      })).toThrow("Unsafe public project URL for case-study:private-link");
    }
  });

  it("keeps dashboard case studies out of the public manifest until they have evidence or media", async () => {
    const {
      applyProjectDraft,
      publicMediaItemsByContentId,
      publicProjectIdsFromDictionaries,
    } = await import("../../../scripts/apply-dashboard-published-content.js");
    const dictionaries: Record<"en" | "es", Record<string, any>> = {
      en: {},
      es: {},
    };
    const contentId = "case-study:dashboard-beta";

    expect(applyProjectDraft(dictionaries.en, {
      contentId,
      locale: "en",
      title: "Dashboard Beta",
      summary: "A dashboard-published project.",
      seoDescription: "A public dashboard-published project case study.",
      ctaLabel: "Contact",
      ctaHref: "/contact",
      achievements: "Prepared a safe case study.",
      structureNotes: "Uses generated content graph entries.",
      publishedAt: 123,
    })).toBe(true);
    expect(applyProjectDraft(dictionaries.es, {
      contentId,
      locale: "es",
      title: "Dashboard Beta ES",
      summary: "Un proyecto publicado desde dashboard.",
      seoDescription: "Un caso publico publicado desde dashboard.",
      ctaLabel: "Contacto",
      ctaHref: "/es/contacto",
      achievements: "Preparo un caso seguro.",
      structureNotes: "Usa entradas generadas del grafo.",
      publishedAt: 124,
    })).toBe(true);

    expect(publicProjectIdsFromDictionaries(dictionaries, [contentId])).toEqual([]);

    const publicMediaByContentId = publicMediaItemsByContentId([
      {
        storageKey: "media/dashboard-beta/selected",
        publicUrl: "https://example.com/dashboard-beta.png",
        altText: "Selected Dashboard Beta project preview.",
        contentId,
        usage: "case-study",
        status: "published",
        selectedForPublic: true,
        updatedAt: 100,
      },
    ]);

    expect(publicProjectIdsFromDictionaries(dictionaries, [contentId], publicMediaByContentId)).toEqual([
      contentId,
    ]);
  });

  it("prefers dashboard-selected public media over the latest fallback", async () => {
    const {
      publicMediaItemsByContentId,
    } = await import("../../../scripts/apply-dashboard-published-content.js");
    const mediaByContentId = publicMediaItemsByContentId([
      {
        storageKey: "media/dashboard-alpha/newer",
        publicUrl: "https://example.com/newer.png",
        altText: "Newer but not selected image.",
        contentId: "case-study:dashboard-alpha",
        usage: "case-study",
        status: "published",
        updatedAt: 200,
      },
      {
        storageKey: "media/dashboard-alpha/selected",
        publicUrl: "https://example.com/selected.png",
        altText: "Selected dashboard image.",
        contentId: "case-study:dashboard-alpha",
        usage: "case-study",
        status: "published",
        selectedForPublic: true,
        updatedAt: 100,
      },
    ]);

    expect(mediaByContentId.get("case-study:dashboard-alpha")?.publicUrl).toBe(
      "https://example.com/selected.png",
    );
  });

  it("derives published Cloudflare Images media from storage keys when publicUrl is missing", async () => {
    const previousHash = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH;

    process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH = "cloudflare-hash";

    try {
      const {
        publicMediaItemsByContentId,
      } = await import("../../../scripts/apply-dashboard-published-content.js");
      const mediaByContentId = publicMediaItemsByContentId([
        {
          storageProvider: "cloudflare-images",
          storageKey: "media/dashboard-alpha/selected",
          altText: "Selected dashboard image.",
          contentId: "case-study:dashboard-alpha",
          usage: "case-study",
          status: "published",
          selectedForPublic: true,
          updatedAt: 100,
        },
      ]);

      expect(mediaByContentId.get("case-study:dashboard-alpha")?.publicUrl).toBe(
        "https://imagedelivery.net/cloudflare-hash/media/dashboard-alpha/selected/public",
      );
    } finally {
      if (previousHash === undefined) {
        delete process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH;
      } else {
        process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH = previousHash;
      }
    }
  });

  it("uses published external media URLs stored as storage keys", async () => {
    const {
      publicMediaItemsByContentId,
    } = await import("../../../scripts/apply-dashboard-published-content.js");
    const mediaByContentId = publicMediaItemsByContentId([
      {
        storageProvider: "external",
        storageKey: "https://cdn.example.com/dashboard-alpha/alternate.png",
        altText: "Alternate dashboard image.",
        contentId: "case-study:dashboard-alpha",
        usage: "case-study",
        status: "published",
        selectedForPublic: true,
        updatedAt: 100,
      },
    ]);

    expect(mediaByContentId.get("case-study:dashboard-alpha")?.publicUrl).toBe(
      "https://cdn.example.com/dashboard-alpha/alternate.png",
    );
  });

  it("uses published public asset paths stored as storage keys", async () => {
    const {
      publicMediaItemsByContentId,
    } = await import("../../../scripts/apply-dashboard-published-content.js");
    const mediaByContentId = publicMediaItemsByContentId([
      {
        storageProvider: "external",
        storageKey: "images/proof/dashboard-alpha.png?variant=public#hero",
        altText: "Dashboard Alpha public asset image.",
        contentId: "case-study:dashboard-alpha",
        usage: "case-study",
        status: "published",
        selectedForPublic: true,
        updatedAt: 100,
      },
    ]);

    expect(mediaByContentId.get("case-study:dashboard-alpha")?.publicUrl).toBe(
      "/images/proof/dashboard-alpha.png?variant=public#hero",
    );
  });

  it("keeps dashboard media from overriding curated case-study evidence", async () => {
    const {
      buildGeneratedPublicMedia,
    } = await import("../../../scripts/apply-dashboard-published-content.js");

    expect(buildGeneratedPublicMedia([
      {
        storageProvider: "external",
        storageKey: "images/proof/casa-roca-production.png",
        altText: "Sanitized Casa Roca production proof.",
        contentId: "case-study:casa-roca",
        usage: "case-study",
        status: "published",
        selectedForPublic: true,
        updatedAt: 100,
      },
      {
        storageProvider: "external",
        storageKey: "images/proof/dashboard-alpha.png",
        altText: "Reviewed Dashboard Alpha proof.",
        contentId: "case-study:dashboard-alpha",
        usage: "case-study",
        status: "published",
        selectedForPublic: true,
        updatedAt: 101,
      },
    ])).toEqual({
      "case-study:dashboard-alpha": {
        src: "/images/proof/dashboard-alpha.png",
        alt: "Reviewed Dashboard Alpha proof.",
        kind: "dashboard",
      },
    });
  });

  it("allows an explicitly reselected curated asset after the copy approval boundary", async () => {
    const { buildGeneratedPublicMedia } = await import(
      "../../../scripts/apply-dashboard-published-content.js"
    );
    const approvedAt = Date.parse(enContent["case-study:casa-roca"].approvedAt);

    expect(buildGeneratedPublicMedia([
      {
        storageProvider: "external",
        storageKey: "images/proof/casa-roca-reviewed.png",
        altText: "Explicitly reviewed Casa Roca proof.",
        contentId: "case-study:casa-roca",
        usage: "case-study",
        status: "published",
        selectedForPublic: true,
        selectedForPublicAt: approvedAt + 1,
        updatedAt: approvedAt + 10,
      },
    ])).toEqual({
      "case-study:casa-roca": {
        src: "/images/proof/casa-roca-reviewed.png",
        alt: "Explicitly reviewed Casa Roca proof.",
        kind: "site",
      },
    });
  });

  it("fails visibly when selected public media uses unsafe path segments", async () => {
    const {
      publicMediaItemsByContentId,
    } = await import("../../../scripts/apply-dashboard-published-content.js");
    const unsafeStorageKeys = [
      "images/../outside.png",
      "/images/./same-directory.png",
      "images//empty-segment.png",
      "images/%2e%2e/encoded-parent.png",
      "images/folder%2fencoded-slash.png",
    ];
    expect(() => publicMediaItemsByContentId(unsafeStorageKeys.map((storageKey, index) => ({
      storageProvider: "external",
      storageKey,
      altText: "Unsafe public asset path.",
      contentId: `case-study:unsafe-${index}`,
      usage: "case-study",
      status: "published",
      selectedForPublic: true,
      updatedAt: 100 + index,
    })))).toThrow("Selected public media for case-study:unsafe-0 is invalid");
  });

  it("includes generated dashboard case studies in routes, sitemap, index, and home outcomes", async () => {
    const contentId = "case-study:dashboard-alpha";

    vi.resetModules();
    vi.doMock("../src/generated/dashboard-public-projects.js", () => ({
      DASHBOARD_PUBLIC_PROJECT_IDS: [contentId],
    }));
    vi.doMock("../src/locales/en.json", () => ({
      default: {
        ...enContent,
        [contentId]: dynamicCaseStudyEntry("en"),
      },
    }));
    vi.doMock("../src/locales/es.json", () => ({
      default: {
        ...esContent,
        [contentId]: dynamicCaseStudyEntry("es"),
      },
    }));

    try {
      const dynamicGraph = await import("../src/index.js");

      expect(dynamicGraph.getLocalizedPath(contentId, "en")).toBe("/case-studies/dashboard-alpha");
      expect(dynamicGraph.getLocalizedPath(contentId, "es")).toBe("/es/casos/dashboard-alpha");
      expect(dynamicGraph.resolvePublicPath("/case-studies/dashboard-alpha")?.id).toBe(contentId);
      expect(dynamicGraph.getPublicRouteMap().filter((route) => route.id === contentId)).toHaveLength(2);
      expect(dynamicGraph.getSitemapEntries().map((entry) => entry.url)).toContain(
        "https://aohys.com/case-studies/dashboard-alpha",
      );

      expect(dynamicGraph.getCaseStudyIndexContent("en").entries.map((entry) => entry.contentId)).toEqual([
        ...staticCaseStudyIds,
        contentId,
      ]);
      expect(dynamicGraph.getHomePageContent("en").selectedOutcomes.at(-1)).toMatchObject({
        contentId,
        path: "/case-studies/dashboard-alpha",
        evidence: {
          href: "https://example.com/dashboard-alpha",
          publicSafe: true,
        },
      });
    } finally {
      vi.doUnmock("../src/generated/dashboard-public-projects.js");
      vi.doUnmock("../src/locales/en.json");
      vi.doUnmock("../src/locales/es.json");
      vi.resetModules();
    }
  });

  it("returns architecture page content with source and architecture document links", () => {
    const englishArchitecture = getArchitecturePageContent("en");
    const spanishArchitecture = getArchitecturePageContent("es");

    expect(englishArchitecture.heading).toMatch(/business intent.*production/i);
    expect(englishArchitecture.layers.map((layer) => layer.id)).toEqual([
      "experience",
      "edge",
      "product-data",
      "communication",
      "observability",
      "delivery",
    ]);
    expect(englishArchitecture.layers.flatMap((layer) => layer.technologies)).toEqual(expect.arrayContaining([
      "Business intent",
      "Domain modeling",
      "Specs & tickets",
      "Agent implementation",
      "Browser QA",
      "Release Train",
    ]));
    expect(englishArchitecture.tradeoffs).toHaveLength(3);
    expect(englishArchitecture.sourceLinks.map((link) => link.href)).toEqual([
      "https://github.com/AO-HyS/aohys.com",
      "https://github.com/AO-HyS/aohys.com/blob/develop/README.md",
      "https://github.com/AO-HyS/aohys.com/blob/develop/docs/release-train.md",
      "https://github.com/AO-HyS/aohys.com/blob/develop/docs/environment-contract.md",
      "https://github.com/AO-HyS/aohys.com/blob/develop/docs/public-content-graph.md",
    ]);
    expect(englishArchitecture.sections.map((section) => section.title)).toContain("Release Train");
    expect(englishArchitecture.sections.map((section) => section.title)).toContain("Human accountability");
    expect(englishArchitecture.sections.map((section) => section.title)).toContain("Public Source Site and Private Work");
    expect(englishArchitecture.sections.every((section) => section.body.length > 40)).toBe(true);
    expect(spanishArchitecture.heading).toMatch(/intenci[oó]n de negocio.*producci[oó]n/i);
    expect(spanishArchitecture.sourceLinks[0]?.href).toBe("https://github.com/AO-HyS/aohys.com");
  });

  it("returns selected work index entries with localized paths and statuses", () => {
    const englishIndex = getCaseStudyIndexContent("en");
    const spanishIndex = getCaseStudyIndexContent("es");

    expect(englishIndex.entries.map((entry) => entry.contentId)).toEqual([
      "case-study:eteria",
      "case-study:engineering-practice",
      "case-study:enterprise-systems",
      "case-study:the-barber-central",
      "case-study:nutri-plan",
      "case-study:casa-roca",
    ]);
    expect(englishIndex.entries.map((entry) => entry.statusLabel)).toEqual([
      "Client project · In production",
      "AI-native development practice",
      "Enterprise product systems",
      "Approaching production",
      "Testing & production preparation",
      "Live hospitality experience",
    ]);
    expect(spanishIndex.entries.map((entry) => entry.path)).toEqual([
      "/es/casos/eteria",
      "/es/casos/practica-de-ingenieria",
      "/es/casos/sistemas-enterprise",
      "/es/casos/the-barber-central",
      "/es/casos/nutri-plan",
      "/es/casos/casa-roca",
    ]);
    expect(spanishIndex.entries.every((entry) => entry.evidenceLabel.length > 6)).toBe(true);
  });

  it("returns resume content with a PDF artifact and localized online context links", () => {
    const englishResume = getResumePageContent("en");
    const spanishResume = getResumePageContent("es");

    expect(englishResume.name).toBe("Alejandro Ortiz Corro");
    expect(englishResume.role).toBe("Senior Software Engineer · AI-Native Product Development");
    expect(englishResume.pdf).toMatchObject({
      href: "/downloads/alejandro-ortiz-corro-resume.pdf",
      fileName: "alejandro-ortiz-corro-resume.pdf",
    });
    expect(englishResume.projects.map((project) => project.title)).toEqual([
      "ETERIA",
      "AI-Native Development Practice",
      "Enterprise Product Systems",
      "The Barber Central",
      "NutriPlan Digital",
      "Casa Roca",
    ]);
    expect(englishResume.summary.join(" ")).toMatch(/business|frontend|backend|agents|human accountability/i);
    expect(englishResume.contextLinks.map((link) => link.href)).toEqual([
      "/case-studies",
      "/architecture",
      "/contact",
    ]);
    expect(englishResume.experience.find((job) => job.company === "NEORIS/CEMEX")?.role).toBe(
      "Senior Software Engineer",
    );

    expect(spanishResume.role).toBe("Senior Software Engineer · Desarrollo de producto AI-native");
    expect(spanishResume.contextTitle).toBe("Más contexto en línea");
    expect(spanishResume.contextLinks.map((link) => link.href)).toEqual([
      "/es/casos",
      "/es/arquitectura",
      "/es/contacto",
    ]);
    expect(spanishResume.experience.find((job) => job.company === "NEORIS/CEMEX")?.role).toBe(
      "Ingeniero de software sénior",
    );
  });

  it("publishes ETERIA as a bilingual, public-safe production case study", () => {
    const englishCaseStudy = getCaseStudyPageContent("case-study:eteria", "en");
    const spanishCaseStudy = getCaseStudyPageContent("case-study:eteria", "es");

    expect(englishCaseStudy?.statusLabel).toBe("Client project · In production");
    expect(englishCaseStudy?.overview).toMatch(/client project.*production/i);
    expect(englishCaseStudy?.role.body).toMatch(/landing|lead|proposal|private web|SwiftUI/i);
    expect(englishCaseStudy?.architectureDecisions.body).toMatch(/Convex|PostHog/i);
    expect(englishCaseStudy?.executionHighlights.body).toMatch(/Release Train|preview|smoke/i);
    expect(englishCaseStudy?.publicEvidence).toEqual([
      expect.objectContaining({
        href: "https://momentos-eteria.com",
        publicSafe: true,
        kind: "public-site",
      }),
    ]);
    expect(spanishCaseStudy?.statusLabel).toBe("Proyecto de cliente · En producción");
    expect(spanishCaseStudy?.publicEvidence[0]?.href).toBe("https://momentos-eteria.com");
  });

  it("keeps approved public claims inside their evidence and privacy boundaries", () => {
    const publicCopy = JSON.stringify({ enContent, esContent });
    const resumeCopy = JSON.stringify({ en: enContent.resume, es: esContent.resume });
    const enterpriseCopy = JSON.stringify({
      en: enContent["case-study:enterprise-systems"],
      es: esContent["case-study:enterprise-systems"],
    });
    const eteriaCopy = JSON.stringify({
      en: enContent["case-study:eteria"],
      es: esContent["case-study:eteria"],
    });

    expect(findForbiddenPublicClaims(publicCopy)).toEqual([]);
    expect(findForbiddenPublicClaims(resumeCopy)).toEqual([]);
    expect(enterpriseCopy).toMatch(/3(?:-|–)5 seconds.*under 1 second/i);
    expect(enterpriseCopy).not.toMatch(/final client|cliente final|New York/i);
    expect(eteriaCopy).not.toMatch(/App Store|credential|private route|customer data|datos de clientes/i);
  });

  it("normalizes forbidden claim variants without rejecting legitimate engineering language", () => {
    expect(findForbiddenPublicClaims("Open-to-Work · AI-ML Engineer · model evaluations")).toEqual([
      "open-to-work",
      "ai-ml-title",
      "model-evaluation",
    ]);
    expect(findForbiddenPublicClaims("High availability architecture that accelerates releases")).toEqual([]);
    expect(findForbiddenPublicClaims("Semantic search, model training, and AI data pipelines")).toEqual([
      "semantic-search",
      "model-training",
      "ai-data-pipelines",
    ]);
    expect(findForbiddenPublicClaims("Búsqueda semántica, entrenamiento de modelos y pipelines de datos para IA")).toEqual([
      "semantic-search",
      "model-training",
      "ai-data-pipelines",
    ]);
    expect(() => assertPublicClaimsSafe("Disponible para proyectos seleccionados", "test content")).toThrow(
      /public-availability/,
    );
  });

  it("keeps bilingual approval boundaries aligned for curated public content", () => {
    for (const contentId of [...staticCaseStudyIds, "resume"] as const) {
      const englishEntry = enContent[contentId] as typeof enContent[typeof contentId] & {
        approvedHash: string;
      };
      const spanishEntry = esContent[contentId] as typeof esContent[typeof contentId] & {
        approvedHash: string;
      };
      const englishApprovedAt = englishEntry.approvedAt;
      const spanishApprovedAt = spanishEntry.approvedAt;

      expect(Number.isNaN(Date.parse(englishApprovedAt))).toBe(false);
      expect(spanishApprovedAt).toBe(englishApprovedAt);

      for (const entry of [englishEntry, spanishEntry]) {
        if (process.env.AOHYS_DASHBOARD_CONTENT_APPLIED === "1") continue;
        const { approvedHash, ...approvedContent } = entry;
        const contentHash = createHash("sha256")
          .update(JSON.stringify(approvedContent))
          .digest("hex");
        expect(approvedHash).toBe(contentHash);
      }
    }
  });

  it("keeps stale dashboard publications from replacing newly approved canonical copy", async () => {
    const { applyProjectDraft, applyResumeDraft } = await import(
      "../../../scripts/apply-dashboard-published-content.js"
    );
    const dictionary = structuredClone(enContent) as Record<string, any>;
    const eteriaApprovedAt = Date.parse(dictionary["case-study:eteria"].approvedAt);
    const resumeApprovedAt = Date.parse(dictionary.resume.approvedAt);
    const approvedEteriaTitle = dictionary["case-study:eteria"].title;
    const approvedResumeRole = dictionary.resume.resumeContent.role;

    expect(applyProjectDraft(dictionary, {
      contentId: "case-study:eteria",
      locale: "en",
      title: "Stale ETERIA draft",
      summary: "Old dashboard copy.",
      seoDescription: "Old dashboard metadata.",
      ctaLabel: "Open",
      ctaHref: "https://example.com/stale",
      achievements: "Old result.",
      structureNotes: "Old structure.",
      updatedAt: eteriaApprovedAt - 10,
      publishedAt: eteriaApprovedAt - 1,
    })).toBe(false);
    expect(dictionary["case-study:eteria"].title).toBe(approvedEteriaTitle);

    expect(applyResumeDraft(dictionary, {
      locale: "en",
      contentJson: JSON.stringify({ role: "Stale resume role" }),
      updatedAt: resumeApprovedAt - 10,
      publishedAt: resumeApprovedAt - 1,
    })).toBe(false);
    expect(dictionary.resume.resumeContent.role).toBe(approvedResumeRole);

    expect(applyProjectDraft(dictionary, {
      contentId: "case-study:eteria",
      locale: "en",
      title: "Newer reviewed ETERIA draft",
      summary: "Newer reviewed dashboard copy.",
      seoDescription: "Newer reviewed dashboard metadata.",
      ctaLabel: "Open",
      ctaHref: "https://momentos-eteria.com",
      achievements: "Newer result.",
      structureNotes: "Newer structure.",
      updatedAt: eteriaApprovedAt + 1,
      publishedAt: eteriaApprovedAt + 1,
    })).toBe(true);
    expect(dictionary["case-study:eteria"].title).toBe("Newer reviewed ETERIA draft");

    expect(applyResumeDraft(dictionary, {
      locale: "en",
      contentJson: JSON.stringify({ role: "Newer reviewed resume role" }),
      updatedAt: resumeApprovedAt + 1,
      publishedAt: resumeApprovedAt + 1,
    })).toBe(true);
    expect(dictionary.resume.resumeContent.role).toBe("Newer reviewed resume role");
  });

  it("does not treat republishing an old locale revision as a fresh review", async () => {
    const { applyProjectDraft } = await import("../../../scripts/apply-dashboard-published-content.js");
    const dictionary = structuredClone(enContent) as Record<string, any>;
    const approvedAt = Date.parse(dictionary["case-study:eteria"].approvedAt);

    expect(applyProjectDraft(dictionary, {
      contentId: "case-study:eteria",
      locale: "en",
      title: "Old revision with a new publish timestamp",
      summary: "Old dashboard copy.",
      seoDescription: "Old dashboard metadata.",
      ctaLabel: "Open",
      ctaHref: "https://momentos-eteria.com",
      achievements: "Old result.",
      structureNotes: "Old structure.",
      updatedAt: approvedAt - 1,
      publishedAt: approvedAt + 10_000,
    })).toBe(false);
    expect(dictionary["case-study:eteria"].title).not.toBe("Old revision with a new publish timestamp");
  });

  it("returns Casa Roca case-study content with public-safe evidence", () => {
    const englishCaseStudy = getCaseStudyPageContent("case-study:casa-roca", "en");
    const spanishCaseStudy = getCaseStudyPageContent("case-study:casa-roca", "es");

    expect(englishCaseStudy?.statusLabel).toBe("Live hospitality experience");
    expect(englishCaseStudy?.problem.title).toBe("Opportunity");
    expect(englishCaseStudy?.businessOutcome.title).toBe("Business outcome");
    expect(englishCaseStudy?.role.body).toMatch(/Product direction/i);
    expect(englishCaseStudy?.constraints.body).toMatch(/two languages/i);
    expect(englishCaseStudy?.architectureDecisions.body).toMatch(/bilingual content/i);
    expect(englishCaseStudy?.executionHighlights.body).toMatch(/production deployment/i);
    expect(englishCaseStudy?.qualitySecurityPerformance.body).toMatch(/optimized media/i);
    expect(englishCaseStudy?.publicEvidence).toHaveLength(1);
    expect(englishCaseStudy?.publicEvidence[0]).toMatchObject({
      href: "https://casa-roca.mx",
      publicSafe: true,
      altText: "Casa Roca production website",
    });
    expect(englishCaseStudy?.confidentialityNote.title).toBe("Scope note");
    expect(spanishCaseStudy?.statusLabel).toBe("Experiencia de hospitalidad en producción");
    expect(spanishCaseStudy?.publicEvidence[0]?.altText).toBe(
      "Sitio Casa Roca en producción",
    );
  });

  it("returns typed product engineering services in both locales", () => {
    const englishPractice = getPracticePageContent("en");
    const spanishPractice = getPracticePageContent("es");

    expect(englishPractice.services.map((service) => service.id)).toEqual([
      "product-systems",
      "architecture-modernization",
      "delivery-acceleration",
    ]);
    expect(englishPractice.services.every((service) => service.problem.length > 50)).toBe(true);
    expect(englishPractice.services.every((service) => service.result.length > 50)).toBe(true);
    expect(englishPractice.services.map((service) => service.title)).toEqual([
      "Build a complete product from zero",
      "Add a senior collaborator to your team",
      "Modernize what is already in motion",
    ]);
    expect(englishPractice.services[0]?.result).toMatch(/website, web application, or mobile application/i);
    expect(englishPractice.services[2]?.result).toMatch(/AI, data, cloud/i);
    expect(englishPractice.process).toHaveLength(4);
    expect(englishPractice.relatedContentIds).toEqual(["architecture", "case-studies"]);
    expect(spanishPractice.services).toHaveLength(3);
    expect(spanishPractice.deliverables).toHaveLength(5);
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
