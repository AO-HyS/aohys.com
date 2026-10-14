import {
  customAction,
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "../_generated/server.js";
import { requireAdmin } from "../auth.js";

// The only public Convex builders. Each resolves the dashboard operator from
// the Better Auth session through requireAdmin before the handler runs and
// exposes it as ctx.admin; a client-supplied actor is never authority.
// architecture:fitness (public-function-guard) rejects any other public
// builder and any change to this shape.

export const adminQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const admin = await requireAdmin(ctx);
    return { admin };
  }),
);

export const adminMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const admin = await requireAdmin(ctx);
    return { admin };
  }),
);

export const adminAction = customAction(
  action,
  customCtx(async (ctx) => {
    const admin = await requireAdmin(ctx);
    return { admin };
  }),
);
