import type { ReactNode } from "react";
import { SaveIcon } from "lucide-react";
import { Action } from "@/components/dashboard/action";
import { StatusBadge, type StatusTone } from "@/components/dashboard/status-badge";

export type SaveBarState = "clean" | "dirty" | "saving" | "saved" | "error";

const saveStateCopy: Record<SaveBarState, { label: string; tone: StatusTone }> = {
  clean: { label: "Up to date", tone: "neutral" },
  dirty: { label: "Unsaved changes", tone: "attention" },
  saving: { label: "Saving", tone: "pending" },
  saved: { label: "Saved", tone: "success" },
  error: { label: "Save failed", tone: "danger" },
};

export interface SaveBarProps {
  state: SaveBarState;
  onSave: () => void;
  description?: string;
  saveLabel?: string;
  secondaryAction?: ReactNode;
  disabled?: boolean;
}

export function SaveBar({
  state,
  onSave,
  description,
  saveLabel = "Save changes",
  secondaryAction,
  disabled = false,
}: SaveBarProps) {
  const status = saveStateCopy[state];
  const isSaving = state === "saving";

  return (
    <footer data-slot="save-bar" className="sticky bottom-3 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-background p-2 shadow-[0_4px_0_color-mix(in_oklch,var(--foreground)_18%,transparent)] sm:p-3">
      <div className="flex min-w-0 flex-col gap-1">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        {description ? <p className="hidden font-body text-sm text-muted-foreground sm:block">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {secondaryAction}
        <Action
          pending={isSaving}
          pendingLabel="Saving…"
          disabled={disabled || state === "clean" || state === "saved"}
          onClick={onSave}
        >
          <SaveIcon data-icon="inline-start" />
          <span className="sm:hidden">Save</span>
          <span className="hidden sm:inline">{saveLabel}</span>
        </Action>
      </div>
    </footer>
  );
}
