import { useEffect, useMemo, useState } from "react";
import { ExternalLinkIcon, ImageIcon, LoaderCircleIcon, RocketIcon, SaveIcon } from "lucide-react";
import {
  loadDashboardContent,
  saveMediaMetadata,
  saveProjectDraft,
  saveSiteSetting,
  type MediaMetadataRequest,
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
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(null);
    try {
      await saveProjectDraft(payload);
      setNotice(`${payload.title} ${payload.locale.toUpperCase()} draft saved in Convex. Public pages update only after the publish pipeline runs.`);
      await refresh();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Project draft could not be saved.");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleSaveMedia(payload: MediaMetadataRequest) {
    const key = `${payload.contentId}:media`;
    setSavingKey(key);
    setNotice(null);
    try {
      await saveMediaMetadata(payload);
      setNotice("Image metadata saved to the project. Public pages update only after the publish pipeline runs.");
      await refresh();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Image metadata could not be saved.");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleSaveContact(value: string) {
    setSavingKey("contact-settings");
    setNotice(null);
    try {
      await saveSiteSetting({
        key: "PUBLIC_WHATSAPP_URL",
        value,
        classification: "public-build-value",
      });
      setNotice("Contact setting saved. Public pages update only after the publish pipeline runs.");
      await refresh();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Contact setting could not be saved.");
    } finally {
      setSavingKey(null);
    }
  }

  if (!content && !loadError) {
    return <ProjectsSkeleton />;
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <Badge className="w-fit" variant="secondary">Projects</Badge>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Project workspace</h1>
          <p className="max-w-3xl text-muted-foreground">
            Edit private project drafts: story, outcome, structure, images, CTA, URL, and SEO metadata.
            Saving keeps the data in the dashboard; publishing is the separate release step.
          </p>
        </div>
      </section>
      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard data problem</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      {content ? (
        <>
          <PublishBoundaryCard />
          <Tabs defaultValue={content.projects[0]?.contentId} className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 lg:flex-col lg:items-stretch lg:overflow-visible">
              {content.projects.map((project) => (
                <TabsTrigger key={project.contentId} value={project.contentId} className="shrink-0 justify-start text-left lg:w-full">
                  {project.title}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="min-w-0">
              {content.projects.map((project) => (
                <TabsContent key={project.contentId} value={project.contentId} className="mt-0">
                  <ProjectEditor
                    project={project}
                    savingKey={savingKey}
                    onSaveMedia={handleSaveMedia}
                    onSaveProject={handleSaveProject}
                  />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </>
      ) : null}
      {content ? (
        <ContactSettingsCard
          settings={content.settings}
          isSaving={savingKey === "contact-settings"}
          onSave={handleSaveContact}
        />
      ) : null}
    </>
  );
}

function ProjectEditor({
  project,
  savingKey,
  onSaveProject,
  onSaveMedia,
}: {
  project: DashboardProject;
  savingKey: string | null;
  onSaveProject: (payload: ProjectFormState) => void | Promise<void>;
  onSaveMedia: (payload: MediaMetadataRequest) => void | Promise<void>;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{project.title}</CardTitle>
            <CardDescription>
              {project.contentId} · {project.englishPath} · {project.spanishPath}
            </CardDescription>
            <CardAction>
              <Badge variant={project.evidenceStatus === "published" ? "default" : "secondary"}>
                {formatReferenceState(project.evidenceStatus)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Metric label="Status" value={formatProjectStatus(project.status)} />
            <Metric label="Sitemap" value={project.sitemapIncluded ? "Included" : "Noindex"} />
            <Metric label="Project URL" value={project.projectUrl ?? "Not set"} />
          </CardContent>
        </Card>
        {project.locales.map((localeContent) => (
          <ProjectLocaleForm
            key={`${project.contentId}:${localeContent.locale}`}
            localeContent={localeContent}
            project={project}
            isSaving={savingKey === `${project.contentId}:${localeContent.locale}`}
            onSave={onSaveProject}
          />
        ))}
      </div>
      <aside className="flex flex-col gap-4">
        <ProjectImagesCard project={project} />
        <ImageMetadataForm
          project={project}
          isSaving={savingKey === `${project.contentId}:media`}
          onSave={onSaveMedia}
        />
      </aside>
    </div>
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
  const [form, setForm] = useState<ProjectFormState>(() => ({
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
  }));

  function update<K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{localeContent.locale === "en" ? "English content" : "Spanish content"}</CardTitle>
        <CardDescription>
          {localeContent.path} · source: {localeContent.draft ? "dashboard draft" : "content graph"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(form);
          }}
        >
          <FieldSet>
            <FieldLegend>Publishing metadata</FieldLegend>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-3">
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
                  rows={3}
                />
              </Field>
              <Field>
                <FieldLabel>SEO description</FieldLabel>
                <Textarea
                  value={form.seoDescription}
                  onChange={(event) => update("seoDescription", event.target.value)}
                  rows={3}
                />
                <FieldDescription>Keep this direct and readable for robots and humans.</FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend>Business outcome</FieldLegend>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
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
                <FieldLabel>Achievements</FieldLabel>
                <Textarea
                  value={form.achievements}
                  onChange={(event) => update("achievements", event.target.value)}
                  rows={4}
                />
              </Field>
              <Field>
                <FieldLabel>Project structure</FieldLabel>
                <Textarea
                  value={form.structureNotes}
                  onChange={(event) => update("structureNotes", event.target.value)}
                  rows={4}
                />
              </Field>
            </FieldGroup>
          </FieldSet>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
              Save {localeContent.locale.toUpperCase()} draft
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ProjectImagesCard({ project }: { project: DashboardProject }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Images</CardTitle>
        <CardDescription>Public-safe media attached to this project.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {project.images.length > 0 ? project.images.map((image) => (
          <div key={`${image.source}:${image.label}:${image.storageKey ?? image.href ?? image.src ?? ""}`} className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-background">
                <ImageIcon />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{image.label}</div>
                <p className="text-sm text-muted-foreground">{image.altText}</p>
                <div className="mt-2 flex flex-wrap gap-2">
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
          </div>
        )) : (
          <p className="text-sm text-muted-foreground">No image metadata has been attached yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ImageMetadataForm({
  project,
  isSaving,
  onSave,
}: {
  project: DashboardProject;
  isSaving: boolean;
  onSave: (payload: MediaMetadataRequest) => void | Promise<void>;
}) {
  const [form, setForm] = useState<MediaMetadataRequest>({
    contentId: project.contentId,
    storageKey: "",
    publicUrl: "",
    altText: "",
    usage: "case-study",
    locale: "en",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add project media</CardTitle>
        <CardDescription>Attach a public-safe image reference. Cloudflare upload is a separate backend pipeline.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(form);
            setForm((current) => ({ ...current, storageKey: "", publicUrl: "", altText: "" }));
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel>Local file</FieldLabel>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    return;
                  }

                  setForm((current) => ({
                    ...current,
                    storageKey: current.storageKey || file.name.replace(/\s+/g, "-").toLowerCase(),
                  }));
                }}
              />
              <FieldDescription>
                Selection is ready for the Cloudflare direct-upload pipeline; this release still stores metadata and public URLs.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Storage key</FieldLabel>
              <Input
                value={form.storageKey}
                onChange={(event) => setForm((current) => ({ ...current, storageKey: event.target.value }))}
                placeholder="media/casa-roca-home"
              />
            </Field>
            <Field>
              <FieldLabel>Temporary public URL</FieldLabel>
              <Input
                value={form.publicUrl ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, publicUrl: event.target.value }))}
                placeholder="https://..."
              />
            </Field>
            <Field>
              <FieldLabel>Alt text</FieldLabel>
              <Textarea
                value={form.altText}
                onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))}
                rows={3}
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
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
            Save image
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
    <Card id="contact-settings">
      <CardHeader>
        <CardTitle>Contact setting</CardTitle>
        <CardDescription>Only the public WhatsApp/contact value belongs here. It publishes through the release path.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(value);
          }}
        >
          <Field>
            <FieldLabel>PUBLIC_WHATSAPP_URL</FieldLabel>
            <Input value={value} onChange={(event) => setValue(event.target.value)} />
          </Field>
          <Button className="self-end" type="submit" disabled={isSaving}>
            {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
            Save contact
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{value}</div>
    </div>
  );
}

function PublishBoundaryCard() {
  return (
    <Alert>
      <RocketIcon data-icon="inline-start" />
      <AlertTitle>Save draft is not publish</AlertTitle>
      <AlertDescription>
        Dashboard edits are private Convex drafts. The public Astro site still builds from the Public Content Graph until a publish action writes reviewed content into the repo and triggers the release train.
      </AlertDescription>
    </Alert>
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
    "enterprise-confidential": "Confidential enterprise work",
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
