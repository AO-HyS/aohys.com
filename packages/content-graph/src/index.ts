import enContent from "./locales/en.json" with { type: "json" };
import esContent from "./locales/es.json" with { type: "json" };
import { DASHBOARD_PUBLIC_PROJECT_IDS } from "./generated/dashboard-public-projects.js";
import { formatI18n, getSharedI18n } from "./i18n.js";

export {
  FORBIDDEN_PUBLIC_CLAIMS,
  assertPublicClaimsSafe,
  findForbiddenPublicClaims,
} from "./public-claim-policy.js";
export {
  formatI18n,
  getAlternateLocale,
  getLocalizedCaseStudyPath,
  getLocalizedValue,
  getSharedI18n,
} from "./i18n.js";
export type { I18nLocale, SharedI18n } from "./i18n.js";

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
  | "case-study:eteria"
  | "case-study:casa-roca"
  | "case-study:the-barber-central"
  | "case-study:nutri-plan"
  | "case-study:enterprise-systems"
  | "case-study:engineering-practice"
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
  kind:
    | "public-site"
    | "development-preview"
    | "private-system"
    | "architecture-note";
  publicSafe: boolean;
  src?: string;
}

export interface StaticEvidenceImageAsset {
  src: string;
  thumbSrc?: string;
  alt?: string;
  kind: "site" | "landing" | "dashboard" | "diagram";
}

export const STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID: Record<
  string,
  StaticEvidenceImageAsset
> = {
  home: {
    src: "/images/proof/eteria-garden-blue-table-og.jpg",
    alt: "ETERIA outdoor celebration table styled with blue textiles, ivory flowers, and layered place settings",
    kind: "site",
  },
  "home:architecture-backdrop": {
    src: "/images/proof/enterprise-systems-map-v2.svg",
    alt: "Enterprise systems and operational flow map",
    kind: "diagram",
  },
  "home:practice-backdrop": {
    src: "/images/proof/barber-central-hero-v2.jpg",
    alt: "The Barber Central product hero",
    kind: "landing",
  },
  "case-study:eteria": {
    src: "/images/proof/eteria-garden-blue-table-og.jpg",
    alt: "ETERIA outdoor celebration table styled with blue textiles, ivory flowers, and layered place settings",
    kind: "site",
  },
  "case-study:casa-roca": {
    src: "/images/proof/casa-roca-gallery-v2.jpg",
    thumbSrc: "/images/proof/casa-roca-value-v2.jpg",
    alt: "Casa Roca destination gallery and value story",
    kind: "site",
  },
  "case-study:the-barber-central": {
    src: "/images/proof/barber-central-hero-v2.jpg",
    alt: "The Barber Central booking product hero",
    kind: "landing",
  },
  "case-study:nutri-plan": {
    src: "/images/proof/nutri-plan-dashboard-v2.png",
    alt: "Sanitized Nutri Plan content operations dashboard",
    kind: "dashboard",
  },
  "case-study:enterprise-systems": {
    src: "/images/proof/enterprise-systems-map-v2.svg",
    kind: "diagram",
  },
  "case-study:engineering-practice": {
    src: "/images/proof/engineering-practice-release-cycle.svg",
    kind: "diagram",
  },
  practice: {
    src: "/images/proof/barber-central-hero-v2.jpg",
    alt: "The Barber Central product delivery system",
    kind: "landing",
  },
};

export interface HomeOutcome {
  contentId: ContentId | string;
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
  headlineLines?: string[];
  headlineEmphasisWords?: string[];
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

export interface PublicNavigationItem {
  slotId: "solutions" | "agents" | "pricing" | "docs" | "blog";
  label: string;
  contentId?: ContentId | string;
  href: string;
  external?: boolean;
  dropdown?: boolean;
}

export interface PublicNavigationAction {
  slotId: "login" | "signup";
  label: string;
  contentId?: ContentId | string;
  href: string;
  style: "secondary" | "primary";
}

export interface PublicNavigationDropdownItem {
  id: string;
  label: string;
  text: string;
  href: string;
  icon: "site" | "operations" | "system" | "practice";
  tone: number;
}

export interface PublicNavigationPreview {
  tabs: string[];
  codeLines: string[];
}

export interface PublicNavigation {
  brand: {
    homeLabel: string;
    wordmarkSrc: string;
    fallbackSrc: string;
  };
  items: PublicNavigationItem[];
  actions: PublicNavigationAction[];
  dropdown: {
    label: string;
    items: PublicNavigationDropdownItem[];
    preview: PublicNavigationPreview;
  };
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

export interface ArchitectureLayer {
  id:
    | "experience"
    | "edge"
    | "product-data"
    | "communication"
    | "observability"
    | "delivery";
  label: string;
  technologies: string[];
  body: string;
}

export interface ArchitectureTradeoff {
  title: string;
  reason: string;
  result: string;
}

export interface ArchitecturePageContent {
  heading: string;
  deck: string;
  systemHeading: string;
  systemBody: string;
  layers: ArchitectureLayer[];
  tradeoffsHeading: string;
  tradeoffs: ArchitectureTradeoff[];
  sourceLabel: string;
  sourceLinks: ArchitectureSourceLink[];
  sections: ArchitectureSection[];
  boundaryNote: string;
}

export interface PracticeService {
  id:
    | "product-systems"
    | "architecture-modernization"
    | "delivery-acceleration";
  title: string;
  problem: string;
  result: string;
  engagement: string;
  deliverables: string[];
}

export interface PracticePageContent {
  heading: string;
  deck: string;
  services: PracticeService[];
  processHeading: string;
  process: HomeStage[];
  deliverablesHeading: string;
  deliverables: string[];
  relatedHeading: string;
  relatedContentIds: ContentId[];
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

export interface CaseStudyIndexEntry {
  contentId: ContentId | string;
  path: string;
  title: string;
  summary: string;
  statusLabel: string;
  evidenceLabel: string;
}

export interface CaseStudyIndexContent {
  heading: string;
  intro: string;
  entries: CaseStudyIndexEntry[];
}

export interface ResumeLink {
  label: string;
  href: string;
  text: string;
}

export interface ResumePdfArtifact {
  label: string;
  href: string;
  fileName: string;
  description: string;
}

export interface ResumeProof {
  label: string;
  title: string;
  body: string;
}

export interface ResumeHighlight {
  label: string;
  text: string;
}

export interface ResumeProject {
  title: string;
  summary: string;
  bullets: string[];
}

export interface ResumeExperience {
  role: string;
  company: string;
  period: string;
  bullets: string[];
}

export interface ResumeSkillGroup {
  label: string;
  items: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  period: string;
}

export interface ResumePageContent {
  name: string;
  role: string;
  location: string;
  intro: string;
  pdf: ResumePdfArtifact;
  proof: ResumeProof;
  contactLinks: ResumeLink[];
  contextTitle: string;
  contextLinks: ResumeLink[];
  summaryTitle: string;
  summary: string[];
  highlightsTitle: string;
  highlights: ResumeHighlight[];
  projectsTitle: string;
  projects: ResumeProject[];
  experienceTitle: string;
  experience: ResumeExperience[];
  skillsTitle: string;
  skills: ResumeSkillGroup[];
  educationTitle: string;
  education: ResumeEducation[];
  languagesTitle: string;
  languages: string[];
}

export interface PrivacySection {
  title: string;
  body: string;
}

export interface PrivacyPageContent {
  heading: string;
  intro: string;
  sections: PrivacySection[];
  boundaryNote: string;
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
  socialImage: SocialImageMetadata;
  structuredData?: SeoStructuredData;
}

export interface SocialImageMetadata {
  url: string;
  alt: string;
  type: "image/jpeg" | "image/png";
  width?: number;
  height?: number;
}

export interface WebsiteStructuredData {
  "@context": "https://schema.org";
  "@type": "WebSite";
  "@id": string;
  url: string;
  name: "AOHYS";
  inLanguage: Locale[];
}

export interface ProfilePageStructuredData {
  "@context": "https://schema.org";
  "@type": "ProfilePage";
  "@id": string;
  url: string;
  name: string;
  description: string;
  inLanguage: Locale;
  mainEntity: {
    "@type": "Person";
    "@id": string;
    name: "Alejandro Ortiz Corro";
    url: string;
    jobTitle: string;
    sameAs: [string, string];
  };
}

export type SeoStructuredData =
  | WebsiteStructuredData
  | ProfilePageStructuredData;

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
  primaryActionContentId?: ContentId | string;
  secondaryActionLabel?: string;
  secondaryActionContentId?: ContentId | string;
  homeContent?: Omit<HomePageContent, "selectedOutcomes"> & {
    selectedOutcomes: Array<Omit<HomeOutcome, "path">>;
  };
  publicNavigation?: Omit<
    PublicNavigation,
    "items" | "actions" | "dropdown"
  > & {
    items: Array<Omit<PublicNavigationItem, "href">>;
    actions: Array<Omit<PublicNavigationAction, "href"> & { href?: string }>;
    dropdown: Omit<PublicNavigation["dropdown"], "items"> & {
      items: Array<
        Omit<PublicNavigationDropdownItem, "href"> & {
          contentId: ContentId | string;
        }
      >;
    };
  };
  architectureContent?: ArchitecturePageContent;
  practiceContent?: PracticePageContent;
  caseStudyContent?: CaseStudyPageContent;
  resumeContent?: ResumePageContent;
  privacyContent?: PrivacyPageContent;
}

type ContentDictionary = Record<string, LocalizedContentEntry>;
type BaseContentNode = Omit<PublicContentNode, "id" | "variants"> & {
  id: ContentId | string;
};

export class MissingLocaleVariantError extends Error {
  constructor(contentId: string, locale: Locale) {
    super(
      `Content node "${contentId}" is missing the "${locale}" locale variant.`,
    );
    this.name = "MissingLocaleVariantError";
  }
}

const contentByLocale = {
  en: enContent,
  es: esContent,
} as Record<Locale, ContentDictionary>;

const STATIC_CASE_STUDY_IDS = [
  "case-study:eteria",
  "case-study:engineering-practice",
  "case-study:enterprise-systems",
  "case-study:the-barber-central",
  "case-study:nutri-plan",
  "case-study:casa-roca",
] as const satisfies readonly ContentId[];

const STATIC_CONTENT_IDS = [
  "home",
  "case-studies",
  ...STATIC_CASE_STUDY_IDS,
  "practice",
  "architecture",
  "resume",
  "contact",
  "privacy",
] as const satisfies readonly ContentId[];

function isCaseStudyContentId(
  contentId: string,
): contentId is `case-study:${string}` {
  return /^case-study:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contentId);
}

function staticActionContentId(
  contentId: ContentId | string | undefined,
): ContentId | undefined {
  return typeof contentId === "string" &&
    STATIC_CONTENT_IDS.includes(contentId as ContentId)
    ? (contentId as ContentId)
    : undefined;
}

function dashboardCaseStudyIds(projectIds: readonly string[]): string[] {
  const seen = new Set<string>(STATIC_CASE_STUDY_IDS);
  const caseStudyIds: string[] = [];

  for (const projectId of projectIds) {
    if (!isCaseStudyContentId(projectId) || seen.has(projectId)) {
      continue;
    }

    seen.add(projectId);
    caseStudyIds.push(projectId);
  }

  return caseStudyIds;
}

const DASHBOARD_CASE_STUDY_IDS = dashboardCaseStudyIds(
  DASHBOARD_PUBLIC_PROJECT_IDS,
);
const CASE_STUDY_IDS: readonly (ContentId | string)[] = [
  ...STATIC_CASE_STUDY_IDS,
  ...DASHBOARD_CASE_STUDY_IDS,
];

const staticBaseNodes = [
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
    id: "case-study:eteria",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.88 },
  },
  {
    id: "case-study:engineering-practice",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.82 },
  },
  {
    id: "case-study:enterprise-systems",
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
    id: "case-study:casa-roca",
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

const dashboardCaseStudyNodes: BaseContentNode[] = DASHBOARD_CASE_STUDY_IDS.map(
  (contentId, index) => ({
    id: contentId,
    type: "case-study",
    status: "published",
    sitemap: {
      include: true,
      changefreq: "monthly",
      priority: Math.max(0.6, 0.7 - index * 0.01),
    },
  }),
);

const baseNodes: readonly BaseContentNode[] = [
  ...staticBaseNodes,
  ...dashboardCaseStudyNodes,
];

function assertLocale(locale: string): asserts locale is Locale {
  if (!LOCALES.includes(locale as Locale)) {
    throw new Error(`Unsupported locale "${locale}".`);
  }
}

function getDictionaryEntry(
  contentId: ContentId | string,
  locale: Locale,
): LocalizedContentEntry {
  assertLocale(locale);
  const entry = contentByLocale[locale][contentId as ContentId];

  if (!entry) {
    throw new MissingLocaleVariantError(contentId, locale);
  }

  return entry;
}

function variantFromDictionary(
  contentId: ContentId | string,
  locale: Locale,
): LocaleVariant {
  const entry = getDictionaryEntry(contentId, locale);

  return {
    locale,
    path: entry.path,
    title: entry.title,
    summary: entry.summary,
    seoTitle: entry.seoTitle ?? `${entry.title} | AOHYS`,
    seoDescription: entry.seoDescription,
    primaryActionLabel: entry.primaryActionLabel,
    primaryActionContentId: staticActionContentId(entry.primaryActionContentId),
    secondaryActionLabel: entry.secondaryActionLabel,
    secondaryActionContentId: staticActionContentId(
      entry.secondaryActionContentId,
    ),
  };
}

const nodes = baseNodes.map((node) => ({
  ...node,
  variants: Object.fromEntries(
    LOCALES.map((locale) => [locale, variantFromDictionary(node.id, locale)]),
  ) as Record<Locale, LocaleVariant>,
})) satisfies PublicContentNode[];

export const PUBLIC_CONTENT_NODES: readonly PublicContentNode[] = nodes;

const contentById = new Map(
  PUBLIC_CONTENT_NODES.map((node) => [node.id, node]),
);

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
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function getContentNode(
  contentId: ContentId | string,
): PublicContentNode {
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
  const node =
    typeof nodeOrId === "string" ? getContentNode(nodeOrId) : nodeOrId;
  const variantForLocale = node.variants[locale];

  if (!variantForLocale) {
    throw new MissingLocaleVariantError(node.id, locale);
  }

  return variantForLocale;
}

export function getLocalizedPath(
  contentId: ContentId | string,
  locale: Locale,
): string {
  return getLocaleVariant(contentId, locale).path;
}

export function getHomePageContent(locale: Locale): HomePageContent {
  const home = getDictionaryEntry("home", locale);

  if (!home.homeContent) {
    throw new Error(`Home content is missing for locale "${locale}".`);
  }

  const selectedOutcomes = home.homeContent.selectedOutcomes.map((outcome) => ({
    ...outcome,
    path: getLocalizedPath(outcome.contentId, locale),
  }));
  const selectedOutcomeIds = new Set(
    selectedOutcomes.map((outcome) => outcome.contentId),
  );
  const dashboardOutcomes = DASHBOARD_CASE_STUDY_IDS.filter(
    (contentId) => !selectedOutcomeIds.has(contentId),
  ).map((contentId) => homeOutcomeFromCaseStudy(contentId, locale));

  return {
    ...home.homeContent,
    selectedOutcomes: [...selectedOutcomes, ...dashboardOutcomes],
  };
}

export function getPublicNavigation(locale: Locale): PublicNavigation {
  const home = getDictionaryEntry("home", locale);

  if (!home.publicNavigation) {
    throw new Error(`Public navigation is missing for locale "${locale}".`);
  }

  return {
    brand: home.publicNavigation.brand,
    items: home.publicNavigation.items.map((item) => ({
      ...item,
      href: item.contentId ? getLocalizedPath(item.contentId, locale) : "#",
    })),
    actions: home.publicNavigation.actions.map((action) => ({
      ...action,
      href:
        action.href ??
        (action.contentId ? getLocalizedPath(action.contentId, locale) : "#"),
    })),
    dropdown: {
      ...home.publicNavigation.dropdown,
      items: home.publicNavigation.dropdown.items.map((item) => ({
        id: item.id,
        label: item.label,
        text: item.text,
        icon: item.icon,
        tone: item.tone,
        href: getLocalizedPath(item.contentId, locale),
      })),
    },
  };
}

export function getArchitecturePageContent(
  locale: Locale,
): ArchitecturePageContent {
  const architecture = getDictionaryEntry("architecture", locale);

  if (!architecture.architectureContent) {
    throw new Error(`Architecture content is missing for locale "${locale}".`);
  }

  return architecture.architectureContent;
}

export function getPracticePageContent(locale: Locale): PracticePageContent {
  const practice = getDictionaryEntry("practice", locale);

  if (!practice.practiceContent) {
    throw new Error(`Practice content is missing for locale "${locale}".`);
  }

  return practice.practiceContent;
}

export function getCaseStudyPageContent(
  contentId: ContentId | string,
  locale: Locale,
): CaseStudyPageContent | undefined {
  const node = getContentNode(contentId);

  if (node.type !== "case-study") {
    throw new Error(`Content node "${contentId}" is not a case study.`);
  }

  const caseStudy = getDictionaryEntry(contentId, locale);

  return caseStudy.caseStudyContent;
}

function homeOutcomeFromCaseStudy(
  contentId: ContentId | string,
  locale: Locale,
): HomeOutcome {
  const variant = getLocaleVariant(contentId, locale);
  const caseStudyContent = getCaseStudyPageContent(contentId, locale);
  const i18n = getSharedI18n(locale);

  if (!caseStudyContent) {
    throw new Error(
      `Home selected outcome "${contentId}" is missing detail content in locale "${locale}".`,
    );
  }

  return {
    contentId,
    path: variant.path,
    label: caseStudyContent.statusLabel,
    title: variant.title,
    outcome: variant.summary,
    role: caseStudyContent.role.body,
    evidence: caseStudyContent.publicEvidence[0] ?? {
      label: caseStudyContent.publicEvidenceTitle,
      altText: formatI18n(i18n.caseStudy.previewAlt, { title: variant.title }),
      kind: "public-site",
      publicSafe: true,
    },
  };
}

export function getCaseStudyIndexContent(
  locale: Locale,
): CaseStudyIndexContent {
  const indexVariant = getLocaleVariant("case-studies", locale);

  return {
    heading: indexVariant.title,
    intro: indexVariant.summary,
    entries: CASE_STUDY_IDS.map((contentId) => {
      const variant = getLocaleVariant(contentId, locale);
      const caseStudyContent = getCaseStudyPageContent(contentId, locale);

      if (!caseStudyContent) {
        throw new Error(
          `Case study index entry "${contentId}" is missing detail content in locale "${locale}".`,
        );
      }

      return {
        contentId,
        path: variant.path,
        title: variant.title,
        summary: variant.summary,
        statusLabel: caseStudyContent.statusLabel,
        evidenceLabel:
          caseStudyContent.publicEvidence[0]?.label ??
          caseStudyContent.publicEvidenceTitle,
      };
    }),
  };
}

export function getResumePageContent(locale: Locale): ResumePageContent {
  const resume = getDictionaryEntry("resume", locale);

  if (!resume.resumeContent) {
    throw new Error(`Resume content is missing for locale "${locale}".`);
  }

  return resume.resumeContent;
}

export function getPrivacyPageContent(locale: Locale): PrivacyPageContent {
  const privacy = getDictionaryEntry("privacy", locale);

  if (!privacy.privacyContent) {
    throw new Error(`Privacy content is missing for locale "${locale}".`);
  }

  return privacy.privacyContent;
}

export function getLanguageAlternates(
  contentId: ContentId | string,
): Record<Locale | "x-default", string> {
  const alternates = Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      toAbsoluteUrl(getLocalizedPath(contentId, locale)),
    ]),
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

  return (
    getPublicRouteMap().find((route) => normalizePath(route.path) === path) ??
    null
  );
}

export function getSeoMetadata(
  contentId: ContentId | string,
  locale: Locale,
): SeoMetadata {
  const node = getContentNode(contentId);
  const localizedVariant = getLocaleVariant(node, locale);
  const i18n = getSharedI18n(locale);
  const canonicalUrl = toAbsoluteUrl(localizedVariant.path);
  const staticEvidence = STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID[contentId];
  const evidencePath = staticEvidence?.thumbSrc ?? staticEvidence?.src;
  const socialImagePath =
    contentId !== "home" &&
    evidencePath &&
    /\.(?:jpe?g|png)$/i.test(evidencePath)
      ? evidencePath
      : "/images/social/aohys-social-preview-v1.png";
  const usesEvidenceImage = socialImagePath === evidencePath;
  const socialImageAlt = usesEvidenceImage
    ? formatI18n(i18n.seo.evidencePreviewAlt, { title: localizedVariant.title })
    : i18n.seo.defaultImageAlt;
  const structuredData: SeoStructuredData | undefined =
    contentId === "home"
      ? {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: `${SITE_URL}/`,
          name: "AOHYS",
          inLanguage: [...LOCALES],
        }
      : contentId === "resume"
        ? {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            "@id": `${canonicalUrl}#profile-page`,
            url: canonicalUrl,
            name: localizedVariant.seoTitle,
            description: localizedVariant.seoDescription,
            inLanguage: locale,
            mainEntity: {
              "@type": "Person",
              "@id": `${SITE_URL}/#alejandro-ortiz-corro`,
              name: "Alejandro Ortiz Corro",
              url: `${SITE_URL}/resume`,
              jobTitle: i18n.seo.resumeJobTitle,
              sameAs: [
                "https://www.linkedin.com/in/alejandrortizcrr/",
                "https://github.com/corrortiz",
              ],
            },
          }
        : undefined;

  return {
    lang: locale,
    title: localizedVariant.seoTitle,
    description: localizedVariant.seoDescription,
    canonicalUrl,
    alternates: getLanguageAlternates(contentId),
    robots:
      node.status === "published" && node.sitemap.include
        ? "index,follow"
        : "noindex,nofollow",
    socialImage: {
      url: toAbsoluteUrl(socialImagePath),
      alt: socialImageAlt,
      type: /\.png$/i.test(socialImagePath) ? "image/png" : "image/jpeg",
      ...(usesEvidenceImage ? {} : { width: 1200, height: 630 }),
    },
    structuredData,
  };
}

export function getSitemapEntries(): SitemapEntry[] {
  return getPublicRouteMap()
    .filter(
      (route) =>
        route.node.status === "published" && route.node.sitemap.include,
    )
    .map((route) => ({
      url: route.canonicalUrl,
      alternates: getLanguageAlternates(route.id),
      changefreq: route.node.sitemap.changefreq,
      priority: route.node.sitemap.priority,
    }));
}
