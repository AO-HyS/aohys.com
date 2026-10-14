import { v, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel.js";
import type { MutationCtx } from "../_generated/server.js";
import {
  auditOutcomeValidator,
  operatorCredentialValidator,
} from "./validators.js";

// The only writer of auditEvents. Events are appended, never patched or
// deleted, and the actor always comes from the server: requireAdmin for a
// session, the deployment for an operator, the originating record for the
// scheduler.

export const sessionActorValidator = v.object({
  actorKind: v.literal("session"),
  actorId: v.string(),
  actorEmail: v.string(),
});
export const operatorActorValidator = v.object({
  actorKind: v.literal("operator"),
  deployment: v.string(),
  credential: operatorCredentialValidator,
  authorizationRef: v.optional(v.string()),
  operatorLabel: v.optional(v.string()),
});
export const systemActorValidator = v.object({
  actorKind: v.literal("system"),
  causedBy: v.string(),
});
export const auditActorValidator = v.union(
  sessionActorValidator,
  operatorActorValidator,
  systemActorValidator,
);
export type SessionActor = Infer<typeof sessionActorValidator>;
export type AuditActor = Infer<typeof auditActorValidator>;

export function sessionActor(admin: {
  _id: string;
  email: string;
}): SessionActor {
  return {
    actorKind: "session",
    actorId: String(admin._id),
    actorEmail: admin.email,
  };
}

// The scheduler acting on behalf of the record that scheduled it.
export function systemActor(causedBy: string): AuditActor {
  return { actorKind: "system", causedBy };
}

// Identifying arguments recorded as the event target. Free text and content
// never enter the audit trail.
const TARGET_ARGUMENTS = [
  "contentId",
  "contentKey",
  "environment",
  "key",
  "leadId",
  "locale",
  "mediaId",
  "scope",
  "storageKey",
  "version",
] as const;

export function auditTarget(args: Record<string, unknown>) {
  const target: Record<string, string> = {};
  for (const name of TARGET_ARGUMENTS) {
    const value = args[name];
    if (typeof value === "string") target[name] = value;
  }
  return target;
}

export const auditEventArgs = {
  actor: auditActorValidator,
  verb: v.string(),
  target: v.record(v.string(), v.string()),
  outcome: auditOutcomeValidator,
  correlationId: v.optional(v.string()),
};
const auditEventValidator = v.object(auditEventArgs);
export type AuditEvent = Infer<typeof auditEventValidator>;

export async function insertAuditEvent(ctx: MutationCtx, event: AuditEvent) {
  const { actor, ...rest } = event;
  await ctx.db.insert("auditEvents", { ...actor, ...rest, at: Date.now() });
}

// The typed actor of a stored event.
export function actorOf(event: Doc<"auditEvents">): AuditActor {
  const missing = (field: string) =>
    new Error(`Audit event ${event._id} lacks ${field}.`);
  switch (event.actorKind) {
    case "session":
      if (!event.actorId || !event.actorEmail) throw missing("its session");
      return {
        actorKind: "session",
        actorId: event.actorId,
        actorEmail: event.actorEmail,
      };
    case "operator":
      if (!event.deployment || !event.credential) throw missing("provenance");
      return {
        actorKind: "operator",
        deployment: event.deployment,
        credential: event.credential,
        ...(event.authorizationRef
          ? { authorizationRef: event.authorizationRef }
          : {}),
        ...(event.operatorLabel ? { operatorLabel: event.operatorLabel } : {}),
      };
    case "system":
      if (!event.causedBy) throw missing("causedBy");
      return { actorKind: "system", causedBy: event.causedBy };
  }
}
