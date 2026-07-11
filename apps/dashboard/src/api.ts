import { useCallback, useMemo } from "react";
import { api as convexApi } from "@aohys/backend/convex/_generated/api";
import type { Id } from "@aohys/backend/convex/_generated/dataModel";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { buildDashboardContentPayload } from "@/lib/projects";
import { dashboardRuntimeConfig } from "@/runtime-config";
import type {
  DashboardCaseStudyStatus,
  DashboardContentPayload,
  DashboardEvidenceStatus,
  DashboardLead,
  DashboardLeadStatus,
  DashboardLocale,
  DashboardMediaMetadata,
  DashboardMediaUsage,
  DashboardResumeContent,
} from "@/types";

export interface ProjectDraftRequest {
  contentId: string;
  locale: DashboardLocale;
  localizedSlug?: string;
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

export interface CreateProjectRequest {
  contentKey: string;
  status: DashboardCaseStudyStatus;
  evidenceStatus: DashboardEvidenceStatus;
  en: Omit<ProjectDraftRequest, "contentId" | "locale" | "status" | "evidenceStatus" | "ctaHref"> & { localizedSlug: string };
  es: Omit<ProjectDraftRequest, "contentId" | "locale" | "status" | "evidenceStatus" | "ctaHref"> & { localizedSlug: string };
}

export interface MediaMetadataRequest {
  storageProvider?: "cloudflare-images" | "external";
  storageKey: string;
  publicUrl?: string;
  altText: string;
  contentId: string;
  usage: DashboardMediaUsage;
  locale?: DashboardLocale;
  selectedForPublic?: boolean;
}

export interface MediaUploadRequest {
  storageKey: string;
  altText: string;
  contentId: string;
  usage: DashboardMediaUsage;
  locale?: DashboardLocale;
  selectedForPublic?: boolean;
}

export interface MediaSelectionRequest {
  mediaId: string;
  contentId: string;
}

export interface MediaUploadResponse {
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

export function useDashboardContent(): DashboardContentPayload | undefined {
  const content = useQuery(convexApi.content.listForDashboard, {});
  const imagesAccountHash = dashboardRuntimeConfig.imagesAccountHash;

  return useMemo(
    () => content ? buildDashboardContentPayload(content, imagesAccountHash) : undefined,
    [content, imagesAccountHash],
  );
}

export function useDashboardOverview() {
  return useQuery(convexApi.content.getDashboardOverview, {
    environment: dashboardRuntimeConfig.environment,
  });
}

export function useSaveProjectDraft() {
  const saveProjectDraft = useMutation(convexApi.content.upsertProjectDraft);

  return useCallback(
    (payload: ProjectDraftRequest) => saveProjectDraft(payload),
    [saveProjectDraft],
  );
}

export function useCreateProject() {
  const createProject = useMutation(convexApi.content.createProject);
  return useCallback((payload: CreateProjectRequest) => createProject(payload), [createProject]);
}

export function useSaveMediaMetadata() {
  const saveMediaMetadata = useMutation(convexApi.content.createMediaMetadata);

  return useCallback(
    (payload: MediaMetadataRequest) => saveMediaMetadata({
      storageProvider: payload.storageProvider ?? "external",
      status: "draft",
      storageKey: payload.storageKey,
      publicUrl: payload.publicUrl,
      altText: payload.altText,
      contentId: payload.contentId,
      usage: payload.usage,
      locale: payload.locale,
      selectedForPublic: payload.selectedForPublic,
    }),
    [saveMediaMetadata],
  );
}

export function useSelectProjectMedia() {
  const selectProjectMedia = useMutation(convexApi.content.selectMediaForPublic);

  return useCallback(
    (payload: MediaSelectionRequest) => selectProjectMedia({
      mediaId: payload.mediaId as Id<"mediaMetadata">,
      contentId: payload.contentId,
    }),
    [selectProjectMedia],
  );
}

export function useArchiveProjectMedia() {
  const archiveProjectMedia = useMutation(convexApi.content.archiveMedia);

  return useCallback(
    (payload: MediaSelectionRequest) => archiveProjectMedia({
      mediaId: payload.mediaId as Id<"mediaMetadata">,
      contentId: payload.contentId,
    }),
    [archiveProjectMedia],
  );
}

export function useDeleteProjectMedia() {
  const deleteProjectMedia = useMutation(convexApi.content.deleteMedia);

  return useCallback(
    (payload: MediaSelectionRequest) => deleteProjectMedia({
      mediaId: payload.mediaId as Id<"mediaMetadata">,
      contentId: payload.contentId,
    }),
    [deleteProjectMedia],
  );
}

export function useCreateMediaUpload() {
  const createMediaUpload = useAction(convexApi.contentActions.createMediaUploadUrl);

  return useCallback(
    (payload: MediaUploadRequest): Promise<MediaUploadResponse> => createMediaUpload(payload),
    [createMediaUpload],
  );
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

export function useSaveSiteSetting() {
  const saveSiteSetting = useMutation(convexApi.content.upsertSiteSetting);

  return useCallback(
    (payload: SiteSettingRequest) => saveSiteSetting({
      ...payload,
      environment: dashboardRuntimeConfig.environment,
    }),
    [saveSiteSetting],
  );
}

export function useSaveResumeVersion() {
  const saveResumeVersion = useMutation(convexApi.content.createResumeVersion);

  return useCallback(
    (payload: ResumeVersionRequest) => saveResumeVersion(payload),
    [saveResumeVersion],
  );
}

export function useSaveResumeDraft() {
  const saveResumeDraft = useMutation(convexApi.content.upsertResumeDraft);

  return useCallback(
    (payload: ResumeDraftRequest) => saveResumeDraft(payload),
    [saveResumeDraft],
  );
}

export function usePublishContent() {
  const publishContent = useAction(convexApi.contentActions.publishContent);

  return useCallback(
    (payload: PublishContentRequest): Promise<PublishContentResponse> => publishContent(payload),
    [publishContent],
  );
}

export function serializeResumeDraft(content: DashboardResumeContent): string {
  return JSON.stringify(content);
}

export function useDashboardLeads() {
  return usePaginatedQuery(convexApi.leads.listForDashboard, {}, { initialNumItems: 12 });
}

export function useSaveLeadStatus() {
  const saveLeadStatus = useMutation(convexApi.leads.updateStatus);

  return useCallback(
    (leadId: string, status: DashboardLeadStatus) =>
      saveLeadStatus({ leadId: leadId as Id<"leads">, status }),
    [saveLeadStatus],
  );
}
