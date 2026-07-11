import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Action } from "@/components/dashboard/action";
import { AsyncSurface } from "@/components/dashboard/async-surface";
import { PageHeader } from "@/components/dashboard/page-header";

export function RoutePendingState() {
  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="Loading workspace"
        description="Preparing this operational surface without blocking the rest of the dashboard."
      />
      <AsyncSurface state="loading" title="Loading workspace" />
    </section>
  );
}

export function RouteErrorState({ error, reset }: ErrorComponentProps) {
  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="This surface needs another try"
        description="The shell and navigation remain available while this route recovers."
      />
      <AsyncSurface
        state="error"
        title="Route unavailable"
        description={error instanceof Error && error.name === "ChunkLoadError"
          ? "A newer dashboard version is available. Retry to load the current route."
          : "The route could not finish loading. Retry without losing access to the rest of the workspace."}
        onRetry={reset}
      />
    </section>
  );
}

export function RouteNotFoundState() {
  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        title="Route not found"
        description="This address is not part of the private operations workspace."
      />
      <AsyncSurface
        state="empty"
        title="No dashboard surface at this address"
        description="Return to Overview to continue with a known operational route."
      />
      <Action asChild variant="secondary" className="w-fit">
        <Link to="/">
          <ArrowLeftIcon data-icon="inline-start" />
          Return to Overview
        </Link>
      </Action>
    </section>
  );
}

export function PermissionState() {
  return (
    <AsyncSurface
      state="permission"
      title="Admin permission required"
      description="The authenticated session is ready, but this operation is not available to the current account."
    />
  );
}

export type SessionBoundaryStatus = "checking" | "expired" | "permission";

export function SessionBoundaryState({ status }: { status: SessionBoundaryStatus }) {
  if (status === "checking") {
    return (
      <AsyncSurface
        state="loading"
        title="Checking dashboard session"
        description="Confirming the authenticated account before showing private operations."
      />
    );
  }

  if (status === "permission") {
    return <PermissionState />;
  }

  return (
    <AsyncSurface
      state="error"
      title="Dashboard session expired"
      description="Sign in again through the protected dashboard entry to continue."
    />
  );
}
