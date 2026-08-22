import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import { internalMutation } from "./_generated/server.js";
import {
  publicationTargetValidator,
  publishDurablyArgs,
  publishDurablyHandler,
  publishDurablyReturns,
} from "./model/publication.js";

const DISPATCH_LEASE_MS = 5 * 60 * 1000;

const claimResultValidator = v.union(
  v.object({ status: v.literal("skipped") }),
  v.object({
    status: v.literal("claimed"),
    attemptId: v.id("publicationAttempts"),
    publicationAttemptId: v.string(),
    publicationRequestKey: v.string(),
    targetEnvironment: publicationTargetValidator,
  }),
);

export const publishFromDashboard = internalMutation({
  args: publishDurablyArgs,
  returns: publishDurablyReturns,
  handler: publishDurablyHandler,
});

export const claimAttempt = internalMutation({
  args: { attemptId: v.id("publicationAttempts") },
  returns: claimResultValidator,
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get("publicationAttempts", args.attemptId);
    if (!attempt || attempt.state !== "scheduled")
      return { status: "skipped" as const };
    const request = await ctx.db.get("publicationRequests", attempt.requestId);
    if (!request || request.state !== "release-requested") {
      return { status: "skipped" as const };
    }
    const now = Date.now();
    await ctx.db.patch("publicationAttempts", attempt._id, {
      state: "dispatching",
      claimedAt: now,
      updatedAt: now,
    });
    return {
      status: "claimed" as const,
      attemptId: attempt._id,
      publicationAttemptId: attempt.publicationAttemptId,
      publicationRequestKey: request.requestKey,
      targetEnvironment: request.targetEnvironment,
    };
  },
});

export const reconcileDispatchingAfterStatusCheck = internalMutation({
  args: {
    attemptId: v.id("publicationAttempts"),
    providerStatus: v.union(v.literal("not-found"), v.literal("unknown")),
    statusCheckedAt: v.number(),
  },
  returns: v.object({
    state: v.union(v.literal("release-failed"), v.literal("rollback-needed")),
    retryable: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get("publicationAttempts", args.attemptId);
    if (!attempt || attempt.state !== "dispatching" || !attempt.claimedAt) {
      throw new Error("Only a claimed dispatching attempt can be reconciled.");
    }
    const now = Date.now();
    if (
      args.statusCheckedAt > now ||
      args.statusCheckedAt < attempt.claimedAt + DISPATCH_LEASE_MS ||
      now < attempt.claimedAt + DISPATCH_LEASE_MS
    ) {
      throw new Error(
        "Provider status check is outside the stale claim window.",
      );
    }
    const request = await ctx.db.get("publicationRequests", attempt.requestId);
    if (!request || request.state !== "release-requested") {
      throw new Error("Publication request is not awaiting dispatch evidence.");
    }
    const retryable = args.providerStatus === "not-found";
    const requestState: "release-failed" | "rollback-needed" = retryable
      ? "release-failed"
      : "rollback-needed";
    await Promise.all([
      ctx.db.patch("publicationAttempts", attempt._id, {
        state: retryable ? "failed" : "ambiguous",
        retryable,
        failureCode: retryable
          ? "provider-run-not-found"
          : "provider-status-unknown",
        failureMessage: retryable
          ? "Provider status check confirmed that no workflow run exists."
          : "Provider status check could not prove whether a workflow run exists.",
        updatedAt: now,
      }),
      ctx.db.patch("publicationRequests", request._id, {
        state: requestState,
        retryable,
        updatedAt: now,
      }),
    ]);
    return { state: requestState, retryable };
  },
});

export const completeAttempt = internalMutation({
  args: {
    attemptId: v.id("publicationAttempts"),
    result: v.union(
      v.object({
        status: v.literal("acknowledged"),
        runId: v.optional(v.string()),
        runUrl: v.optional(v.string()),
      }),
      v.object({
        status: v.literal("failed"),
        retryable: v.boolean(),
        code: v.string(),
        message: v.string(),
      }),
      v.object({
        status: v.literal("ambiguous"),
        retryable: v.literal(false),
        code: v.string(),
        message: v.string(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get("publicationAttempts", args.attemptId);
    if (!attempt || attempt.state !== "dispatching") return null;
    const request = await ctx.db.get("publicationRequests", attempt.requestId);
    if (!request) throw new Error("Publication request is missing.");
    if (request.state === "deployed") return null;
    const receipt = await ctx.db
      .query("publicationReceipts")
      .withIndex("by_publication_attempt_id", (query) =>
        query.eq("publicationAttemptId", attempt.publicationAttemptId),
      )
      .unique();
    if (receipt) return null;
    const now = Date.now();
    if (args.result.status === "acknowledged") {
      await Promise.all([
        ctx.db.patch("publicationAttempts", attempt._id, {
          state: "acknowledged",
          retryable: false,
          ...(args.result.runId ? { providerRunId: args.result.runId } : {}),
          ...(args.result.runUrl ? { providerRunUrl: args.result.runUrl } : {}),
          updatedAt: now,
        }),
        ctx.db.patch("publicationRequests", request._id, {
          state: "release-acknowledged",
          retryable: undefined,
          updatedAt: now,
        }),
      ]);
      return null;
    }
    const ambiguous = args.result.status === "ambiguous";
    await Promise.all([
      ctx.db.patch("publicationAttempts", attempt._id, {
        state: ambiguous ? "ambiguous" : "failed",
        retryable: args.result.retryable,
        failureCode: args.result.code,
        failureMessage: args.result.message,
        updatedAt: now,
      }),
      ctx.db.patch("publicationRequests", request._id, {
        state: ambiguous ? "rollback-needed" : "release-failed",
        retryable: args.result.retryable,
        updatedAt: now,
      }),
    ]);
    return null;
  },
});

export const retryScheduledAfterStatusCheck = internalMutation({
  args: {
    attemptId: v.id("publicationAttempts"),
    providerStatus: v.literal("not-found"),
    statusCheckedAt: v.number(),
  },
  returns: v.id("_scheduled_functions"),
  handler: async (
    ctx,
    args,
  ): Promise<
    import("./_generated/dataModel.js").Id<"_scheduled_functions">
  > => {
    const attempt = await ctx.db.get("publicationAttempts", args.attemptId);
    if (!attempt || attempt.state !== "scheduled") {
      throw new Error("Only an unclaimed scheduled attempt can be recovered.");
    }
    if (
      args.statusCheckedAt > Date.now() ||
      args.statusCheckedAt < attempt.createdAt
    ) {
      throw new Error("Provider status check timestamp is invalid.");
    }
    const jobId: import("./_generated/dataModel.js").Id<"_scheduled_functions"> =
      await ctx.scheduler.runAfter(0, internal.publicationActions.dispatch, {
        attemptId: attempt._id,
      });
    await ctx.db.patch("publicationAttempts", attempt._id, {
      schedulerJobId: jobId,
      updatedAt: Date.now(),
    });
    return jobId;
  },
});

export const recordReceipt = internalMutation({
  args: {
    publicationRequestKey: v.string(),
    publicationAttemptId: v.string(),
    targetEnvironment: publicationTargetValidator,
    gitRef: v.string(),
    runId: v.string(),
    runUrl: v.string(),
    sha: v.string(),
    smokePassed: v.literal(true),
  },
  returns: v.object({
    requestKey: v.string(),
    state: v.literal("deployed"),
    duplicate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    validateReceiptStrings(args);
    validateTargetGitRef(args.targetEnvironment, args.gitRef);
    const request = await ctx.db
      .query("publicationRequests")
      .withIndex("by_request_key", (query) =>
        query.eq("requestKey", args.publicationRequestKey),
      )
      .unique();
    if (!request || request.targetEnvironment !== args.targetEnvironment) {
      throw new Error("Publication receipt request correlation is invalid.");
    }
    const attempt = await ctx.db
      .query("publicationAttempts")
      .withIndex("by_publication_attempt_id", (query) =>
        query.eq("publicationAttemptId", args.publicationAttemptId),
      )
      .unique();
    if (!attempt || attempt.requestId !== request._id) {
      throw new Error("Publication receipt attempt correlation is invalid.");
    }
    if (
      attempt.state !== "acknowledged" &&
      attempt.state !== "dispatching" &&
      attempt.state !== "ambiguous"
    ) {
      throw new Error(
        "Only an accepted or provider-ambiguous publication attempt accepts a receipt.",
      );
    }
    if (attempt.providerRunId && attempt.providerRunId !== args.runId) {
      throw new Error("Publication receipt run id correlation is invalid.");
    }
    if (attempt.providerRunUrl && attempt.providerRunUrl !== args.runUrl) {
      throw new Error("Publication receipt run URL correlation is invalid.");
    }
    const existing = await ctx.db
      .query("publicationReceipts")
      .withIndex("by_publication_attempt_id", (query) =>
        query.eq("publicationAttemptId", args.publicationAttemptId),
      )
      .unique();
    if (existing) {
      if (
        existing.requestKey !== args.publicationRequestKey ||
        existing.targetEnvironment !== args.targetEnvironment ||
        existing.gitRef !== args.gitRef ||
        existing.runId !== args.runId ||
        existing.runUrl !== args.runUrl ||
        existing.sha !== args.sha ||
        existing.smokePassed !== args.smokePassed
      ) {
        throw new Error("Conflicting publication receipt rejected.");
      }
      return {
        requestKey: request.requestKey,
        state: "deployed" as const,
        duplicate: true,
      };
    }
    const now = Date.now();
    await ctx.db.insert("publicationReceipts", {
      requestId: request._id,
      attemptId: attempt._id,
      publicationAttemptId: args.publicationAttemptId,
      requestKey: args.publicationRequestKey,
      targetEnvironment: args.targetEnvironment,
      gitRef: args.gitRef,
      runId: args.runId,
      runUrl: args.runUrl,
      sha: args.sha,
      smokePassed: true,
      receivedAt: now,
    });
    await Promise.all([
      ctx.db.patch("publicationRequests", request._id, {
        state: "deployed",
        retryable: undefined,
        updatedAt: now,
      }),
      ...(attempt.state === "acknowledged"
        ? []
        : [
            ctx.db.patch("publicationAttempts", attempt._id, {
              state: "acknowledged",
              retryable: false,
              providerRunId: args.runId,
              providerRunUrl: args.runUrl,
              updatedAt: now,
            }),
          ]),
    ]);
    return {
      requestKey: request.requestKey,
      state: "deployed" as const,
      duplicate: false,
    };
  },
});

export const reconcileWorkflowOutcome = internalMutation({
  args: {
    publicationRequestKey: v.string(),
    publicationAttemptId: v.string(),
    targetEnvironment: publicationTargetValidator,
    gitRef: v.string(),
    runId: v.string(),
    runUrl: v.string(),
    outcome: v.union(v.literal("failure"), v.literal("cancelled")),
  },
  returns: v.object({
    requestKey: v.string(),
    state: v.union(v.literal("release-failed"), v.literal("deployed")),
    duplicate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    validateReceiptStrings({ ...args, sha: "a".repeat(40) });
    validateTargetGitRef(args.targetEnvironment, args.gitRef);
    const request = await ctx.db
      .query("publicationRequests")
      .withIndex("by_request_key", (query) =>
        query.eq("requestKey", args.publicationRequestKey),
      )
      .unique();
    if (!request || request.targetEnvironment !== args.targetEnvironment) {
      throw new Error("Publication outcome request correlation is invalid.");
    }
    const attempt = await ctx.db
      .query("publicationAttempts")
      .withIndex("by_publication_attempt_id", (query) =>
        query.eq("publicationAttemptId", args.publicationAttemptId),
      )
      .unique();
    if (!attempt || attempt.requestId !== request._id) {
      throw new Error("Publication outcome attempt correlation is invalid.");
    }
    const receipt = await ctx.db
      .query("publicationReceipts")
      .withIndex("by_publication_attempt_id", (query) =>
        query.eq("publicationAttemptId", args.publicationAttemptId),
      )
      .unique();
    if (request.state === "deployed" || receipt) {
      return {
        requestKey: request.requestKey,
        state: "deployed" as const,
        duplicate: true,
      };
    }
    if (attempt.workflowOutcome) {
      if (
        attempt.workflowOutcome !== args.outcome ||
        attempt.providerRunId !== args.runId ||
        attempt.providerRunUrl !== args.runUrl
      ) {
        throw new Error("Conflicting publication workflow outcome rejected.");
      }
      return {
        requestKey: request.requestKey,
        state: "release-failed" as const,
        duplicate: true,
      };
    }
    if (
      attempt.state !== "acknowledged" &&
      attempt.state !== "dispatching" &&
      attempt.state !== "ambiguous"
    ) {
      throw new Error(
        "Only an accepted publication attempt accepts a workflow outcome.",
      );
    }
    if (attempt.providerRunId && attempt.providerRunId !== args.runId) {
      throw new Error("Publication outcome run id correlation is invalid.");
    }
    if (attempt.providerRunUrl && attempt.providerRunUrl !== args.runUrl) {
      throw new Error("Publication outcome run URL correlation is invalid.");
    }
    const now = Date.now();
    await Promise.all([
      ctx.db.patch("publicationAttempts", attempt._id, {
        state: "failed",
        retryable: true,
        providerRunId: args.runId,
        providerRunUrl: args.runUrl,
        workflowOutcome: args.outcome,
        workflowOutcomeAt: now,
        failureCode: `workflow-${args.outcome}`,
        failureMessage:
          "Release workflow reported a terminal unsuccessful outcome.",
        updatedAt: now,
      }),
      ctx.db.patch("publicationRequests", request._id, {
        state: "release-failed",
        retryable: true,
        updatedAt: now,
      }),
    ]);
    return {
      requestKey: request.requestKey,
      state: "release-failed" as const,
      duplicate: false,
    };
  },
});

function validateTargetGitRef(
  targetEnvironment: "preview" | "production",
  gitRef: string,
) {
  const expected =
    targetEnvironment === "production"
      ? "refs/heads/main"
      : "refs/heads/develop";
  if (gitRef !== expected) {
    throw new Error("Publication target and Git ref correlation is invalid.");
  }
}

function validateReceiptStrings(args: {
  publicationRequestKey: string;
  publicationAttemptId: string;
  runId: string;
  runUrl: string;
  sha: string;
}) {
  if (!/^[a-f0-9]{64}$/.test(args.publicationRequestKey)) {
    throw new Error("Publication request key is invalid.");
  }
  if (!args.publicationAttemptId.startsWith(`${args.publicationRequestKey}.`)) {
    throw new Error("Publication attempt key is invalid.");
  }
  if (!/^\d+$/.test(args.runId))
    throw new Error("Publication run id is invalid.");
  if (
    !/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+$/.test(
      args.runUrl,
    ) ||
    !args.runUrl.endsWith(`/actions/runs/${args.runId}`)
  ) {
    throw new Error("Publication run URL is invalid.");
  }
  if (!/^[a-f0-9]{40,64}$/i.test(args.sha)) {
    throw new Error("Publication release SHA is invalid.");
  }
}
