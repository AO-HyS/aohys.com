export type DashboardLocale = "en" | "es";
export type DashboardLeadStatus = "new" | "reviewing" | "closed";
export type DashboardCaseStudyStatus =
  | "production-proof"
  | "active-build"
  | "private-build"
  | "enterprise-confidential"
  | "engineering-practice";
export type DashboardEvidenceStatus = "missing" | "sanitized" | "published";
export type DashboardMediaUsage = "case-study" | "resume" | "architecture" | "site";
export type DashboardMediaStatus = "draft" | "published" | "archived";

export interface DashboardRuntimeConfig {
  adminEmail: string;
  environment: "local" | "preview" | "production";
}

export interface DashboardProjectDraft {
  contentId: string;
  locale: DashboardLocale;
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
  label: string;
  altText: string;
  source: "content-graph" | "media-metadata";
  href?: string;
  src?: string;
  storageKey?: string;
  status?: DashboardMediaStatus;
  usage?: DashboardMediaUsage;
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
  updatedAt: number;
}

export interface DashboardSiteSetting {
  key: string;
  environment: DashboardRuntimeConfig["environment"];
  value: string;
  classification: "public-build-value" | "provider-output" | "policy-value";
  updatedAt: number;
}

export interface DashboardResumeVersion {
  id: string;
  locale: DashboardLocale;
  version: string;
  pdfPath: string;
  isPublished: boolean;
  createdAt: number;
  publishedAt?: number;
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

export interface ResumeLink {
  label: string;
  href: string;
  text: string;
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

export interface DashboardResumeContent {
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

export interface DashboardResumeDraft {
  locale: DashboardLocale;
  contentJson: string;
  updatedAt: number;
  publishedAt?: number;
}

export interface DashboardContentPayload {
  projects: DashboardProject[];
  media: DashboardMediaMetadata[];
  settings: DashboardSiteSetting[];
  resumeContent: Record<DashboardLocale, DashboardResumeContent>;
  resumeDrafts: DashboardResumeDraft[];
  resumeVersions: DashboardResumeVersion[];
}

export interface DashboardLead {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  preferredContactPath?: "email" | "whatsapp";
  consentToContact?: boolean;
  intent: string;
  message: string;
  sourcePath: string;
  locale: DashboardLocale;
  referrer?: string;
  status: DashboardLeadStatus;
  createdAt: number;
  updatedAt: number;
}

declare global {
  interface Window {
    __AOHYS_DASHBOARD__?: DashboardRuntimeConfig;
  }
}
