import { describe, expect, it } from "vitest";
import { buildDashboardOverview, type DashboardOverviewInput } from "../src/dashboard-overview.js";

function readyInput(): DashboardOverviewInput {
  return {
    environment: "preview",
    truncated: false,
    projectDrafts: ["en", "es"].map((locale) => ({
      contentId: "case-study:aohys",
      locale: locale as "en" | "es",
      title: "AOHYS",
      summary: "Summary",
      seoDescription: "SEO",
      ctaLabel: "Open",
      ctaHref: "https://aohys.com",
      achievements: "Outcome",
      structureNotes: "Structure",
    })),
    caseStudies: [{ contentId: "case-study:aohys", evidenceStatus: "sanitized" }],
    media: [{ contentId: "case-study:aohys", status: "draft", selectedForPublic: true }],
    resumeDrafts: [],
    settings: [{
      key: "PUBLIC_WHATSAPP_URL",
      value: "https://wa.me/522299020825",
      classification: "public-build-value",
    }],
    releaseProviderConfigured: true,
  };
}

describe("dashboard publication overview", () => {
  it("reports literal release truth and a ready source action", () => {
    const overview = buildDashboardOverview(readyInput());

    expect(overview.state).toBe("ready-to-queue");
    expect(overview.blockers).toEqual([]);
    expect(overview.nextAction).toMatchObject({ path: "/projects" });
    expect(overview.release).toEqual({
      providerState: "configured",
      workflowState: "not-requested",
      deploymentState: "unknown",
    });
  });

  it("prioritizes an actionable copy blocker without exposing draft content", () => {
    const input = readyInput();
    input.projectDrafts = input.projectDrafts.filter((draft) => draft.locale === "en");

    const overview = buildDashboardOverview(input);

    expect(overview.state).toBe("action-required");
    expect(overview.nextAction).toMatchObject({
      label: "Complete project copy",
      path: "/projects",
    });
    expect(JSON.stringify(overview)).not.toContain("Summary");
  });

  it("keeps provider unavailability distinct from workflow and deployment state", () => {
    const input = readyInput();
    input.releaseProviderConfigured = false;

    const overview = buildDashboardOverview(input);

    expect(overview.release.providerState).toBe("unavailable");
    expect(overview.release.workflowState).toBe("not-requested");
    expect(overview.release.deploymentState).toBe("unknown");
    expect(overview.blockers.at(-1)?.code).toBe("release-provider-unavailable");
  });

  it("marks bounded-query overflow as partial before any publication claim", () => {
    const input = readyInput();
    input.truncated = true;

    const overview = buildDashboardOverview(input);

    expect(overview.state).toBe("partial");
    expect(overview.blockers[0]?.code).toBe("data-limit-reached");
  });
});
