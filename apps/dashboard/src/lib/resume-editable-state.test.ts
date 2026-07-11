import { describe, expect, it } from "vitest";
import {
  createResumeEditableState,
  reduceResumeEditableState,
  resumeHasChanges,
  validateResumeContent,
} from "@/lib/resume-editable-state";
import type { DashboardResumeContent } from "@/types";

const baseline = {
  name: "Alejandro",
  role: "Product engineer",
  location: "Veracruz",
  intro: "Builds dependable product systems.",
  pdf: {
    label: "Download PDF",
    href: "/resume.pdf",
    fileName: "alejandro-resume.pdf",
    description: "Downloadable resume artifact.",
  },
  proof: { label: "Proof", title: "Review", body: "Evidence" },
  contactLinks: [],
  contextTitle: "Context",
  contextLinks: [],
  summaryTitle: "Summary",
  summary: [],
  highlightsTitle: "Highlights",
  highlights: [],
  projectsTitle: "Projects",
  projects: [],
  experienceTitle: "Experience",
  experience: [],
  skillsTitle: "Skills",
  skills: [],
  educationTitle: "Education",
  education: [],
  languagesTitle: "Languages",
  languages: [],
} satisfies DashboardResumeContent;

describe("resume editable state", () => {
  it("owns baseline, dirty state, reset, and commit without synchronization effects", () => {
    const initial = createResumeEditableState(baseline);
    const edited = reduceResumeEditableState(initial, {
      type: "replace",
      draft: { ...initial.draft, role: "Senior product engineer" },
    });

    expect(resumeHasChanges(edited)).toBe(true);
    expect(resumeHasChanges(reduceResumeEditableState(edited, { type: "reset" }))).toBe(false);
    expect(reduceResumeEditableState(edited, { type: "commit" }).baseline.role).toBe("Senior product engineer");
    expect(reduceResumeEditableState(edited, {
      type: "rebase",
      baseline: { ...baseline, role: "Externally updated role" },
    }).draft.role).toBe("Externally updated role");
  });

  it("returns fixed validation messages without draft content", () => {
    const errors = validateResumeContent({ ...baseline, name: "", pdf: { ...baseline.pdf, href: "" } });

    expect(errors).toEqual(["Name is required.", "PDF href is required."]);
    expect(JSON.stringify(errors)).not.toContain("Alejandro");
  });
});
