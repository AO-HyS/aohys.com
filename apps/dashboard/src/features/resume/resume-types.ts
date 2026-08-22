export type DashboardLocale = "en" | "es";

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

export interface DashboardResumeVersion {
  id: Id<"resumeVersions">;
  locale: DashboardLocale;
  version: string;
  pdfPath: string;
  isPublished: boolean;
  createdAt: number;
  publishedAt?: number;
}

export interface ResumeContent {
  resumeContent: Record<DashboardLocale, DashboardResumeContent>;
  resumeDrafts: DashboardResumeDraft[];
  resumeVersions: DashboardResumeVersion[];
}
import type { Id } from "@aohys/backend/convex/_generated/dataModel";
