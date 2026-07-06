import { useEffect, useMemo, useState } from "react";
import {
  CircleAlertIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  LoaderCircleIcon,
  PlusIcon,
  RocketIcon,
  SaveIcon,
  Trash2Icon,
  UploadCloudIcon,
} from "lucide-react";
import {
  useArchiveProjectMedia,
  useCreateMediaUpload,
  useDashboardContent,
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
} from "@/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { cn, dashboardClass } from "@/lib/dashboard-classes";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  DashboardCaseStudyStatus,
  DashboardEvidenceStatus,
  DashboardLocale,
  DashboardProject,
  DashboardProjectLocaleContent,
} from "@/types";

type ProjectFormState = ProjectDraftRequest;

interface NewProjectInput {
  title: string;
  spanishTitle: string;
  slug: string;
  status: DashboardCaseStudyStatus;
}

interface MediaUploadIssue {
  title: string;
  description: string;
  detail: string;
  actionLabel: string;
}

const caseStudyStatuses: DashboardCaseStudyStatus[] = [
  "production-proof",
  "active-build",
  "private-build",
  "enterprise-confidential",
  "engineering-practice",
];

const evidenceStatuses: DashboardEvidenceStatus[] = ["missing", "sanitized", "published"];

export function ProjectsScreen() {
  const content = useDashboardContent();
  const archiveProjectMedia = useArchiveProjectMedia();
  const createMediaUpload = useCreateMediaUpload();
  const deleteProjectMedia = useDeleteProjectMedia();
  const publishContent = usePublishContent();
  const saveMediaMetadata = useSaveMediaMetadata();
  const saveProjectDraft = useSaveProjectDraft();
  const selectProjectMedia = useSelectProjectMedia();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [publishingKey, setPublishingKey] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [uploadIssue, setUploadIssue] = useState<MediaUploadIssue | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<MediaSelectionRequest | null>(null);

  useEffect(() => {
    if (!content?.projects.length) {
      return;
    }

    setSelectedProjectId((current) =>
      current && content.projects.some((project) => project.contentId === current)
        ? current
        : content.projects[0]?.contentId,
    );
  }, [content]);

  async function handleSaveProject(payload: ProjectFormState) {
    const key = `${payload.contentId}:${payload.locale}`;
    const toastId = toast.loading("Saving project draft", {
      description: `${payload.title} ${payload.locale.toUpperCase()}`,
    });
    setSavingKey(key);

    try {
      await saveProjectDraft(payload);
      toast.success("Draft saved", {
        id: toastId,
        description: "Publish when this content is ready for the Astro build.",
      });
    } catch (error) {
      toast.error("Draft save failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Project draft could not be saved.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleUploadMedia(payload: MediaUploadRequest, file: File) {
    const key = `${payload.contentId}:media`;
    const toastId = toast.loading("Preparing media upload", {
      description: "Requesting a Cloudflare Images direct upload URL.",
    });
    setSavingKey(key);

    try {
      const upload = await createMediaUpload(payload);
      toast.loading("Uploading image", {
        id: toastId,
        description: "Cloudflare accepted the upload slot. Sending the selected file now.",
      });
      await uploadMediaFile(upload.uploadURL, file);
      toast.loading("Saving media reference", {
        id: toastId,
        description: "The file upload completed. Registering it as the selected Astro image.",
      });
      await saveMediaMetadata({
        storageProvider: "cloudflare-images",
        storageKey: upload.imageId,
        publicUrl: upload.publicUrl,
        altText: payload.altText,
        contentId: payload.contentId,
        usage: payload.usage,
        locale: payload.locale,
        selectedForPublic: payload.selectedForPublic ?? true,
      });
      toast.success("Image uploaded", {
        id: toastId,
        description: "It is selected for the public Astro build. Publish when ready.",
      });
    } catch (error) {
      const issue = mediaUploadIssueFromError(error);

      setUploadIssue(issue);
      toast.error("Media upload failed", {
        id: toastId,
        description: issue.detail,
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleSaveExternalMedia(payload: MediaMetadataRequest) {
    const key = `${payload.contentId}:media`;
    const toastId = toast.loading("Saving media reference", {
      description: "Registering the public image URL for this project.",
    });
    setSavingKey(key);

    try {
      await saveMediaMetadata(payload);
      toast.success("Media reference saved", {
        id: toastId,
        description: "It is selected for the public Astro build. Publish when ready.",
      });
    } catch (error) {
      toast.error("Media reference failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Media reference could not be saved.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleSelectMedia(payload: MediaSelectionRequest) {
    const key = `${payload.mediaId}:select`;
    const toastId = toast.loading("Selecting public image");
    setSavingKey(key);

    try {
      await selectProjectMedia(payload);
      toast.success("Public image selected", {
        id: toastId,
        description: "This image is the one the Astro build will use for the project.",
      });
    } catch (error) {
      toast.error("Image selection failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "The selected image could not be saved.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleArchiveMedia(payload: MediaSelectionRequest) {
    const key = `${payload.mediaId}:archive`;
    const toastId = toast.loading("Hiding image");
    setSavingKey(key);

    try {
      await archiveProjectMedia(payload);
      toast.success("Image hidden from publish", {
        id: toastId,
        description: "The media record is archived and will not be sent to Astro.",
      });
    } catch (error) {
      toast.error("Image could not be hidden", {
        id: toastId,
        description: error instanceof Error ? error.message : "The media record could not be archived.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  function handleDeleteMedia(payload: MediaSelectionRequest) {
    setDeleteRequest(payload);
  }

  async function handleConfirmDeleteMedia() {
    if (!deleteRequest) {
      return;
    }

    const payload = deleteRequest;
    const key = `${payload.mediaId}:delete`;
    const toastId = toast.loading("Deleting image");
    setSavingKey(key);

    try {
      await deleteProjectMedia(payload);
      toast.success("Image deleted", {
        id: toastId,
        description: "The media record was removed from the dashboard.",
      });
    } catch (error) {
      toast.error("Image could not be deleted", {
        id: toastId,
        description: error instanceof Error ? error.message : "The media record could not be deleted.",
      });
    } finally {
      setSavingKey(null);
      setDeleteRequest(null);
    }
  }

  async function handleCreateProject(input: NewProjectInput) {
    const contentId = `case-study:${input.slug}`;

    if (content?.projects.some((project) => project.contentId === contentId)) {
      toast.error("Project slug already exists", {
        description: "Choose a different slug before creating this draft.",
      });
      return;
    }

    const toastId = toast.loading("Creating project", {
      description: input.title,
    });
    setSavingKey("new-project");

    try {
      await Promise.all([
        saveProjectDraft(buildNewProjectDraft(input, "en")),
        saveProjectDraft(buildNewProjectDraft(input, "es")),
      ]);
      setSelectedProjectId(contentId);
      toast.success("Project created", {
        id: toastId,
        description: "The draft exists in both languages. Save details, attach media, then publish.",
      });
    } catch (error) {
      toast.error("Project creation failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "The project draft could not be created.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handlePublishProject(project: DashboardProject) {
    setPublishingKey(project.contentId);
    const toastId = toast.loading("Publishing project", {
      description: "Marking reviewed drafts and media for the release train.",
    });

    try {
      const result = await publishContent({ scope: "project", contentId: project.contentId });
      const description = result.workflow.status === "queued"
          ? `GitHub Actions is rebuilding ${result.workflow.ref ?? "develop"} for ${project.title}.`
          : `${project.title} was marked published, but ${result.workflow.reason ?? "the workflow token is not configured."}`;
      if (result.workflow.status === "queued") {
        toast.success("Publish queued", { id: toastId, description });
      } else {
        toast.message("Published in Convex", { id: toastId, description });
      }
    } catch (error) {
      toast.error("Publish failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "Project publish could not be queued.",
      });
    } finally {
      setPublishingKey(null);
    }
  }

  const activeDeleteKey = deleteRequest ? `${deleteRequest.mediaId}:delete` : null;

  if (!content) {
    return <ProjectsSkeleton />;
  }

  return (
    <div className={dashboardClass.workspace}>
      <PageHeading
        eyebrow="Projects"
        title="Project workspace"
        description="Edit stories, outcomes, structure, images, CTA, URL, and SEO metadata. Save keeps work private; Publish sends reviewed content through the release train."
        action={
          <Button
            type="button"
            variant={isCreateOpen ? "secondary" : "default"}
            onClick={() => setIsCreateOpen((current) => !current)}
          >
            <PlusIcon data-icon="inline-start" />
            New project
          </Button>
        }
      />

      {content ? (
        <>
          {isCreateOpen ? (
            <NewProjectCard
              existingContentIds={content.projects.map((project) => project.contentId)}
              isSaving={savingKey === "new-project"}
              onCreate={async (input) => {
                await handleCreateProject(input);
                setIsCreateOpen(false);
              }}
            />
          ) : null}

          <Tabs
            value={selectedProjectId ?? content.projects[0]?.contentId}
            onValueChange={setSelectedProjectId}
            orientation="vertical"
            className={dashboardClass.projectShell}
          >
            <ProjectTabs projects={content.projects} />
            <div className="min-w-0">
              {content.projects.map((project) => (
                <TabsContent key={project.contentId} value={project.contentId} className="mt-0">
                  <ProjectEditor
                    project={project}
                    isPublishing={publishingKey === project.contentId}
                    savingKey={savingKey}
                    onPublish={() => handlePublishProject(project)}
                    onArchiveMedia={handleArchiveMedia}
                    onDeleteMedia={handleDeleteMedia}
                    onSelectMedia={handleSelectMedia}
                    onSaveExternalMedia={handleSaveExternalMedia}
                    onSaveMedia={handleUploadMedia}
                    onSaveProject={handleSaveProject}
                  />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </>
      ) : null}
      <MediaUploadIssueDialog
        issue={uploadIssue}
        onOpenChange={(open) => {
          if (!open) {
            setUploadIssue(null);
          }
        }}
      />
      <DeleteMediaDialog
        open={Boolean(deleteRequest)}
        isDeleting={activeDeleteKey !== null && savingKey === activeDeleteKey}
        onOpenChange={(open) => {
          if (!open && savingKey !== activeDeleteKey) {
            setDeleteRequest(null);
          }
        }}
        onConfirm={handleConfirmDeleteMedia}
      />
    </div>
  );
}

function MediaUploadIssueDialog({
  issue,
  onOpenChange,
}: {
  issue: MediaUploadIssue | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={Boolean(issue)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <CircleAlertIcon aria-hidden="true" />
          </div>
          <AlertDialogTitle>{issue?.title ?? "Image upload failed"}</AlertDialogTitle>
          <AlertDialogDescription>
            {issue?.description ?? "The selected image could not be uploaded."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {issue?.detail ? (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm leading-6 text-muted-foreground">
            {issue.detail}
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction>{issue?.actionLabel ?? "Got it"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteMediaDialog({
  open,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2Icon aria-hidden="true" />
          </div>
          <AlertDialogTitle>Delete dashboard media?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the media record from the dashboard. Publish afterwards if the public Astro image should change.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20"
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
          >
            {isDeleting ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <Trash2Icon data-icon="inline-start" />}
            Delete image
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function mediaUploadIssueFromError(error: unknown): MediaUploadIssue {
  const detail = error instanceof Error ? error.message : "Image upload could not be completed.";

  if (detail.toLowerCase().includes("cloudflare images upload is not configured")) {
    return {
      title: "Cloudflare Images upload is not configured",
      description: "This environment is missing the Cloudflare Images runtime configuration required to create direct upload slots.",
      detail: "Configure the Images account hash and narrow API token in the release environment, sync them to Convex, then retry the upload.",
      actionLabel: "Got it",
    };
  }

  return {
    title: "Image upload failed",
    description: "The direct upload did not complete. The selected file was not saved to the dashboard.",
    detail,
    actionLabel: "Got it",
  };
}

function ProjectTabs({ projects }: { projects: DashboardProject[] }) {
  return (
    <aside className={dashboardClass.projectNavPanel}>
      <div className={dashboardClass.projectNavHeader}>
        <div className={dashboardClass.projectNavLabel}>Projects</div>
        <Badge variant="outline">{projects.length}</Badge>
      </div>
      <TabsList className={dashboardClass.projectTabsList}>
        {projects.map((project) => (
          <TabsTrigger key={project.contentId} value={project.contentId} className={dashboardClass.projectTabTrigger}>
            <span className={dashboardClass.projectTabCopy}>
              <span className={dashboardClass.projectTabTitle}>{project.title}</span>
              <small className={dashboardClass.projectTabMeta}>{formatProjectStatus(project.status)}</small>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </aside>
  );
}

function NewProjectCard({
  existingContentIds,
  isSaving,
  onCreate,
}: {
  existingContentIds: string[];
  isSaving: boolean;
  onCreate: (input: NewProjectInput) => void | Promise<void>;
}) {
  const [form, setForm] = useState<NewProjectInput>({
    title: "",
    spanishTitle: "",
    slug: "",
    status: "active-build",
  });

  function update<K extends keyof NewProjectInput>(key: K, value: NewProjectInput[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "title" && !current.slug ? { slug: slugifyProjectTitle(String(value)) } : {}),
    }));
  }

  const normalizedSlug = form.slug.trim().toLowerCase();
  const nextContentId = `case-study:${normalizedSlug}`;
  const slugExists = isSafeProjectSlug(normalizedSlug) && existingContentIds.includes(nextContentId);
  const canCreate = Boolean(
    form.title.trim()
    && form.spanishTitle.trim()
    && isSafeProjectSlug(normalizedSlug)
    && !slugExists,
  );

  return (
    <Card className={dashboardClass.cardShadow}>
      <CardHeader className={dashboardClass.cardHeaderRule}>
        <div>
          <CardTitle>Create project</CardTitle>
          <CardDescription>Add a new public case-study draft. It appears in the dashboard immediately and in Astro after publish/build.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!canCreate) {
                return;
              }
              void onCreate({
                ...form,
                slug: normalizedSlug,
                title: form.title.trim(),
                spanishTitle: form.spanishTitle.trim(),
              });
            }}
          >
            <FieldGroup className={dashboardClass.newProjectForm}>
              <Field>
                <FieldLabel htmlFor="new-project-title">English title</FieldLabel>
                <Input
                  id="new-project-title"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Project name"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-project-spanish-title">Spanish title</FieldLabel>
                <Input
                  id="new-project-spanish-title"
                  value={form.spanishTitle}
                  onChange={(event) => update("spanishTitle", event.target.value)}
                  placeholder="Nombre del proyecto"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-project-slug">Slug</FieldLabel>
                <Input
                  id="new-project-slug"
                  value={form.slug}
                  onChange={(event) => update("slug", slugifyProjectTitle(event.target.value))}
                  placeholder="project-slug"
                />
                <FieldDescription>
                  {slugExists
                    ? "This project slug already exists."
                    : `Creates case-study:${normalizedSlug || "project-slug"}.`}
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select value={form.status} onValueChange={(value) => update("status", value as DashboardCaseStudyStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {caseStudyStatuses.map((status) => (
                        <SelectItem key={status} value={status}>{formatProjectStatus(status)}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Button type="submit" disabled={isSaving || !canCreate}>
                {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <PlusIcon data-icon="inline-start" />}
                Create draft
              </Button>
            </FieldGroup>
          </form>
      </CardContent>
    </Card>
  );
}

function ProjectEditor({
  project,
  isPublishing,
  savingKey,
  onPublish,
  onSaveProject,
  onSaveMedia,
  onSaveExternalMedia,
  onSelectMedia,
  onArchiveMedia,
  onDeleteMedia,
}: {
  project: DashboardProject;
  isPublishing: boolean;
  savingKey: string | null;
  onPublish: () => void | Promise<void>;
  onSaveProject: (payload: ProjectFormState) => void | Promise<void>;
  onSaveMedia: (payload: MediaUploadRequest, file: File) => void | Promise<void>;
  onSaveExternalMedia: (payload: MediaMetadataRequest) => void | Promise<void>;
  onSelectMedia: (payload: MediaSelectionRequest) => void | Promise<void>;
  onArchiveMedia: (payload: MediaSelectionRequest) => void | Promise<void>;
  onDeleteMedia: (payload: MediaSelectionRequest) => void | Promise<void>;
}) {
  return (
    <div className={dashboardClass.projectEditorGrid}>
      <div className={dashboardClass.projectColumn}>
        <ProjectSummaryCard project={project} isPublishing={isPublishing} onPublish={onPublish} />
        <Card className={dashboardClass.localeEditor}>
          <Tabs defaultValue="en" className={dashboardClass.localeEditor}>
            <CardHeader className={dashboardClass.localeHeader}>
              <div>
                <CardTitle>Localized content</CardTitle>
                <CardDescription>Choose the language, edit the draft, then save before publishing.</CardDescription>
              </div>
              <CardAction>
                <TabsList className={dashboardClass.localeTabsList}>
                  {project.locales.map((localeContent) => (
                    <TabsTrigger key={localeContent.locale} value={localeContent.locale}>
                      {localeContent.locale === "en" ? "English" : "Spanish"}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardAction>
            </CardHeader>
            <CardContent>
              {project.locales.map((localeContent) => (
                <TabsContent key={`${project.contentId}:${localeContent.locale}`} value={localeContent.locale} className="mt-0">
                  <ProjectLocaleForm
                    localeContent={localeContent}
                    project={project}
                    isSaving={savingKey === `${project.contentId}:${localeContent.locale}`}
                    onSave={onSaveProject}
                  />
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      </div>
      <aside className={dashboardClass.projectColumn}>
        <ProjectImagesCard
          project={project}
          savingKey={savingKey}
          onSelectMedia={onSelectMedia}
          onArchiveMedia={onArchiveMedia}
          onDeleteMedia={onDeleteMedia}
        />
        <ImageUploadForm
          project={project}
          isSaving={savingKey === `${project.contentId}:media`}
          onSave={onSaveMedia}
          onSaveExternal={onSaveExternalMedia}
        />
      </aside>
    </div>
  );
}

function ProjectSummaryCard({
  project,
  isPublishing,
  onPublish,
}: {
  project: DashboardProject;
  isPublishing: boolean;
  onPublish: () => void | Promise<void>;
}) {
  const latestDraft = project.locales
    .map((localeContent) => localeContent.draft)
    .filter(Boolean)
    .sort((a, b) => (b?.updatedAt ?? 0) - (a?.updatedAt ?? 0))[0];
  const latestPublished = project.locales
    .map((localeContent) => localeContent.draft?.publishedAt)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => b - a)[0];

  return (
    <Card className={dashboardClass.projectSummaryCard}>
      <CardHeader className={dashboardClass.projectSummaryHeader}>
        <div className="min-w-0">
          <CardTitle className={dashboardClass.projectSummaryTitle}>{project.title}</CardTitle>
          <CardDescription className={dashboardClass.projectSummaryPaths}>
            {project.englishPath} · {project.spanishPath}
          </CardDescription>
        </div>
        <CardAction className={dashboardClass.projectSummaryBadges}>
          <Badge variant="secondary">{formatProjectStatus(project.status)}</Badge>
          <Badge variant={project.evidenceStatus === "published" ? "default" : "outline"}>
            {formatReferenceState(project.evidenceStatus)}
          </Badge>
          <Badge variant="outline">{project.sitemapIncluded ? "In sitemap" : "Noindex"}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className={dashboardClass.projectSummaryContent}>
        {project.projectUrl ? (
          <a className={dashboardClass.projectSummaryUrl} href={project.projectUrl} target="_blank" rel="noreferrer">
            {project.projectUrl}
            <ExternalLinkIcon data-icon="inline-end" />
          </a>
        ) : (
          <span className={cn(dashboardClass.projectSummaryUrl, dashboardClass.projectSummaryUrlEmpty)}>No public URL yet</span>
        )}
        <div className={dashboardClass.publishBar}>
          <div className={dashboardClass.publishMeta}>
            <span>Saved {latestDraft ? formatDate(latestDraft.updatedAt) : "never"}</span>
            <span>Published {latestPublished ? formatDate(latestPublished) : "never"}</span>
          </div>
          <Button type="button" onClick={() => void onPublish()} disabled={isPublishing}>
            {isPublishing ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <RocketIcon data-icon="inline-start" />}
            Publish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectLocaleForm({
  project,
  localeContent,
  isSaving,
  onSave,
}: {
  project: DashboardProject;
  localeContent: DashboardProjectLocaleContent;
  isSaving: boolean;
  onSave: (payload: ProjectFormState) => void | Promise<void>;
}) {
  const initialForm = useMemo(() => ({
    contentId: project.contentId,
    locale: localeContent.locale,
    status: project.status,
    evidenceStatus: project.evidenceStatus,
    title: localeContent.draft?.title ?? localeContent.title,
    summary: localeContent.draft?.summary ?? localeContent.summary,
    seoDescription: localeContent.draft?.seoDescription ?? localeContent.seoDescription,
    projectUrl: localeContent.draft?.projectUrl ?? project.projectUrl ?? "",
    ctaLabel: localeContent.draft?.ctaLabel ?? localeContent.ctaLabel,
    ctaHref: localeContent.draft?.ctaHref ?? localeContent.ctaHref,
    achievements: localeContent.draft?.achievements ?? localeContent.achievements,
    structureNotes: localeContent.draft?.structureNotes ?? localeContent.structureNotes,
  }), [localeContent, project]);
  const [form, setForm] = useState<ProjectFormState>(initialForm);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

  function update<K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className={dashboardClass.editForm}
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(form);
      }}
    >
      <div className={dashboardClass.projectFormHeader}>
        <div>
          <h2>{localeContent.locale === "en" ? "English content" : "Spanish content"}</h2>
          <p>
            {localeContent.path} · {localeContent.draft ? "private dashboard draft" : "public content graph"}
          </p>
        </div>
        <Badge variant={hasChanges ? "secondary" : "outline"}>
          {hasChanges ? "Unsaved changes" : "Up to date"}
        </Badge>
      </div>
          <FieldSet>
            <FieldLegend>Identity</FieldLegend>
            <FieldGroup>
              <div className={dashboardClass.formGrid3}>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select
                    value={form.status}
                    onValueChange={(value) => update("status", value as DashboardCaseStudyStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {caseStudyStatuses.map((status) => (
                          <SelectItem key={status} value={status}>{formatProjectStatus(status)}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Public link state</FieldLabel>
                  <Select
                    value={form.evidenceStatus}
                    onValueChange={(value) => update("evidenceStatus", value as DashboardEvidenceStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {evidenceStatuses.map((status) => (
                          <SelectItem key={status} value={status}>{formatReferenceState(status)}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Project URL</FieldLabel>
                  <Input
                    value={form.projectUrl ?? ""}
                    onChange={(event) => update("projectUrl", event.target.value)}
                    placeholder="https://example.com"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input value={form.title} onChange={(event) => update("title", event.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Summary</FieldLabel>
                <Textarea
                  value={form.summary}
                  onChange={(event) => update("summary", event.target.value)}
                  rows={4}
                />
              </Field>
              <Field>
                <FieldLabel>SEO description</FieldLabel>
                <Textarea
                  value={form.seoDescription}
                  onChange={(event) => update("seoDescription", event.target.value)}
                  rows={4}
                />
                <FieldDescription>Write for search results and humans. No vague proof language.</FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Outcome and structure</FieldLegend>
            <FieldGroup>
              <div className={dashboardClass.formGrid2}>
                <Field>
                  <FieldLabel>CTA label</FieldLabel>
                  <Input value={form.ctaLabel} onChange={(event) => update("ctaLabel", event.target.value)} />
                </Field>
                <Field>
                  <FieldLabel>CTA href</FieldLabel>
                  <Input value={form.ctaHref} onChange={(event) => update("ctaHref", event.target.value)} />
                </Field>
              </div>
              <Field>
                <FieldLabel>Business outcome</FieldLabel>
                <Textarea
                  value={form.achievements}
                  onChange={(event) => update("achievements", event.target.value)}
                  rows={7}
                />
              </Field>
              <Field>
                <FieldLabel>Project structure</FieldLabel>
                <Textarea
                  value={form.structureNotes}
                  onChange={(event) => update("structureNotes", event.target.value)}
                  rows={7}
                />
              </Field>
            </FieldGroup>
          </FieldSet>

          <div className={dashboardClass.formActionRow}>
            <span aria-live="polite">
              {isSaving ? "Saving..." : hasChanges ? "Draft has local changes." : "No unsaved changes."}
            </span>
            <Button type="submit" disabled={isSaving || !hasChanges}>
              {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
              Save {localeContent.locale.toUpperCase()}
            </Button>
          </div>
    </form>
  );
}

function ProjectImagesCard({
  project,
  savingKey,
  onSelectMedia,
  onArchiveMedia,
  onDeleteMedia,
}: {
  project: DashboardProject;
  savingKey: string | null;
  onSelectMedia: (payload: MediaSelectionRequest) => void | Promise<void>;
  onArchiveMedia: (payload: MediaSelectionRequest) => void | Promise<void>;
  onDeleteMedia: (payload: MediaSelectionRequest) => void | Promise<void>;
}) {
  const mediaImages = project.images.filter((image) => image.source === "media-metadata");
  const selectedImage = mediaImages.find((image) => image.selectedForPublic && image.status !== "archived");
  const fallbackImage = selectedImage
    ? null
    : mediaImages.find((image) => image.status === "published")
      ?? mediaImages.find((image) => image.status !== "archived")
      ?? project.images.find((image) => image.source === "content-graph");
  const previewImage = selectedImage ?? fallbackImage;
  const selectedImageMissingPreview = selectedImage?.previewStatus === "missing-url";

  return (
    <Card className={dashboardClass.cardShadow}>
      <CardHeader className={dashboardClass.mediaCardHeader}>
        <CardTitle>Project media</CardTitle>
        <CardDescription>Choose the exact image that the Astro landing and case-study pages should use.</CardDescription>
      </CardHeader>
      <CardContent className={dashboardClass.mediaList}>
        <div className={dashboardClass.mediaSelectedPreview}>
          <MediaImage
            src={previewImage?.src}
            alt={previewImage?.altText ?? "No project image"}
            className={dashboardClass.mediaPreviewFrame}
            missingLabel={selectedImageMissingPreview ? "Preview URL missing" : undefined}
          />
          <div className={dashboardClass.mediaPreviewCopy}>
            <span className={selectedImage ? dashboardClass.mediaSelectedLabel : undefined}>
              {selectedImage ? "Selected for Astro" : "No dashboard image selected"}
            </span>
            {previewImage ? <strong>{previewImage.label}</strong> : null}
            <p>
              {selectedImageMissingPreview
                ? "This selected media record is missing a public image URL, so Astro will keep using another available project image until this is deleted or re-uploaded."
                : selectedImage
                ? previewImage?.altText
                : "Choose Use in Astro on one media row to make the public image explicit."}
            </p>
          </div>
        </div>

        {project.images.length > 0 ? project.images.map((image) => (
          <div
            key={`${image.source}:${image.label}:${image.storageKey ?? image.href ?? image.src ?? ""}`}
            className={cn(dashboardClass.mediaRow, image.selectedForPublic && dashboardClass.mediaRowSelected)}
          >
            <MediaImage
              src={image.src}
              alt={image.altText}
              className={dashboardClass.mediaThumb}
              missingLabel={image.previewStatus === "missing-url" ? "Preview URL missing" : undefined}
            />
            <div className={dashboardClass.mediaRowBody}>
              <div className={dashboardClass.mediaRowTitle}>{image.label}</div>
              <p className={dashboardClass.mediaRowText}>{image.altText}</p>
              <div className={dashboardClass.mediaRowTags}>
                <Badge variant="secondary">{image.source === "media-metadata" ? "Dashboard media" : "Content graph"}</Badge>
                {image.status ? <Badge variant="outline">{image.status}</Badge> : null}
                {image.previewStatus === "missing-url" ? <Badge variant="outline">Preview URL missing</Badge> : null}
                {image.selectedForPublic ? <Badge>Astro image</Badge> : null}
              </div>
              <div className={dashboardClass.mediaRowActions}>
                {image.id && image.status !== "archived" ? (
                  <Button
                    type="button"
                    variant={image.selectedForPublic ? "secondary" : "outline"}
                    size="sm"
                    disabled={savingKey === `${image.id}:select` || !image.src}
                    title={!image.src ? "This media record is missing a public image URL." : undefined}
                    onClick={() => void onSelectMedia({ mediaId: image.id!, contentId: project.contentId })}
                  >
                    {savingKey === `${image.id}:select` ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <EyeIcon data-icon="inline-start" />}
                    Use in Astro
                  </Button>
                ) : null}
                {image.id && image.status !== "archived" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={savingKey === `${image.id}:archive`}
                    onClick={() => void onArchiveMedia({ mediaId: image.id!, contentId: project.contentId })}
                  >
                    {savingKey === `${image.id}:archive` ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <EyeOffIcon data-icon="inline-start" />}
                    Hide
                  </Button>
                ) : null}
                {image.id ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={savingKey === `${image.id}:delete`}
                    onClick={() => void onDeleteMedia({ mediaId: image.id!, contentId: project.contentId })}
                  >
                    {savingKey === `${image.id}:delete` ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <Trash2Icon data-icon="inline-start" />}
                    Delete
                  </Button>
                ) : null}
                {image.href ? (
                  <Button asChild variant="link" size="sm" className="h-auto p-0">
                    <a href={image.href} target="_blank" rel="noreferrer">
                      Open
                      <ExternalLinkIcon data-icon="inline-end" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        )) : (
          <p className={dashboardClass.mediaEmptyNote}>No project media has been attached yet. Add an image below to give this case study a public visual.</p>
        )}
      </CardContent>
    </Card>
  );
}

function MediaImage({
  src,
  alt,
  className,
  missingLabel = "Preview URL missing",
}: {
  src?: string;
  alt: string;
  className?: string;
  missingLabel?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div className={cn(dashboardClass.mediaImageEmpty, className)} role="img" aria-label={alt}>
        <ImageIcon aria-hidden="true" />
        <small>{failedSrc === src && src ? "Image not reachable" : missingLabel}</small>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}

function ImageUploadForm({
  project,
  isSaving,
  onSave,
  onSaveExternal,
}: {
  project: DashboardProject;
  isSaving: boolean;
  onSave: (payload: MediaUploadRequest, file: File) => void | Promise<void>;
  onSaveExternal: (payload: MediaMetadataRequest) => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [form, setForm] = useState<MediaUploadRequest>({
    contentId: project.contentId,
    storageKey: `media/${project.contentId.replace("case-study:", "")}`,
    altText: "",
    usage: "case-study",
    locale: "en",
  });

  useEffect(() => {
    setFile(null);
    setPreviewUrl(null);
    setPublicUrl("");
    setForm({
      contentId: project.contentId,
      storageKey: `media/${project.contentId.replace("case-study:", "")}`,
      altText: "",
      usage: "case-study",
      locale: "en",
    });
  }, [project.contentId]);

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  return (
    <Card className={dashboardClass.cardShadow}>
      <CardHeader className={dashboardClass.mediaCardHeader}>
        <CardTitle>Add image</CardTitle>
        <CardDescription>Preview the selected file, or register an image that is already hosted publicly.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className={dashboardClass.editForm}
          onSubmit={(event) => {
            event.preventDefault();
            const trimmedPublicUrl = publicUrl.trim();

            if (trimmedPublicUrl) {
              void onSaveExternal({
                ...form,
                publicUrl: trimmedPublicUrl,
                selectedForPublic: true,
              });
              return;
            }
            if (!file) {
              return;
            }
            void onSave({ ...form, selectedForPublic: true }, file);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`upload-file-${project.contentId}`}>Local image</FieldLabel>
              <Input
                id={`upload-file-${project.contentId}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null;
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setFile(selectedFile);
                  setPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null);

                  if (selectedFile) {
                    setForm((current) => ({
                      ...current,
                      storageKey: `${current.storageKey}/${selectedFile.name.replace(/\.[^.]+$/, "").replace(/\s+/g, "-").toLowerCase()}`,
                    }));
                  }
                }}
              />
            </Field>
            {previewUrl ? (
              <figure className={dashboardClass.uploadPreview}>
                <img src={previewUrl} alt={form.altText || "Selected image preview"} />
                <figcaption>{file?.name}</figcaption>
              </figure>
            ) : null}
            <Field>
              <FieldLabel htmlFor={`upload-url-${project.contentId}`}>Public image URL</FieldLabel>
              <Input
                id={`upload-url-${project.contentId}`}
                value={publicUrl}
                onChange={(event) => setPublicUrl(event.target.value)}
                placeholder="https://..."
              />
              <FieldDescription>Use this instead when the image is already hosted publicly. It becomes the selected Astro image.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`upload-alt-${project.contentId}`}>Alt text</FieldLabel>
              <Textarea
                id={`upload-alt-${project.contentId}`}
                value={form.altText}
                onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))}
                rows={3}
                placeholder="Describe what the image shows for screen readers and SEO."
              />
            </Field>
            <div className={dashboardClass.formGrid2}>
              <Field>
                <FieldLabel>Locale</FieldLabel>
                <Select
                  value={form.locale}
                  onValueChange={(value) => setForm((current) => ({ ...current, locale: value as DashboardLocale }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`upload-key-${project.contentId}`}>Storage key</FieldLabel>
                <Input
                  id={`upload-key-${project.contentId}`}
                  value={form.storageKey}
                  onChange={(event) => setForm((current) => ({ ...current, storageKey: event.target.value }))}
                />
                <FieldDescription>Cloudflare Images custom ID.</FieldDescription>
              </Field>
            </div>
          </FieldGroup>
          <Button type="submit" disabled={isSaving || (!file && !publicUrl.trim()) || !form.altText.trim()}>
            {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <UploadCloudIcon data-icon="inline-start" />}
            {publicUrl.trim() ? "Save image URL" : "Upload image"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn(dashboardClass.pageHeading, action && dashboardClass.pageHeadingWithAction)}>
      <div className={dashboardClass.pageHeadingMain}>
        <Badge className="w-fit" variant="secondary">{eyebrow}</Badge>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {action ? <div className={dashboardClass.pageHeadingAction}>{action}</div> : null}
    </section>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function buildNewProjectDraft(input: NewProjectInput, locale: DashboardLocale): ProjectFormState {
  const isSpanish = locale === "es";
  const title = isSpanish ? input.spanishTitle : input.title;
  const summary = isSpanish
    ? `Caso público en borrador para ${title}.`
    : `Public case-study draft for ${title}.`;

  return {
    contentId: `case-study:${input.slug}`,
    locale,
    status: input.status,
    evidenceStatus: "sanitized",
    title,
    summary,
    seoDescription: summary,
    projectUrl: "",
    ctaLabel: isSpanish ? "Hablemos de algo similar" : "Start a similar build",
    ctaHref: isSpanish ? "/es/contacto" : "/contact",
    achievements: isSpanish
      ? "Describe el resultado de negocio antes de publicar este caso."
      : "Describe the business outcome before publishing this case study.",
    structureNotes: isSpanish
      ? "Describe la estructura pública, los límites privados y la evidencia segura."
      : "Describe the public structure, private boundaries, and safe evidence.",
  };
}

function slugifyProjectTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function isSafeProjectSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function formatProjectStatus(value: string): string {
  const labels: Record<string, string> = {
    "production-proof": "Live site",
    "active-build": "Active build",
    "private-build": "Private system",
    "enterprise-confidential": "Confidential enterprise",
    "engineering-practice": "Engineering practice",
  };

  return labels[value] ?? formatLabel(value);
}

function formatReferenceState(value: string): string {
  const labels: Record<string, string> = {
    missing: "No public link",
    sanitized: "Sanitized reference",
    published: "Public link live",
  };

  return labels[value] ?? formatLabel(value);
}

function formatLabel(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
