import type { ReactNode } from "react";
import { AlertCircleIcon, LockKeyholeIcon, PackageOpenIcon, RotateCcwIcon } from "lucide-react";
import { Action } from "@/components/dashboard/action";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export type AsyncSurfaceState = "ready" | "loading" | "empty" | "error" | "permission";

export interface AsyncSurfaceProps {
  state: AsyncSurfaceState;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
}

const defaultCopy: Record<Exclude<AsyncSurfaceState, "ready">, { title: string; description: string }> = {
  loading: {
    title: "Loading workspace",
    description: "The requested operational data is being prepared.",
  },
  empty: {
    title: "Nothing here yet",
    description: "This surface is ready when the first record is available.",
  },
  error: {
    title: "This surface could not load",
    description: "The rest of the dashboard is still available. Retry this request when ready.",
  },
  permission: {
    title: "Permission required",
    description: "Your session is valid, but it does not grant access to this operation.",
  },
};

export function AsyncSurface({
  state,
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  children,
}: AsyncSurfaceProps) {
  if (state === "ready") {
    return <>{children}</>;
  }

  const copy = defaultCopy[state];

  if (state === "loading") {
    return (
      <div
        data-slot="async-surface"
        data-state={state}
        aria-busy="true"
        aria-label={title ?? copy.title}
        className="flex flex-col gap-4 rounded-lg border p-5"
      >
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-4/5" />
        </div>
        <span className="sr-only">{description ?? copy.description}</span>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <Empty data-slot="async-surface" data-state={state} className="min-h-56 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageOpenIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{title ?? copy.title}</EmptyTitle>
          <EmptyDescription>{description ?? copy.description}</EmptyDescription>
        </EmptyHeader>
        {onRetry ? (
          <EmptyContent>
            <Action variant="secondary" onClick={onRetry}>
              <RotateCcwIcon data-icon="inline-start" />
              {retryLabel}
            </Action>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  const Icon = state === "permission" ? LockKeyholeIcon : AlertCircleIcon;

  return (
    <Alert
      data-slot="async-surface"
      data-state={state}
      variant={state === "error" ? "destructive" : "default"}
    >
      <Icon aria-hidden="true" />
      <AlertTitle>{title ?? copy.title}</AlertTitle>
      <AlertDescription className="font-body">{description ?? copy.description}</AlertDescription>
      {onRetry ? (
        <div className="col-span-full mt-3">
          <Action variant={state === "error" ? "destructive" : "secondary"} onClick={onRetry}>
            <RotateCcwIcon data-icon="inline-start" />
            {retryLabel}
          </Action>
        </div>
      ) : null}
    </Alert>
  );
}
