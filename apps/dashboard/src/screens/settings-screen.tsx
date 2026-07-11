import { useState } from "react";
import { ExternalLinkIcon, SaveIcon, ShieldCheckIcon } from "lucide-react";
import { validatePublicWhatsappUrl } from "@aohys/core";
import { useDashboardContent, useSaveSiteSetting } from "@/api";
import { Action, AsyncSurface, PageHeader, SectionPanel, StatusBadge } from "@/components/dashboard";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { captureDashboardAction } from "@/lib/analytics";

export function SettingsScreen() {
  const content = useDashboardContent();
  const saveSiteSetting = useSaveSiteSetting();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveContact(value: string) {
    const validation = validatePublicWhatsappUrl(value);
    if (!validation.normalized) return;

    const toastId = toast.loading("Saving public contact setting");
    setIsSaving(true);

    try {
      await saveSiteSetting({
        key: "PUBLIC_WHATSAPP_URL",
        value: validation.normalized,
        classification: "public-build-value",
      });
      captureDashboardAction("succeeded", "settings", "save_setting");
      toast.success("Public contact setting saved", {
        id: toastId,
        description: "The normalized URL is ready for the next reviewed content build.",
      });
    } catch (error) {
      captureDashboardAction("failed", "settings", "save_setting", {
        error_type: error instanceof Error ? error.name : "UnknownError",
      });
      toast.error("Setting save failed", {
        id: toastId,
        description: error instanceof Error ? error.message : "The site setting could not be saved.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!content) {
    return <AsyncSurface state="loading" title="Loading site settings" />;
  }

  const whatsappSetting = content.settings.find((setting) => setting.key === "PUBLIC_WHATSAPP_URL");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Site settings"
        description="Manage the small set of reviewed public values that belong outside an individual project. Secrets and provider credentials never belong here."
      />

      <SectionPanel
        title="Public contact"
        description="This value feeds the Astro contact surface only after the release train applies reviewed dashboard content."
      >
        <PublicWhatsappSetting
          key={whatsappSetting?.updatedAt ?? "empty"}
          initialValue={whatsappSetting?.value ?? ""}
          isSaving={isSaving}
          onSave={handleSaveContact}
        />
      </SectionPanel>
    </div>
  );
}

function PublicWhatsappSetting({
  initialValue,
  isSaving,
  onSave,
}: {
  initialValue: string;
  isSaving: boolean;
  onSave: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const validation = validatePublicWhatsappUrl(value);
  const isDirty = value.trim() !== initialValue;
  const canSave = isDirty && validation.ok;

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (validation.normalized) void onSave(validation.normalized);
      }}
    >
      <Field data-invalid={value.length > 0 && !validation.ok || undefined}>
        <FieldLabel htmlFor="public-whatsapp-url">WhatsApp public URL</FieldLabel>
        <Input
          id="public-whatsapp-url"
          name="publicWhatsappUrl"
          inputMode="url"
          autoComplete="url"
          aria-invalid={value.length > 0 && !validation.ok || undefined}
          aria-describedby="public-whatsapp-description public-whatsapp-error"
          placeholder="https://wa.me/522299020825"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <FieldDescription id="public-whatsapp-description">
          Use a direct <code>https://wa.me/</code> URL with 8–15 digits and no query parameters.
        </FieldDescription>
        {value.length > 0 && !validation.ok ? (
          <FieldError id="public-whatsapp-error">{validation.reason}</FieldError>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Action type="submit" pending={isSaving} pendingLabel="Saving…" disabled={!canSave}>
            <SaveIcon data-icon="inline-start" />
            Save setting
          </Action>
          <StatusBadge tone={canSave ? "attention" : validation.ok ? "success" : "neutral"}>
            {canSave ? "Unsaved change" : validation.ok ? "Valid value" : "Waiting for value"}
          </StatusBadge>
        </div>
      </Field>

      <aside className="rounded-xl border bg-muted/55 p-5" aria-label="Public value safety contract">
        <ShieldCheckIcon className="size-6 text-success-foreground" aria-hidden="true" />
        <h2 className="mt-3 font-semibold">Public by design</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The browser and Convex apply the same strict allowlist. Invalid protocols, alternate hosts, credentials, fragments, and query strings are rejected.
        </p>
        {validation.normalized ? (
          <a
            className="mt-4 inline-flex min-h-11 items-center gap-2 break-all text-sm underline decoration-primary decoration-2 underline-offset-4"
            href={validation.normalized}
            target="_blank"
            rel="noreferrer"
          >
            Preview normalized URL
            <ExternalLinkIcon className="size-4 shrink-0" aria-hidden="true" />
          </a>
        ) : null}
      </aside>
    </form>
  );
}
