import { describe, expect, it, vi } from "vitest";
import { listForDashboardHandler } from "../convex/model/content/overview.js";
import { createResumeVersionHandler } from "../convex/model/content/resume.js";
import { withinLimit } from "../convex/model/content/shared.js";

function dashboardDatabase(rowsByTable: Record<string, unknown[]>) {
  const takes = new Map<string, ReturnType<typeof vi.fn>>();
  const query = vi.fn((table: string) => {
    const take = vi.fn(async () => rowsByTable[table] ?? []);
    takes.set(table, take);
    return {
      take,
      order: vi.fn(() => ({ take })),
    };
  });
  return { db: { query }, query, takes };
}

describe("content capability bounds and indexes", () => {
  it("rejects rows beyond a declared safe operation limit", () => {
    expect(() => withinLimit([1, 2], 1, "Fixture rows")).toThrow(
      "Fixture rows exceeds the safe dashboard operation limit.",
    );
  });

  it.each([
    ["mediaMetadata", 101, "Media metadata"],
    ["siteSettings", 101, "Site settings"],
    ["resumeVersions", 51, "Resume versions"],
  ] as const)(
    "detects %s overflow instead of silently truncating",
    async (table, count, label) => {
      const rows = Array.from({ length: count }, (_, index) => ({
        _id: `${table}_${index}`,
      }));
      const database = dashboardDatabase({ [table]: rows });

      await expect(listForDashboardHandler(database as never)).rejects.toThrow(
        `${label} exceeds the safe dashboard operation limit.`,
      );
      expect(database.takes.get(table)).toHaveBeenCalledWith(count);
    },
  );

  it("uses the locale-and-published index and probes one row past the version bound", async () => {
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
