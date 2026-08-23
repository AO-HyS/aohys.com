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

const RESUME_HTTPS_HOSTS = new Set([
  "aohys.com",
  "www.linkedin.com",
  "github.com",
]);
const RESUME_EXPLICIT_LINKS = new Set([
  "mailto:alejandro.ortiz@aohys.com",
  "tel:+522299020825",
]);

function hasSafeDecodedPath(pathname: string): boolean {
  let decoded = pathname;
  try {
    for (let index = 0; index < 3; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return false;
  }
  return (
    !decoded.includes("\\") &&
    !decoded.split("/").some((segment) => segment === "." || segment === "..")
  );
}

function isSafeInternalHref(href: string): boolean {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.includes("\\") ||
    !hasSafeDecodedPath(href)
  )
    return false;
  try {
    const parsed = new URL(href, "https://aohys.com");
    return (
      parsed.origin === "https://aohys.com" &&
      !parsed.search &&
      !parsed.hash &&
      hasSafeDecodedPath(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function isSafeResumeHref(href: string): boolean {
  if (RESUME_EXPLICIT_LINKS.has(href) || isSafeInternalHref(href)) return true;
  try {
    const parsed = new URL(href);
    return (
      hasSafeDecodedPath(href) &&
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      RESUME_HTTPS_HOSTS.has(parsed.hostname.toLowerCase()) &&
      hasSafeDecodedPath(parsed.pathname)
    );
  } catch {
    return false;
  }
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
    hasStringFields(item, ["label", "href", "text"]) &&
    typeof item.href === "string" &&
    isSafeResumeHref(item.href);
  return (
    hasStringFields(value, stringFields) &&
    hasStringFields(value.pdf, ["label", "href", "fileName", "description"]) &&
    typeof value.pdf.href === "string" &&
    isSafeInternalHref(value.pdf.href) &&
    value.pdf.href.startsWith("/downloads/") &&
    value.pdf.href.endsWith(".pdf") &&
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
