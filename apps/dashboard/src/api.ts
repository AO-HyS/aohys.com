import type {
  DashboardCaseStudyStatus,
  DashboardContentPayload,
  DashboardEvidenceStatus,
  DashboardLead,
  DashboardLeadStatus,
  DashboardLocale,
  DashboardMediaUsage,
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
