import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardOverviewContent } from "./overview-screen";

describe("overview journey", () => {
  it("keeps queue, workflow, and deployment truth visibly distinct", () => {
    type Overview = Parameters<typeof DashboardOverviewContent>[0]["overview"];
    const overview = {
      environment: "preview",
      state: "clear",
      gates: [
        {
          id: "release-provider",
          label: "Release provider",
          status: "ready",
          reason: "The dispatcher is configured.",
        },
      ],
      blockers: [],
      release: {
        providerState: "configured",
        workflowState: "not-requested",
        deploymentState: "unknown",
      },
    } satisfies Overview;

    const html = renderToStaticMarkup(
      <DashboardOverviewContent overview={overview} />,
    );
    expect(html).toContain("No release work waiting");
    expect(html).toContain("Workflow request");
    expect(html).toContain("Not requested");
    expect(html).toContain("Deployment proof");
    expect(html).toContain("Unknown");
    expect(html).toContain("Ready to queue is not workflow queued");
  });
});
