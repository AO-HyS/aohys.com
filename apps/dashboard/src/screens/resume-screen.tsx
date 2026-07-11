import { useMemo, useReducer, useState } from "react";
import {
  LoaderCircleIcon,
  PlusIcon,
  RocketIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import {
  serializeResumeDraft,
  useDashboardContent,
  usePublishContent,
  useSaveResumeDraft,
  useSaveResumeVersion,
} from "@/api";
import { Action } from "@/components/dashboard/action";
import { AsyncSurface } from "@/components/dashboard/async-surface";
import { ConfirmAction } from "@/components/dashboard/confirm-action";
import { LabeledInput, LabeledSelect, LabeledTextarea } from "@/components/dashboard/form-controls";
import { PageHeader } from "@/components/dashboard/page-header";
import { SaveBar } from "@/components/dashboard/save-bar";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import { captureDashboardAction } from "@/lib/analytics";
import { dashboardClass } from "@/lib/dashboard-classes";
import {
  createResumeEditableState,
  reduceResumeEditableState,
  resumeHasChanges,
  validateResumeContent,
} from "@/lib/resume-editable-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  DashboardLocale,
  DashboardContentPayload,
  DashboardResumeContent,
  DashboardResumeVersion,
  ResumeEducation,
  ResumeExperience,
  ResumeHighlight,
  ResumeProject,
  ResumeSkillGroup,
} from "@/types";

export function ResumeScreen() {
  const payload = useDashboardContent();
  const [selectedLocale, setSelectedLocale] = useState<DashboardLocale>("en");

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
  if (!payload || !baseline) {
    return (
      <section className="flex flex-col gap-5">
        <PageHeader
          title="Loading resume workspace"
          description="Preparing the editable resume and its publication history."
        />
        <AsyncSurface state="loading" title="Loading resume workspace" />
      </section>
    );
  }

  return (
    <ResumeWorkspace
      key={selectedLocale}
      payload={payload}
      baseline={baseline}
      selectedLocale={selectedLocale}
      onSelectLocale={setSelectedLocale}
    />
  );
}

function ResumeWorkspace({
  payload,
  baseline,
  selectedLocale,
  onSelectLocale,
}: {
  payload: DashboardContentPayload;
  baseline: DashboardResumeContent;
  selectedLocale: DashboardLocale;
  onSelectLocale: (locale: DashboardLocale) => void;
}) {
  const publishContent = usePublishContent();
  const saveResumeDraft = useSaveResumeDraft();
  const saveResumeVersion = useSaveResumeVersion();
  const activeDraft = payload.resumeDrafts.find((item) => item.locale === selectedLocale);
  const baselineVersion = activeDraft?.updatedAt ?? 0;
  const [editor, dispatch] = useReducer(reduceResumeEditableState, baseline, createResumeEditableState);
  const [seenBaselineVersion, setSeenBaselineVersion] = useState(baselineVersion);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveResult, setSaveResult] = useState<"clean" | "saved" | "error">("clean");
  const [pendingLocale, setPendingLocale] = useState<DashboardLocale | null>(null);
  const [versionForm, setVersionForm] = useState({
    locale: selectedLocale,
    version: "",
    pdfPath: "/downloads/alejandro-ortiz-corro-resume.pdf",
    isPublished: true,
  });
  const form = editor.draft;
  const hasChanges = resumeHasChanges(editor);
  const validationErrors = validateResumeContent(form);
  const versions = payload.resumeVersions;
  const hasRemoteBaseline = baselineVersion !== seenBaselineVersion;

  async function handleSave() {
    if (validationErrors.length > 0) {
      setSaveResult("error");
      toast.error("Resume needs attention", { description: validationErrors[0] });
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Saving resume", {
      description: `Writing the ${selectedLocale.toUpperCase()} resume draft to Convex.`,
    });

    try {
      const mutationResult = await saveResumeDraft({
        locale: selectedLocale,
        contentJson: serializeResumeDraft(form),
      });
      dispatch({ type: "commit" });
      setSeenBaselineVersion(mutationResult.updatedAt);
      setSaveResult("saved");
      captureDashboardAction("succeeded", "resume", "save_resume", { locale: selectedLocale });
      toast.success("Resume saved", {
        id: toastId,
        description: "The editable resume draft is saved. Publish to rebuild the public Astro resume.",
      });
    } catch (saveError) {
      setSaveResult("error");
      captureDashboardAction("failed", "resume", "save_resume", {
        error_type: saveError instanceof Error ? saveError.name : "UnknownError",
        locale: selectedLocale,
      });
      toast.error("Resume save failed", {
        id: toastId,
        description: saveError instanceof Error ? saveError.message : "Resume draft could not be saved.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (hasChanges || validationErrors.length > 0) {
      toast.error("Save a valid draft before publishing.");
      return;
    }

    setIsPublishing(true);
    const toastId = toast.loading("Publishing resume", {
      description: "Requesting publication for the saved Convex draft.",
    });

    try {
      const result = await publishContent({ scope: "resume", locale: selectedLocale });
      captureDashboardAction("succeeded", "resume", "publish_resume", {
        locale: selectedLocale,
        workflow_status: result.workflow.status,
      });
      const description = result.workflow.status === "queued"
        ? `GitHub Actions is rebuilding ${result.workflow.ref ?? "develop"} with the ${selectedLocale.toUpperCase()} resume.`
        : result.workflow.reason ?? "The publish workflow token is not configured.";

      if (result.workflow.status === "queued") {
        toast.success("Resume publish queued", { id: toastId, description });
      } else {
        toast.message("Resume marked published", { id: toastId, description });
      }
    } catch (publishError) {
      captureDashboardAction("failed", "resume", "publish_resume", {
        error_type: publishError instanceof Error ? publishError.name : "UnknownError",
        locale: selectedLocale,
      });
      toast.error("Resume publish failed", {
        id: toastId,
        description: publishError instanceof Error ? publishError.message : "Resume publish could not be queued.",
      });
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleVersionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingVersion(true);
    const toastId = toast.loading("Saving PDF artifact");

    try {
      await saveResumeVersion(versionForm);
      captureDashboardAction("succeeded", "resume", "save_resume_artifact", {
        locale: versionForm.locale,
      });
      setVersionForm((current) => ({ ...current, version: "" }));
      toast.success("PDF artifact saved", {
        id: toastId,
        description: "The PDF artifact is registered. Resume copy is edited in the main editor above.",
      });
    } catch (saveError) {
      captureDashboardAction("failed", "resume", "save_resume_artifact", {
        error_type: saveError instanceof Error ? saveError.name : "UnknownError",
        locale: versionForm.locale,
      });
      toast.error("PDF artifact failed", {
        id: toastId,
        description: saveError instanceof Error ? saveError.message : "Resume version could not be saved.",
      });
    } finally {
      setIsSavingVersion(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resume publishing workspace"
        description="Edit one section at a time. Save commits the Convex draft; Publish becomes available only after the draft is valid and saved."
        actions={(
          <Tabs
            value={selectedLocale}
            onValueChange={(value) => {
              const nextLocale = value as DashboardLocale;
              if (nextLocale === selectedLocale) return;
              if (hasChanges) setPendingLocale(nextLocale);
              else onSelectLocale(nextLocale);
            }}
          >
            <TabsList className={dashboardClass.localeTabsList}>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="es">Spanish</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      />

      <section aria-label="Resume draft status" className="flex flex-wrap gap-x-6 gap-y-2 border-y py-3 text-sm text-muted-foreground">
        <span>Last saved: <strong className="text-foreground">{activeDraft ? formatDate(activeDraft.updatedAt) : "No dashboard draft"}</strong></span>
        <span>Last published: <strong className="text-foreground">{activeDraft?.publishedAt ? formatDate(activeDraft.publishedAt) : "Not published"}</strong></span>
        <span>Validation: <strong className="text-foreground">{validationErrors.length === 0 ? "Ready" : `${validationErrors.length} issue${validationErrors.length === 1 ? "" : "s"}`}</strong></span>
      </section>

      {validationErrors.length > 0 ? (
        <div role="alert" className="rounded-lg border border-attention/40 bg-attention/10 p-4">
          <strong className="text-sm">Fix before saving</strong>
          <ul className="mt-2 list-disc pl-5 font-body text-sm text-muted-foreground">
            {validationErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      {hasRemoteBaseline ? (
        <div role="status" className="flex flex-col gap-3 rounded-lg border border-attention/40 bg-attention/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="text-sm">A newer saved baseline is available</strong>
            <p className="mt-1 font-body text-sm text-muted-foreground">Rebase only when you are ready to replace this local editor state.</p>
          </div>
          <ConfirmAction
            trigger={<Action variant="secondary">Review saved baseline</Action>}
            title="Replace this local editor state?"
            description="The newer Convex baseline will replace any unsaved changes in this locale."
            confirmLabel="Rebase editor"
            onConfirm={() => {
              dispatch({ type: "rebase", baseline });
              setSeenBaselineVersion(baselineVersion);
              setSaveResult("clean");
            }}
          />
        </div>
      ) : null}

      <ResumeEditor
        content={form}
        onChange={(draft) => {
          setSaveResult("clean");
          dispatch({ type: "replace", draft });
        }}
      />

      <SaveBar
        state={isSaving ? "saving" : hasChanges ? "dirty" : saveResult}
        onSave={() => void handleSave()}
        disabled={!hasChanges || validationErrors.length > 0 || isPublishing}
        description={hasChanges
          ? "Save this locale before switching locale or requesting publication."
          : "The current locale matches its saved Convex baseline."}
        secondaryAction={!hasChanges && validationErrors.length === 0 ? (
          <Action
            variant="secondary"
            pending={isPublishing}
            pendingLabel="Requesting publication…"
            onClick={() => void handlePublish()}
          >
            <RocketIcon data-icon="inline-start" />
            <span className="sm:hidden">Publish</span>
            <span className="hidden sm:inline">Publish saved draft</span>
          </Action>
        ) : undefined}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ResumeVersionsCard versions={versions} />
        <Card>
              <CardHeader>
                <CardTitle>PDF artifact</CardTitle>
                <CardDescription>Optional downloadable file used by the public resume CTA.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className={dashboardClass.editForm} onSubmit={handleVersionSubmit}>
                  <FieldGroup>
                    <LabeledSelect
                      label="Locale"
                      value={versionForm.locale}
                      onValueChange={(value) => setVersionForm((current) => ({ ...current, locale: value as DashboardLocale }))}
                      options={[{ value: "en", label: "English" }, { value: "es", label: "Spanish" }]}
                    />
                    <LabeledInput label="Version" value={versionForm.version} placeholder="2026.07" onValueChange={(value) => setVersionForm((current) => ({ ...current, version: value }))} />
                    <LabeledInput label="PDF path" value={versionForm.pdfPath} onValueChange={(value) => setVersionForm((current) => ({ ...current, pdfPath: value }))} />
                  </FieldGroup>
                  <Button type="submit" disabled={isSavingVersion || !versionForm.version.trim()}>
                    {isSavingVersion ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
                    Save PDF artifact
                  </Button>
                </form>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={pendingLocale !== null} onOpenChange={(open) => !open && setPendingLocale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved locale changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching locale resets this editor to the other locale's saved Convex baseline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingLocale) onSelectLocale(pendingLocale);
                setPendingLocale(null);
              }}
            >
              Discard and switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const [section, setSection] = useState<ResumeSection>("header");

  function update<K extends keyof DashboardResumeContent>(key: K, value: DashboardResumeContent[K]) {
    onChange({ ...content, [key]: value });
  }

  return (
    <section aria-label="Focused resume editor" className="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:items-start">
      <div className="md:hidden">
        <ResumeSectionSelect section={section} onChange={setSection} />
      </div>
      <nav aria-label="Resume sections" className="hidden rounded-lg border p-2 md:block">
        <ol className="flex flex-col gap-1">
          {resumeSections.map((item) => (
            <li key={item.id}>
              <Button
                type="button"
                variant={section === item.id ? "secondary" : "ghost"}
                className="h-auto min-h-10 w-full justify-start whitespace-normal text-left"
                aria-current={section === item.id ? "step" : undefined}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </Button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="min-w-0">
        {section === "header" ? <ResumeHeaderEditor content={content} update={update} /> : null}
        {section === "proof" ? <ResumeProofEditor content={content} update={update} /> : null}
        {section === "summary" ? (
          <TextArrayEditor title={content.summaryTitle} titleLabel="Summary section title" values={content.summary} onTitleChange={(value) => update("summaryTitle", value)} onChange={(value) => update("summary", value)} />
        ) : null}
        {section === "highlights" ? <HighlightsEditor title={content.highlightsTitle} items={content.highlights} onTitleChange={(value) => update("highlightsTitle", value)} onChange={(value) => update("highlights", value)} /> : null}
        {section === "projects" ? <ProjectsEditor title={content.projectsTitle} items={content.projects} onTitleChange={(value) => update("projectsTitle", value)} onChange={(value) => update("projects", value)} /> : null}
        {section === "experience" ? <ExperienceEditor title={content.experienceTitle} items={content.experience} onTitleChange={(value) => update("experienceTitle", value)} onChange={(value) => update("experience", value)} /> : null}
        {section === "skills" ? <SkillsEditor title={content.skillsTitle} items={content.skills} onTitleChange={(value) => update("skillsTitle", value)} onChange={(value) => update("skills", value)} /> : null}
        {section === "education" ? <EducationEditor title={content.educationTitle} items={content.education} onTitleChange={(value) => update("educationTitle", value)} onChange={(value) => update("education", value)} /> : null}
        {section === "languages" ? <TextArrayEditor title={content.languagesTitle} titleLabel="Languages section title" values={content.languages} onTitleChange={(value) => update("languagesTitle", value)} onChange={(value) => update("languages", value)} /> : null}
      </div>
    </section>
  );
}

const resumeSections = [
  { id: "header", label: "Header & CTA" },
  { id: "proof", label: "Review panel" },
  { id: "summary", label: "Summary" },
  { id: "highlights", label: "Highlights" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "languages", label: "Languages" },
] as const;

type ResumeSection = (typeof resumeSections)[number]["id"];

function ResumeSectionSelect({ section, onChange }: { section: ResumeSection; onChange: (section: ResumeSection) => void }) {
  return (
    <LabeledSelect
      label="Resume section"
      value={section}
      onValueChange={(value) => onChange(value as ResumeSection)}
      options={resumeSections.map((item) => ({ value: item.id, label: item.label }))}
    />
  );
}

function ResumeHeaderEditor({
  content,
  update,
}: {
  content: DashboardResumeContent;
  update: <K extends keyof DashboardResumeContent>(key: K, value: DashboardResumeContent[K]) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Header & download CTA</CardTitle><CardDescription>Name, positioning, intro, and public PDF action.</CardDescription></CardHeader>
      <CardContent className={dashboardClass.editForm}>
        <div className={dashboardClass.formGrid2}>
          <LabeledInput label="Name" value={content.name} onValueChange={(value) => update("name", value)} />
          <LabeledInput label="Role" value={content.role} onValueChange={(value) => update("role", value)} />
        </div>
        <LabeledInput label="Location" value={content.location} onValueChange={(value) => update("location", value)} />
        <LabeledTextarea label="Intro" value={content.intro} rows={4} onValueChange={(value) => update("intro", value)} />
        <div className={dashboardClass.formGrid2}>
          <LabeledInput label="PDF label" value={content.pdf.label} onValueChange={(value) => update("pdf", { ...content.pdf, label: value })} />
          <LabeledInput label="PDF href" value={content.pdf.href} onValueChange={(value) => update("pdf", { ...content.pdf, href: value })} />
        </div>
      </CardContent>
    </Card>
  );
}

function ResumeProofEditor({
  content,
  update,
}: {
  content: DashboardResumeContent;
  update: <K extends keyof DashboardResumeContent>(key: K, value: DashboardResumeContent[K]) => void;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>Review panel</CardTitle><CardDescription>The evidence context beside the resume hero.</CardDescription></CardHeader>
      <CardContent className={dashboardClass.editForm}>
        <LabeledInput label="Proof label" value={content.proof.label} onValueChange={(value) => update("proof", { ...content.proof, label: value })} />
        <LabeledInput label="Proof title" value={content.proof.title} onValueChange={(value) => update("proof", { ...content.proof, title: value })} />
        <LabeledTextarea label="Proof body" value={content.proof.body} rows={4} onValueChange={(value) => update("proof", { ...content.proof, body: value })} />
      </CardContent>
    </Card>
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
      <CardContent className={dashboardClass.editForm}>
        <LabeledInput label={titleLabel} value={title} onValueChange={onTitleChange} />
        {values.map((value, index) => (
          <div key={index} className={dashboardClass.arrayRow}>
            <LabeledTextarea label={`Item ${index + 1}`} value={value} rows={3} onValueChange={(nextValue) => onChange(replaceAt(values, index, nextValue))} />
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
      <CardContent className={dashboardClass.editForm}>
        <LabeledInput label="Section title" value={title} onValueChange={onTitleChange} />
        {items.map((item, index) => (
          <div key={index} className={dashboardClass.nestedEditorRow}>
            <div className={dashboardClass.formGrid2}>
              <LabeledInput label={`Highlight ${index + 1} label`} value={item.label} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, label: value }))} />
              <LabeledInput label={`Highlight ${index + 1} text`} value={item.text} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, text: value }))} />
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
      <CardContent className={dashboardClass.editForm}>
        <LabeledInput label="Section title" value={title} onValueChange={onTitleChange} />
        {items.map((item, index) => (
          <div key={index} className={dashboardClass.nestedEditorRow}>
            <LabeledInput label={`Project ${index + 1} title`} value={item.title} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, title: value }))} />
            <LabeledTextarea label={`Project ${index + 1} summary`} value={item.summary} rows={3} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, summary: value }))} />
            <LabeledTextarea label={`Project ${index + 1} bullets`} description="One bullet per line." value={item.bullets.join("\n")} rows={4} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, bullets: linesFromTextarea(value) }))} />
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
      <CardContent className={dashboardClass.editForm}>
        <LabeledInput label="Section title" value={title} onValueChange={onTitleChange} />
        {items.map((item, index) => (
          <div key={index} className={dashboardClass.nestedEditorRow}>
            <div className={dashboardClass.formGrid3}>
              <LabeledInput label={`Experience ${index + 1} role`} value={item.role} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, role: value }))} />
              <LabeledInput label={`Experience ${index + 1} company`} value={item.company} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, company: value }))} />
              <LabeledInput label={`Experience ${index + 1} period`} value={item.period} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, period: value }))} />
            </div>
            <LabeledTextarea label={`Experience ${index + 1} bullets`} description="One bullet per line." value={item.bullets.join("\n")} rows={5} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, bullets: linesFromTextarea(value) }))} />
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
      <CardContent className={dashboardClass.editForm}>
        <LabeledInput label="Section title" value={title} onValueChange={onTitleChange} />
        {items.map((item, index) => (
          <div key={index} className={dashboardClass.nestedEditorRow}>
            <LabeledInput label={`Skill group ${index + 1} label`} value={item.label} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, label: value }))} />
            <LabeledTextarea label={`Skill group ${index + 1} items`} description="One skill per line." value={item.items.join("\n")} rows={4} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, items: linesFromTextarea(value) }))} />
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
      <CardContent className={dashboardClass.editForm}>
        <LabeledInput label="Section title" value={title} onValueChange={onTitleChange} />
        {items.map((item, index) => (
          <div key={index} className={dashboardClass.nestedEditorRow}>
            <div className={dashboardClass.formGrid3}>
              <LabeledInput label={`Education ${index + 1} degree`} value={item.degree} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, degree: value }))} />
              <LabeledInput label={`Education ${index + 1} institution`} value={item.institution} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, institution: value }))} />
              <LabeledInput label={`Education ${index + 1} period`} value={item.period} onValueChange={(value) => onChange(replaceAt(items, index, { ...item, period: value }))} />
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
    <ConfirmAction
      trigger={(
        <Button type="button" variant="outline" size="icon" aria-label={label}>
          <Trash2Icon />
        </Button>
      )}
      title="Remove this resume item?"
      description="This changes the local draft. Save is still required before Convex is updated."
      confirmLabel="Remove item"
      onConfirm={onClick}
    />
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

function formatDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
