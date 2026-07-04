import { useEffect, useMemo, useState } from "react";
import { LoaderCircleIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { loadDashboardContent, saveSiteSetting } from "@/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardContentPayload, DashboardSiteSetting } from "@/types";

export function SettingsScreen() {
  const [content, setContent] = useState<DashboardContentPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function refresh() {
    setLoadError(null);
    try {
      setContent(await loadDashboardContent());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Dashboard settings could not load.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleSaveContact(value: string) {
    const toastId = toast.loading("Saving site setting");
    setIsSaving(true);

    try {
      await saveSiteSetting({
        key: "PUBLIC_WHATSAPP_URL",
        value,
        classification: "public-build-value",
      });
      await refresh();
      toast.success("Site setting saved", {
        id: toastId,
        description: "The public WhatsApp URL will be applied by the next content build.",
      });
    } catch (error) {
      toast.error("Setting save failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "The site setting could not be saved.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!content && !loadError) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="dashboard-workspace">
      <section className="dashboard-page-heading">
        <Badge className="w-fit" variant="secondary">Settings</Badge>
        <div>
          <h1>Site settings</h1>
          <p>Manage public build values that belong outside an individual project record.</p>
        </div>
      </section>

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard settings problem</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {content ? (
        <ContactSettingsCard
          settings={content.settings}
          isSaving={isSaving}
          onSave={handleSaveContact}
        />
      ) : null}
    </div>
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
    <Card id="contact-settings" className="settings-card">
      <CardHeader>
        <CardTitle>Public contact</CardTitle>
        <CardDescription>
          This value feeds the public Astro contact surface during the release train.
        </CardDescription>
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
            <FieldLabel htmlFor="public-whatsapp-url">PUBLIC_WHATSAPP_URL</FieldLabel>
            <Input
              id="public-whatsapp-url"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <FieldDescription>Use a public https://wa.me/... URL.</FieldDescription>
          </Field>
          <Button className="self-end" type="submit" disabled={isSaving || value === currentValue}>
            {isSaving ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <SaveIcon data-icon="inline-start" />}
            Save setting
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
