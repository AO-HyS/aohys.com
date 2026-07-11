import { useState } from "react";
import {
  useArchiveProjectMedia,
  useCreateMediaUpload,
  useDeleteProjectMedia,
  usePublishContent,
  useSaveMediaMetadata,
  useSaveProjectDraft,
  useSelectProjectMedia,
  uploadMediaFile,
  type MediaMetadataRequest,
  type MediaSelectionRequest,
  type MediaUploadRequest,
  type ProjectDraftRequest,
  type PublishContentResponse,
} from "@/api";
import { toast } from "@/components/ui/sonner";
import { captureDashboardAction } from "@/lib/analytics";
import { validateCloudflareImagesCustomId } from "@/lib/media-upload";
import type {
  DashboardCaseStudyStatus,
  DashboardLocale,
  DashboardProject,
} from "@/types";

export type ProjectFormState = ProjectDraftRequest;

export interface NewProjectInput {
  title: string;
  spanishTitle: string;
  slug: string;
  status: DashboardCaseStudyStatus;
}

export interface MediaUploadIssue {
  title: string;
  description: string;
  detail: string;
  actionLabel: string;
}

export interface ProjectMediaUploadPorts {
  createUpload: (payload: MediaUploadRequest) => Promise<{
    imageId: string;
    publicUrl: string;
    uploadURL: string;
  }>;
  uploadFile: (uploadUrl: string, file: File) => Promise<void>;
  saveMetadata: (payload: MediaMetadataRequest) => Promise<unknown>;
}

export async function runProjectMediaUpload(
  payload: MediaUploadRequest,
  file: File,
  ports: ProjectMediaUploadPorts,
): Promise<void> {
  const storageKey = validateCloudflareImagesCustomId(payload.storageKey);
  if (!storageKey.isValid) throw new MediaUploadValidationError(mediaUploadCustomIdIssue(storageKey.message));

  const normalizedPayload = {
    ...payload,
    storageKey: storageKey.value,
    altText: payload.altText.trim(),
  };
  const upload = await ports.createUpload(normalizedPayload);
  await ports.uploadFile(upload.uploadURL, file);
  await ports.saveMetadata({
    storageProvider: "cloudflare-images",
    storageKey: upload.imageId,
    publicUrl: upload.publicUrl,
    altText: normalizedPayload.altText,
    contentId: payload.contentId,
    usage: payload.usage,
    locale: payload.locale,
    selectedForPublic: payload.selectedForPublic ?? true,
  });
}

export async function runProjectCreation(
  input: NewProjectInput,
  saveDraft: (payload: ProjectDraftRequest) => Promise<unknown>,
): Promise<string> {
  const contentId = `case-study:${input.slug}`;
  await Promise.all([
    saveDraft(buildNewProjectDraft(input, "en")),
    saveDraft(buildNewProjectDraft(input, "es")),
  ]);
  return contentId;
}

export async function runProjectPublication(
  project: Pick<DashboardProject, "contentId">,
  publish: (payload: { scope: "project"; contentId: string }) => Promise<PublishContentResponse>,
): Promise<PublishContentResponse> {
  return publish({ scope: "project", contentId: project.contentId });
}

export function useProjectsWorkflow({
  existingContentIds,
  onProjectCreated,
}: {
  existingContentIds: string[];
  onProjectCreated: (contentId: string) => void;
}) {
  const archiveProjectMedia = useArchiveProjectMedia();
  const createMediaUpload = useCreateMediaUpload();
  const deleteProjectMedia = useDeleteProjectMedia();
  const publishContent = usePublishContent();
  const saveMediaMetadata = useSaveMediaMetadata();
  const saveProjectDraft = useSaveProjectDraft();
  const selectProjectMedia = useSelectProjectMedia();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [publishingKey, setPublishingKey] = useState<string | null>(null);
  const [uploadIssue, setUploadIssue] = useState<MediaUploadIssue | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<MediaSelectionRequest | null>(null);

  async function saveProject(payload: ProjectFormState) {
    const key = `${payload.contentId}:${payload.locale}`;
    const toastId = toast.loading("Saving project draft", { description: `${payload.title} ${payload.locale.toUpperCase()}` });
    setSavingKey(key);
    try {
      await saveProjectDraft(payload);
      captureDashboardAction("succeeded", "projects", "save_project", { locale: payload.locale });
      toast.success("Draft saved", { id: toastId, description: "Publish when this content is ready for the Astro build." });
    } catch (error) {
      captureDashboardAction("failed", "projects", "save_project", errorProperties(error, payload.locale));
      toast.error("Draft save failed", { id: toastId, description: errorMessage(error, "Project draft could not be saved.") });
    } finally {
      setSavingKey(null);
    }
  }

  async function uploadMedia(payload: MediaUploadRequest, file: File) {
    const key = `${payload.contentId}:media`;
    const toastId = toast.loading("Uploading project evidence", { description: "Preparing the reviewed media reference." });
    setSavingKey(key);
    try {
      await runProjectMediaUpload(payload, file, {
        createUpload: createMediaUpload,
        uploadFile: uploadMediaFile,
        saveMetadata: saveMediaMetadata,
      });
      captureDashboardAction("succeeded", "projects", "upload_media", { locale: payload.locale });
      toast.success("Image uploaded", { id: toastId, description: "It is selected for the public Astro build. Publish when ready." });
    } catch (error) {
      captureDashboardAction("failed", "projects", "upload_media", errorProperties(error, payload.locale));
      const issue = error instanceof MediaUploadValidationError ? error.issue : mediaUploadIssueFromError(error);
      setUploadIssue(issue);
      toast.error(issue.title, { id: toastId, description: issue.detail });
    } finally {
      setSavingKey(null);
    }
  }

  async function saveExternalMedia(payload: MediaMetadataRequest) {
    await runSimpleOperation({
      key: `${payload.contentId}:media`,
      loading: "Saving media reference",
      success: "Media reference saved",
      successDescription: "It is selected for the public Astro build. Publish when ready.",
      failure: "Media reference failed",
      fallbackError: "Media reference could not be saved.",
      action: "save_external_media",
      locale: payload.locale,
      operation: () => saveMediaMetadata(payload),
    });
  }

  async function selectMedia(payload: MediaSelectionRequest) {
    await runSimpleOperation({
      key: `${payload.mediaId}:select`,
      loading: "Selecting public image",
      success: "Public image selected",
      successDescription: "This image is the one the Astro build will use for the project.",
      failure: "Image selection failed",
      fallbackError: "The selected image could not be saved.",
      action: "select_media",
      operation: () => selectProjectMedia(payload),
    });
  }

  async function archiveMedia(payload: MediaSelectionRequest) {
    await runSimpleOperation({
      key: `${payload.mediaId}:archive`,
      loading: "Hiding image",
      success: "Image hidden from publish",
      successDescription: "The media record is archived and will not be sent to Astro.",
      failure: "Image could not be hidden",
      fallbackError: "The media record could not be archived.",
      action: "archive_media",
      operation: () => archiveProjectMedia(payload),
    });
  }

  async function confirmDeleteMedia() {
    if (!deleteRequest) return;
    const payload = deleteRequest;
    await runSimpleOperation({
      key: `${payload.mediaId}:delete`,
      loading: "Deleting image",
      success: "Image deleted",
      successDescription: "The media record was removed from the dashboard.",
      failure: "Image could not be deleted",
      fallbackError: "The media record could not be deleted.",
      action: "delete_media",
      operation: () => deleteProjectMedia(payload),
    });
    setDeleteRequest(null);
  }

  async function createProject(input: NewProjectInput) {
    const contentId = `case-study:${input.slug}`;
    if (existingContentIds.includes(contentId)) {
      toast.error("Project slug already exists", { description: "Choose a different slug before creating this draft." });
      return false;
    }

    const toastId = toast.loading("Creating project", { description: input.title });
    setSavingKey("new-project");
    try {
      const createdContentId = await runProjectCreation(input, saveProjectDraft);
      captureDashboardAction("succeeded", "projects", "create_project");
      onProjectCreated(createdContentId);
      toast.success("Project created", { id: toastId, description: "The draft exists in both languages. Save details, attach media, then publish." });
      return true;
    } catch (error) {
      captureDashboardAction("failed", "projects", "create_project", errorProperties(error));
      toast.error("Project creation failed", { id: toastId, description: errorMessage(error, "The project draft could not be created.") });
      return false;
    } finally {
      setSavingKey(null);
    }
  }

  async function publishProject(project: DashboardProject) {
    setPublishingKey(project.contentId);
    const toastId = toast.loading("Publishing project", { description: "Marking reviewed drafts and media for the release train." });
    try {
      const result = await runProjectPublication(project, publishContent);
      captureDashboardAction("succeeded", "projects", "publish_project", { workflow_status: result.workflow.status });
      const description = result.workflow.status === "queued"
        ? `GitHub Actions is rebuilding ${result.workflow.ref ?? "develop"} for ${project.title}.`
        : `${project.title} was marked published, but ${result.workflow.reason ?? "the workflow token is not configured."}`;
      if (result.workflow.status === "queued") toast.success("Publish queued", { id: toastId, description });
      else toast.message("Published in Convex", { id: toastId, description });
    } catch (error) {
      captureDashboardAction("failed", "projects", "publish_project", errorProperties(error));
      toast.error("Publish failed", { id: toastId, description: errorMessage(error, "Project publish could not be queued.") });
    } finally {
      setPublishingKey(null);
    }
  }

  async function runSimpleOperation(config: {
    key: string;
    loading: string;
    success: string;
    successDescription: string;
    failure: string;
    fallbackError: string;
    action: "save_external_media" | "select_media" | "archive_media" | "delete_media";
    locale?: DashboardLocale;
    operation: () => Promise<unknown>;
  }) {
    const toastId = toast.loading(config.loading);
    setSavingKey(config.key);
    try {
      await config.operation();
      captureDashboardAction("succeeded", "projects", config.action, config.locale ? { locale: config.locale } : undefined);
      toast.success(config.success, { id: toastId, description: config.successDescription });
    } catch (error) {
      captureDashboardAction("failed", "projects", config.action, errorProperties(error, config.locale));
      toast.error(config.failure, { id: toastId, description: errorMessage(error, config.fallbackError) });
    } finally {
      setSavingKey(null);
    }
  }

  return {
    savingKey,
    publishingKey,
    uploadIssue,
    deleteRequest,
    clearUploadIssue: () => setUploadIssue(null),
    clearDeleteRequest: () => setDeleteRequest(null),
    requestDeleteMedia: setDeleteRequest,
    saveProject,
    uploadMedia,
    saveExternalMedia,
    selectMedia,
    archiveMedia,
    confirmDeleteMedia,
    createProject,
    publishProject,
  };
}

export function buildNewProjectDraft(input: NewProjectInput, locale: DashboardLocale): ProjectFormState {
  const contentId = `case-study:${input.slug}`;
  const localizedTitle = locale === "en" ? input.title : input.spanishTitle;
  return {
    contentId,
    locale,
    status: input.status,
    evidenceStatus: "missing",
    title: localizedTitle,
    summary: "",
    seoDescription: "",
    ctaLabel: locale === "en" ? "View project" : "Ver proyecto",
    ctaHref: locale === "en" ? `/case-studies/${input.slug}` : `/es/casos/${input.slug}`,
    achievements: "",
    structureNotes: "",
  };
}

class MediaUploadValidationError extends Error {
  constructor(readonly issue: MediaUploadIssue) {
    super(issue.detail);
    this.name = "MediaUploadValidationError";
  }
}

function mediaUploadCustomIdIssue(detail?: string): MediaUploadIssue {
  return {
    title: "Use a relative media key",
    description: "Cloudflare Images needs a safe relative custom ID before it can create an upload slot.",
    detail: detail ?? "Use a value like media/casa-roca/hero without URLs, dot folders, traversal, or query fragments.",
    actionLabel: "Review media key",
  };
}

function mediaUploadIssueFromError(error: unknown): MediaUploadIssue {
  return {
    title: "Media upload failed",
    description: "The evidence asset was not registered. No publication state changed.",
    detail: errorMessage(error, "The provider did not complete the media upload."),
    actionLabel: "Review and retry",
  };
}

function errorProperties(error: unknown, locale?: DashboardLocale) {
  return {
    error_type: error instanceof Error ? error.name : "UnknownError",
    ...(locale ? { locale } : {}),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
