import type { DashboardResumeContent } from "@/types";

export interface ResumeEditableState {
  baseline: DashboardResumeContent;
  draft: DashboardResumeContent;
}

export type ResumeEditableAction =
  | { type: "replace"; draft: DashboardResumeContent }
  | { type: "rebase"; baseline: DashboardResumeContent }
  | { type: "commit" }
  | { type: "reset" };

export function createResumeEditableState(baseline: DashboardResumeContent): ResumeEditableState {
  return {
    baseline: cloneResumeContent(baseline),
    draft: cloneResumeContent(baseline),
  };
}

export function reduceResumeEditableState(
  state: ResumeEditableState,
  action: ResumeEditableAction,
): ResumeEditableState {
  switch (action.type) {
    case "replace":
      return { ...state, draft: action.draft };
    case "rebase":
      return createResumeEditableState(action.baseline);
    case "commit":
      return createResumeEditableState(state.draft);
    case "reset":
      return createResumeEditableState(state.baseline);
  }
}

export function resumeHasChanges(state: ResumeEditableState): boolean {
  return !structurallyEqual(state.baseline, state.draft);
}

export function validateResumeContent(content: DashboardResumeContent): string[] {
  const errors = [
    required(content.name, "Name"),
    required(content.role, "Role"),
    required(content.intro, "Intro"),
    required(content.pdf.label, "PDF label"),
    required(content.pdf.href, "PDF href"),
    required(content.summaryTitle, "Summary section title"),
    required(content.highlightsTitle, "Highlights section title"),
    required(content.projectsTitle, "Projects section title"),
    required(content.experienceTitle, "Experience section title"),
    required(content.skillsTitle, "Skills section title"),
    required(content.educationTitle, "Education section title"),
    required(content.languagesTitle, "Languages section title"),
  ].filter((error): error is string => error !== undefined);

  return errors;
}

function required(value: string, label: string): string | undefined {
  return value.trim() ? undefined : `${label} is required.`;
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => structurallyEqual(value, right[index]));
  }

  if (typeof left !== "object" || typeof right !== "object") return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.hasOwn(rightRecord, key)
      && structurallyEqual(leftRecord[key], rightRecord[key]));
}

function cloneResumeContent(content: DashboardResumeContent): DashboardResumeContent {
  return structuredClone(content);
}
