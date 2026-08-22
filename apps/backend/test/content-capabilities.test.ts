import { afterEach, describe, expect, it, vi } from "vitest";
import { selectMediaForPublicHandler } from "../convex/model/content/media.js";
import { listForDashboardHandler } from "../convex/model/content/overview.js";
import { createProjectHandler } from "../convex/model/content/projects.js";
import { publishContentHandler } from "../convex/model/content/publication.js";
import { createResumeVersionHandler } from "../convex/model/content/resume.js";
import { withinLimit } from "../convex/model/content/shared.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function dashboardDatabase(rowsByTable: Record<string, unknown[]>) {
  const takes = new Map<string, ReturnType<typeof vi.fn>>();
  const orders = new Map<string, ReturnType<typeof vi.fn>>();
  const query = vi.fn((table: string) => {
    const take = vi.fn(async (limit: number) =>
      (rowsByTable[table] ?? []).slice(0, limit),
    );
    const order = vi.fn(() => ({ take }));
    const withIndex = vi.fn(() => ({ order, take }));
    takes.set(table, take);
    orders.set(table, order);
    return { take, order, withIndex };
  });
  return { db: { query }, orders, takes };
}

describe("content capability bounds and indexes", () => {
  it("rejects rows beyond a declared safe operation limit", () => {
    expect(() => withinLimit([1, 2], 1, "Fixture rows")).toThrow(
      "Fixture rows exceeds the safe dashboard operation limit.",
    );
  });

  it("preserves legacy newest-first truncation for media, settings, and resume versions", async () => {
    const media = Array.from({ length: 101 }, (_, index) => ({
      _id: `media_${index}`,
      storageProvider: "external" as const,
      storageKey: `/images/${index}.jpg`,
      publicUrl: `https://example.com/${index}.jpg`,
      altText: `Image ${index}`,
      usage: "case-study" as const,
      status: "draft" as const,
      updatedAt: index,
    }));
    const settings = Array.from({ length: 101 }, (_, index) => ({
      key: `setting_${index}`,
      environment: "preview" as const,
      value: `${index}`,
      classification: "policy-value" as const,
      updatedAt: index,
    }));
    const resumeVersions = Array.from({ length: 51 }, (_, index) => ({
      _id: `resume_${index}`,
      locale: "en" as const,
      version: `${index}`,
      pdfPath: `/resume/${index}.pdf`,
      isPublished: false,
      createdAt: index,
    }));
    const database = dashboardDatabase({
      mediaMetadata: media,
      siteSettings: settings,
      resumeVersions,
    });

    const result = await listForDashboardHandler(database as never);

    expect(result.media).toHaveLength(100);
    expect(result.settings).toHaveLength(100);
    expect(result.resumeVersions).toHaveLength(50);
    expect(result.media.at(0)?.id).toBe("media_0");
    expect(result.media.at(-1)?.id).toBe("media_99");
    expect(result.settings.at(0)?.key).toBe("setting_0");
    expect(result.settings.at(-1)?.key).toBe("setting_99");
    expect(result.resumeVersions.at(0)?.id).toBe("resume_0");
    expect(result.resumeVersions.at(-1)?.id).toBe("resume_49");
    expect(database.orders.get("mediaMetadata")).toHaveBeenCalledWith("desc");
    expect(database.orders.get("siteSettings")).toHaveBeenCalledWith("desc");
    expect(database.orders.get("resumeVersions")).toHaveBeenCalledWith("desc");
    expect(database.takes.get("mediaMetadata")).toHaveBeenCalledWith(100);
    expect(database.takes.get("siteSettings")).toHaveBeenCalledWith(100);
    expect(database.takes.get("resumeVersions")).toHaveBeenCalledWith(50);
  });

  it("uses the locale-and-published index and probes one row past the version mutation bound", async () => {
    const take = vi.fn(async () => []);
    const eq = vi.fn(() => ({ eq, take }));
    const withIndex = vi.fn(
      (_name: string, range: (query: { eq: typeof eq }) => unknown) => {
        range({ eq });
        return { take };
      },
    );
    const query = vi.fn(() => ({ withIndex }));
    const insert = vi.fn(async () => "resume_version_1");

    await createResumeVersionHandler({ db: { query, insert } } as never, {
      locale: "es",
      version: "2026-08",
      pdfPath: "/resume/es.pdf",
      isPublished: true,
    });

    expect(query).toHaveBeenCalledWith("resumeVersions");
    expect(withIndex).toHaveBeenCalledWith(
      "by_locale_and_published",
      expect.any(Function),
    );
    expect(eq).toHaveBeenCalledWith("locale", "es");
    expect(eq).toHaveBeenCalledWith("isPublished", true);
    expect(take).toHaveBeenCalledWith(51);
    expect(insert).toHaveBeenCalledWith(
      "resumeVersions",
      expect.objectContaining({
        locale: "es",
        isPublished: true,
      }),
    );
  });
});

describe("moved content capability behavior", () => {
  it("creates one project identity with both localized drafts and routes", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_788_000_000_000);
    const first = vi.fn(async () => null);
    const take = vi.fn(async () => []);
    const eq = vi.fn(() => ({ eq, first, take }));
    const withIndex = vi.fn(
      (_name: string, range: (query: { eq: typeof eq }) => unknown) => {
        range({ eq });
        return { first, take };
      },
    );
    const query = vi.fn(() => ({ withIndex }));
    const insert = vi.fn(async () => "created_id");

    const result = await createProjectHandler(
      { db: { query, insert } } as never,
      {
        contentKey: "new-project",
        status: "active-build",
        evidenceStatus: "sanitized",
        en: {
          localizedSlug: "new-project",
          title: "New project",
          summary: "Summary",
          seoDescription: "Description",
          ctaLabel: "Read",
          achievements: "Achievements",
          structureNotes: "Notes",
        },
        es: {
          localizedSlug: "nuevo-proyecto",
          title: "Nuevo proyecto",
          summary: "Resumen",
          seoDescription: "Descripcion",
          ctaLabel: "Leer",
          achievements: "Logros",
          structureNotes: "Notas",
        },
      },
    );

    expect(result).toEqual({
      contentId: "case-study:new-project",
      updatedAt: 1_788_000_000_000,
    });
    expect(insert).toHaveBeenCalledWith("caseStudyMetadata", {
      contentId: "case-study:new-project",
      status: "active-build",
      evidenceStatus: "sanitized",
      updatedAt: 1_788_000_000_000,
    });
    expect(insert).toHaveBeenCalledWith(
      "projectDrafts",
      expect.objectContaining({
        locale: "en",
        localizedSlug: "new-project",
        ctaHref: "/case-studies/new-project",
      }),
    );
    expect(insert).toHaveBeenCalledWith(
      "projectDrafts",
      expect.objectContaining({
        locale: "es",
        localizedSlug: "nuevo-proyecto",
        ctaHref: "/es/casos/nuevo-proyecto",
      }),
    );
  });

  it("checks media ownership before selection and leaves the database untouched on mismatch", async () => {
    const get = vi.fn(async () => ({
      _id: "media_1",
      contentId: "case-study:other",
    }));
    const query = vi.fn();
    const patch = vi.fn();

    await expect(
      selectMediaForPublicHandler({ db: { get, query, patch } } as never, {
        mediaId: "media_1" as never,
        contentId: "case-study:expected",
      }),
    ).rejects.toThrow("Selected media does not belong to this project.");
    expect(query).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it("selects owned media, clears siblings, and revives an archived selection as draft", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_788_000_000_100);
    const selected = {
      _id: "media_selected",
      contentId: "case-study:aohys",
      status: "archived",
    };
    const sibling = {
      _id: "media_sibling",
      contentId: "case-study:aohys",
      status: "published",
    };
    const get = vi.fn(async () => selected);
    const take = vi.fn(async () => [selected, sibling]);
    const eq = vi.fn(() => ({ take }));
    const withIndex = vi.fn(
      (_name: string, range: (query: { eq: typeof eq }) => unknown) => {
        range({ eq });
        return { take };
      },
    );
    const query = vi.fn(() => ({ withIndex }));
    const patch = vi.fn(async () => undefined);

    const result = await selectMediaForPublicHandler(
      { db: { get, query, patch } } as never,
      {
        mediaId: "media_selected" as never,
        contentId: "case-study:aohys",
      },
    );

    expect(result).toEqual({
      mediaId: "media_selected",
      updatedAt: 1_788_000_000_100,
    });
    expect(withIndex).toHaveBeenCalledWith(
      "by_content_id_and_usage",
      expect.any(Function),
    );
    expect(take).toHaveBeenCalledWith(101);
    expect(patch).toHaveBeenCalledWith("media_sibling", {
      selectedForPublic: false,
      selectedForPublicAt: undefined,
      updatedAt: 1_788_000_000_100,
    });
    expect(patch).toHaveBeenCalledWith("media_selected", {
      selectedForPublic: true,
      selectedForPublicAt: 1_788_000_000_100,
      status: "draft",
      updatedAt: 1_788_000_000_100,
    });
  });

  it("publishes the selected project media and demotes a displaced published sibling", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_788_000_000_200);
    const projectDrafts = [{ _id: "draft_en" }, { _id: "draft_es" }];
    const media = [
      {
        _id: "media_selected",
        contentId: "case-study:aohys",
        usage: "case-study" as const,
        status: "draft" as const,
        selectedForPublic: true,
        updatedAt: 10,
      },
      {
        _id: "media_displaced",
        contentId: "case-study:aohys",
        usage: "case-study" as const,
        status: "published" as const,
        updatedAt: 20,
      },
    ];
    const eq = vi.fn(() => ({ take: vi.fn() }));
    const query = vi.fn((table: string) => ({
      withIndex: vi.fn(
        (_name: string, range: (query: { eq: typeof eq }) => unknown) => {
          range({ eq });
          return {
            take: vi.fn(async () =>
              table === "projectDrafts" ? projectDrafts : media,
            ),
          };
        },
      ),
    }));
    const patch = vi.fn(async () => undefined);

    const result = await publishContentHandler(
      { db: { query, patch } } as never,
      {
        scope: "project",
        contentId: "case-study:aohys",
      },
    );

    expect(result).toEqual({
      publishedAt: 1_788_000_000_200,
      projectDraftsPublished: 2,
      resumeDraftsPublished: 0,
      mediaPublished: 1,
    });
    expect(patch).toHaveBeenCalledWith("draft_en", {
      publishedAt: 1_788_000_000_200,
    });
    expect(patch).toHaveBeenCalledWith("draft_es", {
      publishedAt: 1_788_000_000_200,
    });
    expect(patch).toHaveBeenCalledWith("media_selected", {
      status: "published",
      updatedAt: 1_788_000_000_200,
    });
    expect(patch).toHaveBeenCalledWith("media_displaced", {
      status: "draft",
      updatedAt: 1_788_000_000_200,
    });
  });
});
