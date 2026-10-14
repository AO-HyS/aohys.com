// Single source for AOHYS domain vocabularies. Types derive from these arrays,
// Convex validators derive through apps/backend/convex/lib/validators.ts, and
// architecture fitness rejects a re-declared union outside this file.

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const ENVIRONMENTS = ["local", "preview", "production"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const RELEASE_ENVIRONMENTS = ["preview", "production"] as const;
export type ReleaseEnvironment = (typeof RELEASE_ENVIRONMENTS)[number];

export const LEAD_INTENTS = [
  "project",
  "hiring",
  "architecture-review",
  "website",
  "other",
] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];

export const LEAD_STATUSES = ["new", "reviewing", "closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PREFERRED_CONTACT_PATHS = ["email", "whatsapp"] as const;
export type PreferredContactPath = (typeof PREFERRED_CONTACT_PATHS)[number];

export const PUBLICATION_SCOPES = ["project", "resume", "all"] as const;
export type PublicationScope = (typeof PUBLICATION_SCOPES)[number];

export const PUBLICATION_REQUEST_STATES = [
  "published-locally",
  "release-requested",
  "release-acknowledged",
  "release-failed",
  "deployed",
  "rollback-needed",
] as const;
export type PublicationRequestState =
  (typeof PUBLICATION_REQUEST_STATES)[number];

export const PUBLICATION_ATTEMPT_STATES = [
  "scheduled",
  "dispatching",
  "acknowledged",
  "failed",
  "ambiguous",
] as const;
export type PublicationAttemptState =
  (typeof PUBLICATION_ATTEMPT_STATES)[number];

export const PUBLICATION_WORKFLOW_OUTCOMES = ["failure", "cancelled"] as const;
export type PublicationWorkflowOutcome =
  (typeof PUBLICATION_WORKFLOW_OUTCOMES)[number];

// Results of an explicit provider status check; never inferred from time.
export const PUBLICATION_PROVIDER_STATUSES = ["not-found", "unknown"] as const;
export type PublicationProviderStatus =
  (typeof PUBLICATION_PROVIDER_STATUSES)[number];

// Only a confirmed missing dispatch may be rescheduled.
export const RETRYABLE_PUBLICATION_PROVIDER_STATUSES = [
  "not-found",
] as const satisfies readonly PublicationProviderStatus[];

export const MEDIA_STORAGE_PROVIDERS = [
  "cloudflare-images",
  "cloudflare-r2",
  "external",
] as const;
export type MediaStorageProvider = (typeof MEDIA_STORAGE_PROVIDERS)[number];

// Direct uploads never target R2.
export const WRITABLE_MEDIA_STORAGE_PROVIDERS = [
  "cloudflare-images",
  "external",
] as const satisfies readonly MediaStorageProvider[];

export const MEDIA_USAGES = [
  "case-study",
  "resume",
  "architecture",
  "site",
] as const;
export type MediaUsage = (typeof MEDIA_USAGES)[number];

export const MEDIA_STATUSES = ["draft", "published", "archived"] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

export const SITE_SETTING_KEYS = ["PUBLIC_WHATSAPP_URL"] as const;
export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];

export const VARIABLE_CLASSIFICATIONS = [
  "public-build-value",
  "server-secret",
  "provider-output",
  "policy-value",
] as const;
export type VariableClassification = (typeof VARIABLE_CLASSIFICATIONS)[number];

// Where an Environment Contract variable is delivered.
export const VARIABLE_DESTINATIONS = [
  "convex-runtime",
  "pages-runtime",
  "release-job",
] as const;
export type VariableDestination = (typeof VARIABLE_DESTINATIONS)[number];

// How the release workflow supplies a variable to a release job.
export const GITHUB_VALUE_SOURCES = [
  "environment-name",
  "release-sha",
  "variable",
  "secret",
] as const;
export type GithubValueSource = (typeof GITHUB_VALUE_SOURCES)[number];

// Site settings are never secrets.
export const SITE_SETTING_CLASSIFICATIONS = [
  "public-build-value",
  "provider-output",
  "policy-value",
] as const;
export type SiteSettingClassification =
  (typeof SITE_SETTING_CLASSIFICATIONS)[number];

export const CASE_STUDY_STATUSES = [
  "production-proof",
  "active-build",
  "private-build",
  "enterprise-confidential",
  "engineering-practice",
] as const;
export type CaseStudyStatus = (typeof CASE_STUDY_STATUSES)[number];

export const CASE_STUDY_EVIDENCE_STATUSES = [
  "missing",
  "sanitized",
  "published",
] as const;
export type CaseStudyEvidenceStatus =
  (typeof CASE_STUDY_EVIDENCE_STATUSES)[number];
