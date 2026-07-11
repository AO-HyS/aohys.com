import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { internalMutation, mutation, query } from "./_generated/server.js";
import type { Doc } from "./_generated/dataModel.js";
import { requireAdmin } from "./auth.js";
import {
  CONTACT_SUBMISSION_MAX_PER_WINDOW,
  CONTACT_SUBMISSION_RATE_LIMIT_MESSAGE,
  CONTACT_SUBMISSION_RATE_LIMIT_WINDOW_MS,
} from "../src/contact-abuse.js";

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

const dashboardLeadValidator = v.object({
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
    const recentSubmissions = await ctx.db
      .query("leads")
      .withIndex("by_email_and_created_at", (query) => query
        .eq("email", args.email)
        .gte("createdAt", args.createdAt - CONTACT_SUBMISSION_RATE_LIMIT_WINDOW_MS))
      .take(CONTACT_SUBMISSION_MAX_PER_WINDOW);

    if (recentSubmissions.length >= CONTACT_SUBMISSION_MAX_PER_WINDOW) {
      throw new Error(CONTACT_SUBMISSION_RATE_LIMIT_MESSAGE);
    }

    const leadId = await ctx.db.insert("leads", args);

    return { leadId };
  },
});

export const listForDashboard = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(dashboardLeadValidator),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const result = await ctx.db
      .query("leads")
      .withIndex("by_created_at")
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        maximumRowsRead: Math.min(args.paginationOpts.maximumRowsRead ?? 100, 100),
        maximumBytesRead: Math.min(args.paginationOpts.maximumBytesRead ?? 1_000_000, 1_000_000),
      });

    return {
      ...result,
      page: result.page.map(toDashboardLead),
    };
  },
});

function toDashboardLead(lead: Doc<"leads">) {
  return {
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
  };
}

export const updateStatus = mutation({
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
    await requireAdmin(ctx);

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
