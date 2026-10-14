import { useState, type ComponentType, type ReactElement } from "react";
import { Action, type ActionVariant } from "@/components/dashboard/action";
import { DialogIcon } from "@/components/dashboard/notice-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmActionContent {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: Extract<ActionVariant, "primary" | "destructive">;
  icon?: ComponentType;
  pending?: boolean;
  pendingLabel?: string;
}

// With a trigger the dialog owns its open state and closes on confirm. With
// `open` the caller owns it and closes the dialog once the work is done, so a
// pending action stays visible.
export type ConfirmActionProps = ConfirmActionContent &
  (
    | { trigger: ReactElement; open?: never; onOpenChange?: never }
    | { trigger?: never; open: boolean; onOpenChange: (open: boolean) => void }
  );

export function ConfirmAction({
  trigger,
  open: controlledOpen,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  variant = "destructive",
  icon: Icon,
  pending = false,
  pendingLabel = "Working…",
}: ConfirmActionProps) {
  const [ownOpen, setOwnOpen] = useState(false);
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : ownOpen;
  const setOpen = controlled ? onOpenChange : setOwnOpen;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen?.(next);
      }}
    >
      {trigger ? (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      ) : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          {Icon ? <DialogIcon icon={Icon} tone={variant} /> : null}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>
          <Action
            variant={variant}
            pending={pending}
            pendingLabel={pendingLabel}
            onClick={() => {
              onConfirm();
              if (!controlled) setOwnOpen(false);
            }}
          >
            {Icon ? <Icon data-icon="inline-start" aria-hidden="true" /> : null}
            {confirmLabel}
          </Action>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
