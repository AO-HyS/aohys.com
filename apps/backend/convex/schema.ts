import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const environmentValidator = v.union(
  v.literal("local"),
  v.literal("preview"),
  v.literal("production"),
);

const localeValidator = v.union(v.literal("en"), v.literal("es"));

const leadIntentValidator = v.union(
  v.literal("project"),
  v.literal("hiring"),
  v.literal("architecture-review"),
  v.literal("website"),
  v.literal("other"),
);

const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("reviewing"),
  v.literal("closed"),
);

const preferredContactPathValidator = v.union(
  v.literal("email"),
  v.literal("whatsapp"),
);

export default defineSchema({
  leads: defineTable({
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
    spamSignals: v.optional(v.object({
      elapsedMs: v.optional(v.number()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_email", ["email"]),

  mediaMetadata: defineTable({
    storageProvider: v.union(
      v.literal("cloudflare-images"),
      v.literal("cloudflare-r2"),
      v.literal("external"),
    ),
    storageKey: v.string(),
    publicUrl: v.optional(v.string()),
    altText: v.string(),
    contentId: v.optional(v.string()),
    usage: v.union(
      v.literal("case-study"),
      v.literal("resume"),
      v.literal("architecture"),
      v.literal("site"),
    ),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
    locale: v.optional(localeValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_usage", ["status", "usage"])
    .index("by_content_id", ["contentId"]),

  siteSettings: defineTable({
    key: v.string(),
    environment: environmentValidator,
    value: v.string(),
    classification: v.union(
      v.literal("public-build-value"),
      v.literal("provider-output"),
      v.literal("policy-value"),
    ),
    updatedAt: v.number(),
  }).index("by_environment_and_key", ["environment", "key"]),

  caseStudyMetadata: defineTable({
    contentId: v.string(),
    status: v.union(
      v.literal("production-proof"),
      v.literal("active-build"),
      v.literal("private-build"),
      v.literal("enterprise-confidential"),
      v.literal("engineering-practice"),
    ),
    evidenceStatus: v.union(
      v.literal("missing"),
      v.literal("sanitized"),
      v.literal("published"),
    ),
    updatedAt: v.number(),
  }).index("by_content_id", ["contentId"]),

  resumeVersions: defineTable({
    locale: localeValidator,
    version: v.string(),
    pdfPath: v.string(),
    isPublished: v.boolean(),
    createdAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_locale_and_published", ["locale", "isPublished"])
    .index("by_locale_and_created_at", ["locale", "createdAt"]),
});
