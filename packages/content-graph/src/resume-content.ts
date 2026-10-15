import type { ResumePageContent } from "./index.js";
import { isRecord } from "@aohys/core/unknown-guards";

// Single resume content contract shared by the Convex mutation (trust
// boundary), the dashboard editor and the publication build script.

// Enforced when saving and publishing; the dashboard still loads a larger
// draft stored before the limit so the operator can shorten it.
export const RESUME_CONTENT_MAX_LENGTH = 64_000;

const RESUME_HTTPS_HOSTS = new Set([
  "aohys.com",
  "www.linkedin.com",
  "github.com",
]);
const RESUME_EXPLICIT_LINKS = new Set([
  "mailto:alejandro.ortiz@aohys.com",
  "tel:+522299020825",
]);
const DANGEROUS_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);
const RESUME_STRING_FIELDS = [
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
] as const;

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

function isSafeJsonValue(value: unknown): boolean {
  if (value === null || ["string", "number", "boolean"].includes(typeof value))
    return true;
  if (Array.isArray(value)) return value.every(isSafeJsonValue);
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([key, nested]) =>
      !DANGEROUS_OBJECT_KEYS.has(key) && isSafeJsonValue(nested),
  );
}

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

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function isSafeInternalHref(href: string): boolean {
  if (
    hasControlCharacters(href) ||
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

export function isSafeResumeLinkHref(href: string): boolean {
  if (RESUME_EXPLICIT_LINKS.has(href) || isSafeInternalHref(href)) return true;
  if (hasControlCharacters(href)) return false;
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

export function isSafeResumePdfHref(href: string): boolean {
  if (!isSafeInternalHref(href)) return false;
  const { pathname } = new URL(href, "https://aohys.com");
  return (
    href === pathname &&
    pathname.startsWith("/downloads/") &&
    pathname.endsWith(".pdf")
  );
}

export function isResumePageContent(
  value: unknown,
): value is ResumePageContent {
  const isLink = (item: unknown) =>
    hasStringFields(item, ["label", "href", "text"]) &&
    typeof item.href === "string" &&
    isSafeResumeLinkHref(item.href);
  return (
    hasStringFields(value, RESUME_STRING_FIELDS) &&
    hasStringFields(value.pdf, ["label", "href", "fileName", "description"]) &&
    typeof value.pdf.href === "string" &&
    isSafeResumePdfHref(value.pdf.href) &&
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
    isStringArray(value.languages) &&
    isSafeJsonValue(value)
  );
}

export function parseResumePageContent(
  serialized: string,
): ResumePageContent | undefined {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return undefined;
  }
  return isResumePageContent(value) ? value : undefined;
}
