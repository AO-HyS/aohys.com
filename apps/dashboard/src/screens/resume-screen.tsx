import { useEffect, useState } from "react";
import { LoaderCircleIcon, SaveIcon } from "lucide-react";
import { loadDashboardContent, saveResumeVersion } from "@/api";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardLocale, DashboardResumeVersion } from "@/types";

export function ResumeScreen() {
  const [versions, setVersions] = useState<DashboardResumeVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    locale: "en" as DashboardLocale,
    version: "",
    pdfPath: "/downloads/alejandro-ortiz-corro-resume.pdf",
    isPublished: true,
  });

  async function refresh() {
    setError(null);
    try {
      const payload = await loadDashboardContent();
      setVersions(payload.resumeVersions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Resume content could not load.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await saveResumeVersion(form);
      setForm((current) => ({ ...current, version: "" }));
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Resume version could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <Badge className="w-fit" variant="secondary">Resume</Badge>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Resume publishing</h1>
          <p className="max-w-3xl text-muted-foreground">
            Track downloadable resume versions. Resume copy remains graph-backed until the next publishing pipeline moves it into editable project and experience records.
          </p>
        </div>
      </section>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Resume data problem</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardHeader>
            <CardTitle>Resume versions</CardTitle>
            <CardDescription>Downloadable PDF artifacts managed by the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            {!versions ? (
              <Skeleton className="h-48 w-full" />
            ) : versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No resume versions yet.</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Add version</CardTitle>
            <CardDescription>Register a new public PDF artifact.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <FieldGroup>
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
                  <FieldLabel>Version</FieldLabel>
                  <Input value={form.version} onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))} placeholder="2026.07" />
                </Field>
                <Field>
                  <FieldLabel>PDF path</FieldLabel>
                  <Input value={form.pdfPath} onChange={(event) => setForm((current) => ({ ...current, pdfPath: event.target.value }))} />
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
                Save version
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
