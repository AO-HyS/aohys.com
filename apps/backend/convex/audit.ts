import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server.js";
import { actorOf, auditEventArgs, insertAuditEvent } from "./lib/audit.js";
import { auditOutcomeValidator } from "./lib/validators.js";

// Audit writes for actions, which cannot write directly. The actor is resolved
// on the server by the builder or the caller; clients never reach these.

export const record = internalMutation({
  args: auditEventArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    await insertAuditEvent(ctx, args);
    return null;
  },
});

// Appends the result of an external effect to its attempted event, copying the
// actor and verb from it. The target comes from the call's arguments, which the
// builder only sees after the handler.
export const recordOutcome = internalMutation({
  args: {
    correlationId: v.string(),
    outcome: auditOutcomeValidator,
    target: v.record(v.string(), v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.outcome === "committed" || args.outcome === "attempted")
      throw new ConvexError(
        "An effect outcome is succeeded, failed or unknown.",
      );
    const attempted = await ctx.db
      .query("auditEvents")
      .withIndex("by_correlation_id", (query) =>
        query.eq("correlationId", args.correlationId),
      )
      .first();
    if (!attempted || attempted.outcome !== "attempted")
      throw new ConvexError("No attempted event for this correlation id.");
    await insertAuditEvent(ctx, {
      actor: actorOf(attempted),
      verb: attempted.verb,
      target: args.target,
      outcome: args.outcome,
      correlationId: args.correlationId,
    });
    return null;
  },
});
