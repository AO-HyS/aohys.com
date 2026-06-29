import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server.js";
import { prepareLeadIntake } from "../src/lead-intake.js";

const leadIntentValidator = v.union(
  v.literal("project"),
  v.literal("hiring"),
  v.literal("architecture-review"),
  v.literal("website"),
  v.literal("other"),
);

const localeValidator = v.union(v.literal("en"), v.literal("es"));

const preferredContactPathValidator = v.union(
  v.literal("email"),
  v.literal("whatsapp"),
);

const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("reviewing"),
  v.literal("closed"),
);

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

export const createFromContact = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    preferredContactPath: preferredContactPathValidator,
    consentToContact: v.literal(true),
    intent: leadIntentValidator,
    message: v.string(),
    sourcePath: v.string(),
    locale: localeValidator,
    referrer: v.optional(v.string()),
    status: v.literal("new"),
    spamSignals: v.object({
      elapsedMs: v.optional(v.number()),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  returns: v.object({
    leadId: v.id("leads"),
  }),
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert("leads", args);

    return { leadId };
  },
});

export const listForDashboard = internalQuery({
  args: {},
  returns: v.array(v.object({
    id: v.id("leads"),
    name: v.string(),
    email: v.string(),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    preferredContactPath: v.optional(preferredContactPathValidator),
    consentToContact: v.optional(v.boolean()),
    intent: leadIntentValidator,
    message: v.string(),
    sourcePath: v.string(),
    locale: localeValidator,
    referrer: v.optional(v.string()),
    status: leadStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_status_and_created_at")
      .order("desc")
      .take(50);

    return leads.map((lead) => ({
      id: lead._id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      phone: lead.phone,
      preferredContactPath: lead.preferredContactPath,
      consentToContact: lead.consentToContact,
      intent: lead.intent,
      message: lead.message,
      sourcePath: lead.sourcePath,
      locale: lead.locale,
      referrer: lead.referrer,
      status: lead.status,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    }));
  },
});

export const updateStatusFromDashboard = internalMutation({
  args: {
    leadId: v.id("leads"),
    status: leadStatusValidator,
  },
  returns: v.object({
    leadId: v.id("leads"),
    status: leadStatusValidator,
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const existingLead = await ctx.db.get(args.leadId);

    if (!existingLead) {
      throw new Error("Lead not found.");
    }

    const updatedAt = Date.now();
    await ctx.db.patch(args.leadId, {
      status: args.status,
      updatedAt,
    });

    return {
      leadId: args.leadId,
      status: args.status,
      updatedAt,
    };
  },
});
