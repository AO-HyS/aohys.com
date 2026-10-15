import { useRef, type ComponentType, type RefObject } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type DialogTone = "primary" | "destructive";

const iconClassByTone = {
  primary: "bg-primary/20 text-foreground",
  destructive: "bg-destructive/10 text-destructive",
} as const satisfies Record<DialogTone, string>;

export function DialogIcon({
  icon: Icon,
  tone,
}: {
  icon: ComponentType;
  tone: DialogTone;
}) {
  return (
    <div
      className={cn(
        "mb-1 flex size-10 items-center justify-center rounded-full",
        iconClassByTone[tone],
      )}
    >
      <Icon aria-hidden="true" />
    </div>
  );
}

// Radix returns focus only to an AlertDialogTrigger. A dialog opened from state
// returns it to the element that had focus when it opened, if still mounted.
// `initialFocus` names the element to focus on open when the dialog has no
// Cancel button, which is where Radix would put it.
export function useReturnFocus(initialFocus?: RefObject<HTMLElement | null>) {
  const opener = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: (event: Event) => {
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      if (initialFocus?.current) {
        event.preventDefault();
        initialFocus.current.focus();
      }
    },
    onCloseAutoFocus: (event: Event) => {
      if (opener.current?.isConnected) {
        event.preventDefault();
        opener.current.focus();
      }
      opener.current = null;
    },
  };
}

export interface NoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  detail?: string;
  actionLabel?: string;
  tone?: DialogTone;
  icon?: ComponentType;
}

// A message the operator must acknowledge; it has no decision to make.
export function NoticeDialog({
  open,
  onOpenChange,
  title,
  description,
  detail,
  actionLabel = "Got it",
  tone = "destructive",
  icon,
}: NoticeDialogProps) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useReturnFocus(actionRef);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md" {...returnFocus}>
        <AlertDialogHeader>
          {icon ? <DialogIcon icon={icon} tone={tone} /> : null}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {detail ? (
          <div className="break-words rounded-lg border bg-muted/40 px-3 py-2 text-left text-sm leading-6 text-muted-foreground">
            {detail}
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogAction ref={actionRef}>{actionLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
