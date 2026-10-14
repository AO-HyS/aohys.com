import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server.js";
import type { Doc } from "./_generated/dataModel.js";
import {
  insertAuditEvent,
  operatorActor,
  operatorInputValidator,
  systemActor,
} from "./lib/audit.js";
import {
  publicationProviderStatusValidator,
  publicationWorkflowOutcomeValidator,
  releaseEnvironmentValidator,
  retryablePublicationProviderStatusValidator,
} from "./lib/validators.js";
import {
  publishDurablyArgs,
  publishDurablyHandler,
  publishDurablyReturns,
} from "./model/publication.js";
import { type ReleaseEnvironment } from "@aohys/core/domain";

const DISPATCH_LEASE_MS = 5 * 60 * 1000;

const claimResultValidator = v.union(
  v.object({ status: v.literal("skipped") }),
  v.object({
    status: v.literal("claimed"),
    attemptId: v.id("publicationAttempts"),
    publicationAttemptId: v.string(),
    publicationRequestKey: v.string(),
    targetEnvironment: releaseEnvironmentValidator,
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
    await insertAuditEvent(ctx, {
      actor: systemActor(attempt.publicationAttemptId),
      verb: "publication:claimAttempt",
      target: {
        requestKey: request.requestKey,
        publicationAttemptId: attempt.publicationAttemptId,
      },
      outcome: "committed",
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
    providerStatus: publicationProviderStatusValidator,
    statusCheckedAt: v.number(),
    expectedTarget: releaseEnvironmentValidator,
    operator: operatorInputValidator,
  },
  returns: v.object({
    state: v.union(v.literal("release-failed"), v.literal("rollback-needed")),
    retryable: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get("publicationAttempts", args.attemptId);
    if (!attempt) throw new Error("Publication attempt not found.");
    const boundRequest = await requireBoundTarget(
      ctx,
      attempt,
      args.expectedTarget,
    );
    if (attempt.state !== "dispatching" || !attempt.claimedAt) {
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
    const request = boundRequest;
    if (request.state !== "release-requested") {
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
    await insertAuditEvent(ctx, {
      actor: await operatorActor(ctx, args.operator),
      verb: "publication:reconcileDispatchingAfterStatusCheck",
      target: {
        requestKey: request.requestKey,
        publicationAttemptId: attempt.publicationAttemptId,
        providerStatus: args.providerStatus,
        result: requestState,
      },
      outcome: "committed",
    });
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
    await insertAuditEvent(ctx, {
      actor: systemActor(attempt.publicationAttemptId),
      verb: "publication:completeAttempt",
      target: {
        requestKey: request.requestKey,
        publicationAttemptId: attempt.publicationAttemptId,
        result: args.result.status,
      },
      outcome: "committed",
    });
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
    providerStatus: retryablePublicationProviderStatusValidator,
    statusCheckedAt: v.number(),
    expectedTarget: releaseEnvironmentValidator,
    operator: operatorInputValidator,
  },
  returns: v.id("_scheduled_functions"),
  handler: async (
    ctx,
    args,
  ): Promise<
    import("./_generated/dataModel.js").Id<"_scheduled_functions">
  > => {
    const attempt = await ctx.db.get("publicationAttempts", args.attemptId);
    if (!attempt) throw new Error("Publication attempt not found.");
    const request = await requireBoundTarget(ctx, attempt, args.expectedTarget);
    if (attempt.state !== "scheduled") {
      throw new Error("Only an unclaimed scheduled attempt can be recovered.");
    }
    // Rescheduling dispatches to GitHub again: it needs the owner's
    // authorization for this operation.
    if (!args.operator.authorizationRef?.trim()) {
      throw new Error(
        "Retrying a dispatch requires an authorization reference.",
      );
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
    await insertAuditEvent(ctx, {
      actor: await operatorActor(ctx, args.operator),
      verb: "publication:retryScheduledAfterStatusCheck",
      target: {
        requestKey: request.requestKey,
        publicationAttemptId: attempt.publicationAttemptId,
        providerStatus: args.providerStatus,
      },
      outcome: "committed",
    });
    return jobId;
  },
});

export const recordReceipt = internalMutation({
  args: {
    publicationRequestKey: v.string(),
    publicationAttemptId: v.string(),
    targetEnvironment: releaseEnvironmentValidator,
    gitRef: v.string(),
    runId: v.string(),
    runUrl: v.string(),
    sha: v.string(),
    smokePassed: v.literal(true),
    operator: operatorInputValidator,
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
    await insertAuditEvent(ctx, {
      actor: await operatorActor(ctx, args.operator),
      verb: "publication:recordReceipt",
      target: {
        requestKey: args.publicationRequestKey,
        publicationAttemptId: args.publicationAttemptId,
        runId: args.runId,
      },
      outcome: "committed",
    });
    await Promise.all([
      ctx.db.patch("publicationRequests", request._id, {
        state: "deployed",
        retryable: undefined,
        updatedAt: now,
      }),
      ctx.db.patch("publicationAttempts", attempt._id, {
        ...(attempt.state === "acknowledged"
          ? {}
          : { state: "acknowledged" as const, retryable: false }),
        providerRunId: args.runId,
        providerRunUrl: args.runUrl,
        providerGitRef: args.gitRef,
        providerReleaseSha: args.sha,
        updatedAt: now,
      }),
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
    targetEnvironment: releaseEnvironmentValidator,
    gitRef: v.string(),
    runId: v.string(),
    runUrl: v.string(),
    releaseSha: v.string(),
    outcome: publicationWorkflowOutcomeValidator,
    operator: operatorInputValidator,
  },
  returns: v.object({
    requestKey: v.string(),
    state: v.union(v.literal("release-failed"), v.literal("deployed")),
    duplicate: v.boolean(),
  }),
  handler: async (ctx, args) => {
    validateReceiptStrings({ ...args, sha: args.releaseSha });
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
      if (!receipt) {
        throw new Error(
          "Deployed publication outcome requires receipt evidence.",
        );
      }
      if (
        receipt.requestId !== request._id ||
        receipt.attemptId !== attempt._id ||
        receipt.requestKey !== args.publicationRequestKey ||
        receipt.publicationAttemptId !== args.publicationAttemptId ||
        receipt.targetEnvironment !== args.targetEnvironment ||
        receipt.gitRef !== args.gitRef ||
        receipt.runId !== args.runId ||
        receipt.runUrl !== args.runUrl ||
        receipt.sha !== args.releaseSha ||
        receipt.smokePassed !== true ||
        attempt.providerRunId !== args.runId ||
        attempt.providerRunUrl !== args.runUrl ||
        attempt.providerGitRef !== args.gitRef ||
        attempt.providerReleaseSha !== args.releaseSha ||
        attempt.workflowOutcome !== args.outcome
      ) {
        throw new Error(
          "Publication outcome conflicts with deployed receipt evidence.",
        );
      }
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
        attempt.providerRunUrl !== args.runUrl ||
        attempt.providerGitRef !== args.gitRef ||
        attempt.providerReleaseSha !== args.releaseSha
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
        providerGitRef: args.gitRef,
        providerReleaseSha: args.releaseSha,
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
    await insertAuditEvent(ctx, {
      actor: await operatorActor(ctx, args.operator),
      verb: "publication:reconcileWorkflowOutcome",
      target: {
        requestKey: request.requestKey,
        publicationAttemptId: attempt.publicationAttemptId,
        runId: args.runId,
        result: args.outcome,
      },
      outcome: "committed",
    });
    return {
      requestKey: request.requestKey,
      state: "release-failed" as const,
      duplicate: false,
    };
  },
});

function validateTargetGitRef(
  targetEnvironment: ReleaseEnvironment,
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

// Binds an operator transition to its target before any write: the attempt
// belongs to its request, and the operator's expected target, the request's
// target and this deployment's AOHYS_ENV all agree.
async function requireBoundTarget(
  ctx: MutationCtx,
  attempt: Doc<"publicationAttempts">,
  expectedTarget: ReleaseEnvironment,
) {
  const request = await ctx.db.get("publicationRequests", attempt.requestId);
  if (!request || request._id !== attempt.requestId) {
    throw new Error("Publication attempt does not belong to a request.");
  }
  if (
    request.targetEnvironment !== expectedTarget ||
    process.env.AOHYS_ENV !== expectedTarget
  ) {
    throw new Error(
      `Target mismatch: expected ${expectedTarget}, request targets ${request.targetEnvironment}, deployment is ${process.env.AOHYS_ENV ?? "unset"}.`,
    );
  }
  return request;
}

// Read-only view for the publication CLI: this deployment's environment and,
// for one request (by key or by one of its attempts), its attempts and
// receipts.
export const status = internalQuery({
  args: {
    requestKey: v.optional(v.string()),
    publicationAttemptId: v.optional(v.string()),
  },
  returns: v.object({
    deploymentEnvironment: v.union(v.string(), v.null()),
    request: v.union(
      v.null(),
      v.object({
        requestKey: v.string(),
        targetEnvironment: releaseEnvironmentValidator,
        state: v.string(),
        retryable: v.optional(v.boolean()),
        requestedBy: v.string(),
        updatedAt: v.number(),
      }),
    ),
    attempts: v.array(
      v.object({
        attemptId: v.id("publicationAttempts"),
        publicationAttemptId: v.string(),
        attemptNumber: v.number(),
        state: v.string(),
        retryable: v.optional(v.boolean()),
        claimedAt: v.optional(v.number()),
        failureCode: v.optional(v.string()),
        providerRunUrl: v.optional(v.string()),
        updatedAt: v.number(),
      }),
    ),
    receipts: v.array(
      v.object({
        publicationAttemptId: v.string(),
        runUrl: v.string(),
        sha: v.string(),
        receivedAt: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const deploymentEnvironment = process.env.AOHYS_ENV ?? null;
    let request: Doc<"publicationRequests"> | null = null;
    if (args.requestKey) {
      request = await ctx.db
        .query("publicationRequests")
        .withIndex("by_request_key", (query) =>
          query.eq("requestKey", args.requestKey ?? ""),
        )
        .unique();
    } else if (args.publicationAttemptId) {
      const attempt = await ctx.db
        .query("publicationAttempts")
        .withIndex("by_publication_attempt_id", (query) =>
          query.eq("publicationAttemptId", args.publicationAttemptId ?? ""),
        )
        .unique();
      request = attempt
        ? await ctx.db.get("publicationRequests", attempt.requestId)
        : null;
    }
    if (!request)
      return {
        deploymentEnvironment,
        request: null,
        attempts: [],
        receipts: [],
      };
    const requestId = request._id;
    const attempts = await ctx.db
      .query("publicationAttempts")
      .withIndex("by_request_id_and_attempt_number", (query) =>
        query.eq("requestId", requestId),
      )
      .take(50);
    const receipts = await ctx.db
      .query("publicationReceipts")
      .withIndex("by_request_id", (query) => query.eq("requestId", requestId))
      .take(50);
    return {
      deploymentEnvironment,
      request: {
        requestKey: request.requestKey,
        targetEnvironment: request.targetEnvironment,
        state: request.state,
        ...(request.retryable === undefined
          ? {}
          : { retryable: request.retryable }),
        requestedBy: request.requestedBy,
        updatedAt: request.updatedAt,
      },
      attempts: attempts.map((attempt) => ({
        attemptId: attempt._id,
        publicationAttemptId: attempt.publicationAttemptId,
        attemptNumber: attempt.attemptNumber,
        state: attempt.state,
        ...(attempt.retryable === undefined
          ? {}
          : { retryable: attempt.retryable }),
        ...(attempt.claimedAt === undefined
          ? {}
          : { claimedAt: attempt.claimedAt }),
        ...(attempt.failureCode ? { failureCode: attempt.failureCode } : {}),
        ...(attempt.providerRunUrl
          ? { providerRunUrl: attempt.providerRunUrl }
          : {}),
        updatedAt: attempt.updatedAt,
      })),
      receipts: receipts.map((receipt) => ({
        publicationAttemptId: receipt.publicationAttemptId,
        runUrl: receipt.runUrl,
        sha: receipt.sha,
        receivedAt: receipt.receivedAt,
      })),
    };
  },
});
