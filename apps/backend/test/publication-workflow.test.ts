import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishDurablyHandler } from "../convex/model/publication.js";
import { completeAttempt, recordReceipt } from "../convex/publication.js";

type Row = Record<string, unknown> & { _id: string; _creationTime: number };

function publicationDatabase(seed: Record<string, Row[]> = {}) {
  const rows = new Map<string, Row[]>(Object.entries(seed));
  const writes: Array<{ operation: string; table: string; id?: string }> = [];
  let sequence = 0;
  const tableRows = (table: string) => rows.get(table) ?? [];
  const query = vi.fn((table: string) => {
    const filters: Array<[string, unknown]> = [];
    const chain = {
      withIndex: vi.fn((_name: string, range: (query: unknown) => unknown) => {
        const rangeQuery = {
          eq(field: string, value: unknown) {
            filters.push([field, value]);
            return rangeQuery;
          },
        };
        range(rangeQuery);
        return chain;
      }),
      order: vi.fn(() => chain),
      take: vi.fn(async (limit: number) =>
        matching(tableRows(table), filters).slice(0, limit),
      ),
      unique: vi.fn(async () => matching(tableRows(table), filters)[0] ?? null),
    };
    return chain;
  });
  const insert = vi.fn(
    async (table: string, value: Record<string, unknown>) => {
      sequence += 1;
      const id = `${table}_${sequence}`;
      const row = { ...value, _id: id, _creationTime: Date.now() } as Row;
      rows.set(table, [...tableRows(table), row]);
      writes.push({ operation: "insert", table, id });
      return id;
    },
  );
  const get = vi.fn(
    async (table: string, id: string) =>
      tableRows(table).find((row) => row._id === id) ?? null,
  );
  const patch = vi.fn(async (...args: unknown[]) => {
    const [tableOrId, idOrValue, maybeValue] = args;
    const explicitTable = args.length === 3 ? String(tableOrId) : undefined;
    const id = String(explicitTable ? idOrValue : tableOrId);
    const value = (explicitTable ? maybeValue : idOrValue) as Record<
      string,
      unknown
    >;
    const table =
      explicitTable ??
      [...rows.entries()].find(([, candidates]) =>
        candidates.some((row) => row._id === id),
      )?.[0];
    if (!table) throw new Error(`Unknown fixture row ${id}`);
    const next = tableRows(table).map((row) =>
      row._id === id ? ({ ...row, ...value } as Row) : row,
    );
    rows.set(table, next);
    writes.push({ operation: "patch", table, id });
  });
  const scheduler = {
    runAfter: vi.fn(async () => `scheduled_${++sequence}`),
  };
  return {
    ctx: { db: { query, insert, get, patch }, scheduler },
    rows,
    writes,
    scheduler,
  };
}

function matching(rows: Row[], filters: Array<[string, unknown]>) {
  return rows.filter((row) =>
    filters.every(([field, value]) => row[field] === value),
  );
}

function projectDraft(): Row {
  return {
    _id: "draft_en",
    _creationTime: 1,
    contentId: "case-study:aohys",
    locale: "en",
    title: "AOHYS",
    summary: "Summary",
    seoDescription: "SEO",
    ctaLabel: "Open",
    ctaHref: "/case-studies/aohys",
    achievements: "Outcome",
    structureNotes: "Structure",
    updatedAt: 10,
  };
}

describe("durable publication mutation", () => {
  beforeEach(() => vi.spyOn(Date, "now").mockReturnValue(1_788_000_001_000));

  it("publishes and schedules once, then dedupes before any repeat local write", async () => {
    const fixture = publicationDatabase({
      projectDrafts: [projectDraft()],
      mediaMetadata: [
        {
          _id: "media_1",
          _creationTime: 1,
          storageProvider: "external",
          storageKey: "hero",
          publicUrl: "https://example.com/hero.jpg",
          altText: "Hero",
          contentId: "case-study:aohys",
          usage: "case-study",
          status: "draft",
          selectedForPublic: true,
          selectedForPublicAt: 5,
          updatedAt: 10,
        },
      ],
      siteSettings: [],
    });
    const args = {
      scope: "project" as const,
      contentId: "case-study:aohys",
      targetEnvironment: "preview" as const,
      requestedBy: "admin_1",
      providerConfigured: true,
    };
    const first = await publishDurablyHandler(fixture.ctx as never, args);
    const writesAfterFirst = fixture.writes.length;
    const repeated = await publishDurablyHandler(fixture.ctx as never, args);

    expect(first.publication.state).toBe("release-requested");
    expect(first.projectDraftsPublished).toBe(1);
    expect(first.mediaPublished).toBe(1);
    expect(repeated).toEqual(first);
    expect(fixture.writes).toHaveLength(writesAfterFirst);
    expect(fixture.scheduler.runAfter).toHaveBeenCalledTimes(1);
    expect(fixture.rows.get("publicationRequests")).toHaveLength(1);
    expect(fixture.rows.get("publicationAttempts")).toHaveLength(1);
    const requestQueryCall = fixture.ctx.db.query.mock.calls.findIndex(
      ([table]) => table === "publicationRequests",
    );
    expect(requestQueryCall).toBeGreaterThanOrEqual(0);
    expect(
      fixture.ctx.db.query.mock.invocationCallOrder[requestQueryCall],
    ).toBeLessThan(
      fixture.ctx.db.patch.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it("reuses persisted local counts and creates only one later attempt after retryable failure", async () => {
    const fixture = publicationDatabase({
      projectDrafts: [projectDraft()],
      mediaMetadata: [],
      siteSettings: [],
    });
    const args = {
      scope: "project" as const,
      contentId: "case-study:aohys",
      targetEnvironment: "preview" as const,
      requestedBy: "admin_1",
      providerConfigured: true,
    };
    const first = await publishDurablyHandler(fixture.ctx as never, args);
    const request = fixture.rows.get("publicationRequests")?.[0];
    if (!request) throw new Error("missing request fixture");
    Object.assign(request, { state: "release-failed", retryable: true });
    const draftPatchesBeforeRetry = fixture.writes.filter(
      (write) => write.table === "projectDrafts",
    ).length;
    const retried = await publishDurablyHandler(fixture.ctx as never, args);

    expect(retried.publication.requestKey).toBe(first.publication.requestKey);
    expect(retried.publishedAt).toBe(first.publishedAt);
    expect(retried.projectDraftsPublished).toBe(first.projectDraftsPublished);
    expect(
      fixture.writes.filter((write) => write.table === "projectDrafts"),
    ).toHaveLength(draftPatchesBeforeRetry);
    expect(fixture.rows.get("publicationAttempts")).toHaveLength(2);
    expect(fixture.scheduler.runAfter).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid resume JSON before any write", async () => {
    const fixture = publicationDatabase({
      resumeDrafts: [
        {
          _id: "resume_en",
          _creationTime: 1,
          locale: "en",
          contentJson: "not-json",
          updatedAt: 10,
        },
      ],
      siteSettings: [],
    });
    await expect(
      publishDurablyHandler(fixture.ctx as never, {
        scope: "resume",
        locale: "en",
        targetEnvironment: "preview",
        requestedBy: "admin_1",
        providerConfigured: false,
      }),
    ).rejects.toThrow("contentJson is invalid");
    expect(fixture.writes).toEqual([]);
    expect(fixture.scheduler.runAfter).not.toHaveBeenCalled();
  });
});

describe("publication acknowledgement and receipts", () => {
  it("does not mark acknowledged work deployed until one matching post-smoke receipt", async () => {
    const key = "a".repeat(64);
    const attemptKey = `${key}.1`;
    const fixture = publicationDatabase({
      publicationRequests: [
        {
          _id: "request_1",
          _creationTime: 1,
          requestKey: key,
          targetEnvironment: "preview",
          state: "release-requested",
        },
      ],
      publicationAttempts: [
        {
          _id: "attempt_1",
          _creationTime: 1,
          requestId: "request_1",
          publicationAttemptId: attemptKey,
          state: "dispatching",
        },
      ],
      publicationReceipts: [],
    });
    await (completeAttempt as never as { _handler: Function })._handler(
      fixture.ctx,
      {
        attemptId: "attempt_1",
        result: { status: "acknowledged", runId: "123" },
      },
    );
    expect(fixture.rows.get("publicationRequests")?.[0]?.state).toBe(
      "release-acknowledged",
    );

    const receiptArgs = {
      publicationRequestKey: key,
      publicationAttemptId: attemptKey,
      targetEnvironment: "preview",
      runId: "123",
      runUrl: "https://github.com/AO-HyS/aohys.com/actions/runs/123",
      sha: "b".repeat(40),
      smokePassed: true,
    };
    const handler = (recordReceipt as never as { _handler: Function })._handler;
    await expect(handler(fixture.ctx, receiptArgs)).resolves.toMatchObject({
      state: "deployed",
      duplicate: false,
    });
    await expect(handler(fixture.ctx, receiptArgs)).resolves.toMatchObject({
      state: "deployed",
      duplicate: true,
    });
    await expect(
      handler(fixture.ctx, { ...receiptArgs, sha: "c".repeat(40) }),
    ).rejects.toThrow("Conflicting publication receipt");
    expect(fixture.rows.get("publicationReceipts")).toHaveLength(1);
    expect(fixture.rows.get("publicationRequests")?.[0]?.state).toBe(
      "deployed",
    );
  });

  it("marks provider ambiguity rollback-needed and never retryable", async () => {
    const fixture = publicationDatabase({
      publicationRequests: [
        {
          _id: "request_1",
          _creationTime: 1,
          requestKey: "a".repeat(64),
          targetEnvironment: "preview",
          state: "release-requested",
        },
      ],
      publicationAttempts: [
        {
          _id: "attempt_1",
          _creationTime: 1,
          requestId: "request_1",
          publicationAttemptId: `${"a".repeat(64)}.1`,
          state: "dispatching",
        },
      ],
    });
    await (completeAttempt as never as { _handler: Function })._handler(
      fixture.ctx,
      {
        attemptId: "attempt_1",
        result: {
          status: "ambiguous",
          retryable: false,
          code: "provider-response-lost",
          message: "Acknowledgement not received.",
        },
      },
    );
    expect(fixture.rows.get("publicationAttempts")?.[0]).toMatchObject({
      state: "ambiguous",
      retryable: false,
    });
    expect(fixture.rows.get("publicationRequests")?.[0]).toMatchObject({
      state: "rollback-needed",
      retryable: false,
    });
  });
});
