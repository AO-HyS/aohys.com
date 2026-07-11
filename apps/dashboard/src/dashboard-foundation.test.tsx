import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Action } from "@/components/dashboard/action";
import { AsyncSurface } from "@/components/dashboard/async-surface";
import { FormField } from "@/components/dashboard/form-field";
import { SaveBar } from "@/components/dashboard/save-bar";
import { SectionPanel } from "@/components/dashboard/section-panel";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SidebarInset } from "@/components/ui/sidebar";
import {
  dashboardNavigation,
  findDashboardNavigationItem,
  matchDashboardNavigationItem,
  normalizeDashboardPath,
} from "@/app/navigation";
import { SessionBoundaryState } from "@/app/route-states";
import { DashboardOverviewContent } from "@/screens/dashboard-home";

describe("Operations Desk navigation", () => {
  it("uses one unique route model for canonical paths and legacy aliases", () => {
    const canonicalPaths = dashboardNavigation.map((item) => item.path);
    const aliases = dashboardNavigation.flatMap((item) => item.aliases);

    expect(new Set(canonicalPaths).size).toBe(canonicalPaths.length);
    expect(canonicalPaths).toEqual(["/", "/projects", "/leads", "/resume", "/settings"]);
    expect(aliases).toEqual(["/case-studies", "/media"]);
    expect(findDashboardNavigationItem("/dashboard/case-studies").id).toBe("projects");
    expect(findDashboardNavigationItem("/dashboard/media?project=casa-roca").id).toBe("projects");
    expect(findDashboardNavigationItem("/dashboard/not-real").id).toBe("overview");
    expect(matchDashboardNavigationItem("/dashboard/not-real")).toBeUndefined();
  });

  it("normalizes dashboard paths without changing real route identity", () => {
    expect(normalizeDashboardPath("/dashboard")).toBe("/");
    expect(normalizeDashboardPath("/dashboard/projects/")).toBe("/projects");
    expect(normalizeDashboardPath("/dashboard/leads?status=new")).toBe("/leads");
  });
});

describe("Dashboard primitive adapters", () => {
  it("allows the dashboard inset to shrink beside the desktop sidebar", () => {
    const html = renderToStaticMarkup(<SidebarInset />);

    expect(html).toContain("min-w-0");
  });

  it("announces pending actions and prevents duplicate activation", () => {
    const html = renderToStaticMarkup(
      <Action pending pendingLabel="Saving draft…">Save draft</Action>,
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
    expect(html).toContain("Saving draft…");
    expect(html).not.toContain(">Save draft<");
  });

  it("keeps link actions as one slottable interactive element", () => {
    const html = renderToStaticMarkup(
      <Action asChild variant="secondary">
        <a href="/dashboard/projects">Open projects</a>
      </Action>,
    );

    expect(html).toContain('<a href="/dashboard/projects"');
    expect(html).toContain('data-slot="action"');
    expect(html).not.toContain("<button");
  });

  it("keeps status meaning in visible text and iconography", () => {
    const html = renderToStaticMarkup(
      <StatusBadge tone="attention">Review required</StatusBadge>,
    );

    expect(html).toContain('data-tone="attention"');
    expect(html).toContain("Review required");
    expect(html).toContain("<svg");
  });

  it("owns label, description, and error identity for a form control", () => {
    const html = renderToStaticMarkup(
      <FormField
        id="project-title"
        name="title"
        label="Project title"
        description="Shown on the public case study."
        error="A project title is required."
        required
        renderControl={(controlProps) => <input {...controlProps} />}
      />,
    );

    expect(html).toContain('for="project-title"');
    expect(html).toContain('id="project-title"');
    expect(html).toContain('aria-describedby="project-title-description project-title-error"');
    expect(html).toContain('aria-errormessage="project-title-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });

  it("renders a real heading at the requested section level", () => {
    const html = renderToStaticMarkup(
      <SectionPanel title="Publication readiness" headingLevel={3}>
        <p>Ready for review.</p>
      </SectionPanel>,
    );

    expect(html).toMatch(/<section[^>]+aria-labelledby="([^"]+)"/);
    expect(html).toMatch(/<h3 id="[^"]+"/);
    expect(html).toContain("Publication readiness");
  });

  it("renders explicit loading, permission, and retry recovery states", () => {
    const loading = renderToStaticMarkup(<AsyncSurface state="loading" />);
    const permission = renderToStaticMarkup(<AsyncSurface state="permission" />);
    const error = renderToStaticMarkup(<AsyncSurface state="error" onRetry={() => undefined} />);

    expect(loading).toContain('aria-busy="true"');
    expect(permission).toContain("Permission required");
    expect(error).toContain("Try again");
  });

  it("keeps checking, expired, and permission session states accessible", () => {
    const checking = renderToStaticMarkup(<SessionBoundaryState status="checking" />);
    const expired = renderToStaticMarkup(<SessionBoundaryState status="expired" />);
    const permission = renderToStaticMarkup(<SessionBoundaryState status="permission" />);

    expect(checking).toContain('aria-busy="true"');
    expect(expired).toContain("Dashboard session expired");
    expect(permission).toContain("Admin permission required");
  });

  it("makes dirty and saving states explicit in the shared save bar", () => {
    const dirty = renderToStaticMarkup(<SaveBar state="dirty" onSave={() => undefined} />);
    const saving = renderToStaticMarkup(<SaveBar state="saving" onSave={() => undefined} />);

    expect(dirty).toContain("Unsaved changes");
    expect(dirty).toContain("Save changes");
    expect(saving).toContain('aria-busy="true"');
    expect(saving).toContain("Saving…");
  });
});

describe("authoritative dashboard overview", () => {
  it("keeps queue, workflow, and deployment truth visibly distinct", () => {
    type Overview = Parameters<typeof DashboardOverviewContent>[0]["overview"];
    const overview = {
      environment: "preview",
      state: "clear",
      gates: [{
        id: "release-provider",
        label: "Release provider",
        status: "ready",
        reason: "The dispatcher is configured.",
      }],
      blockers: [],
      release: {
        providerState: "configured",
        workflowState: "not-requested",
        deploymentState: "unknown",
      },
    } satisfies Overview;

    const html = renderToStaticMarkup(<DashboardOverviewContent overview={overview} />);

    expect(html).toContain("No release work waiting");
    expect(html).toContain("Workflow request");
    expect(html).toContain("Not requested");
    expect(html).toContain("Deployment proof");
    expect(html).toContain("Unknown");
    expect(html).toContain("Ready to queue is not workflow queued");
  });
});
