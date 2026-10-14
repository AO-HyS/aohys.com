import type { ResumePageContent } from "@aohys/content-graph";

export type DashboardLocale = "en" | "es";

export type {
  ResumeEducation,
  ResumeExperience,
  ResumeHighlight,
  ResumeLink,
  ResumePageContent as DashboardResumeContent,
  ResumePdfArtifact,
  ResumeProject,
  ResumeProof,
  ResumeSkillGroup,
} from "@aohys/content-graph";

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
  resumeContent: Record<DashboardLocale, ResumePageContent>;
  resumeDrafts: DashboardResumeDraft[];
  resumeVersions: DashboardResumeVersion[];
  publications?: import("@/lib/publication-state").DashboardPublication[];
}
import type { Id } from "@aohys/backend/convex/_generated/dataModel";
