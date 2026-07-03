import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  ImageIcon,
  LoaderCircleIcon,
  RocketIcon,
  SaveIcon,
  UploadCloudIcon,
} from "lucide-react";
import {
  createMediaUpload,
  loadDashboardContent,
  publishContent,
  saveProjectDraft,
  saveSiteSetting,
  uploadMediaFile,
  type MediaUploadRequest,
  type ProjectDraftRequest,
} from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DashboardContentPayload,
  DashboardEvidenceStatus,
  DashboardLocale,
  DashboardProject,
  DashboardProjectLocaleContent,
  DashboardSiteSetting,
} from "@/types";

type ProjectFormState = ProjectDraftRequest;
type NoticeTone = "success" | "info" | "error";

interface Notice {
  tone: NoticeTone;
  title: string;
  message: string;
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
  const [content, setContent] = useState<DashboardContentPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [publishingKey, setPublishingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function refresh() {
    setLoadError(null);
    try {
      setContent(await loadDashboardContent());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Dashboard content could not load.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleSaveProject(payload: ProjectFormState) {
    const key = `${payload.contentId}:${payload.locale}`;
    setSavingKey(key);
    setNotice({
      tone: "info",
      title: "Saving draft",
      message: "Writing this project draft to Convex.",
    });

    try {
      await saveProjectDraft(payload);
      await refresh();
      setNotice({
        tone: "success",
        title: "Draft saved",
        message: `${payload.title} ${payload.locale.toUpperCase()} is saved. Use Publish to rebuild the public site with this content.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Draft save failed",
        message: error instanceof Error ? error.message : "Project draft could not be saved.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleUploadMedia(payload: MediaUploadRequest, file: File) {
    const key = `${payload.contentId}:media`;
    setSavingKey(key);
    setNotice({
      tone: "info",
      title: "Preparing media upload",
      message: "Requesting a Cloudflare Images direct upload URL.",
    });

    try {
      const upload = await createMediaUpload(payload);
      setNotice({
        tone: "info",
        title: "Uploading image",
        message: "Cloudflare accepted the upload slot. Sending the selected file now.",
      });
      await uploadMediaFile(upload.uploadURL, file);
      await refresh();
      setNotice({
        tone: "success",
        title: "Image uploaded",
        message: "The image is attached as project media. Publish when you want it available to the Astro build.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Media upload failed",
        message: error instanceof Error ? error.message : "Image upload could not be completed.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handleSaveContact(value: string) {
    setSavingKey("contact-settings");
    setNotice({
      tone: "info",
      title: "Saving contact setting",
      message: "Updating the public WhatsApp value in Convex.",
    });

    try {
      await saveSiteSetting({
        key: "PUBLIC_WHATSAPP_URL",
        value,
        classification: "public-build-value",
      });
      await refresh();
      setNotice({
        tone: "success",
        title: "Contact setting saved",
        message: "This value will be applied to the public build after publish.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Contact save failed",
        message: error instanceof Error ? error.message : "Contact setting could not be saved.",
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function handlePublishProject(project: DashboardProject) {
    setPublishingKey(project.contentId);
    setNotice({
      tone: "info",
      title: "Publishing project",
      message: "Marking reviewed drafts as published and queuing the release train.",
    });

    try {
      const result = await publishContent({ scope: "project", contentId: project.contentId });
      await refresh();
      setNotice({
        tone: result.workflow.status === "queued" ? "success" : "info",
        title: result.workflow.status === "queued" ? "Publish queued" : "Published in Convex",
        message: result.workflow.status === "queued"
          ? `GitHub Actions is rebuilding ${result.workflow.ref ?? "develop"} for ${project.title}.`
          : `${project.title} was marked published, but ${result.workflow.reason ?? "the workflow token is not configured."}`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Publish failed",
        message: error instanceof Error ? error.message : "Project publish could not be queued.",
      });
    } finally {
      setPublishingKey(null);
    }
  }

  if (!content && !loadError) {
    return <ProjectsSkeleton />;
  }

  return (
    <div className="dashboard-workspace">
      <PageHeading
        eyebrow="Projects"
        title="Project workspace"
        description="Edit project stories, outcomes, structure, images, CTA, URL, and SEO metadata. Save stores work privately; Publish sends reviewed content through the release train."
      />

      <NoticeAlert notice={notice} />

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard data problem</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {content ? (
        <>
          <Tabs defaultValue={content.projects[0]?.contentId} orientation="vertical" className="project-shell">
            <ProjectTabs projects={content.projects} />
            <div className="min-w-0">
              {content.projects.map((project) => (
                <TabsContent key={project.contentId} value={project.contentId} className="mt-0">
                  <ProjectEditor
                    project={project}
                    isPublishing={publishingKey === project.contentId}
                    savingKey={savingKey}
                    onPublish={() => handlePublishProject(project)}
                    onSaveMedia={handleUploadMedia}
                    onSaveProject={handleSaveProject}
                  />
                </TabsContent>
              ))}
            </div>
          </Tabs>

          <ContactSettingsCard
            settings={content.settings}
            isSaving={savingKey === "contact-settings"}
            onSave={handleSaveContact}
          />
        </>
      ) : null}
    </div>
  );
}

function ProjectTabs({ projects }: { projects: DashboardProject[] }) {
  return (
    <aside className="project-nav-panel">
      <div className="project-nav-header">
        <div>
          <div className="project-nav-label">Projects</div>
          <p>Choose the content record to edit.</p>
        </div>
        <Badge variant="outline">{projects.length}</Badge>
      </div>
      <TabsList className="project-tabs-list">
        {projects.map((project) => (
          <TabsTrigger key={project.contentId} value={project.contentId} className="project-tab-trigger">
            <span className="project-tab-title">{project.title}</span>
            <small>{formatProjectStatus(project.status)}</small>
          </TabsTrigger>
        ))}
      </TabsList>
    </aside>
  );
}

function ProjectEditor({
  project,
  isPublishing,
  savingKey,
  onPublish,
  onSaveProject,
  onSaveMedia,
}: {
  project: DashboardProject;
  isPublishing: boolean;
  savingKey: string | null;
  onPublish: () => void | Promise<void>;
  onSaveProject: (payload: ProjectFormState) => void | Promise<void>;
  onSaveMedia: (payload: MediaUploadRequest, file: File) => void | Promise<void>;
}) {
  return (
    <div className="project-editor-grid">
      <div className="project-main-column">
        <ProjectSummaryCard project={project} isPublishing={isPublishing} onPublish={onPublish} />
        <Tabs defaultValue="en" className="locale-editor-tabs">
          <TabsList className="locale-tabs-list">
            {project.locales.map((localeContent) => (
              <TabsTrigger key={localeContent.locale} value={localeContent.locale}>
                {localeContent.locale === "en" ? "English" : "Spanish"}
              </TabsTrigger>
            ))}
          </TabsList>
          {project.locales.map((localeContent) => (
            <TabsContent key={`${project.contentId}:${localeContent.locale}`} value={localeContent.locale} className="mt-4">
              <ProjectLocaleForm
                localeContent={localeContent}
                project={project}
                isSaving={savingKey === `${project.contentId}:${localeContent.locale}`}
                onSave={onSaveProject}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <aside className="project-side-column">
        <ProjectImagesCard project={project} />
        <ImageUploadForm
          project={project}
          isSaving={savingKey === `${project.contentId}:media`}
          onSave={onSaveMedia}
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
    <Card className="project-summary-card">
      <CardHeader className="project-summary-header">
        <div>
          <CardTitle>{project.title}</CardTitle>
          <CardDescription>
            {project.englishPath} · {project.spanishPath}
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant={project.evidenceStatus === "published" ? "default" : "secondary"}>
            {formatReferenceState(project.evidenceStatus)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="project-summary-content">
        <div className="metric-grid">
          <Metric label="Status" value={formatProjectStatus(project.status)} />
          <Metric label="Sitemap" value={project.sitemapIncluded ? "Included" : "Noindex"} />
          <Metric label="URL" value={project.projectUrl ?? "Not set"} />
        </div>
        <div className="publish-panel">
          <div>
            <div className="publish-panel-title">Publish to preview</div>
            <p>
              Save changes first. Publish marks the reviewed drafts and queues the GitHub release workflow so Astro can rebuild with the new content.
            </p>
            <div className="publish-meta">
              <span>Last saved: {latestDraft ? formatDate(latestDraft.updatedAt) : "No draft yet"}</span>
              <span>Last published: {latestPublished ? formatDate(latestPublished) : "Not published"}</span>
            </div>
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
    <Card className="project-form-card">
      <CardHeader className="project-form-header">
        <div>
          <CardTitle>{localeContent.locale === "en" ? "English content" : "Spanish content"}</CardTitle>
          <CardDescription>
            {localeContent.path} · {localeContent.draft ? "private dashboard draft" : "public content graph"}
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant={hasChanges ? "secondary" : "outline"}>
            {hasChanges ? "Unsaved changes" : "Up to date"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form
          className="content-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(form);
          }}
        >
          <FieldSet>
            <FieldLegend>Identity</FieldLegend>
            <FieldGroup>
              <div className="form-grid-3">
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
              <div className="form-grid-2">
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

          <div className="form-action-row">
            <span aria-live="polite">
              {isSaving ? "Saving..." : hasChanges ? "Draft has local changes." : "No unsaved changes."}
            </span>
            <Button type="submit" disabled={isSaving || !hasChanges}>
              {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
              Save {localeContent.locale.toUpperCase()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ProjectImagesCard({ project }: { project: DashboardProject }) {
  return (
    <Card className="media-card">
      <CardHeader className="media-card-header">
        <CardTitle>Project media</CardTitle>
        <CardDescription>Images attached to this project and available for the publish pipeline.</CardDescription>
      </CardHeader>
      <CardContent className="media-list">
        {project.images.length > 0 ? project.images.map((image) => (
          <div key={`${image.source}:${image.label}:${image.storageKey ?? image.href ?? image.src ?? ""}`} className="media-row">
            <div className="media-icon">
              <ImageIcon />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{image.label}</div>
              <p>{image.altText}</p>
              <div className="media-row-actions">
                <Badge variant="secondary">{image.source}</Badge>
                {image.status ? <Badge variant="outline">{image.status}</Badge> : null}
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
          <p className="text-sm text-muted-foreground">No project media has been attached yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ImageUploadForm({
  project,
  isSaving,
  onSave,
}: {
  project: DashboardProject;
  isSaving: boolean;
  onSave: (payload: MediaUploadRequest, file: File) => void | Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<MediaUploadRequest>({
    contentId: project.contentId,
    storageKey: `media/${project.contentId.replace("case-study:", "")}`,
    altText: "",
    usage: "case-study",
    locale: "en",
  });

  useEffect(() => {
    setFile(null);
    setForm({
      contentId: project.contentId,
      storageKey: `media/${project.contentId.replace("case-study:", "")}`,
      altText: "",
      usage: "case-study",
      locale: "en",
    });
  }, [project.contentId]);

  return (
    <Card className="upload-card">
      <CardHeader className="media-card-header">
        <CardTitle>Upload image</CardTitle>
        <CardDescription>Select a local image. The dashboard requests a direct Cloudflare upload URL and stores the resulting media record.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="content-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!file) {
              return;
            }
            void onSave(form, file);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Local image</FieldLabel>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null;
                  setFile(selectedFile);

                  if (selectedFile) {
                    setForm((current) => ({
                      ...current,
                      storageKey: `${current.storageKey}/${selectedFile.name.replace(/\.[^.]+$/, "").replace(/\s+/g, "-").toLowerCase()}`,
                    }));
                  }
                }}
              />
            </Field>
            <Field>
              <FieldLabel>Storage key</FieldLabel>
              <Input
                value={form.storageKey}
                onChange={(event) => setForm((current) => ({ ...current, storageKey: event.target.value }))}
              />
              <FieldDescription>Readable key used as the Cloudflare Images custom ID.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Alt text</FieldLabel>
              <Textarea
                value={form.altText}
                onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))}
                rows={4}
              />
            </Field>
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
          </FieldGroup>
          <Button type="submit" disabled={isSaving || !file || !form.altText.trim()}>
            {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <UploadCloudIcon data-icon="inline-start" />}
            Upload image
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ContactSettingsCard({
  settings,
  isSaving,
  onSave,
}: {
  settings: DashboardSiteSetting[];
  isSaving: boolean;
  onSave: (value: string) => void | Promise<void>;
}) {
  const currentValue = useMemo(
    () => settings.find((setting) => setting.key === "PUBLIC_WHATSAPP_URL")?.value ?? "",
    [settings],
  );
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  return (
    <Card id="contact-settings" className="contact-settings-card">
      <CardHeader>
        <CardTitle>Contact setting</CardTitle>
        <CardDescription>Only the public WhatsApp/contact value belongs here. It publishes through the same release path.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="contact-setting-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(value);
          }}
        >
          <Field>
            <FieldLabel>PUBLIC_WHATSAPP_URL</FieldLabel>
            <Input value={value} onChange={(event) => setValue(event.target.value)} />
          </Field>
          <Button className="self-end" type="submit" disabled={isSaving || value === currentValue}>
            {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
            Save contact
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
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="dashboard-page-heading">
      <Badge className="w-fit" variant="secondary">{eyebrow}</Badge>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}

function NoticeAlert({ notice }: { notice: Notice | null }) {
  if (!notice) {
    return null;
  }

  return (
    <Alert variant={notice.tone === "error" ? "destructive" : "default"} className="status-alert">
      {notice.tone === "success" ? <CheckCircle2Icon data-icon="inline-start" /> : null}
      <AlertTitle>{notice.title}</AlertTitle>
      <AlertDescription>{notice.message}</AlertDescription>
    </Alert>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-tile">
      <div>{label}</div>
      <strong>{value}</strong>
    </div>
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
