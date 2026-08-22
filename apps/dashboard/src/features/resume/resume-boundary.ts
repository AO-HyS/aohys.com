import type { DashboardResumeContent } from "./resume-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStringFields(
  value: unknown,
  fields: readonly string[],
): value is Record<string, unknown> {
  return (
    isRecord(value) && fields.every((field) => typeof value[field] === "string")
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isArrayOf(
  value: unknown,
  predicate: (item: unknown) => boolean,
): boolean {
  return Array.isArray(value) && value.every(predicate);
}

export function parseDashboardResumeContent(
  serialized: string,
): DashboardResumeContent | undefined {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return undefined;
  }
  return isDashboardResumeContent(value) ? value : undefined;
}

function isDashboardResumeContent(
  value: unknown,
): value is DashboardResumeContent {
  const stringFields = [
    "name",
    "role",
    "location",
    "intro",
    "contextTitle",
    "summaryTitle",
    "highlightsTitle",
    "projectsTitle",
    "experienceTitle",
    "skillsTitle",
    "educationTitle",
    "languagesTitle",
  ];
  const isLink = (item: unknown) =>
    hasStringFields(item, ["label", "href", "text"]);
  return (
    hasStringFields(value, stringFields) &&
    hasStringFields(value.pdf, ["label", "href", "fileName", "description"]) &&
    hasStringFields(value.proof, ["label", "title", "body"]) &&
    isArrayOf(value.contactLinks, isLink) &&
    isArrayOf(value.contextLinks, isLink) &&
    isStringArray(value.summary) &&
    isArrayOf(value.highlights, (item) =>
      hasStringFields(item, ["label", "text"]),
    ) &&
    isArrayOf(
      value.projects,
      (item) =>
        hasStringFields(item, ["title", "summary"]) &&
        isStringArray(item.bullets),
    ) &&
    isArrayOf(
      value.experience,
      (item) =>
        hasStringFields(item, ["role", "company", "period"]) &&
        isStringArray(item.bullets),
    ) &&
    isArrayOf(
      value.skills,
      (item) => hasStringFields(item, ["label"]) && isStringArray(item.items),
    ) &&
    isArrayOf(value.education, (item) =>
      hasStringFields(item, ["degree", "institution", "period"]),
    ) &&
    isStringArray(value.languages)
  );
}
