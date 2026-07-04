import { describe, expect, it, vi } from "vitest";
import enContent from "../src/locales/en.json" with { type: "json" };
import esContent from "../src/locales/es.json" with { type: "json" };
import {
  DEFAULT_LOCALE,
  LOCALES,
  MissingLocaleVariantError,
  getArchitecturePageContent,
  getCaseStudyIndexContent,
  getCaseStudyPageContent,
  getHomePageContent,
  getLanguageAlternates,
  getLocaleVariant,
  getLocalizedPath,
  getPublicRouteMap,
  getResumePageContent,
  getSeoMetadata,
  getSitemapEntries,
  isPrivateRoute,
  resolvePublicPath,
} from "../src/index.js";

const staticCaseStudyIds = [
  "case-study:casa-roca",
  "case-study:the-barber-central",
  "case-study:nutri-plan",
  "case-study:enterprise-systems",
  "case-study:engineering-practice",
] as const;

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
        title: isSpanish ? "Problema" : "Problem",
        body: isSpanish ? "Necesitaba una pagina publica." : "It needed a public page.",
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
        title: isSpanish ? "Restricciones" : "Constraints",
        body: isSpanish ? "Sin datos privados." : "No private data.",
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
    expect(publicRoutes).toHaveLength(24);
    expect(new Set(publicRoutes.map((route) => `${route.id}:${route.locale}`)).size).toBe(24);
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

    expect(englishHome.headline).toContain("sell, operate, and ship");
    expect(spanishHome.headline).toContain("vender, operar y lanzar");
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
        statusLabel: "Published dashboard project",
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
      title: "Dashboard Alpha ES",
      summary: "Un proyecto publicado desde dashboard.",
      seoDescription: "Un caso publico publicado desde dashboard.",
      projectUrl: "https://example.com/dashboard-alpha",
      ctaLabel: "Abrir proyecto",
      ctaHref: "https://example.com/dashboard-alpha",
      achievements: "Llego a publicacion.\n\nCreo un caso seguro.",
      structureNotes: "Usa entradas generadas del grafo.\n\nMantiene datos privados fuera.",
      publishedAt: 124,
    })).toBe(true);

    expect(publicProjectIdsFromDictionaries(dictionaries, [
      "case-study:casa-roca",
      contentId,
      contentId,
    ])).toEqual([contentId]);
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

    expect(englishArchitecture.heading).toBe("The public code shows the work around the work.");
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
    expect(spanishArchitecture.heading).toBe("El código público muestra el trabajo alrededor del trabajo.");
    expect(spanishArchitecture.sourceLinks[0]?.href).toBe("https://github.com/AO-HyS/aohys.com");
  });

  it("returns selected work index entries with localized paths and statuses", () => {
    const englishIndex = getCaseStudyIndexContent("en");
    const spanishIndex = getCaseStudyIndexContent("es");

    expect(englishIndex.entries.map((entry) => entry.contentId)).toEqual([
      "case-study:casa-roca",
      "case-study:the-barber-central",
      "case-study:nutri-plan",
      "case-study:enterprise-systems",
      "case-study:engineering-practice",
    ]);
    expect(englishIndex.entries.map((entry) => entry.statusLabel)).toEqual([
      "Live hospitality site",
      "Active build",
      "Private build",
      "Enterprise/confidential",
      "Engineering practice",
    ]);
    expect(spanishIndex.entries.map((entry) => entry.path)).toEqual([
      "/es/casos/casa-roca",
      "/es/casos/the-barber-central",
      "/es/casos/nutri-plan",
      "/es/casos/sistemas-enterprise",
      "/es/casos/practica-de-ingenieria",
    ]);
    expect(spanishIndex.entries.every((entry) => entry.evidenceLabel.length > 6)).toBe(true);
  });

  it("returns resume content with a PDF artifact and localized online context links", () => {
    const englishResume = getResumePageContent("en");
    const spanishResume = getResumePageContent("es");

    expect(englishResume.name).toBe("Alejandro Ortiz Corro");
    expect(englishResume.role).toBe("Senior Product Engineer / Frontend Systems");
    expect(englishResume.pdf).toMatchObject({
      href: "/downloads/alejandro-ortiz-corro-resume.pdf",
      fileName: "alejandro-ortiz-corro-resume.pdf",
    });
    expect(englishResume.proof.title).toBe("The site supports the resume.");
    expect(englishResume.summary.join(" ")).toMatch(/React|TypeScript|Next\.js|agents|observability/i);
    expect(englishResume.contextLinks.map((link) => link.href)).toEqual([
      "/case-studies",
      "/architecture",
      "/contact",
    ]);

    expect(spanishResume.role).toBe("Senior Product Engineer / Sistemas Frontend");
    expect(spanishResume.contextTitle).toBe("Más contexto en línea");
    expect(spanishResume.contextLinks.map((link) => link.href)).toEqual([
      "/es/casos",
      "/es/arquitectura",
      "/es/contacto",
    ]);
  });

  it("returns Casa Roca case-study content with public-safe evidence", () => {
    const englishCaseStudy = getCaseStudyPageContent("case-study:casa-roca", "en");
    const spanishCaseStudy = getCaseStudyPageContent("case-study:casa-roca", "es");

    expect(englishCaseStudy?.statusLabel).toBe("Live hospitality site");
    expect(englishCaseStudy?.problem.title).toBe("Problem");
    expect(englishCaseStudy?.businessOutcome.title).toBe("Business outcome");
    expect(englishCaseStudy?.role.body).toMatch(/Public site delivery/i);
    expect(englishCaseStudy?.constraints.body).toMatch(/private booking data/i);
    expect(englishCaseStudy?.architectureDecisions.body).toMatch(/bilingual content/i);
    expect(englishCaseStudy?.executionHighlights.body).toMatch(/production deployment/i);
    expect(englishCaseStudy?.qualitySecurityPerformance.body).toMatch(/sensitive operational data/i);
    expect(englishCaseStudy?.publicEvidence).toHaveLength(1);
    expect(englishCaseStudy?.publicEvidence[0]).toMatchObject({
      href: "https://casa-roca.mx",
      publicSafe: true,
      altText: "Casa Roca production website",
    });
    expect(englishCaseStudy?.confidentialityNote.body).toMatch(/operational data remain private/i);
    expect(spanishCaseStudy?.statusLabel).toBe("Sitio de hospitalidad en vivo");
    expect(spanishCaseStudy?.publicEvidence[0]?.altText).toBe(
      "Sitio Casa Roca en producción",
    );
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
