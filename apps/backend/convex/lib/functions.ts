import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { internal } from "../_generated/api.js";
import { action, mutation, query } from "../_generated/server.js";
import { requireAdmin } from "../auth.js";
import { auditTarget, insertAuditEvent, sessionActor } from "./audit.js";

// The only public Convex builders. Each resolves the dashboard operator from
// the Better Auth session through requireAdmin before the handler runs and
// exposes it as ctx.admin; a client-supplied actor is never authority.
// Mutations append a committed audit event in the same transaction as their
// write; actions append attempted before the handler and succeeded after it,
// and expose ctx.auditCorrelationId so a handler can record failed or unknown.
// architecture:fitness (public-function-guard) rejects any other public
// builder and checks that requireAdmin runs first.

export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const admin = await requireAdmin(ctx);
    return { admin };
  }),
);

export const adminMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const admin = await requireAdmin(ctx);
    return {
      ctx: { admin },
      args: {},
      onSuccess: async ({ args }) => {
        const { name } = await ctx.meta.getFunctionMetadata();
        await insertAuditEvent(ctx, {
          actor: sessionActor(admin),
          verb: name,
          target: auditTarget(args),
          outcome: "committed",
        });
      },
    };
  },
});

export const adminAction = customAction(action, {
  args: {},
  input: async (ctx) => {
    const admin = await requireAdmin(ctx);
    const { name } = await ctx.meta.getFunctionMetadata();
    const auditCorrelationId = crypto.randomUUID();
    await ctx.runMutation(internal.audit.record, {
      actor: sessionActor(admin),
      verb: name,
      target: {},
      outcome: "attempted",
      correlationId: auditCorrelationId,
    });
    return {
      ctx: { admin, auditCorrelationId },
      args: {},
      onSuccess: async ({ args }) => {
        await ctx.runMutation(internal.audit.recordOutcome, {
          correlationId: auditCorrelationId,
          outcome: "succeeded",
          target: auditTarget(args),
        });
      },
    };
  },
});
