import { staticCaseStudyRouteOwner } from "@aohys/content-graph/static-case-study-routes";

const SAFE_PROJECT_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function requireSafeProjectKey(value: string, label: string): void {
  if (!SAFE_PROJECT_KEY.test(value)) {
    throw new Error(`${label} must use lowercase letters, numbers, and single hyphens only.`);
  }
}

export function requireCaseStudyContentId(contentId: string): string {
  if (!contentId.startsWith("case-study:")) {
    throw new Error("Content ID must use the case-study namespace.");
  }
  const contentKey = contentId.slice("case-study:".length);
  requireSafeProjectKey(contentKey, "Content key");
  return contentKey;
}

export function localizedCaseStudyPath(locale: "en" | "es", localizedSlug: string): string {
  requireSafeProjectKey(localizedSlug, "Localized slug");
  return locale === "es" ? `/es/casos/${localizedSlug}` : `/case-studies/${localizedSlug}`;
}

export function requireUnreservedStaticSlug(
  contentId: string,
  locale: "en" | "es",
  localizedSlug: string,
): void {
  const owner = staticCaseStudyRouteOwner(locale, localizedSlug);
  if (owner && owner !== contentId) {
    throw new Error(`The ${locale.toUpperCase()} localized slug is reserved by ${owner}.`);
  }
}
