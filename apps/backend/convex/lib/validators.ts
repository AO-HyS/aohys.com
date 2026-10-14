import {
  CASE_STUDY_EVIDENCE_STATUSES,
  CASE_STUDY_STATUSES,
  ENVIRONMENTS,
  LEAD_INTENTS,
  LEAD_STATUSES,
  LOCALES,
  MEDIA_STATUSES,
  MEDIA_STORAGE_PROVIDERS,
  MEDIA_USAGES,
  PREFERRED_CONTACT_PATHS,
  PUBLICATION_ATTEMPT_STATES,
  PUBLICATION_REQUEST_STATES,
  PUBLICATION_SCOPES,
  RELEASE_ENVIRONMENTS,
  SITE_SETTING_CLASSIFICATIONS,
  SITE_SETTING_KEYS,
} from "@aohys/core/domain";
import { v, type VLiteral, type VUnion } from "convex/values";

// Convex validators derived from the domain vocabulary in @aohys/core/domain.
export function literals<const T extends readonly [string, ...string[]]>(
  values: T,
) {
  return v.union(...values.map((value) => v.literal(value))) as VUnion<
    T[number],
    { -readonly [K in keyof T]: VLiteral<T[K]> },
    "required"
  >;
}

export const localeValidator = literals(LOCALES);
export const environmentValidator = literals(ENVIRONMENTS);
export const releaseEnvironmentValidator = literals(RELEASE_ENVIRONMENTS);
export const leadIntentValidator = literals(LEAD_INTENTS);
export const leadStatusValidator = literals(LEAD_STATUSES);
export const preferredContactPathValidator = literals(PREFERRED_CONTACT_PATHS);
export const publicationScopeValidator = literals(PUBLICATION_SCOPES);
export const publicationRequestStateValidator = literals(
  PUBLICATION_REQUEST_STATES,
);
export const publicationAttemptStateValidator = literals(
  PUBLICATION_ATTEMPT_STATES,
);
export const mediaStorageProviderValidator = literals(MEDIA_STORAGE_PROVIDERS);
export const mediaUsageValidator = literals(MEDIA_USAGES);
export const mediaStatusValidator = literals(MEDIA_STATUSES);
export const siteSettingKeyValidator = literals(SITE_SETTING_KEYS);
export const siteSettingClassificationValidator = literals(
  SITE_SETTING_CLASSIFICATIONS,
);
export const caseStudyStatusValidator = literals(CASE_STUDY_STATUSES);
export const caseStudyEvidenceStatusValidator = literals(
  CASE_STUDY_EVIDENCE_STATUSES,
);
