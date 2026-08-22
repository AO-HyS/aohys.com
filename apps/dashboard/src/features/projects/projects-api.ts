import { useCallback, useMemo } from "react";
import { api as convexApi } from "@aohys/backend/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { buildDashboardProjectRows } from "./projects-model";
import type {
  DashboardCaseStudyStatus,
  DashboardEvidenceStatus,
  DashboardLocale,
  DashboardMediaUsage,
  ProjectsContent,
} from "./projects-types";
import { dashboardRuntimeConfig } from "@/runtime-config";

export type ProjectDraftRequest = FunctionArgs<
  typeof convexApi.content.upsertProjectDraft
>;
export type CreateProjectRequest = FunctionArgs<
  typeof convexApi.content.createProject
>;

type CreateMediaMetadataArgs = FunctionArgs<
  typeof convexApi.content.createMediaMetadata
>;
export type MediaMetadataRequest = Omit<
  CreateMediaMetadataArgs,
  "contentId" | "status" | "storageProvider"
> & {
  contentId: string;
  storageProvider?: CreateMediaMetadataArgs["storageProvider"];
};
type CreateMediaUploadArgs = FunctionArgs<
  typeof convexApi.contentActions.createMediaUploadUrl
>;
export type MediaUploadRequest = Omit<CreateMediaUploadArgs, "contentId"> & {
  contentId: string;
};

export type MediaSelectionRequest = FunctionArgs<
  typeof convexApi.content.selectMediaForPublic
>;
export type MediaUploadResponse = FunctionReturnType<
  typeof convexApi.contentActions.createMediaUploadUrl
>;
export type PublishContentResponse = FunctionReturnType<
  typeof convexApi.contentActions.publishContent
>;

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
            publications: content.publications ?? [],
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
    (payload: MediaSelectionRequest) => mutation(payload),
    [mutation],
  );
}

export function useArchiveProjectMedia() {
  const mutation = useMutation(convexApi.content.archiveMedia);
  return useCallback(
    (payload: MediaSelectionRequest) => mutation(payload),
    [mutation],
  );
}

export function useDeleteProjectMedia() {
  const mutation = useMutation(convexApi.content.deleteMedia);
  return useCallback(
    (payload: MediaSelectionRequest) => mutation(payload),
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
