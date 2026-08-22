export type DashboardLocale = "en" | "es";
export type DashboardCaseStudyStatus =
  | "production-proof"
  | "active-build"
  | "private-build"
  | "enterprise-confidential"
  | "engineering-practice";
export type DashboardEvidenceStatus = "missing" | "sanitized" | "published";
export type DashboardMediaUsage =
  | "case-study"
  | "resume"
  | "architecture"
  | "site";
export type DashboardMediaStatus = "draft" | "published" | "archived";

export interface DashboardProjectDraft {
  contentId: string;
  locale: DashboardLocale;
  localizedSlug?: string;
  title: string;
  summary: string;
  seoDescription: string;
  projectUrl?: string;
  ctaLabel: string;
  ctaHref: string;
  achievements: string;
  structureNotes: string;
  updatedAt: number;
  publishedAt?: number;
}

export interface DashboardProjectLocaleContent {
  locale: DashboardLocale;
  path: string;
  title: string;
  summary: string;
  seoDescription: string;
  ctaLabel: string;
  ctaHref: string;
  overview: string;
  achievements: string;
  structureNotes: string;
  draft?: DashboardProjectDraft;
}

export interface DashboardProjectImage {
  id?: string;
  label: string;
  altText: string;
  source: "content-graph" | "media-metadata";
  href?: string;
  src?: string;
  previewStatus?:
    | "ready"
    | "missing-url"
    | "invalid-reference"
    | "unsupported-provider"
    | "provider-unavailable";
  previewIssue?: string;
  storageKey?: string;
  status?: DashboardMediaStatus;
  usage?: DashboardMediaUsage;
  selectedForPublic?: boolean;
  selectedForPublicAt?: number;
}

export interface DashboardProject {
  contentId: string;
  title: string;
  englishPath: string;
  spanishPath: string;
  sitemapIncluded: boolean;
  status: DashboardCaseStudyStatus;
  evidenceStatus: DashboardEvidenceStatus;
  projectUrl?: string;
  updatedAt: number;
  locales: DashboardProjectLocaleContent[];
  images: DashboardProjectImage[];
}

export interface DashboardMediaMetadata {
  id: string;
  storageProvider: "cloudflare-images" | "cloudflare-r2" | "external";
  storageKey: string;
  publicUrl?: string;
  altText: string;
  contentId?: string;
  usage: DashboardMediaUsage;
  status: DashboardMediaStatus;
  locale?: DashboardLocale;
  selectedForPublic?: boolean;
  selectedForPublicAt?: number;
  updatedAt: number;
}

export interface ProjectsContent {
  projects: DashboardProject[];
}
