import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  caseStudyEvidenceStatusValidator,
  caseStudyStatusValidator,
  environmentValidator,
  leadIntentValidator,
  leadStatusValidator,
  localeValidator,
  mediaStatusValidator,
  mediaStorageProviderValidator,
  mediaUsageValidator,
  preferredContactPathValidator,
  publicationAttemptStateValidator,
  publicationRequestStateValidator,
  publicationScopeValidator,
  publicationWorkflowOutcomeValidator,
  releaseEnvironmentValidator,
  siteSettingClassificationValidator,
  auditActorKindValidator,
  auditOutcomeValidator,
  operatorCredentialValidator,
} from "./lib/validators.js";

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
    storageProvider: mediaStorageProviderValidator,
    storageKey: v.string(),
    publicUrl: v.optional(v.string()),
    altText: v.string(),
    contentId: v.optional(v.string()),
    usage: mediaUsageValidator,
    status: mediaStatusValidator,
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
    classification: siteSettingClassificationValidator,
    updatedAt: v.number(),
  }).index("by_environment_and_key", ["environment", "key"]),

  caseStudyMetadata: defineTable({
    contentId: v.string(),
    status: caseStudyStatusValidator,
    evidenceStatus: caseStudyEvidenceStatusValidator,
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
    targetEnvironment: releaseEnvironmentValidator,
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
    workflowOutcome: v.optional(publicationWorkflowOutcomeValidator),
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
    targetEnvironment: releaseEnvironmentValidator,
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

  // Append-only: rows are never patched or deleted. Written only through
  // convex/lib/audit.ts. The actor fields present depend on actorKind:
  // session (actorId, actorEmail), operator (deployment, credential,
  // authorizationRef, operatorLabel as a non-authoritative label) or system
  // (causedBy).
  auditEvents: defineTable({
    actorKind: auditActorKindValidator,
    actorId: v.optional(v.string()),
    actorEmail: v.optional(v.string()),
    deployment: v.optional(v.string()),
    credential: v.optional(operatorCredentialValidator),
    authorizationRef: v.optional(v.string()),
    operatorLabel: v.optional(v.string()),
    causedBy: v.optional(v.string()),
    verb: v.string(),
    target: v.record(v.string(), v.string()),
    outcome: auditOutcomeValidator,
    correlationId: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_correlation_id", ["correlationId"]),
});
