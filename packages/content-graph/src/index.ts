import enContent from "./locales/en.json" with { type: "json" };
import esContent from "./locales/es.json" with { type: "json" };

export const SITE_URL = "https://aohys.com";
export const DEFAULT_LOCALE = "en";
export const LOCALES = ["en", "es"] as const;
export const PRIVATE_ROUTE_PREFIXES = ["/dashboard"] as const;

export type Locale = (typeof LOCALES)[number];
export type ContentStatus = "published" | "draft";
export type ContentType =
  | "landing"
  | "case-study-index"
  | "case-study"
  | "page"
  | "resume"
  | "contact"
  | "privacy";

export type ContentId =
  | "home"
  | "case-studies"
  | "case-study:casa-roca"
  | "case-study:the-barber-central"
  | "case-study:nutri-plan"
  | "case-study:enterprise-systems"
  | "practice"
  | "architecture"
  | "resume"
  | "contact"
  | "privacy";

export interface LocaleVariant {
  locale: Locale;
  path: string;
  title: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  primaryActionLabel?: string;
  primaryActionContentId?: ContentId;
  secondaryActionLabel?: string;
  secondaryActionContentId?: ContentId;
}

export interface EvidenceAsset {
  label: string;
  altText: string;
  kind: "public-site" | "development-preview" | "private-system" | "architecture-note";
  publicSafe: boolean;
}

export interface HomeOutcome {
  contentId: ContentId;
  path: string;
  label: string;
  title: string;
  outcome: string;
  role: string;
  evidence: EvidenceAsset;
}

export interface HomeStage {
  label: string;
  text: string;
}

export interface HomePageContent {
  headline: string;
  deck: string;
  proofBoardLabel: string;
  proofBoardTitle: string;
  proofBoardBody: string;
  selectedOutcomesHeading: string;
  selectedOutcomesIntro: string;
  selectedOutcomes: HomeOutcome[];
  architectureHeading: string;
  architectureBody: string;
  architectureStages: HomeStage[];
  practiceHeading: string;
  practiceBody: string;
  practicePoints: HomeStage[];
  contactHeading: string;
  contactBody: string;
  emailLabel: string;
  emailHref: string;
  whatsappLabel: string;
  whatsappHref: string;
}

export interface ArchitectureSourceLink {
  label: string;
  href: string;
}

export interface ArchitectureSection {
  title: string;
  body: string;
  links?: ArchitectureSourceLink[];
}

export interface ArchitecturePageContent {
  heading: string;
  deck: string;
  sourceLabel: string;
  sourceLinks: ArchitectureSourceLink[];
  sections: ArchitectureSection[];
  boundaryNote: string;
}

export interface CaseStudySection {
  title: string;
  body: string;
}

export interface CaseStudyEvidenceAsset extends EvidenceAsset {
  href: string;
  description: string;
}

export interface CaseStudyPageContent {
  statusLabel: string;
  overview: string;
  problem: CaseStudySection;
  businessOutcome: CaseStudySection;
  role: CaseStudySection;
  constraints: CaseStudySection;
  architectureDecisions: CaseStudySection;
  executionHighlights: CaseStudySection;
  qualitySecurityPerformance: CaseStudySection;
  publicEvidenceTitle: string;
  publicEvidence: CaseStudyEvidenceAsset[];
  confidentialityNote: CaseStudySection;
}

export interface SitemapRule {
  include: boolean;
  changefreq?: "weekly" | "monthly";
  priority?: number;
}

export interface PublicContentNode {
  id: ContentId | string;
  type: ContentType;
  status: ContentStatus;
  sitemap: SitemapRule;
  variants: Partial<Record<Locale, LocaleVariant>>;
}

export interface PublicRoute {
  id: ContentId | string;
  locale: Locale;
  node: PublicContentNode;
  variant: LocaleVariant;
  path: string;
  canonicalUrl: string;
}

export interface SeoMetadata {
  lang: Locale;
  title: string;
  description: string;
  canonicalUrl: string;
  alternates: Record<Locale | "x-default", string>;
  robots: "index,follow" | "noindex,nofollow";
}

export interface SitemapEntry {
  url: string;
  alternates: Record<Locale | "x-default", string>;
  changefreq?: SitemapRule["changefreq"];
  priority?: number;
}

interface LocalizedContentEntry {
  path: string;
  title: string;
  summary: string;
  seoTitle?: string;
  seoDescription: string;
  primaryActionLabel?: string;
  primaryActionContentId?: ContentId;
  secondaryActionLabel?: string;
  secondaryActionContentId?: ContentId;
  homeContent?: Omit<HomePageContent, "selectedOutcomes"> & {
    selectedOutcomes: Array<Omit<HomeOutcome, "path">>;
  };
  architectureContent?: ArchitecturePageContent;
  caseStudyContent?: CaseStudyPageContent;
}

type ContentDictionary = Record<ContentId, LocalizedContentEntry>;
type BaseContentNode = Omit<PublicContentNode, "id" | "variants"> & { id: ContentId };

export class MissingLocaleVariantError extends Error {
  constructor(contentId: string, locale: Locale) {
    super(`Content node "${contentId}" is missing the "${locale}" locale variant.`);
    this.name = "MissingLocaleVariantError";
  }
}

const contentByLocale = {
  en: enContent,
  es: esContent,
} as Record<Locale, ContentDictionary>;

const baseNodes = [
  {
    id: "home",
    type: "landing",
    status: "published",
    sitemap: { include: true, changefreq: "weekly", priority: 1 },
  },
  {
    id: "case-studies",
    type: "case-study-index",
    status: "published",
    sitemap: { include: true, changefreq: "weekly", priority: 0.9 },
  },
  {
    id: "case-study:casa-roca",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.8 },
  },
  {
    id: "case-study:the-barber-central",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.78 },
  },
  {
    id: "case-study:nutri-plan",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.78 },
  },
  {
    id: "case-study:enterprise-systems",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.76 },
  },
  {
    id: "practice",
    type: "page",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.72 },
  },
  {
    id: "architecture",
    type: "page",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.86 },
  },
  {
    id: "resume",
    type: "resume",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.84 },
  },
  {
    id: "contact",
    type: "contact",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.82 },
  },
  {
    id: "privacy",
    type: "privacy",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.5 },
  },
] as const satisfies readonly BaseContentNode[];

function assertLocale(locale: string): asserts locale is Locale {
  if (!LOCALES.includes(locale as Locale)) {
    throw new Error(`Unsupported locale "${locale}".`);
  }
}

function getDictionaryEntry(contentId: ContentId | string, locale: Locale): LocalizedContentEntry {
  assertLocale(locale);
  const entry = contentByLocale[locale][contentId as ContentId];

  if (!entry) {
    throw new MissingLocaleVariantError(contentId, locale);
  }

  return entry;
}

function variantFromDictionary(contentId: ContentId, locale: Locale): LocaleVariant {
  const entry = getDictionaryEntry(contentId, locale);

  return {
    locale,
    path: entry.path,
    title: entry.title,
    summary: entry.summary,
    seoTitle: entry.seoTitle ?? `${entry.title} | AOHYS`,
    seoDescription: entry.seoDescription,
    primaryActionLabel: entry.primaryActionLabel,
    primaryActionContentId: entry.primaryActionContentId,
    secondaryActionLabel: entry.secondaryActionLabel,
    secondaryActionContentId: entry.secondaryActionContentId,
  };
}

const nodes = baseNodes.map((node) => ({
  ...node,
  variants: Object.fromEntries(
    LOCALES.map((locale) => [locale, variantFromDictionary(node.id, locale)]),
  ) as Record<Locale, LocaleVariant>,
})) satisfies PublicContentNode[];

export const PUBLIC_CONTENT_NODES: readonly PublicContentNode[] = nodes;

const contentById = new Map(PUBLIC_CONTENT_NODES.map((node) => [node.id, node]));

function normalizePath(pathname: string): string {
  let path = pathname;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    path = new URL(path).pathname;
  }

  path = path.split("#")[0]?.split("?")[0] ?? "/";

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (path === "/es") {
    return "/es/";
  }

  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

function toAbsoluteUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export function isPrivateRoute(pathname: string): boolean {
  const path = normalizePath(pathname);
  return PRIVATE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function getContentNode(contentId: ContentId | string): PublicContentNode {
  const node = contentById.get(contentId);

  if (!node) {
    throw new Error(`Unknown content node "${contentId}".`);
  }

  return node;
}

export function getLocaleVariant(
  nodeOrId: PublicContentNode | ContentId | string,
  locale: Locale,
): LocaleVariant {
  assertLocale(locale);
  const node = typeof nodeOrId === "string" ? getContentNode(nodeOrId) : nodeOrId;
  const variantForLocale = node.variants[locale];

  if (!variantForLocale) {
    throw new MissingLocaleVariantError(node.id, locale);
  }

  return variantForLocale;
}

export function getLocalizedPath(contentId: ContentId | string, locale: Locale): string {
  return getLocaleVariant(contentId, locale).path;
}

export function getHomePageContent(locale: Locale): HomePageContent {
  const home = getDictionaryEntry("home", locale);

  if (!home.homeContent) {
    throw new Error(`Home content is missing for locale "${locale}".`);
  }

  return {
    ...home.homeContent,
    selectedOutcomes: home.homeContent.selectedOutcomes.map((outcome) => ({
      ...outcome,
      path: getLocalizedPath(outcome.contentId, locale),
    })),
  };
}

export function getArchitecturePageContent(locale: Locale): ArchitecturePageContent {
  const architecture = getDictionaryEntry("architecture", locale);

  if (!architecture.architectureContent) {
    throw new Error(`Architecture content is missing for locale "${locale}".`);
  }

  return architecture.architectureContent;
}

export function getCaseStudyPageContent(contentId: ContentId | string, locale: Locale): CaseStudyPageContent | undefined {
  const node = getContentNode(contentId);

  if (node.type !== "case-study") {
    throw new Error(`Content node "${contentId}" is not a case study.`);
  }

  const caseStudy = getDictionaryEntry(contentId, locale);

  return caseStudy.caseStudyContent;
}

export function getLanguageAlternates(contentId: ContentId | string): Record<Locale | "x-default", string> {
  const alternates = Object.fromEntries(
    LOCALES.map((locale) => [locale, toAbsoluteUrl(getLocalizedPath(contentId, locale))]),
  ) as Record<Locale, string>;

  return {
    ...alternates,
    "x-default": alternates[DEFAULT_LOCALE],
  };
}

export function getPublicRouteMap(): PublicRoute[] {
  return PUBLIC_CONTENT_NODES.flatMap((node) =>
    LOCALES.map((locale) => {
      const localizedVariant = getLocaleVariant(node, locale);

      return {
        id: node.id,
        locale,
        node,
        variant: localizedVariant,
        path: localizedVariant.path,
        canonicalUrl: toAbsoluteUrl(localizedVariant.path),
      };
    }),
  );
}

export function resolvePublicPath(pathname: string): PublicRoute | null {
  const path = normalizePath(pathname);

  if (isPrivateRoute(path)) {
    return null;
  }

  return getPublicRouteMap().find((route) => normalizePath(route.path) === path) ?? null;
}

export function getSeoMetadata(contentId: ContentId | string, locale: Locale): SeoMetadata {
  const node = getContentNode(contentId);
  const localizedVariant = getLocaleVariant(node, locale);

  return {
    lang: locale,
    title: localizedVariant.seoTitle,
    description: localizedVariant.seoDescription,
    canonicalUrl: toAbsoluteUrl(localizedVariant.path),
    alternates: getLanguageAlternates(contentId),
    robots: node.status === "published" && node.sitemap.include ? "index,follow" : "noindex,nofollow",
  };
}

export function getSitemapEntries(): SitemapEntry[] {
  return getPublicRouteMap()
    .filter((route) => route.node.status === "published" && route.node.sitemap.include)
    .map((route) => ({
      url: route.canonicalUrl,
      alternates: getLanguageAlternates(route.id),
      changefreq: route.node.sitemap.changefreq,
      priority: route.node.sitemap.priority,
    }));
}
