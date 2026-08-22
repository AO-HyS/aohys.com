// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectsScreen } from "./projects-screen";
import type { DashboardProject, ProjectsContent } from "./projects-types";

const project: DashboardProject = {
  contentId: "case-study:journey",
  title: "Journey project",
  englishPath: "/case-studies/journey",
  spanishPath: "/es/casos/journey",
  sitemapIncluded: true,
  status: "active-build",
  evidenceStatus: "sanitized",
  updatedAt: 1,
  locales: [
    {
      locale: "en",
      path: "/case-studies/journey",
      title: "Journey project",
      summary: "A focused project summary.",
      seoDescription: "Project SEO description.",
      ctaLabel: "View project",
      ctaHref: "/contact",
      overview: "Project overview.",
      achievements: "One achievement.",
      structureNotes: "Project structure.",
    },
    {
      locale: "es",
      path: "/es/casos/journey",
      title: "Proyecto de recorrido",
      summary: "Un resumen del proyecto.",
      seoDescription: "Descripción SEO del proyecto.",
      ctaLabel: "Ver proyecto",
      ctaHref: "/es/contacto",
      overview: "Resumen del proyecto.",
      achievements: "Un logro.",
      structureNotes: "Estructura del proyecto.",
    },
  ],
  images: [],
};

const mocks = vi.hoisted(() => ({
  content: { projects: [] } as ProjectsContent,
  workflow: {
    savingKey: null as string | null,
    publishingKey: null as string | null,
    uploadIssue: null,
    deleteRequest: null,
    clearUploadIssue: vi.fn(),
    clearDeleteRequest: vi.fn(),
    requestDeleteMedia: vi.fn(),
    saveProject: vi.fn(),
    uploadMedia: vi.fn(),
    saveExternalMedia: vi.fn(),
    selectMedia: vi.fn(),
    archiveMedia: vi.fn(),
    confirmDeleteMedia: vi.fn(),
    createProject: vi.fn(),
    publishProject: vi.fn(),
  },
}));

vi.mock("./projects-api", () => ({
  useProjectsContent: () => mocks.content,
}));
vi.mock("./projects-workflow", () => ({
  useProjectsWorkflow: () => mocks.workflow,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.workflow.publishingKey = null;
});

describe("ProjectsScreen journey", () => {
  it("publishes the active project and exposes the pending action", () => {
    mocks.content = { projects: [project] };
    const view = render(<ProjectsScreen />);

    expect(
      screen.getByRole("heading", { name: "Project workspace" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(mocks.workflow.publishProject).toHaveBeenCalledWith(project);

    mocks.workflow.publishingKey = project.contentId;
    view.rerender(<ProjectsScreen />);
    const pending = screen.getByRole("button", { name: /Requesting…/ });
    expect(pending.getAttribute("aria-busy")).toBe("true");
    expect((pending as HTMLButtonElement).disabled).toBe(true);
  });
});
