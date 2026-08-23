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

const publicationScopeValidator = v.union(
  v.literal("project"),
  v.literal("resume"),
  v.literal("all"),
);

const publicationTargetValidator = v.union(
  v.literal("preview"),
  v.literal("production"),
);

const publicationRequestStateValidator = v.union(
  v.literal("published-locally"),
  v.literal("release-requested"),
  v.literal("release-acknowledged"),
  v.literal("release-failed"),
  v.literal("deployed"),
  v.literal("rollback-needed"),
);

const publicationAttemptStateValidator = v.union(
  v.literal("scheduled"),
  v.literal("dispatching"),
  v.literal("acknowledged"),
  v.literal("failed"),
  v.literal("ambiguous"),
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
    spamSignals: v.optional(
      v.object({
        elapsedMs: v.optional(v.number()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_email_and_created_at", ["email", "createdAt"]),

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
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    locale: v.optional(localeValidator),
    selectedForPublic: v.optional(v.boolean()),
    selectedForPublicAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_usage", ["status", "usage"])
    .index("by_content_id_and_usage", ["contentId", "usage"]),

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

  projectDrafts: defineTable({
    contentId: v.string(),
    locale: localeValidator,
    localizedSlug: v.optional(v.string()),
    title: v.string(),
    summary: v.string(),
    seoDescription: v.string(),
    projectUrl: v.optional(v.string()),
    ctaLabel: v.string(),
    ctaHref: v.string(),
    achievements: v.string(),
    structureNotes: v.string(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_content_id", ["contentId"])
    .index("by_content_id_and_locale", ["contentId", "locale"])
    .index("by_locale_and_localized_slug", ["locale", "localizedSlug"]),

  resumeDrafts: defineTable({
    locale: localeValidator,
    contentJson: v.string(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  }).index("by_locale", ["locale"]),

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

  publicationRequests: defineTable({
    requestKey: v.string(),
    sourceRevision: v.string(),
    scope: publicationScopeValidator,
    contentId: v.optional(v.string()),
    locale: v.optional(localeValidator),
    targetEnvironment: publicationTargetValidator,
    requestedBy: v.string(),
    state: publicationRequestStateValidator,
    retryable: v.optional(v.boolean()),
    latestAttemptNumber: v.number(),
    publishedAt: v.number(),
    projectDraftsPublished: v.number(),
    resumeDraftsPublished: v.number(),
    mediaPublished: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_request_key", ["requestKey"])
    .index("by_updated_at", ["updatedAt"])
    .index("by_target_environment_and_updated_at", [
      "targetEnvironment",
      "updatedAt",
    ])
    .index("by_scope_content_id_locale_target_environment_updated_at", [
      "scope",
      "contentId",
      "locale",
      "targetEnvironment",
      "updatedAt",
    ]),

  publicationAttempts: defineTable({
    requestId: v.id("publicationRequests"),
    publicationAttemptId: v.string(),
    attemptNumber: v.number(),
    state: publicationAttemptStateValidator,
    retryable: v.boolean(),
    schedulerJobId: v.optional(v.id("_scheduled_functions")),
    claimedAt: v.optional(v.number()),
    providerRunId: v.optional(v.string()),
    providerRunUrl: v.optional(v.string()),
    providerGitRef: v.optional(v.string()),
    providerReleaseSha: v.optional(v.string()),
    workflowOutcome: v.optional(
      v.union(v.literal("failure"), v.literal("cancelled")),
    ),
    workflowOutcomeAt: v.optional(v.number()),
    failureCode: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_publication_attempt_id", ["publicationAttemptId"])
    .index("by_request_id_and_attempt_number", ["requestId", "attemptNumber"])
    .index("by_state_and_updated_at", ["state", "updatedAt"]),

  publicationReceipts: defineTable({
    requestId: v.id("publicationRequests"),
    attemptId: v.id("publicationAttempts"),
    publicationAttemptId: v.string(),
    requestKey: v.string(),
    targetEnvironment: publicationTargetValidator,
    gitRef: v.optional(v.string()),
    runId: v.string(),
    runUrl: v.string(),
    sha: v.string(),
    smokePassed: v.literal(true),
    receivedAt: v.number(),
  })
    .index("by_publication_attempt_id", ["publicationAttemptId"])
    .index("by_request_id", ["requestId"])
    .index("by_request_key", ["requestKey"]),
});
