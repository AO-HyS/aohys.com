export type StaticCaseStudyLocale = "en" | "es";

export interface StaticCaseStudyRoute {
  contentId: string;
  locale: StaticCaseStudyLocale;
  path: string;
  localizedSlug: string;
}

// Kept isolated so Convex can reserve public routes without loading locale copy.
export const STATIC_CASE_STUDY_ROUTES: readonly StaticCaseStudyRoute[] = [
  { contentId: "case-study:eteria", locale: "en", path: "/case-studies/eteria", localizedSlug: "eteria" },
  { contentId: "case-study:eteria", locale: "es", path: "/es/casos/eteria", localizedSlug: "eteria" },
  { contentId: "case-study:casa-roca", locale: "en", path: "/case-studies/casa-roca", localizedSlug: "casa-roca" },
  { contentId: "case-study:casa-roca", locale: "es", path: "/es/casos/casa-roca", localizedSlug: "casa-roca" },
  { contentId: "case-study:the-barber-central", locale: "en", path: "/case-studies/the-barber-central", localizedSlug: "the-barber-central" },
  { contentId: "case-study:the-barber-central", locale: "es", path: "/es/casos/the-barber-central", localizedSlug: "the-barber-central" },
  { contentId: "case-study:nutri-plan", locale: "en", path: "/case-studies/nutri-plan", localizedSlug: "nutri-plan" },
  { contentId: "case-study:nutri-plan", locale: "es", path: "/es/casos/nutri-plan", localizedSlug: "nutri-plan" },
  { contentId: "case-study:enterprise-systems", locale: "en", path: "/case-studies/enterprise-systems", localizedSlug: "enterprise-systems" },
  { contentId: "case-study:enterprise-systems", locale: "es", path: "/es/casos/sistemas-enterprise", localizedSlug: "sistemas-enterprise" },
  { contentId: "case-study:engineering-practice", locale: "en", path: "/case-studies/engineering-practice", localizedSlug: "engineering-practice" },
  { contentId: "case-study:engineering-practice", locale: "es", path: "/es/casos/practica-de-ingenieria", localizedSlug: "practica-de-ingenieria" },
];

export function staticCaseStudyRouteOwner(
  locale: StaticCaseStudyLocale,
  localizedSlug: string,
): string | undefined {
  return STATIC_CASE_STUDY_ROUTES.find((route) =>
    route.locale === locale && route.localizedSlug === localizedSlug
  )?.contentId;
}
