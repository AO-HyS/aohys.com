import { useCallback, useMemo } from "react";
import { api as convexApi } from "@aohys/backend/convex/_generated/api";
import type { Id } from "@aohys/backend/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { buildDashboardProjectRows } from "./projects-model";
import type {
  DashboardCaseStudyStatus,
  DashboardEvidenceStatus,
  DashboardLocale,
  DashboardMediaUsage,
  ProjectsContent,
} from "./projects-types";
import { dashboardRuntimeConfig } from "@/runtime-config";

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
  en: Omit<
    ProjectDraftRequest,
    "contentId" | "locale" | "status" | "evidenceStatus" | "ctaHref"
  > & { localizedSlug: string };
  es: Omit<
    ProjectDraftRequest,
    "contentId" | "locale" | "status" | "evidenceStatus" | "ctaHref"
  > & { localizedSlug: string };
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

export function useProjectsContent(): ProjectsContent | undefined {
  const content = useQuery(convexApi.content.listForDashboard, {});
  const imagesAccountHash = dashboardRuntimeConfig.imagesAccountHash;
  return useMemo(
    () =>
      content
        ? {
            projects: buildDashboardProjectRows(
              content,
              content.media ?? [],
              imagesAccountHash,
            ),
          }
        : undefined,
    [content, imagesAccountHash],
  );
}

export function useSaveProjectDraft() {
  const mutation = useMutation(convexApi.content.upsertProjectDraft);
  return useCallback(
    (payload: ProjectDraftRequest) => mutation(payload),
    [mutation],
  );
}

export function useCreateProject() {
  const mutation = useMutation(convexApi.content.createProject);
  return useCallback(
    (payload: CreateProjectRequest) => mutation(payload),
    [mutation],
  );
}

export function useSaveMediaMetadata() {
  const mutation = useMutation(convexApi.content.createMediaMetadata);
  return useCallback(
    (payload: MediaMetadataRequest) =>
      mutation({
        ...payload,
        storageProvider: payload.storageProvider ?? "external",
        status: "draft",
      }),
    [mutation],
  );
}

export function useSelectProjectMedia() {
  const mutation = useMutation(convexApi.content.selectMediaForPublic);
  return useCallback(
    (payload: MediaSelectionRequest) =>
      mutation({
        mediaId: payload.mediaId as Id<"mediaMetadata">,
        contentId: payload.contentId,
      }),
    [mutation],
  );
}

export function useArchiveProjectMedia() {
  const mutation = useMutation(convexApi.content.archiveMedia);
  return useCallback(
    (payload: MediaSelectionRequest) =>
      mutation({
        mediaId: payload.mediaId as Id<"mediaMetadata">,
        contentId: payload.contentId,
      }),
    [mutation],
  );
}

export function useDeleteProjectMedia() {
  const mutation = useMutation(convexApi.content.deleteMedia);
  return useCallback(
    (payload: MediaSelectionRequest) =>
      mutation({
        mediaId: payload.mediaId as Id<"mediaMetadata">,
        contentId: payload.contentId,
      }),
    [mutation],
  );
}

export function useCreateMediaUpload() {
  const action = useAction(convexApi.contentActions.createMediaUploadUrl);
  return useCallback(
    (payload: MediaUploadRequest): Promise<MediaUploadResponse> =>
      action(payload),
    [action],
  );
}

export async function uploadMediaFile(
  uploadURL: string,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.set("file", file);
  const response = await fetch(uploadURL, { method: "POST", body: form });
  if (!response.ok)
    throw new Error(
      "Cloudflare accepted the upload URL but the file upload failed.",
    );
}

export function usePublishProject() {
  const action = useAction(convexApi.contentActions.publishContent);
  return useCallback(
    (contentId: string): Promise<PublishContentResponse> =>
      action({ scope: "project", contentId }),
    [action],
  );
}
