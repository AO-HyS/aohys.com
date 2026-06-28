import { v } from "convex/values";
import { mutation } from "./_generated/server.js";
import { prepareLeadIntake } from "../src/lead-intake.js";

const leadIntentValidator = v.union(
  v.literal("project"),
  v.literal("hiring"),
  v.literal("architecture-review"),
  v.literal("website"),
  v.literal("other"),
);

const localeValidator = v.union(v.literal("en"), v.literal("es"));

export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    intent: leadIntentValidator,
    message: v.string(),
    sourcePath: v.string(),
    locale: localeValidator,
    referrer: v.optional(v.string()),
  },
  returns: v.object({
    leadId: v.id("leads"),
    status: v.literal("new"),
  }),
  handler: async (ctx, args) => {
    const preparedLead = prepareLeadIntake(args);
    const leadId = await ctx.db.insert("leads", preparedLead);

    return {
      leadId,
      status: preparedLead.status,
    };
  },
});
