import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishDurablyHandler } from "../convex/model/publication.js";
import {
  claimAttempt,
  completeAttempt,
  reconcileDispatchingAfterStatusCheck,
  reconcileWorkflowOutcome,
  recordReceipt,
} from "../convex/publication.js";

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

/** Models Convex's serialized/OCC retry boundary; this is not a live service test. */
class AtomicMutationHarness {
  private tail = Promise.resolve();

  run<T>(mutation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(mutation);
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
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

  it("models concurrent Convex serialization as one logical request and attempt", async () => {
    const fixture = publicationDatabase({
      projectDrafts: [projectDraft()],
      mediaMetadata: [],
      siteSettings: [],
    });
    const harness = new AtomicMutationHarness();
    const args = {
      scope: "project" as const,
      contentId: "case-study:aohys",
      targetEnvironment: "preview" as const,
      requestedBy: "admin_1",
      providerConfigured: true,
    };

    const [first, second] = await Promise.all([
      harness.run(() => publishDurablyHandler(fixture.ctx as never, args)),
      harness.run(() => publishDurablyHandler(fixture.ctx as never, args)),
    ]);

    expect(second).toEqual(first);
    expect(fixture.rows.get("publicationRequests")).toHaveLength(1);
    expect(fixture.rows.get("publicationAttempts")).toHaveLength(1);
    expect(fixture.scheduler.runAfter).toHaveBeenCalledTimes(1);
    expect(
      fixture.writes.filter((write) => write.table === "projectDrafts"),
    ).toHaveLength(1);
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
      gitRef: "refs/heads/develop",
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

  it("rejects a receipt whose target is bound to the wrong branch", async () => {
    const key = "a".repeat(64);
    const fixture = publicationDatabase({
      publicationRequests: [
        {
          _id: "request_1",
          _creationTime: 1,
          requestKey: key,
          targetEnvironment: "production",
          state: "release-acknowledged",
        },
      ],
      publicationAttempts: [
        {
          _id: "attempt_1",
          _creationTime: 1,
          requestId: "request_1",
          publicationAttemptId: `${key}.1`,
          state: "acknowledged",
        },
      ],
    });

    await expect(
      (recordReceipt as never as { _handler: Function })._handler(fixture.ctx, {
        publicationRequestKey: key,
        publicationAttemptId: `${key}.1`,
        targetEnvironment: "production",
        gitRef: "refs/heads/develop",
        runId: "123",
        runUrl: "https://github.com/AO-HyS/aohys.com/actions/runs/123",
        sha: "b".repeat(40),
        smokePassed: true,
      }),
    ).rejects.toThrow("target and Git ref correlation");
    expect(fixture.rows.get("publicationReceipts") ?? []).toHaveLength(0);
  });

  it("lets a correlated post-smoke receipt resolve a response-lost ambiguity", async () => {
    const key = "a".repeat(64);
    const fixture = publicationDatabase({
      publicationRequests: [
        {
          _id: "request_1",
          _creationTime: 1,
          requestKey: key,
          targetEnvironment: "preview",
          state: "rollback-needed",
        },
      ],
      publicationAttempts: [
        {
          _id: "attempt_1",
          _creationTime: 1,
          requestId: "request_1",
          publicationAttemptId: `${key}.1`,
          state: "ambiguous",
        },
      ],
    });

    await expect(
      (recordReceipt as never as { _handler: Function })._handler(fixture.ctx, {
        publicationRequestKey: key,
        publicationAttemptId: `${key}.1`,
        targetEnvironment: "preview",
        gitRef: "refs/heads/develop",
        runId: "123",
        runUrl: "https://github.com/AO-HyS/aohys.com/actions/runs/123",
        sha: "b".repeat(40),
        smokePassed: true,
      }),
    ).resolves.toMatchObject({ state: "deployed" });
    expect(fixture.rows.get("publicationRequests")?.[0]?.state).toBe(
      "deployed",
    );
    expect(fixture.rows.get("publicationAttempts")?.[0]).toMatchObject({
      state: "acknowledged",
      providerRunId: "123",
    });
  });

  it("no-ops only an exactly correlated late outcome after a receipt", async () => {
    const key = "a".repeat(64);
    const attemptKey = `${key}.1`;
    const fixture = publicationDatabase({
      publicationRequests: [
        {
          _id: "request_1",
          _creationTime: 1,
          requestKey: key,
          targetEnvironment: "preview",
          state: "deployed",
        },
      ],
      publicationAttempts: [
        {
          _id: "attempt_1",
          _creationTime: 1,
          requestId: "request_1",
          publicationAttemptId: attemptKey,
          state: "acknowledged",
          providerRunId: "123",
          providerRunUrl:
            "https://github.com/AO-HyS/aohys.com/actions/runs/123",
          providerGitRef: "refs/heads/develop",
          providerReleaseSha: "b".repeat(40),
          workflowOutcome: "failure",
        },
      ],
      publicationReceipts: [
        {
          _id: "receipt_1",
          _creationTime: 1,
          requestId: "request_1",
          attemptId: "attempt_1",
          publicationAttemptId: attemptKey,
          requestKey: key,
          targetEnvironment: "preview",
          gitRef: "refs/heads/develop",
          runId: "123",
          runUrl: "https://github.com/AO-HyS/aohys.com/actions/runs/123",
          sha: "b".repeat(40),
          smokePassed: true,
        },
      ],
    });
    const correlation = {
      publicationRequestKey: key,
      publicationAttemptId: attemptKey,
      targetEnvironment: "preview",
      gitRef: "refs/heads/develop",
      runId: "123",
      runUrl: "https://github.com/AO-HyS/aohys.com/actions/runs/123",
      releaseSha: "b".repeat(40),
      outcome: "failure",
    };
    const outcomeHandler = (
      reconcileWorkflowOutcome as never as { _handler: Function }
    )._handler;

    await expect(
      outcomeHandler(fixture.ctx, correlation),
    ).resolves.toMatchObject({ state: "deployed", duplicate: true });
    await expect(
      outcomeHandler(fixture.ctx, { ...correlation, outcome: "cancelled" }),
    ).rejects.toThrow("conflicts with deployed receipt evidence");
    await expect(
      outcomeHandler(fixture.ctx, {
        ...correlation,
        runId: "456",
        runUrl: "https://github.com/AO-HyS/aohys.com/actions/runs/456",
      }),
    ).rejects.toThrow("conflicts with deployed receipt evidence");
    await expect(
      outcomeHandler(fixture.ctx, {
        ...correlation,
        runUrl: "https://github.com/Other/repository/actions/runs/123",
      }),
    ).rejects.toThrow("conflicts with deployed receipt evidence");
    await expect(
      outcomeHandler(fixture.ctx, {
        ...correlation,
        releaseSha: "c".repeat(40),
      }),
    ).rejects.toThrow("conflicts with deployed receipt evidence");
    await (completeAttempt as never as { _handler: Function })._handler(
      fixture.ctx,
      {
        attemptId: "attempt_1",
        result: { status: "acknowledged", runId: "123" },
      },
    );

    expect(fixture.writes).toEqual([]);
    expect(fixture.rows.get("publicationRequests")?.[0]?.state).toBe(
      "deployed",
    );
    expect(fixture.rows.get("publicationAttempts")?.[0]?.state).toBe(
      "acknowledged",
    );
  });

  it("does not let a late dispatcher completion downgrade a deployed request", async () => {
    const key = "a".repeat(64);
    const fixture = publicationDatabase({
      publicationRequests: [
        {
          _id: "request_1",
          _creationTime: 1,
          requestKey: key,
          targetEnvironment: "preview",
          state: "deployed",
        },
      ],
      publicationAttempts: [
        {
          _id: "attempt_1",
          _creationTime: 1,
          requestId: "request_1",
          publicationAttemptId: `${key}.1`,
          state: "dispatching",
        },
      ],
      publicationReceipts: [
        {
          _id: "receipt_1",
          _creationTime: 1,
          publicationAttemptId: `${key}.1`,
        },
      ],
    });

    await (completeAttempt as never as { _handler: Function })._handler(
      fixture.ctx,
      {
        attemptId: "attempt_1",
        result: {
          status: "failed",
          retryable: true,
          code: "late-provider-result",
          message: "Late result.",
        },
      },
    );

    expect(fixture.writes).toEqual([]);
    expect(fixture.rows.get("publicationRequests")?.[0]?.state).toBe(
      "deployed",
    );
    expect(fixture.rows.get("publicationAttempts")?.[0]?.state).toBe(
      "dispatching",
    );
  });

  it("reconciles an accepted workflow failure idempotently", async () => {
    const key = "a".repeat(64);
    const fixture = publicationDatabase({
      publicationRequests: [
        {
          _id: "request_1",
          _creationTime: 1,
          requestKey: key,
          targetEnvironment: "preview",
          state: "release-acknowledged",
        },
      ],
      publicationAttempts: [
        {
          _id: "attempt_1",
          _creationTime: 1,
          requestId: "request_1",
          publicationAttemptId: `${key}.1`,
          state: "acknowledged",
          providerRunId: "123",
        },
      ],
    });
    const args = {
      publicationRequestKey: key,
      publicationAttemptId: `${key}.1`,
      targetEnvironment: "preview",
      gitRef: "refs/heads/develop",
      runId: "123",
      runUrl: "https://github.com/AO-HyS/aohys.com/actions/runs/123",
      releaseSha: "b".repeat(40),
      outcome: "failure",
    };
    const handler = (
      reconcileWorkflowOutcome as never as {
        _handler: Function;
      }
    )._handler;

    await expect(handler(fixture.ctx, args)).resolves.toMatchObject({
      state: "release-failed",
      duplicate: false,
    });
    await expect(handler(fixture.ctx, args)).resolves.toMatchObject({
      duplicate: true,
    });
    await expect(
      handler(fixture.ctx, { ...args, outcome: "cancelled" }),
    ).rejects.toThrow("Conflicting publication workflow outcome");
    expect(fixture.rows.get("publicationRequests")?.[0]).toMatchObject({
      state: "release-failed",
      retryable: true,
    });
  });
});

describe("publication claim recovery", () => {
  it("records the claim lease and only one serialized claimant succeeds", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_788_000_000_000);
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
          state: "scheduled",
        },
      ],
    });
    const handler = (
      claimAttempt as never as {
        _handler: (
          ctx: unknown,
          args: { attemptId: string },
        ) => Promise<{ status: "claimed" | "skipped" }>;
      }
    )._handler;
    const harness = new AtomicMutationHarness();
    const [first, second] = await Promise.all([
      harness.run(() => handler(fixture.ctx, { attemptId: "attempt_1" })),
      harness.run(() => handler(fixture.ctx, { attemptId: "attempt_1" })),
    ]);

    expect(first.status).toBe("claimed");
    expect(second.status).toBe("skipped");
    expect(fixture.rows.get("publicationAttempts")?.[0]).toMatchObject({
      state: "dispatching",
      claimedAt: 1_788_000_000_000,
    });
  });

  it.each([
    ["not-found", "release-failed", true],
    ["unknown", "rollback-needed", false],
  ] as const)(
    "reconciles a stale dispatching claim with %s evidence",
    async (providerStatus, state, retryable) => {
      vi.spyOn(Date, "now").mockReturnValue(1_788_000_600_000);
      const fixture = publicationDatabase({
        publicationRequests: [
          {
            _id: "request_1",
            _creationTime: 1,
            state: "release-requested",
          },
        ],
        publicationAttempts: [
          {
            _id: "attempt_1",
            _creationTime: 1,
            requestId: "request_1",
            state: "dispatching",
            claimedAt: 1_788_000_000_000,
          },
        ],
      });
      const handler = (
        reconcileDispatchingAfterStatusCheck as never as {
          _handler: Function;
        }
      )._handler;

      await expect(
        handler(fixture.ctx, {
          attemptId: "attempt_1",
          providerStatus,
          statusCheckedAt: 1_788_000_600_000,
        }),
      ).resolves.toEqual({ state, retryable });
      expect(fixture.rows.get("publicationRequests")?.[0]).toMatchObject({
        state,
        retryable,
      });
    },
  );

  it("rejects status evidence collected before the dispatch lease expires", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_788_000_100_000);
    const fixture = publicationDatabase({
      publicationAttempts: [
        {
          _id: "attempt_1",
          _creationTime: 1,
          requestId: "request_1",
          state: "dispatching",
          claimedAt: 1_788_000_000_000,
        },
      ],
    });

    await expect(
      (
        reconcileDispatchingAfterStatusCheck as never as {
          _handler: Function;
        }
      )._handler(fixture.ctx, {
        attemptId: "attempt_1",
        providerStatus: "not-found",
        statusCheckedAt: 1_788_000_100_000,
      }),
    ).rejects.toThrow("stale claim window");
  });
});
