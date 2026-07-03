import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2Icon,
  LoaderCircleIcon,
  PlusIcon,
  RocketIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import {
  loadDashboardContent,
  publishContent,
  saveResumeDraft,
  saveResumeVersion,
  serializeResumeDraft,
} from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  DashboardContentPayload,
  DashboardLocale,
  DashboardResumeContent,
  DashboardResumeVersion,
  ResumeEducation,
  ResumeExperience,
  ResumeHighlight,
  ResumeProject,
  ResumeSkillGroup,
} from "@/types";

type NoticeTone = "success" | "info" | "error";

interface Notice {
  tone: NoticeTone;
  title: string;
  message: string;
}

export function ResumeScreen() {
  const [payload, setPayload] = useState<DashboardContentPayload | null>(null);
  const [selectedLocale, setSelectedLocale] = useState<DashboardLocale>("en");
  const [form, setForm] = useState<DashboardResumeContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [versionForm, setVersionForm] = useState({
    locale: "en" as DashboardLocale,
    version: "",
    pdfPath: "/downloads/alejandro-ortiz-corro-resume.pdf",
    isPublished: true,
  });

  async function refresh() {
    setError(null);
    try {
      setPayload(await loadDashboardContent());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Resume content could not load.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const baseline = useMemo(() => {
    if (!payload) {
      return null;
    }

    const draft = payload.resumeDrafts.find((item) => item.locale === selectedLocale);

    if (draft) {
      try {
        return JSON.parse(draft.contentJson) as DashboardResumeContent;
      } catch {
        return payload.resumeContent[selectedLocale];
      }
    }

    return payload.resumeContent[selectedLocale];
  }, [payload, selectedLocale]);

  useEffect(() => {
    setForm(baseline ? cloneResumeContent(baseline) : null);
  }, [baseline]);

  const activeDraft = payload?.resumeDrafts.find((item) => item.locale === selectedLocale);
  const versions = payload?.resumeVersions ?? null;
  const hasChanges = Boolean(form && baseline && JSON.stringify(form) !== JSON.stringify(baseline));

  async function handleSave() {
    if (!form) {
      return;
    }

    setIsSaving(true);
    setNotice({
      tone: "info",
      title: "Saving resume",
      message: `Writing the ${selectedLocale.toUpperCase()} resume draft to Convex.`,
    });

    try {
      await saveResumeDraft({
        locale: selectedLocale,
        contentJson: serializeResumeDraft(form),
      });
      await refresh();
      setNotice({
        tone: "success",
        title: "Resume saved",
        message: "The editable resume draft is saved. Publish to rebuild the public Astro resume.",
      });
    } catch (saveError) {
      setNotice({
        tone: "error",
        title: "Resume save failed",
        message: saveError instanceof Error ? saveError.message : "Resume draft could not be saved.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!form) {
      return;
    }

    setIsPublishing(true);
    setNotice({
      tone: "info",
      title: "Publishing resume",
      message: "Saving the current editor state and queuing the release train.",
    });

    try {
      await saveResumeDraft({
        locale: selectedLocale,
        contentJson: serializeResumeDraft(form),
      });
      const result = await publishContent({ scope: "resume", locale: selectedLocale });
      await refresh();
      setNotice({
        tone: result.workflow.status === "queued" ? "success" : "info",
        title: result.workflow.status === "queued" ? "Resume publish queued" : "Resume marked published",
        message: result.workflow.status === "queued"
          ? `GitHub Actions is rebuilding ${result.workflow.ref ?? "develop"} with the ${selectedLocale.toUpperCase()} resume.`
          : result.workflow.reason ?? "The publish workflow token is not configured.",
      });
    } catch (publishError) {
      setNotice({
        tone: "error",
        title: "Resume publish failed",
        message: publishError instanceof Error ? publishError.message : "Resume publish could not be queued.",
      });
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleVersionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await saveResumeVersion(versionForm);
      setVersionForm((current) => ({ ...current, version: "" }));
      await refresh();
      setNotice({
        tone: "success",
        title: "PDF artifact saved",
        message: "The PDF artifact is registered. Resume copy is edited in the main editor above.",
      });
    } catch (saveError) {
      setNotice({
        tone: "error",
        title: "PDF artifact failed",
        message: saveError instanceof Error ? saveError.message : "Resume version could not be saved.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dashboard-workspace">
      <section className="dashboard-page-heading">
        <Badge className="w-fit" variant="secondary">Resume</Badge>
        <div>
          <h1>Resume workspace</h1>
          <p>Edit the public resume content directly. Save stores the draft; Publish applies it to the next Astro build.</p>
        </div>
      </section>

      <NoticeAlert notice={notice} />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Resume data problem</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!payload || !form ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Editable resume</CardTitle>
                <CardDescription>
                  Last saved: {activeDraft ? formatDate(activeDraft.updatedAt) : "No dashboard draft yet"} · Last published: {activeDraft?.publishedAt ? formatDate(activeDraft.publishedAt) : "Not published"}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="resume-toolbar">
                <Tabs value={selectedLocale} onValueChange={(value) => setSelectedLocale(value as DashboardLocale)}>
                  <TabsList className="locale-tabs-list">
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="es">Spanish</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="form-action-row resume-actions">
                  <span aria-live="polite">
                    {hasChanges ? "Resume has unsaved changes." : "Resume editor is up to date."}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={isSaving || !hasChanges} onClick={() => void handleSave()}>
                      {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
                      Save
                    </Button>
                    <Button type="button" disabled={isPublishing} onClick={() => void handlePublish()}>
                      {isPublishing ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <RocketIcon data-icon="inline-start" />}
                      Publish
                    </Button>
                  </div>
                </div>
              </div>
              <ResumeEditor content={form} onChange={setForm} />
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <ResumeVersionsCard versions={versions} />
            <Card>
              <CardHeader>
                <CardTitle>PDF artifact</CardTitle>
                <CardDescription>Optional downloadable file used by the public resume CTA.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="content-edit-form" onSubmit={handleVersionSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Locale</FieldLabel>
                      <Select
                        value={versionForm.locale}
                        onValueChange={(value) => setVersionForm((current) => ({ ...current, locale: value as DashboardLocale }))}
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
                      <FieldLabel>Version</FieldLabel>
                      <Input value={versionForm.version} onChange={(event) => setVersionForm((current) => ({ ...current, version: event.target.value }))} placeholder="2026.07" />
                    </Field>
                    <Field>
                      <FieldLabel>PDF path</FieldLabel>
                      <Input value={versionForm.pdfPath} onChange={(event) => setVersionForm((current) => ({ ...current, pdfPath: event.target.value }))} />
                    </Field>
                  </FieldGroup>
                  <Button type="submit" disabled={isSaving || !versionForm.version.trim()}>
                    {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
                    Save PDF artifact
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function ResumeEditor({
  content,
  onChange,
}: {
  content: DashboardResumeContent;
  onChange: (content: DashboardResumeContent) => void;
}) {
  function update<K extends keyof DashboardResumeContent>(key: K, value: DashboardResumeContent[K]) {
    onChange({ ...content, [key]: value });
  }

  return (
    <div className="resume-editor-grid">
      <Card>
        <CardHeader>
          <CardTitle>Header</CardTitle>
          <CardDescription>Name, positioning, intro, and download CTA.</CardDescription>
        </CardHeader>
        <CardContent className="content-edit-form">
          <div className="form-grid-2">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input value={content.name} onChange={(event) => update("name", event.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Input value={content.role} onChange={(event) => update("role", event.target.value)} />
            </Field>
          </div>
          <Field>
            <FieldLabel>Location</FieldLabel>
            <Input value={content.location} onChange={(event) => update("location", event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Intro</FieldLabel>
            <Textarea value={content.intro} rows={4} onChange={(event) => update("intro", event.target.value)} />
          </Field>
          <div className="form-grid-2">
            <Field>
              <FieldLabel>PDF label</FieldLabel>
              <Input value={content.pdf.label} onChange={(event) => update("pdf", { ...content.pdf, label: event.target.value })} />
            </Field>
            <Field>
              <FieldLabel>PDF href</FieldLabel>
              <Input value={content.pdf.href} onChange={(event) => update("pdf", { ...content.pdf, href: event.target.value })} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review panel</CardTitle>
          <CardDescription>The context panel beside the resume hero.</CardDescription>
        </CardHeader>
        <CardContent className="content-edit-form">
          <Field>
            <FieldLabel>Proof label</FieldLabel>
            <Input value={content.proof.label} onChange={(event) => update("proof", { ...content.proof, label: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel>Proof title</FieldLabel>
            <Input value={content.proof.title} onChange={(event) => update("proof", { ...content.proof, title: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel>Proof body</FieldLabel>
            <Textarea value={content.proof.body} rows={4} onChange={(event) => update("proof", { ...content.proof, body: event.target.value })} />
          </Field>
        </CardContent>
      </Card>

      <TextArrayEditor
        title={content.summaryTitle}
        titleLabel="Summary section title"
        values={content.summary}
        onTitleChange={(value) => update("summaryTitle", value)}
        onChange={(value) => update("summary", value)}
      />
      <HighlightsEditor
        title={content.highlightsTitle}
        items={content.highlights}
        onTitleChange={(value) => update("highlightsTitle", value)}
        onChange={(value) => update("highlights", value)}
      />
      <ProjectsEditor
        title={content.projectsTitle}
        items={content.projects}
        onTitleChange={(value) => update("projectsTitle", value)}
        onChange={(value) => update("projects", value)}
      />
      <ExperienceEditor
        title={content.experienceTitle}
        items={content.experience}
        onTitleChange={(value) => update("experienceTitle", value)}
        onChange={(value) => update("experience", value)}
      />
      <SkillsEditor
        title={content.skillsTitle}
        items={content.skills}
        onTitleChange={(value) => update("skillsTitle", value)}
        onChange={(value) => update("skills", value)}
      />
      <EducationEditor
        title={content.educationTitle}
        items={content.education}
        onTitleChange={(value) => update("educationTitle", value)}
        onChange={(value) => update("education", value)}
      />
      <TextArrayEditor
        title={content.languagesTitle}
        titleLabel="Languages section title"
        values={content.languages}
        onTitleChange={(value) => update("languagesTitle", value)}
        onChange={(value) => update("languages", value)}
      />
    </div>
  );
}

function TextArrayEditor({
  title,
  titleLabel,
  values,
  onTitleChange,
  onChange,
}: {
  title: string;
  titleLabel: string;
  values: string[];
  onTitleChange: (title: string) => void;
  onChange: (values: string[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Edit one item per row.</CardDescription>
      </CardHeader>
      <CardContent className="content-edit-form">
        <Field>
          <FieldLabel>{titleLabel}</FieldLabel>
          <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </Field>
        {values.map((value, index) => (
          <div key={index} className="array-row">
            <Textarea value={value} rows={3} onChange={(event) => onChange(replaceAt(values, index, event.target.value))} />
            <IconButton label="Remove" onClick={() => onChange(removeAt(values, index))} />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => onChange([...values, ""])}>
          <PlusIcon data-icon="inline-start" />
          Add item
        </Button>
      </CardContent>
    </Card>
  );
}

function HighlightsEditor({
  title,
  items,
  onTitleChange,
  onChange,
}: {
  title: string;
  items: ResumeHighlight[];
  onTitleChange: (title: string) => void;
  onChange: (items: ResumeHighlight[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Quantified impact blocks.</CardDescription>
      </CardHeader>
      <CardContent className="content-edit-form">
        <Field>
          <FieldLabel>Section title</FieldLabel>
          <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </Field>
        {items.map((item, index) => (
          <div key={index} className="nested-editor-row">
            <div className="form-grid-2">
              <Field>
                <FieldLabel>Label</FieldLabel>
                <Input value={item.label} onChange={(event) => onChange(replaceAt(items, index, { ...item, label: event.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Text</FieldLabel>
                <Input value={item.text} onChange={(event) => onChange(replaceAt(items, index, { ...item, text: event.target.value }))} />
              </Field>
            </div>
            <IconButton label="Remove highlight" onClick={() => onChange(removeAt(items, index))} />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => onChange([...items, { label: "", text: "" }])}>
          <PlusIcon data-icon="inline-start" />
          Add highlight
        </Button>
      </CardContent>
    </Card>
  );
}

function ProjectsEditor({
  title,
  items,
  onTitleChange,
  onChange,
}: {
  title: string;
  items: ResumeProject[];
  onTitleChange: (title: string) => void;
  onChange: (items: ResumeProject[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Resume projects and bullets.</CardDescription>
      </CardHeader>
      <CardContent className="content-edit-form">
        <Field>
          <FieldLabel>Section title</FieldLabel>
          <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </Field>
        {items.map((item, index) => (
          <div key={index} className="nested-editor-row">
            <Field>
              <FieldLabel>Project title</FieldLabel>
              <Input value={item.title} onChange={(event) => onChange(replaceAt(items, index, { ...item, title: event.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>Summary</FieldLabel>
              <Textarea value={item.summary} rows={3} onChange={(event) => onChange(replaceAt(items, index, { ...item, summary: event.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>Bullets</FieldLabel>
              <Textarea value={item.bullets.join("\n")} rows={4} onChange={(event) => onChange(replaceAt(items, index, { ...item, bullets: linesFromTextarea(event.target.value) }))} />
            </Field>
            <IconButton label="Remove project" onClick={() => onChange(removeAt(items, index))} />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => onChange([...items, { title: "", summary: "", bullets: [""] }])}>
          <PlusIcon data-icon="inline-start" />
          Add project
        </Button>
      </CardContent>
    </Card>
  );
}

function ExperienceEditor({
  title,
  items,
  onTitleChange,
  onChange,
}: {
  title: string;
  items: ResumeExperience[];
  onTitleChange: (title: string) => void;
  onChange: (items: ResumeExperience[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Add and edit roles, periods, and impact bullets.</CardDescription>
      </CardHeader>
      <CardContent className="content-edit-form">
        <Field>
          <FieldLabel>Section title</FieldLabel>
          <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </Field>
        {items.map((item, index) => (
          <div key={index} className="nested-editor-row">
            <div className="form-grid-3">
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Input value={item.role} onChange={(event) => onChange(replaceAt(items, index, { ...item, role: event.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Company</FieldLabel>
                <Input value={item.company} onChange={(event) => onChange(replaceAt(items, index, { ...item, company: event.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Period</FieldLabel>
                <Input value={item.period} onChange={(event) => onChange(replaceAt(items, index, { ...item, period: event.target.value }))} />
              </Field>
            </div>
            <Field>
              <FieldLabel>Bullets</FieldLabel>
              <Textarea value={item.bullets.join("\n")} rows={5} onChange={(event) => onChange(replaceAt(items, index, { ...item, bullets: linesFromTextarea(event.target.value) }))} />
            </Field>
            <IconButton label="Remove experience" onClick={() => onChange(removeAt(items, index))} />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => onChange([...items, { role: "", company: "", period: "", bullets: [""] }])}>
          <PlusIcon data-icon="inline-start" />
          Add experience
        </Button>
      </CardContent>
    </Card>
  );
}

function SkillsEditor({
  title,
  items,
  onTitleChange,
  onChange,
}: {
  title: string;
  items: ResumeSkillGroup[];
  onTitleChange: (title: string) => void;
  onChange: (items: ResumeSkillGroup[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Skill groups and comma-free item lists.</CardDescription>
      </CardHeader>
      <CardContent className="content-edit-form">
        <Field>
          <FieldLabel>Section title</FieldLabel>
          <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </Field>
        {items.map((item, index) => (
          <div key={index} className="nested-editor-row">
            <Field>
              <FieldLabel>Group label</FieldLabel>
              <Input value={item.label} onChange={(event) => onChange(replaceAt(items, index, { ...item, label: event.target.value }))} />
            </Field>
            <Field>
              <FieldLabel>Items</FieldLabel>
              <Textarea value={item.items.join("\n")} rows={4} onChange={(event) => onChange(replaceAt(items, index, { ...item, items: linesFromTextarea(event.target.value) }))} />
            </Field>
            <IconButton label="Remove skill group" onClick={() => onChange(removeAt(items, index))} />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => onChange([...items, { label: "", items: [""] }])}>
          <PlusIcon data-icon="inline-start" />
          Add skill group
        </Button>
      </CardContent>
    </Card>
  );
}

function EducationEditor({
  title,
  items,
  onTitleChange,
  onChange,
}: {
  title: string;
  items: ResumeEducation[];
  onTitleChange: (title: string) => void;
  onChange: (items: ResumeEducation[]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Education entries.</CardDescription>
      </CardHeader>
      <CardContent className="content-edit-form">
        <Field>
          <FieldLabel>Section title</FieldLabel>
          <Input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </Field>
        {items.map((item, index) => (
          <div key={index} className="nested-editor-row">
            <div className="form-grid-3">
              <Field>
                <FieldLabel>Degree</FieldLabel>
                <Input value={item.degree} onChange={(event) => onChange(replaceAt(items, index, { ...item, degree: event.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Institution</FieldLabel>
                <Input value={item.institution} onChange={(event) => onChange(replaceAt(items, index, { ...item, institution: event.target.value }))} />
              </Field>
              <Field>
                <FieldLabel>Period</FieldLabel>
                <Input value={item.period} onChange={(event) => onChange(replaceAt(items, index, { ...item, period: event.target.value }))} />
              </Field>
            </div>
            <IconButton label="Remove education" onClick={() => onChange(removeAt(items, index))} />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => onChange([...items, { degree: "", institution: "", period: "" }])}>
          <PlusIcon data-icon="inline-start" />
          Add education
        </Button>
      </CardContent>
    </Card>
  );
}

function ResumeVersionsCard({ versions }: { versions: DashboardResumeVersion[] | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF artifacts</CardTitle>
        <CardDescription>Downloadable files registered for the public resume.</CardDescription>
      </CardHeader>
      <CardContent>
        {!versions ? (
          <Skeleton className="h-48 w-full" />
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No PDF artifacts yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell className="font-medium">{version.version}</TableCell>
                  <TableCell>{version.locale}</TableCell>
                  <TableCell className="text-muted-foreground">{version.pdfPath}</TableCell>
                  <TableCell>
                    <Badge variant={version.isPublished ? "default" : "secondary"}>
                      {version.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="icon" aria-label={label} onClick={onClick}>
      <Trash2Icon />
    </Button>
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

function replaceAt<T>(items: T[], index: number, value: T): T[] {
  return items.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function linesFromTextarea(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function cloneResumeContent(content: DashboardResumeContent): DashboardResumeContent {
  return JSON.parse(JSON.stringify(content)) as DashboardResumeContent;
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
