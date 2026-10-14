import { useState } from "react";
import { getSharedI18n } from "@aohys/content-graph";
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
  useProjectsContent,
  type MediaMetadataRequest,
  type MediaSelectionRequest,
  type MediaUploadRequest,
} from "./projects-api";
import { Action } from "@/components/dashboard/action";
import { ConfirmAction } from "@/components/dashboard/confirm-action";
import { MetaBadge } from "@/components/dashboard/meta-badge";
import { NoticeDialog } from "@/components/dashboard/notice-dialog";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/dashboard/status-badge";
import {
  LabeledInput,
  LabeledSelect,
  LabeledTextarea,
} from "@/components/dashboard/form-controls";
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
import { projectClass } from "./project-classes";
import {
  cloudflareImagesStorageKeyForFile,
  defaultProjectMediaStorageKey,
  validateCloudflareImagesCustomId,
} from "./media-upload";
import { resolveProjectMediaPreview } from "./projects-model";
import {
  useProjectsWorkflow,
  type MediaUploadIssue,
  type NewProjectInput,
  type ProjectFormState,
} from "./projects-workflow";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  DashboardProject,
  DashboardProjectLocaleContent,
  ProjectsContent,
} from "./projects-types";
import { useFilePreviewUrl } from "./use-file-preview-url";
import {
  publicationLabel,
  type DashboardPublication,
} from "@/lib/publication-state";
import {
  CASE_STUDY_EVIDENCE_STATUSES,
  CASE_STUDY_STATUSES,
  LOCALES,
  type CaseStudyEvidenceStatus,
  type CaseStudyStatus,
  type Locale,
  type MediaStatus,
} from "@aohys/core/domain";

const caseStudyStatuses = CASE_STUDY_STATUSES;
const evidenceStatuses = CASE_STUDY_EVIDENCE_STATUSES;
const projectDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const dashboardLocaleOptions = LOCALES.map((locale) => ({
  value: locale,
  label: getSharedI18n(locale).dashboard.languageName,
}));

export function ProjectsScreen() {
  const content = useProjectsContent();

  if (!content) return <ProjectsSkeleton />;

  return <ProjectsWorkspace content={content} />;
}

function ProjectsWorkspace({ content }: { content: ProjectsContent }) {
  const [requestedProjectId, setRequestedProjectId] = useState<
    string | undefined
  >();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const selectedProjectId =
    requestedProjectId &&
    content.projects.some((project) => project.contentId === requestedProjectId)
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

  const activeDeleteKey = deleteRequest
    ? `${deleteRequest.mediaId}:delete`
    : null;

  return (
    <div className={projectClass.workspace}>
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
          existingContentIds={content.projects.map(
            (project) => project.contentId,
          )}
          isSaving={savingKey === "new-project"}
          onCreate={async (input) => {
            if (await handleCreateProject(input)) setIsCreateOpen(false);
          }}
        />
      ) : null}

      <Tabs
        {...(selectedProjectId ? { value: selectedProjectId } : {})}
        onValueChange={setRequestedProjectId}
        orientation="vertical"
        className={projectClass.projectShell}
      >
        <ProjectTabs projects={content.projects} />
        <div className="min-w-0">
          {content.projects.map((project) => {
            const publication = (content.publications ?? []).find(
              (item) =>
                item.scope === "all" ||
                (item.scope === "project" &&
                  item.contentId === project.contentId),
            );
            return (
              <TabsContent
                key={project.contentId}
                value={project.contentId}
                className="mt-0"
              >
                <ProjectEditor
                  project={project}
                  {...(publication ? { publication } : {})}
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
            );
          })}
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
    <NoticeDialog
      open={Boolean(issue)}
      onOpenChange={onOpenChange}
      icon={CircleAlertIcon}
      title={issue?.title ?? "Image upload failed"}
      description={
        issue?.description ?? "The selected image could not be uploaded."
      }
      {...(issue?.detail ? { detail: issue.detail } : {})}
      {...(issue?.actionLabel ? { actionLabel: issue.actionLabel } : {})}
    />
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
    <ConfirmAction
      open={open}
      onOpenChange={onOpenChange}
      icon={Trash2Icon}
      title="Delete dashboard media?"
      description="This removes the media record from the dashboard. Publish afterwards if the public Astro image should change."
      confirmLabel="Delete image"
      pending={isDeleting}
      pendingLabel="Deleting…"
      onConfirm={() => void onConfirm()}
    />
  );
}

function ProjectTabs({ projects }: { projects: DashboardProject[] }) {
  return (
    <aside className={projectClass.projectNavPanel}>
      <div className={projectClass.projectNavHeader}>
        <div className={projectClass.projectNavLabel}>Projects</div>
        <MetaBadge>{projects.length}</MetaBadge>
      </div>
      <TabsList className={projectClass.projectTabsList}>
        {projects.map((project) => (
          <TabsTrigger
            key={project.contentId}
            value={project.contentId}
            className={projectClass.projectTabTrigger}
          >
            <span className={projectClass.projectTabCopy}>
              <span className={projectClass.projectTabTitle}>
                {project.title}
              </span>
              <small className={projectClass.projectTabMeta}>
                {formatProjectStatus(project.status)}
              </small>
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
    contentKey: "",
    englishSlug: "",
    spanishSlug: "",
    status: "active-build",
  });

  function update<K extends keyof NewProjectInput>(
    key: K,
    value: NewProjectInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "title" && !current.contentKey
        ? { contentKey: slugifyProjectTitle(String(value)) }
        : {}),
      ...(key === "title" && !current.englishSlug
        ? { englishSlug: slugifyProjectTitle(String(value)) }
        : {}),
      ...(key === "spanishTitle" && !current.spanishSlug
        ? { spanishSlug: slugifyProjectTitle(String(value)) }
        : {}),
    }));
  }

  const contentKey = form.contentKey.trim().toLowerCase();
  const nextContentId = `case-study:${contentKey}`;
  const slugExists =
    isSafeProjectSlug(contentKey) && existingContentIds.includes(nextContentId);
  const canCreate = Boolean(
    form.title.trim() &&
    form.spanishTitle.trim() &&
    isSafeProjectSlug(contentKey) &&
    isSafeProjectSlug(form.englishSlug) &&
    isSafeProjectSlug(form.spanishSlug) &&
    !slugExists,
  );

  return (
    <Card className={projectClass.cardShadow}>
      <CardHeader className={projectClass.cardHeaderRule}>
        <div>
          <CardTitle>Create project</CardTitle>
          <CardDescription>
            Add a new public case-study draft. It appears in the dashboard
            immediately and in Astro after publish/build.
          </CardDescription>
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
              contentKey,
              englishSlug: form.englishSlug.trim().toLowerCase(),
              spanishSlug: form.spanishSlug.trim().toLowerCase(),
              title: form.title.trim(),
              spanishTitle: form.spanishTitle.trim(),
            });
          }}
        >
          <FieldGroup className={projectClass.newProjectForm}>
            <LabeledInput
              label="English title"
              value={form.title}
              placeholder="Project name"
              onValueChange={(value) => update("title", value)}
            />
            <LabeledInput
              label="Spanish title"
              value={form.spanishTitle}
              placeholder="Nombre del proyecto"
              onValueChange={(value) => update("spanishTitle", value)}
            />
            <LabeledInput
              label="Stable content key"
              value={form.contentKey}
              placeholder="project-key"
              description={
                slugExists
                  ? "This content key already exists."
                  : `Creates case-study:${contentKey || "project-key"}.`
              }
              {...(slugExists ? { error: "Choose a unique content key." } : {})}
              onValueChange={(value) =>
                update("contentKey", slugifyProjectTitle(value))
              }
            />
            <LabeledInput
              label="English slug"
              value={form.englishSlug}
              placeholder="project-slug"
              onValueChange={(value) =>
                update("englishSlug", slugifyProjectTitle(value))
              }
            />
            <LabeledInput
              label="Spanish slug"
              value={form.spanishSlug}
              placeholder="proyecto-slug"
              onValueChange={(value) =>
                update("spanishSlug", slugifyProjectTitle(value))
              }
            />
            <LabeledSelect
              label="Status"
              value={form.status}
              onValueChange={(value) =>
                update("status", value as CaseStudyStatus)
              }
              options={caseStudyStatuses.map((status) => ({
                value: status,
                label: formatProjectStatus(status),
              }))}
            />
            <Button type="submit" disabled={isSaving || !canCreate}>
              {isSaving ? (
                <LoaderCircleIcon
                  data-icon="inline-start"
                  className="animate-spin"
                />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
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
  publication,
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
  publication?: DashboardPublication;
  isPublishing: boolean;
  savingKey: string | null;
  onPublish: () => void | Promise<void>;
  onSaveProject: (payload: ProjectFormState) => void | Promise<void>;
  onSaveMedia: (
    payload: MediaUploadRequest,
    file: File,
  ) => void | Promise<void>;
  onSaveExternalMedia: (payload: MediaMetadataRequest) => void | Promise<void>;
  onSelectMedia: (payload: MediaSelectionRequest) => void | Promise<void>;
  onArchiveMedia: (payload: MediaSelectionRequest) => void | Promise<void>;
  onDeleteMedia: (payload: MediaSelectionRequest) => void | Promise<void>;
}) {
  return (
    <div className={projectClass.projectEditorGrid}>
      <div className={projectClass.projectColumn}>
        <ProjectSummaryCard
          project={project}
          {...(publication ? { publication } : {})}
          isPublishing={isPublishing}
          onPublish={onPublish}
        />
        <Card className={projectClass.localeEditor}>
          <Tabs defaultValue="en" className={projectClass.localeEditor}>
            <CardHeader className={projectClass.localeHeader}>
              <div>
                <CardTitle>Localized content</CardTitle>
                <CardDescription>
                  Choose the language, edit the draft, then save before
                  publishing.
                </CardDescription>
              </div>
              <CardAction>
                <TabsList className={dashboardClass.localeTabsList}>
                  {project.locales.map((localeContent) => (
                    <TabsTrigger
                      key={localeContent.locale}
                      value={localeContent.locale}
                    >
                      {
                        getSharedI18n(localeContent.locale).dashboard
                          .languageName
                      }
                    </TabsTrigger>
                  ))}
                </TabsList>
              </CardAction>
            </CardHeader>
            <CardContent>
              {project.locales.map((localeContent) => (
                <TabsContent
                  key={`${project.contentId}:${localeContent.locale}`}
                  value={localeContent.locale}
                  forceMount
                  className="mt-0 data-[state=inactive]:hidden"
                >
                  <ProjectLocaleForm
                    key={`${project.contentId}:${localeContent.locale}`}
                    localeContent={localeContent}
                    project={project}
                    isSaving={
                      savingKey ===
                      `${project.contentId}:${localeContent.locale}`
                    }
                    onSave={onSaveProject}
                  />
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      </div>
      <aside className={projectClass.projectColumn}>
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
  publication,
  isPublishing,
  onPublish,
}: {
  project: DashboardProject;
  publication?: DashboardPublication;
  isPublishing: boolean;
  onPublish: () => void | Promise<void>;
}) {
  const latestDraft = project.locales
    .flatMap((localeContent) =>
      localeContent.draft ? [localeContent.draft] : [],
    )
    .sort((a, b) => (b?.updatedAt ?? 0) - (a?.updatedAt ?? 0))[0];
  const latestPublished = project.locales
    .flatMap((localeContent) =>
      typeof localeContent.draft?.publishedAt === "number"
        ? [localeContent.draft.publishedAt]
        : [],
    )
    .sort((a, b) => b - a)[0];

  return (
    <Card className={projectClass.projectSummaryCard}>
      <CardHeader className={projectClass.projectSummaryHeader}>
        <div className="min-w-0">
          <CardTitle className={projectClass.projectSummaryTitle}>
            {project.title}
          </CardTitle>
          <CardDescription className={projectClass.projectSummaryPaths}>
            {project.englishPath} · {project.spanishPath}
          </CardDescription>
        </div>
        <CardAction className={projectClass.projectSummaryBadges}>
          <MetaBadge emphasis="filled">
            {formatProjectStatus(project.status)}
          </MetaBadge>
          <StatusBadge
            tone={
              project.evidenceStatus === "published" ? "success" : "neutral"
            }
          >
            {formatReferenceState(project.evidenceStatus)}
          </StatusBadge>
          <StatusBadge tone={project.sitemapIncluded ? "success" : "neutral"}>
            {project.sitemapIncluded ? "In sitemap" : "Noindex"}
          </StatusBadge>
        </CardAction>
      </CardHeader>
      <CardContent className={projectClass.projectSummaryContent}>
        {project.projectUrl ? (
          <a
            className={projectClass.projectSummaryUrl}
            href={project.projectUrl}
            target="_blank"
            rel="noreferrer"
          >
            {project.projectUrl}
            <ExternalLinkIcon data-icon="inline-end" />
          </a>
        ) : (
          <span
            className={cn(
              projectClass.projectSummaryUrl,
              projectClass.projectSummaryUrlEmpty,
            )}
          >
            No public URL yet
          </span>
        )}
        <div className={projectClass.publishBar}>
          <div className={projectClass.publishMeta}>
            <span>
              Saved {latestDraft ? formatDate(latestDraft.updatedAt) : "never"}
            </span>
            <span>
              Published{" "}
              {latestPublished ? formatDate(latestPublished) : "never"}
            </span>
            <span>
              Release:{" "}
              {publication ? publicationLabel(publication) : "Not requested"}
            </span>
          </div>
          <Action
            type="button"
            pending={isPublishing}
            pendingLabel="Requesting…"
            onClick={() => void onPublish()}
          >
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
    seoDescription:
      localeContent.draft?.seoDescription ?? localeContent.seoDescription,
    projectUrl: localeContent.draft?.projectUrl ?? project.projectUrl ?? "",
    ctaLabel: localeContent.draft?.ctaLabel ?? localeContent.ctaLabel,
    ctaHref: localeContent.draft?.ctaHref ?? localeContent.ctaHref,
    achievements:
      localeContent.draft?.achievements ?? localeContent.achievements,
    structureNotes:
      localeContent.draft?.structureNotes ?? localeContent.structureNotes,
  };
  const [form, setForm] = useState<ProjectFormState>(initialForm);

  const hasChanges = !projectFormsEqual(form, initialForm);

  function update<K extends keyof ProjectFormState>(
    key: K,
    value: ProjectFormState[K],
  ) {
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
      <div className={projectClass.projectFormHeader}>
        <div>
          <h2>
            {getSharedI18n(localeContent.locale).dashboard.contentHeading}
          </h2>
          <p>
            {localeContent.path} ·{" "}
            {localeContent.draft
              ? "private dashboard draft"
              : "public content graph"}
          </p>
        </div>
        <StatusBadge tone={hasChanges ? "attention" : "success"}>
          {hasChanges ? "Unsaved changes" : "Up to date"}
        </StatusBadge>
      </div>
      <FieldSet>
        <FieldLegend>Identity</FieldLegend>
        <FieldGroup>
          <div className={dashboardClass.formGrid3}>
            <LabeledSelect
              label="Status"
              value={form.status}
              onValueChange={(value) =>
                update("status", value as CaseStudyStatus)
              }
              options={caseStudyStatuses.map((status) => ({
                value: status,
                label: formatProjectStatus(status),
              }))}
            />
            <LabeledSelect
              label="Public link state"
              value={form.evidenceStatus}
              onValueChange={(value) =>
                update("evidenceStatus", value as CaseStudyEvidenceStatus)
              }
              options={evidenceStatuses.map((status) => ({
                value: status,
                label: formatReferenceState(status),
              }))}
            />
            <LabeledInput
              label="Project URL"
              value={form.projectUrl ?? ""}
              placeholder="https://example.com"
              onValueChange={(value) => update("projectUrl", value)}
            />
          </div>
          <LabeledInput
            label="Title"
            value={form.title}
            onValueChange={(value) => update("title", value)}
          />
          <LabeledInput
            label="Localized slug"
            value={form.localizedSlug ?? ""}
            onValueChange={(value) =>
              update("localizedSlug", slugifyProjectTitle(value))
            }
          />
          <LabeledTextarea
            label="Summary"
            value={form.summary}
            rows={4}
            onValueChange={(value) => update("summary", value)}
          />
          <LabeledTextarea
            label="SEO description"
            description="Write for search results and humans. No vague proof language."
            value={form.seoDescription}
            rows={4}
            onValueChange={(value) => update("seoDescription", value)}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Outcome and structure</FieldLegend>
        <FieldGroup>
          <div className={dashboardClass.formGrid2}>
            <LabeledInput
              label="CTA label"
              value={form.ctaLabel}
              onValueChange={(value) => update("ctaLabel", value)}
            />
            <LabeledInput
              label="CTA href"
              value={form.ctaHref}
              onValueChange={(value) => update("ctaHref", value)}
            />
          </div>
          <LabeledTextarea
            label="Business outcome"
            value={form.achievements}
            rows={7}
            onValueChange={(value) => update("achievements", value)}
          />
          <LabeledTextarea
            label="Project structure"
            value={form.structureNotes}
            rows={7}
            onValueChange={(value) => update("structureNotes", value)}
          />
        </FieldGroup>
      </FieldSet>

      <div className={projectClass.formActionRow}>
        <span aria-live="polite">
          {isSaving
            ? "Saving..."
            : hasChanges
              ? "Draft has local changes."
              : "No unsaved changes."}
        </span>
        <Action
          type="submit"
          pending={isSaving}
          pendingLabel="Saving…"
          disabled={!hasChanges}
        >
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
  const { previewImage, selectedImage, selectedImageNeedsReview } =
    resolveProjectMediaPreview(project.images);
  const selectedImagePreviewStatus = selectedImage?.previewStatus;
  const selectedImageHasPreviewIssue =
    selectedImagePreviewStatus !== undefined &&
    selectedImagePreviewStatus !== "ready";

  return (
    <Card className={projectClass.cardShadow}>
      <CardHeader className={projectClass.mediaCardHeader}>
        <CardTitle>Project media</CardTitle>
        <CardDescription>
          Choose the exact image that the Astro landing and case-study pages
          should use.
        </CardDescription>
      </CardHeader>
      <CardContent className={projectClass.mediaList}>
        <div className={projectClass.mediaSelectedPreview}>
          <MediaImage
            {...(previewImage?.src ? { src: previewImage.src } : {})}
            alt={previewImage?.altText ?? "No project image"}
            className={projectClass.mediaPreviewFrame}
            {...(selectedImageHasPreviewIssue
              ? {
                  missingLabel: mediaPreviewIssueLabel(
                    selectedImagePreviewStatus,
                  ),
                }
              : {})}
          />
          <div className={projectClass.mediaPreviewCopy}>
            <span
              className={
                selectedImage ? projectClass.mediaSelectedLabel : undefined
              }
            >
              {selectedImage
                ? "Selected for Astro"
                : selectedImageNeedsReview
                  ? "Selection review required"
                  : "No dashboard image selected"}
            </span>
            {previewImage ? <strong>{previewImage.label}</strong> : null}
            <p>
              {selectedImageHasPreviewIssue
                ? (selectedImage?.previewIssue ??
                  "This selected media record cannot resolve to a safe public image, so Astro will keep using another reviewed project image.")
                : selectedImage
                  ? previewImage?.altText
                  : selectedImageNeedsReview
                    ? "This legacy selection keeps the committed public-safe image until you explicitly choose Use in Astro again."
                    : "Choose Use in Astro on one media row to make the public image explicit."}
            </p>
          </div>
        </div>

        {project.images.length > 0 ? (
          project.images.map((image) => (
            <div
              key={`${image.source}:${image.label}:${image.storageKey ?? image.href ?? image.src ?? ""}`}
              className={cn(
                projectClass.mediaRow,
                image.selectedForPublic && projectClass.mediaRowSelected,
              )}
            >
              <MediaImage
                {...(image.src ? { src: image.src } : {})}
                alt={image.altText}
                className={projectClass.mediaThumb}
                {...(image.previewStatus && image.previewStatus !== "ready"
                  ? {
                      missingLabel: mediaPreviewIssueLabel(image.previewStatus),
                    }
                  : {})}
              />
              <div className={projectClass.mediaRowBody}>
                <div className={projectClass.mediaRowTitle}>{image.label}</div>
                <p className={projectClass.mediaRowText}>{image.altText}</p>
                <div className={projectClass.mediaRowTags}>
                  <MetaBadge emphasis="filled">
                    {image.source === "media-metadata"
                      ? "Dashboard media"
                      : "Content graph"}
                  </MetaBadge>
                  {image.status ? (
                    <StatusBadge tone={mediaStatus[image.status].tone}>
                      {mediaStatus[image.status].label}
                    </StatusBadge>
                  ) : null}
                  {image.previewStatus && image.previewStatus !== "ready" ? (
                    <StatusBadge tone="attention">
                      {mediaPreviewIssueLabel(image.previewStatus)}
                    </StatusBadge>
                  ) : null}
                  {image.selectedForPublicAt ? (
                    <StatusBadge tone="success">Astro image</StatusBadge>
                  ) : null}
                  {image.selectedForPublic && !image.selectedForPublicAt ? (
                    <StatusBadge tone="attention">Review required</StatusBadge>
                  ) : null}
                </div>
                <div className={projectClass.mediaRowActions}>
                  {image.id && image.status !== "archived" ? (
                    <Button
                      type="button"
                      variant={
                        image.selectedForPublicAt ? "secondary" : "outline"
                      }
                      size="sm"
                      disabled={
                        savingKey === `${image.id}:select` || !image.src
                      }
                      title={
                        !image.src
                          ? (image.previewIssue ??
                            "This media record has no safe public image URL.")
                          : undefined
                      }
                      onClick={() =>
                        void onSelectMedia({
                          mediaId: image.id!,
                          contentId: project.contentId,
                        })
                      }
                    >
                      {savingKey === `${image.id}:select` ? (
                        <LoaderCircleIcon
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : (
                        <EyeIcon data-icon="inline-start" />
                      )}
                      Use in Astro
                    </Button>
                  ) : null}
                  {image.id && image.status !== "archived" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={savingKey === `${image.id}:archive`}
                      onClick={() =>
                        void onArchiveMedia({
                          mediaId: image.id!,
                          contentId: project.contentId,
                        })
                      }
                    >
                      {savingKey === `${image.id}:archive` ? (
                        <LoaderCircleIcon
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : (
                        <EyeOffIcon data-icon="inline-start" />
                      )}
                      Hide
                    </Button>
                  ) : null}
                  {image.id ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={savingKey === `${image.id}:delete`}
                      onClick={() =>
                        void onDeleteMedia({
                          mediaId: image.id!,
                          contentId: project.contentId,
                        })
                      }
                    >
                      {savingKey === `${image.id}:delete` ? (
                        <LoaderCircleIcon
                          data-icon="inline-start"
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2Icon data-icon="inline-start" />
                      )}
                      Delete
                    </Button>
                  ) : null}
                  {image.href ? (
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                    >
                      <a href={image.href} target="_blank" rel="noreferrer">
                        Open
                        <ExternalLinkIcon data-icon="inline-end" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className={projectClass.mediaEmptyNote}>
            No project media has been attached yet. Add an image below to give
            this case study a public visual.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Draft matches resume versions: a resting state, not work in progress.
const mediaStatus = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Published", tone: "success" },
  archived: { label: "Archived", tone: "neutral" },
} as const satisfies Record<MediaStatus, { label: string; tone: StatusTone }>;

function mediaPreviewIssueLabel(
  status: NonNullable<DashboardProject["images"][number]["previewStatus"]>,
): string {
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
      <div
        className={cn(projectClass.mediaImageEmpty, className)}
        role="img"
        aria-label={alt}
      >
        <ImageIcon aria-hidden="true" />
        <small>
          {failedSrc === src && src ? "Image not reachable" : missingLabel}
        </small>
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
  const projectDefaultStorageKey = defaultProjectMediaStorageKey(
    project.contentId,
  );
  const [file, setFile] = useState<File | null>(null);
  const previewUrl = useFilePreviewUrl(file);

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
  const storageKeyValidation = validateCloudflareImagesCustomId(
    form.storageKey,
  );
  const storageKeyWillNormalize = Boolean(
    storageKeyValidation.isValid &&
    storageKeyValidation.value &&
    storageKeyValidation.value !== form.storageKey.trim(),
  );
  const showStorageKeyError =
    !trimmedPublicUrl && !storageKeyValidation.isValid;

  return (
    <Card className={projectClass.cardShadow}>
      <CardHeader className={projectClass.mediaCardHeader}>
        <CardTitle>Add image</CardTitle>
        <CardDescription>
          Preview the selected file, or register an image that is already hosted
          publicly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className={dashboardClass.editForm}
          onSubmit={(event) => {
            event.preventDefault();

            if (trimmedPublicUrl) {
              void onSaveExternal({
                ...form,
                storageKey: storageKeyValidation.isValid
                  ? storageKeyValidation.value
                  : projectDefaultStorageKey,
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
            void onSave(
              {
                ...form,
                storageKey: storageKeyValidation.value,
                altText: trimmedAltText,
                selectedForPublic: true,
              },
              file,
            );
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`upload-file-${project.contentId}`}>
                Local image
              </FieldLabel>
              <Input
                id={`upload-file-${project.contentId}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null;
                  setFile(selectedFile);

                  if (selectedFile) {
                    setForm((current) => ({
                      ...current,
                      storageKey: cloudflareImagesStorageKeyForFile(
                        projectDefaultStorageKey,
                        selectedFile.name,
                      ),
                    }));
                  }
                }}
              />
            </Field>
            {previewUrl ? (
              <figure className={projectClass.uploadPreview}>
                <img
                  src={previewUrl}
                  alt={form.altText || "Selected image preview"}
                />
                <figcaption>{file?.name}</figcaption>
              </figure>
            ) : null}
            <Field>
              <FieldLabel htmlFor={`upload-url-${project.contentId}`}>
                Public image URL
              </FieldLabel>
              <Input
                id={`upload-url-${project.contentId}`}
                value={publicUrl}
                onChange={(event) => setPublicUrl(event.target.value)}
                placeholder="https://..."
              />
              <FieldDescription>
                Use this instead when the image is already hosted publicly. It
                becomes the selected Astro image.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`upload-alt-${project.contentId}`}>
                Alt text
              </FieldLabel>
              <Textarea
                id={`upload-alt-${project.contentId}`}
                value={form.altText}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    altText: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Describe what the image shows for screen readers and SEO."
              />
            </Field>
            <div className={dashboardClass.formGrid2}>
              <LabeledSelect
                label="Locale"
                value={form.locale ?? "en"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    locale: value as Locale,
                  }))
                }
                options={dashboardLocaleOptions}
              />
              <Field data-invalid={showStorageKeyError}>
                <FieldLabel htmlFor={`upload-key-${project.contentId}`}>
                  Storage key
                </FieldLabel>
                <Input
                  id={`upload-key-${project.contentId}`}
                  value={form.storageKey}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      storageKey: event.target.value,
                    }))
                  }
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
            disabled={
              isSaving ||
              (!file && !trimmedPublicUrl) ||
              !trimmedAltText ||
              (!trimmedPublicUrl && !storageKeyValidation.isValid)
            }
          >
            {isSaving ? (
              <LoaderCircleIcon
                data-icon="inline-start"
                className="animate-spin"
              />
            ) : (
              <UploadCloudIcon data-icon="inline-start" />
            )}
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
  return projectDateFormatter.format(new Date(value));
}

function projectFormsEqual(
  left: ProjectFormState,
  right: ProjectFormState,
): boolean {
  return Object.keys(left).every((key) => {
    const field = key as keyof ProjectFormState;
    return left[field] === right[field];
  });
}
