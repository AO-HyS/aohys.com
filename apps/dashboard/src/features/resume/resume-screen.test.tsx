// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResumeScreen } from "./resume-screen";
import type { DashboardResumeContent } from "./resume-types";

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
  summary: ["First", "Second"],
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

const mocks = vi.hoisted(() => ({
  saveResumeDraft: vi.fn(),
  serializeResumeDraft: vi.fn((content: DashboardResumeContent) =>
    JSON.stringify(content),
  ),
}));

vi.mock("./resume-api", () => ({
  serializeResumeDraft: mocks.serializeResumeDraft,
  useResumeContent: () => ({
    resumeContent: { en: baseline, es: baseline },
    resumeDrafts: [],
    resumeVersions: [],
  }),
  usePublishResume: () => vi.fn(),
  useSaveResumeDraft: () => mocks.saveResumeDraft,
  useSaveResumeVersion: () => vi.fn(),
}));
vi.mock("@/components/ui/toast", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));
vi.mock("@/lib/analytics", () => ({ captureDashboardAction: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("ResumeScreen journey", () => {
  it("preserves row identity through remove/add and saves the serialized draft", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.saveResumeDraft.mockResolvedValue({ updatedAt: 2 });
    render(<ResumeScreen />);

    expect(
      screen.getByRole("heading", { name: "Resume publishing workspace" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Summary" }));
    const eliminatedFirst = screen.getByLabelText("Item 1");
    const formerSecond = screen.getByLabelText("Item 2");
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Remove item" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Item 1")).toBe(formerSecond),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    const addedSecond = screen.getByLabelText("Item 2");
    expect(addedSecond).not.toBe(formerSecond);
    expect(addedSecond).not.toBe(eliminatedFirst);
    expect(
      consoleError.mock.calls.filter((call) =>
        call.some((value) => String(value).includes("same key")),
      ),
    ).toEqual([]);
    expect(screen.getByText("Unsaved changes")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    await waitFor(() => expect(mocks.saveResumeDraft).toHaveBeenCalledTimes(1));
    const payload = mocks.saveResumeDraft.mock.calls[0]?.[0] as {
      locale: string;
      contentJson: string;
    };
    expect(payload.locale).toBe("en");
    expect(JSON.parse(payload.contentJson).summary).toEqual(["Second", ""]);
  });

  it("names the discard dialog when a dirty locale switch is requested", async () => {
    const user = userEvent.setup();
    render(<ResumeScreen />);
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "Senior product engineer" },
    });
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Spanish" }));

    expect(
      screen.getByRole("alertdialog", {
        name: "Discard unsaved locale changes?",
      }),
    ).toBeTruthy();
  });
});
