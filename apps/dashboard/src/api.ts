import type {
  DashboardCaseStudyStatus,
  DashboardContentPayload,
  DashboardEvidenceStatus,
  DashboardLead,
  DashboardLeadStatus,
  DashboardLocale,
  DashboardMediaUsage,
  DashboardResumeContent,
} from "@/types";

export interface ProjectDraftRequest {
  contentId: string;
  locale: DashboardLocale;
  status: DashboardCaseStudyStatus;
  evidenceStatus: DashboardEvidenceStatus;
  title: string;
  summary: string;
  seoDescription: string;
  projectUrl?: string;
  ctaLabel: string;
  ctaHref: string;
  achievements: string;
  structureNotes: string;
}

export interface MediaMetadataRequest {
  storageKey: string;
  publicUrl?: string;
  altText: string;
  contentId: string;
  usage: DashboardMediaUsage;
  locale?: DashboardLocale;
}

export interface MediaUploadRequest {
  storageKey: string;
  altText: string;
  contentId: string;
  usage: DashboardMediaUsage;
  locale?: DashboardLocale;
}

export interface MediaUploadResponse {
  ok: true;
  imageId: string;
  publicUrl: string;
  uploadURL: string;
}

export interface SiteSettingRequest {
  key: string;
  value: string;
  classification: "public-build-value";
}

export interface ResumeVersionRequest {
  locale: DashboardLocale;
  version: string;
  pdfPath: string;
  isPublished: boolean;
}

export interface ResumeDraftRequest {
  locale: DashboardLocale;
  contentJson: string;
}

export interface PublishContentRequest {
  scope: "project" | "resume" | "all";
  contentId?: string;
  locale?: DashboardLocale;
}

export interface PublishContentResponse {
  ok: true;
  publishedAt: number;
  projectDraftsPublished: number;
  resumeDraftsPublished: number;
  mediaPublished: number;
  workflow: {
    status: "queued" | "not-configured";
    repository?: string;
    workflowId?: string;
    ref?: string;
    reason?: string;
  };
}

async function dashboardRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/dashboard/api${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = "Dashboard request failed.";

    try {
      const payload = await response.json() as { error?: string };
      message = payload.error ?? message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return await response.json() as T;
}

export function loadDashboardContent(): Promise<DashboardContentPayload> {
  return dashboardRequest<DashboardContentPayload>("/content");
}

export function saveProjectDraft(payload: ProjectDraftRequest): Promise<{ ok: true }> {
  return dashboardRequest<{ ok: true }>("/content/project", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveMediaMetadata(payload: MediaMetadataRequest): Promise<{ ok: true }> {
  return dashboardRequest<{ ok: true }>("/content/media", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      storageProvider: "external",
      status: "draft",
    }),
  });
}

export async function createMediaUpload(payload: MediaUploadRequest): Promise<MediaUploadResponse> {
  return dashboardRequest<MediaUploadResponse>("/content/media/upload-url", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadMediaFile(uploadURL: string, file: File): Promise<void> {
  const form = new FormData();
  form.set("file", file);

  const response = await fetch(uploadURL, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error("Cloudflare accepted the upload URL but the file upload failed.");
  }
}

export function saveSiteSetting(payload: SiteSettingRequest): Promise<{ ok: true }> {
  return dashboardRequest<{ ok: true }>("/content/setting", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveResumeVersion(payload: ResumeVersionRequest): Promise<{ ok: true }> {
  return dashboardRequest<{ ok: true }>("/content/resume", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveResumeDraft(payload: ResumeDraftRequest): Promise<{ ok: true }> {
  return dashboardRequest<{ ok: true }>("/content/resume-draft", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function publishContent(payload: PublishContentRequest): Promise<PublishContentResponse> {
  return dashboardRequest<PublishContentResponse>("/content/publish", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function serializeResumeDraft(content: DashboardResumeContent): string {
  return JSON.stringify(content);
}

export function loadDashboardLeads(): Promise<{ leads: DashboardLead[] }> {
  return dashboardRequest<{ leads: DashboardLead[] }>("/leads");
}

export function saveLeadStatus(
  leadId: string,
  status: DashboardLeadStatus,
): Promise<{ ok: true }> {
  return dashboardRequest<{ ok: true }>("/leads/status", {
    method: "POST",
    body: JSON.stringify({ leadId, status }),
  });
}
