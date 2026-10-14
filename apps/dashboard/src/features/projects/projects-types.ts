export interface DashboardProjectDraft {
  contentId: string;
  locale: Locale;
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
  locale: Locale;
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
  id?: Id<"mediaMetadata">;
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
  status?: MediaStatus;
  usage?: MediaUsage;
  selectedForPublic?: boolean;
  selectedForPublicAt?: number;
}

export interface DashboardProject {
  contentId: string;
  title: string;
  englishPath: string;
  spanishPath: string;
  sitemapIncluded: boolean;
  status: CaseStudyStatus;
  evidenceStatus: CaseStudyEvidenceStatus;
  projectUrl?: string;
  updatedAt: number;
  locales: DashboardProjectLocaleContent[];
  images: DashboardProjectImage[];
}

export interface DashboardMediaMetadata {
  id: Id<"mediaMetadata">;
  storageProvider: MediaStorageProvider;
  storageKey: string;
  publicUrl?: string;
  altText: string;
  contentId?: string;
  usage: MediaUsage;
  status: MediaStatus;
  locale?: Locale;
  selectedForPublic?: boolean;
  selectedForPublicAt?: number;
  updatedAt: number;
}

export interface ProjectsContent {
  projects: DashboardProject[];
  publications?: import("@/lib/publication-state").DashboardPublication[];
}
import type { Id } from "@aohys/backend/convex/_generated/dataModel";
import {
  type CaseStudyEvidenceStatus,
  type CaseStudyStatus,
  type Locale,
  type MediaStatus,
  type MediaStorageProvider,
  type MediaUsage,
} from "@aohys/core/domain";
