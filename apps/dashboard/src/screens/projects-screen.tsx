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
  useDashboardContent,
  type MediaMetadataRequest,
  type MediaSelectionRequest,
  type MediaUploadRequest,
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
import { Action } from "@/components/dashboard/action";
import { LabeledInput, LabeledSelect, LabeledTextarea } from "@/components/dashboard/form-controls";
import { PageHeader } from "@/components/dashboard/page-header";
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
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn, dashboardClass } from "@/lib/dashboard-classes";
import {
  cloudflareImagesStorageKeyForFile,
  defaultProjectMediaStorageKey,
  validateCloudflareImagesCustomId,
} from "@/lib/media-upload";
import {
  useProjectsWorkflow,
  type MediaUploadIssue,
  type NewProjectInput,
  type ProjectFormState,
} from "@/lib/projects-workflow";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  DashboardCaseStudyStatus,
  DashboardContentPayload,
  DashboardEvidenceStatus,
  DashboardLocale,
  DashboardProject,
  DashboardProjectLocaleContent,
} from "@/types";

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

  if (!content) return <ProjectsSkeleton />;

  return <ProjectsWorkspace content={content} />;
}

function ProjectsWorkspace({ content }: { content: DashboardContentPayload }) {
  const [requestedProjectId, setRequestedProjectId] = useState<string | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const selectedProjectId = requestedProjectId && content.projects.some(
    (project) => project.contentId === requestedProjectId,
  )
    ? requestedProjectId
    : content.projects[0]?.contentId;

  const {
    savingKey,
    publishingKey,
    uploadIssue,
    deleteRequest,
    clearUploadIssue,
    clearDeleteRequest,
    requestDeleteMedia: handleDeleteMedia,
    saveProject: handleSaveProject,
    uploadMedia: handleUploadMedia,
    saveExternalMedia: handleSaveExternalMedia,
    selectMedia: handleSelectMedia,
    archiveMedia: handleArchiveMedia,
    confirmDeleteMedia: handleConfirmDeleteMedia,
    createProject: handleCreateProject,
    publishProject: handlePublishProject,
  } = useProjectsWorkflow({
    existingContentIds: content.projects.map((project) => project.contentId),
    onProjectCreated: setRequestedProjectId,
  });

  const activeDeleteKey = deleteRequest ? `${deleteRequest.mediaId}:delete` : null;

  return (
    <div className={dashboardClass.workspace}>
      <PageHeader
        title="Project workspace"
        description="Edit stories, outcomes, structure, images, CTA, URL, and SEO metadata. Save keeps work private; Publish sends reviewed content through the release train."
        actions={
          <Action
            type="button"
            variant={isCreateOpen ? "quiet" : "secondary"}
            onClick={() => setIsCreateOpen((current) => !current)}
          >
            <PlusIcon data-icon="inline-start" />
            New project
          </Action>
        }
      />

      {isCreateOpen ? (
        <NewProjectCard
          existingContentIds={content.projects.map((project) => project.contentId)}
          isSaving={savingKey === "new-project"}
          onCreate={async (input) => {
            if (await handleCreateProject(input)) setIsCreateOpen(false);
          }}
        />
      ) : null}

      <Tabs value={selectedProjectId} onValueChange={setRequestedProjectId} orientation="vertical" className={dashboardClass.projectShell}>
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
      <MediaUploadIssueDialog
        issue={uploadIssue}
        onOpenChange={(open) => {
          if (!open) {
            clearUploadIssue();
          }
        }}
      />
      <DeleteMediaDialog
        open={Boolean(deleteRequest)}
        isDeleting={activeDeleteKey !== null && savingKey === activeDeleteKey}
        onOpenChange={(open) => {
          if (!open && savingKey !== activeDeleteKey) {
            clearDeleteRequest();
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
      <AlertDialogContent className="sm:max-w-md">
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
          <div className="break-words rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm leading-6 text-muted-foreground">
            {issue.detail}
          </div>
        ) : null}
        <AlertDialogFooter>
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
              <LabeledInput label="English title" value={form.title} placeholder="Project name" onValueChange={(value) => update("title", value)} />
              <LabeledInput label="Spanish title" value={form.spanishTitle} placeholder="Nombre del proyecto" onValueChange={(value) => update("spanishTitle", value)} />
              <LabeledInput
                label="Slug"
                value={form.slug}
                placeholder="project-slug"
                description={slugExists ? "This project slug already exists." : `Creates case-study:${normalizedSlug || "project-slug"}.`}
                error={slugExists ? "Choose a unique slug." : undefined}
                onValueChange={(value) => update("slug", slugifyProjectTitle(value))}
              />
              <LabeledSelect label="Status" value={form.status} onValueChange={(value) => update("status", value as DashboardCaseStudyStatus)} options={caseStudyStatuses.map((status) => ({ value: status, label: formatProjectStatus(status) }))} />
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
                <TabsContent key={`${project.contentId}:${localeContent.locale}`} value={localeContent.locale} forceMount className="mt-0 data-[state=inactive]:hidden">
                  <ProjectLocaleForm
                    key={`${project.contentId}:${localeContent.locale}`}
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
          key={project.contentId}
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
          <Action type="button" pending={isPublishing} pendingLabel="Requesting…" onClick={() => void onPublish()}>
            <RocketIcon data-icon="inline-start" />
            Publish
          </Action>
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
  const initialForm = {
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
  };
  const [form, setForm] = useState<ProjectFormState>(initialForm);

  const hasChanges = !projectFormsEqual(form, initialForm);

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
                <LabeledSelect label="Status" value={form.status} onValueChange={(value) => update("status", value as DashboardCaseStudyStatus)} options={caseStudyStatuses.map((status) => ({ value: status, label: formatProjectStatus(status) }))} />
                <LabeledSelect label="Public link state" value={form.evidenceStatus} onValueChange={(value) => update("evidenceStatus", value as DashboardEvidenceStatus)} options={evidenceStatuses.map((status) => ({ value: status, label: formatReferenceState(status) }))} />
                <LabeledInput label="Project URL" value={form.projectUrl ?? ""} placeholder="https://example.com" onValueChange={(value) => update("projectUrl", value)} />
              </div>
              <LabeledInput label="Title" value={form.title} onValueChange={(value) => update("title", value)} />
              <LabeledTextarea label="Summary" value={form.summary} rows={4} onValueChange={(value) => update("summary", value)} />
              <LabeledTextarea label="SEO description" description="Write for search results and humans. No vague proof language." value={form.seoDescription} rows={4} onValueChange={(value) => update("seoDescription", value)} />
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Outcome and structure</FieldLegend>
            <FieldGroup>
              <div className={dashboardClass.formGrid2}>
                <LabeledInput label="CTA label" value={form.ctaLabel} onValueChange={(value) => update("ctaLabel", value)} />
                <LabeledInput label="CTA href" value={form.ctaHref} onValueChange={(value) => update("ctaHref", value)} />
              </div>
              <LabeledTextarea label="Business outcome" value={form.achievements} rows={7} onValueChange={(value) => update("achievements", value)} />
              <LabeledTextarea label="Project structure" value={form.structureNotes} rows={7} onValueChange={(value) => update("structureNotes", value)} />
            </FieldGroup>
          </FieldSet>

          <div className={dashboardClass.formActionRow}>
            <span aria-live="polite">
              {isSaving ? "Saving..." : hasChanges ? "Draft has local changes." : "No unsaved changes."}
            </span>
            <Action type="submit" pending={isSaving} pendingLabel="Saving…" disabled={!hasChanges}>
              <SaveIcon data-icon="inline-start" />
              Save {localeContent.locale.toUpperCase()}
            </Action>
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
  const selectedImagePreviewStatus = selectedImage?.previewStatus;
  const selectedImageHasPreviewIssue = selectedImagePreviewStatus !== undefined
    && selectedImagePreviewStatus !== "ready";

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
            missingLabel={selectedImageHasPreviewIssue ? mediaPreviewIssueLabel(selectedImagePreviewStatus) : undefined}
          />
          <div className={dashboardClass.mediaPreviewCopy}>
            <span className={selectedImage ? dashboardClass.mediaSelectedLabel : undefined}>
              {selectedImage ? "Selected for Astro" : "No dashboard image selected"}
            </span>
            {previewImage ? <strong>{previewImage.label}</strong> : null}
            <p>
              {selectedImageHasPreviewIssue
                ? selectedImage?.previewIssue ?? "This selected media record cannot resolve to a safe public image, so Astro will keep using another reviewed project image."
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
              missingLabel={image.previewStatus && image.previewStatus !== "ready" ? mediaPreviewIssueLabel(image.previewStatus) : undefined}
            />
            <div className={dashboardClass.mediaRowBody}>
              <div className={dashboardClass.mediaRowTitle}>{image.label}</div>
              <p className={dashboardClass.mediaRowText}>{image.altText}</p>
              <div className={dashboardClass.mediaRowTags}>
                <Badge variant="secondary">{image.source === "media-metadata" ? "Dashboard media" : "Content graph"}</Badge>
                {image.status ? <Badge variant="outline">{image.status}</Badge> : null}
                {image.previewStatus && image.previewStatus !== "ready" ? (
                  <Badge variant="outline">{mediaPreviewIssueLabel(image.previewStatus)}</Badge>
                ) : null}
                {image.selectedForPublic ? <Badge>Astro image</Badge> : null}
              </div>
              <div className={dashboardClass.mediaRowActions}>
                {image.id && image.status !== "archived" ? (
                  <Button
                    type="button"
                    variant={image.selectedForPublic ? "secondary" : "outline"}
                    size="sm"
                    disabled={savingKey === `${image.id}:select` || !image.src}
                    title={!image.src ? image.previewIssue ?? "This media record has no safe public image URL." : undefined}
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

function mediaPreviewIssueLabel(status: NonNullable<DashboardProject["images"][number]["previewStatus"]>): string {
  switch (status) {
    case "unsupported-provider":
      return "Provider unsupported";
    case "provider-unavailable":
      return "Provider unavailable";
    case "invalid-reference":
      return "Invalid public reference";
    case "missing-url":
      return "Preview URL missing";
    case "ready":
      return "Preview ready";
  }
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
  const projectDefaultStorageKey = defaultProjectMediaStorageKey(project.contentId);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState("");
  const [form, setForm] = useState<MediaUploadRequest>({
    contentId: project.contentId,
    storageKey: projectDefaultStorageKey,
    altText: "",
    usage: "case-study",
    locale: "en",
  });
  const trimmedPublicUrl = publicUrl.trim();
  const trimmedAltText = form.altText.trim();
  const storageKeyValidation = validateCloudflareImagesCustomId(form.storageKey);
  const storageKeyWillNormalize = Boolean(
    storageKeyValidation.isValid &&
      storageKeyValidation.value &&
      storageKeyValidation.value !== form.storageKey.trim(),
  );
  const showStorageKeyError = !trimmedPublicUrl && !storageKeyValidation.isValid;

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

            if (trimmedPublicUrl) {
              void onSaveExternal({
                ...form,
                storageKey: storageKeyValidation.isValid ? storageKeyValidation.value : projectDefaultStorageKey,
                altText: trimmedAltText,
                publicUrl: trimmedPublicUrl,
                selectedForPublic: true,
              });
              return;
            }
            if (!file) {
              return;
            }
            if (!storageKeyValidation.isValid) {
              return;
            }
            void onSave({
              ...form,
              storageKey: storageKeyValidation.value,
              altText: trimmedAltText,
              selectedForPublic: true,
            }, file);
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
                      storageKey: cloudflareImagesStorageKeyForFile(projectDefaultStorageKey, selectedFile.name),
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
              <LabeledSelect label="Locale" value={form.locale ?? "en"} onValueChange={(value) => setForm((current) => ({ ...current, locale: value as DashboardLocale }))} options={[{ value: "en", label: "English" }, { value: "es", label: "Spanish" }]} />
              <Field data-invalid={showStorageKeyError}>
                <FieldLabel htmlFor={`upload-key-${project.contentId}`}>Storage key</FieldLabel>
                <Input
                  id={`upload-key-${project.contentId}`}
                  value={form.storageKey}
                  onChange={(event) => setForm((current) => ({ ...current, storageKey: event.target.value }))}
                  aria-invalid={showStorageKeyError}
                />
                {showStorageKeyError ? (
                  <FieldError>{storageKeyValidation.message}</FieldError>
                ) : (
                  <FieldDescription>
                    {storageKeyWillNormalize
                      ? `Upload will use ${storageKeyValidation.value}.`
                      : "Cloudflare Images custom ID."}
                  </FieldDescription>
                )}
              </Field>
            </div>
          </FieldGroup>
          <Button
            type="submit"
            disabled={isSaving || (!file && !trimmedPublicUrl) || !trimmedAltText || (!trimmedPublicUrl && !storageKeyValidation.isValid)}
          >
            {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <UploadCloudIcon data-icon="inline-start" />}
            {publicUrl.trim() ? "Save image URL" : "Upload image"}
          </Button>
        </form>
      </CardContent>
    </Card>
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

function projectFormsEqual(left: ProjectFormState, right: ProjectFormState): boolean {
  return Object.keys(left).every((key) => {
    const field = key as keyof ProjectFormState;
    return left[field] === right[field];
  });
}
