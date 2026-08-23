import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isIP } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  normalizePublicWhatsappUrl,
  resolvePublicMediaUrl,
  selectPublicationMedia,
} from "../packages/core/src/index.js";
import {
  formatI18n,
  getLocalizedCaseStudyPath,
  getSharedI18n,
} from "../packages/content-graph/src/i18n.js";
import { assertPublicClaimsSafe } from "../packages/content-graph/src/public-claim-policy.js";
import { hasConvexDeploymentAccess, runConvexFunction } from "./convex-run.js";

type Locale = "en" | "es";

interface DashboardProjectDraft {
  contentId: string;
  locale: Locale;
  localizedSlug?: string;
  title: string;
  summary: string;
  seoDescription: string;
  projectUrl?: string;
  ctaLabel: string;
  ctaHref: string;
  achievements: string;
  structureNotes: string;
  updatedAt?: number;
  publishedAt?: number;
}

interface DashboardResumeDraft {
  locale: Locale;
  contentJson: string;
  updatedAt?: number;
  publishedAt?: number;
}

export interface DashboardMediaMetadata {
  id?: string;
  storageProvider?: "cloudflare-images" | "cloudflare-r2" | "external";
  storageKey: string;
  publicUrl?: string;
  altText: string;
  contentId?: string;
  usage: "case-study" | "resume" | "architecture" | "site";
  status: "draft" | "published" | "archived";
  locale?: Locale;
  selectedForPublic?: boolean;
  selectedForPublicAt?: number;
  updatedAt: number;
}

type PublicDashboardMediaMetadata = DashboardMediaMetadata & {
  publicUrl: string;
};

interface DashboardSiteSetting {
  key: string;
  environment: "local" | "preview" | "production";
  value: string;
  classification: "public-build-value" | "provider-output" | "policy-value";
  updatedAt: number;
}

export interface DashboardContentPayload {
  projectDrafts: DashboardProjectDraft[];
  resumeDrafts: DashboardResumeDraft[];
  media: DashboardMediaMetadata[];
  settings: DashboardSiteSetting[];
}

interface LocalizedEntry {
  approvedAt?: string;
  approvedHash?: string;
  path?: string;
  title?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  primaryActionLabel?: string;
  primaryActionContentId?: string;
  secondaryActionLabel?: string;
  secondaryActionContentId?: string;
  caseStudyContent?: {
    statusLabel?: string;
    overview?: string;
    problem?: { title?: string; body?: string };
    businessOutcome?: { title?: string; body?: string };
    role?: { title?: string; body?: string };
    constraints?: { title?: string; body?: string };
    architectureDecisions?: { title?: string; body?: string };
    executionHighlights?: { title?: string; body?: string };
    qualitySecurityPerformance?: { title?: string; body?: string };
    publicEvidenceTitle?: string;
    publicEvidence?: Array<{
      label: string;
      description: string;
      href: string;
      altText: string;
      kind: string;
      publicSafe: boolean;
    }>;
    confidentialityNote?: { title?: string; body?: string };
  };
  resumeContent?: unknown;
}

type LocaleDictionary = Record<string, LocalizedEntry>;

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const localeFiles: Record<Locale, string> = {
  en: path.join(repoRoot, "packages/content-graph/src/locales/en.json"),
  es: path.join(repoRoot, "packages/content-graph/src/locales/es.json"),
};
const generatedContentGraphDir = path.join(
  repoRoot,
  "packages/content-graph/src/generated",
);
const generatedPublicProjectsFile = path.join(
  generatedContentGraphDir,
  "dashboard-public-projects.ts",
);
const generatedSiteDir = path.join(repoRoot, "apps/site/src/generated");
const generatedMediaFile = path.join(
  generatedSiteDir,
  "dashboard-public-media.ts",
);
const generatedSettingsFile = path.join(
  generatedSiteDir,
  "dashboard-public-settings.ts",
);

const STATIC_CASE_STUDY_IDS = new Set([
  "case-study:eteria",
  "case-study:casa-roca",
  "case-study:the-barber-central",
  "case-study:nutri-plan",
  "case-study:enterprise-systems",
  "case-study:engineering-practice",
]);

export function shouldApplyDashboardDraft(
  entry: LocalizedEntry | undefined,
  publishedAt: number | undefined,
  updatedAt?: number,
): boolean {
  if (!publishedAt) {
    return false;
  }

  if (!entry?.approvedAt) {
    return true;
  }

  const approvedAt = Date.parse(entry.approvedAt);

  if (!Number.isFinite(approvedAt)) {
    throw new Error(
      `Invalid approvedAt value "${entry.approvedAt}" in public content.`,
    );
  }

  return Boolean(updatedAt && updatedAt > approvedAt);
}

async function loadDashboardContent(): Promise<unknown | null> {
  if (!hasConvexDeploymentAccess()) {
    console.log(
      "Dashboard published content bridge skipped: CONVEX_DEPLOY_KEY and CONVEX_DEPLOYMENT are missing.",
    );
    return null;
  }

  return runConvexFunction(
    "content:listForDashboardInternal",
    {},
    (value) => value,
  );
}

function readLocaleFile(locale: Locale): LocaleDictionary {
  return parseLocaleDictionary(
    readFileSync(localeFiles[locale], "utf8"),
    localeFiles[locale],
  );
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStringFields(
  value: unknown,
  fields: readonly string[],
): value is Record<string, unknown> {
  return (
    isJsonRecord(value) &&
    fields.every((field) => typeof value[field] === "string")
  );
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isArrayOf<T>(
  value: unknown,
  predicate: (item: unknown) => item is T,
): value is T[];
function isArrayOf(
  value: unknown,
  predicate: (item: unknown) => boolean,
): boolean;
function isArrayOf(
  value: unknown,
  predicate: (item: unknown) => boolean,
): boolean {
  return Array.isArray(value) && value.every(predicate);
}

function hasOptionalString(
  value: Record<string, unknown>,
  field: string,
): boolean {
  return value[field] === undefined || typeof value[field] === "string";
}

function hasOptionalNumber(
  value: Record<string, unknown>,
  field: string,
): boolean {
  return value[field] === undefined || typeof value[field] === "number";
}

function hasOptionalBoolean(
  value: Record<string, unknown>,
  field: string,
): boolean {
  return value[field] === undefined || typeof value[field] === "boolean";
}

function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "es";
}

function isDashboardProjectDraft(
  value: unknown,
): value is DashboardProjectDraft {
  return (
    hasStringFields(value, [
      "contentId",
      "title",
      "summary",
      "seoDescription",
      "ctaLabel",
      "ctaHref",
      "achievements",
      "structureNotes",
    ]) &&
    isLocale(value.locale) &&
    hasOptionalString(value, "localizedSlug") &&
    hasOptionalString(value, "projectUrl") &&
    typeof value.updatedAt === "number" &&
    hasOptionalNumber(value, "publishedAt")
  );
}

function isDashboardResumeDraft(value: unknown): value is DashboardResumeDraft {
  return (
    hasStringFields(value, ["contentJson"]) &&
    isLocale(value.locale) &&
    typeof value.updatedAt === "number" &&
    hasOptionalNumber(value, "publishedAt")
  );
}

function isDashboardMediaMetadata(
  value: unknown,
): value is DashboardMediaMetadata {
  return (
    hasStringFields(value, ["storageKey", "altText"]) &&
    ["case-study", "resume", "architecture", "site"].includes(
      String(value.usage),
    ) &&
    ["draft", "published", "archived"].includes(String(value.status)) &&
    typeof value.updatedAt === "number" &&
    typeof value.id === "string" &&
    hasOptionalString(value, "contentId") &&
    hasOptionalString(value, "publicUrl") &&
    ["cloudflare-images", "cloudflare-r2", "external"].includes(
      String(value.storageProvider),
    ) &&
    (value.locale === undefined || isLocale(value.locale)) &&
    hasOptionalBoolean(value, "selectedForPublic") &&
    hasOptionalNumber(value, "selectedForPublicAt")
  );
}

function isDashboardSiteSetting(value: unknown): value is DashboardSiteSetting {
  return (
    hasStringFields(value, ["key", "value"]) &&
    ["local", "preview", "production"].includes(String(value.environment)) &&
    ["public-build-value", "provider-output", "policy-value"].includes(
      String(value.classification),
    ) &&
    typeof value.updatedAt === "number"
  );
}

export function parseDashboardContentPayload(
  value: unknown,
): DashboardContentPayload {
  if (
    !isJsonRecord(value) ||
    !isArrayOf(value.projectDrafts, isDashboardProjectDraft) ||
    !isArrayOf(value.resumeDrafts, isDashboardResumeDraft) ||
    !isArrayOf(value.media, isDashboardMediaMetadata) ||
    !isArrayOf(value.settings, isDashboardSiteSetting)
  ) {
    throw new Error(
      "Convex dashboard content must match the publication contract.",
    );
  }
  return {
    projectDrafts: value.projectDrafts,
    resumeDrafts: value.resumeDrafts,
    media: value.media,
    settings: value.settings,
  };
}

const DANGEROUS_OBJECT_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);
const RESUME_HTTPS_HOSTS = new Set([
  "aohys.com",
  "www.linkedin.com",
  "github.com",
]);
const RESUME_EXPLICIT_LINKS = new Set([
  "mailto:alejandro.ortiz@aohys.com",
  "tel:+522299020825",
]);

function isSafeJsonValue(value: unknown): boolean {
  if (value === null || ["string", "number", "boolean"].includes(typeof value))
    return true;
  if (Array.isArray(value)) return value.every(isSafeJsonValue);
  if (!isJsonRecord(value)) return false;
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

function isSafeResumeLinkHref(href: string): boolean {
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

function isSafeResumePdfHref(href: string): boolean {
  return (
    isSafeInternalHref(href) &&
    href.startsWith("/downloads/") &&
    href.endsWith(".pdf")
  );
}

function isSafePublicHttpsHref(href: string): boolean {
  if (isSafeInternalHref(href)) return true;
  try {
    const parsed = new URL(href);
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
    return (
      hasSafeDecodedPath(href) &&
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      isIP(hostname) === 0 &&
      hostname.includes(".") &&
      !hostname.endsWith(".local") &&
      !hostname.endsWith(".internal") &&
      hasSafeDecodedPath(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function isResumeContentValue(
  value: unknown,
): value is Record<string, unknown> {
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
    isSafeResumeLinkHref(item.href);
  return (
    hasStringFields(value, stringFields) &&
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

function isLocalizedEntry(value: unknown): value is LocalizedEntry {
  if (
    !hasStringFields(value, ["path", "title", "summary", "seoDescription"]) ||
    ![
      "approvedAt",
      "approvedHash",
      "seoTitle",
      "primaryActionLabel",
      "primaryActionContentId",
      "secondaryActionLabel",
      "secondaryActionContentId",
    ].every((field) => hasOptionalString(value, field)) ||
    !isSafeJsonValue(value)
  )
    return false;
  if (
    value.resumeContent !== undefined &&
    !isResumeContentValue(value.resumeContent)
  )
    return false;
  if (value.caseStudyContent === undefined) return true;
  const content = value.caseStudyContent;
  if (
    !isJsonRecord(content) ||
    !["statusLabel", "overview", "publicEvidenceTitle"].every((field) =>
      hasOptionalString(content, field),
    )
  )
    return false;
  for (const field of [
    "problem",
    "businessOutcome",
    "role",
    "constraints",
    "architectureDecisions",
    "executionHighlights",
    "qualitySecurityPerformance",
    "confidentialityNote",
  ]) {
    const section = content[field];
    if (
      section !== undefined &&
      (!hasStringFields(section, []) ||
        !hasOptionalString(section, "title") ||
        !hasOptionalString(section, "body"))
    )
      return false;
  }
  return (
    content.publicEvidence === undefined ||
    isArrayOf(
      content.publicEvidence,
      (evidence) =>
        hasStringFields(evidence, [
          "label",
          "description",
          "href",
          "altText",
          "kind",
        ]) &&
        typeof evidence.href === "string" &&
        typeof evidence.publicSafe === "boolean" &&
        isSafePublicHttpsHref(evidence.href),
    )
  );
}

export function parseLocaleDictionary(
  serialized: string,
  source = "locale JSON",
): LocaleDictionary {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error(`${source} must contain valid JSON.`);
  }
  if (!isJsonRecord(parsed)) {
    throw new Error(
      `${source} must contain an object of localized content entries.`,
    );
  }
  const dictionary: LocaleDictionary = Object.create(null);
  for (const [contentId, entry] of Object.entries(parsed)) {
    if (DANGEROUS_OBJECT_KEYS.has(contentId) || !isLocalizedEntry(entry)) {
      throw new Error(
        `${source} must contain fully valid localized content entries.`,
      );
    }
    dictionary[contentId] = entry;
  }
  return dictionary;
}

export function parseResumeContent(
  serialized: string,
): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error("Published resume content must contain valid JSON.");
  }
  if (!isResumeContentValue(parsed)) {
    throw new Error(
      "Published resume content must match the resume JSON object contract.",
    );
  }
  return parsed;
}

function writeLocaleFile(locale: Locale, dictionary: LocaleDictionary): void {
  writeFileSync(
    localeFiles[locale],
    `${JSON.stringify(dictionary, null, 2)}\n`,
  );
}

function paragraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstParagraph(value: string): string {
  return paragraphs(value)[0] ?? value.trim();
}

function restParagraphs(value: string): string {
  const [, ...rest] = paragraphs(value);

  return rest.join("\n\n") || value.trim();
}

function isCaseStudyContentId(contentId: string): boolean {
  return /^case-study:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contentId);
}

function slugFromContentId(contentId: string): string {
  return contentId.slice("case-study:".length);
}

function projectPath(draft: DashboardProjectDraft): string {
  const slug =
    draft.localizedSlug &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.localizedSlug)
      ? draft.localizedSlug
      : slugFromContentId(draft.contentId);

  return getLocalizedCaseStudyPath(draft.locale, slug);
}

function fallbackText(value: string, fallback: string): string {
  return value.trim() || fallback;
}

function firstParagraphOrFallback(value: string, fallback: string): string {
  return fallbackText(firstParagraph(value), fallback);
}

function restParagraphsOrFallback(value: string, fallback: string): string {
  return fallbackText(restParagraphs(value), fallback);
}

function contentIdFromPath(
  dictionary: LocaleDictionary,
  href: string,
): string | undefined {
  const normalized = href.replace(/\/$/, "");
  return Object.entries(dictionary).find(
    ([, entry]) => entry.path?.replace(/\/$/, "") === normalized,
  )?.[0];
}

function publicHrefForDraft(draft: DashboardProjectDraft): string | undefined {
  const candidate =
    draft.projectUrl?.trim() ||
    (/^https?:/i.test(draft.ctaHref) ? draft.ctaHref.trim() : undefined);

  if (!candidate) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`Invalid public project URL for ${draft.contentId}.`);
  }

  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    isIP(hostname) !== 0 ||
    !hostname.includes(".") ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "home.arpa" ||
    hostname.endsWith(".home.arpa")
  ) {
    throw new Error(`Unsafe public project URL for ${draft.contentId}.`);
  }

  return parsed.toString();
}

function achievementFallbackForDraft(draft: DashboardProjectDraft): string {
  return formatI18n(getSharedI18n(draft.locale).caseStudy.achievementFallback, {
    title: draft.title,
  });
}

function structureFallbackForDraft(draft: DashboardProjectDraft): string {
  return formatI18n(getSharedI18n(draft.locale).caseStudy.structureFallback, {
    title: draft.title,
  });
}

function createProjectEntry(draft: DashboardProjectDraft): LocalizedEntry {
  const locale = draft.locale;
  const title = draft.title;
  const publicHref = publicHrefForDraft(draft);
  const achievementFallback = achievementFallbackForDraft(draft);
  const structureFallback = structureFallbackForDraft(draft);
  const i18n = getSharedI18n(locale).caseStudy;

  return {
    path: projectPath(draft),
    title,
    summary: draft.summary,
    seoDescription: draft.seoDescription,
    primaryActionLabel: draft.ctaLabel,
    secondaryActionLabel: i18n.backToSelectedWork,
    secondaryActionContentId: "case-studies",
    caseStudyContent: {
      statusLabel: i18n.statusLabel,
      overview: draft.summary,
      problem: {
        title: i18n.problemTitle,
        body: draft.summary,
      },
      businessOutcome: {
        title: i18n.businessOutcomeTitle,
        body: firstParagraphOrFallback(draft.achievements, achievementFallback),
      },
      role: {
        title: i18n.roleTitle,
        body: i18n.productRoleBody,
      },
      constraints: {
        title: i18n.constraintsTitle,
        body: i18n.constraintsBody,
      },
      architectureDecisions: {
        title: i18n.architectureDecisionsTitle,
        body: firstParagraphOrFallback(draft.structureNotes, structureFallback),
      },
      executionHighlights: {
        title: i18n.executionHighlightsTitle,
        body: restParagraphsOrFallback(draft.achievements, achievementFallback),
      },
      qualitySecurityPerformance: {
        title: i18n.qualityTitle,
        body: restParagraphsOrFallback(draft.structureNotes, structureFallback),
      },
      publicEvidenceTitle: i18n.projectLinksTitle,
      publicEvidence: publicHref
        ? [
            {
              label: i18n.liveSiteLabel,
              description: formatI18n(i18n.openProject, { title }),
              href: publicHref,
              altText: title,
              kind: "public-site",
              publicSafe: true,
            },
          ]
        : [],
      confidentialityNote: {
        title: i18n.clientContextTitle,
        body: i18n.clientContextBody,
      },
    },
  };
}

export function applyProjectDraft(
  dictionary: LocaleDictionary,
  draft: DashboardProjectDraft,
): boolean {
  if (
    !isCaseStudyContentId(draft.contentId) ||
    DANGEROUS_OBJECT_KEYS.has(draft.contentId)
  ) {
    console.log(
      `Skipping unknown content entry ${draft.contentId} (${draft.locale}).`,
    );
    return false;
  }
  let entry = Object.hasOwn(dictionary, draft.contentId)
    ? dictionary[draft.contentId]
    : undefined;

  if (
    entry &&
    !shouldApplyDashboardDraft(entry, draft.publishedAt, draft.updatedAt)
  ) {
    console.log(
      `Skipping stale published project draft ${draft.contentId} (${draft.locale}).`,
    );
    return false;
  }

  if (!entry) {
    if (!shouldApplyDashboardDraft(undefined, draft.publishedAt)) {
      return false;
    }

    entry = createProjectEntry(draft);
    dictionary[draft.contentId] = entry;
  }

  entry.title = draft.title;
  entry.path = projectPath(draft);
  entry.summary = draft.summary;
  entry.seoDescription = draft.seoDescription;
  entry.primaryActionLabel = draft.ctaLabel;

  const actionContentId = contentIdFromPath(dictionary, draft.ctaHref);

  if (actionContentId) {
    entry.primaryActionContentId = actionContentId;
  }

  if (entry.caseStudyContent) {
    const achievementFallback = achievementFallbackForDraft(draft);
    const structureFallback = structureFallbackForDraft(draft);
    const i18n = getSharedI18n(draft.locale).caseStudy;

    entry.caseStudyContent.overview = draft.summary;

    if (entry.caseStudyContent.businessOutcome) {
      entry.caseStudyContent.businessOutcome.body = firstParagraphOrFallback(
        draft.achievements,
        achievementFallback,
      );
    }

    if (entry.caseStudyContent.executionHighlights) {
      entry.caseStudyContent.executionHighlights.body =
        restParagraphsOrFallback(draft.achievements, achievementFallback);
    }

    if (entry.caseStudyContent.architectureDecisions) {
      entry.caseStudyContent.architectureDecisions.body =
        firstParagraphOrFallback(draft.structureNotes, structureFallback);
    }

    if (entry.caseStudyContent.qualitySecurityPerformance) {
      entry.caseStudyContent.qualitySecurityPerformance.body =
        restParagraphsOrFallback(draft.structureNotes, structureFallback);
    }

    entry.caseStudyContent.publicEvidenceTitle = i18n.projectLinksTitle;

    const publicHref = publicHrefForDraft(draft);

    if (publicHref) {
      entry.caseStudyContent.publicEvidence = [
        {
          label: i18n.liveSiteLabel,
          description: formatI18n(i18n.openProject, { title: draft.title }),
          href: publicHref,
          altText: draft.title,
          kind: "public-site",
          publicSafe: true,
        },
      ];
    }
  }

  return true;
}

export function applyResumeDraft(
  dictionary: LocaleDictionary,
  draft: DashboardResumeDraft,
): boolean {
  const resume = dictionary.resume;

  if (!resume) {
    throw new Error(`Resume content entry is missing for ${draft.locale}.`);
  }

  if (!shouldApplyDashboardDraft(resume, draft.publishedAt, draft.updatedAt)) {
    console.log(`Skipping stale published resume draft (${draft.locale}).`);
    return false;
  }

  resume.resumeContent = parseResumeContent(draft.contentJson);
  return true;
}

function generatedMediaKind(item: DashboardMediaMetadata): string {
  const normalizedStorageKey = item.storageKey.toLowerCase();

  if (
    normalizedStorageKey.includes("dashboard") ||
    normalizedStorageKey.includes("admin")
  ) {
    return "dashboard";
  }

  if (
    normalizedStorageKey.includes("diagram") ||
    item.usage === "architecture"
  ) {
    return "diagram";
  }

  if (normalizedStorageKey.includes("landing")) {
    return "landing";
  }

  return "site";
}

export function publicMediaItemsByContentId(
  mediaItems: DashboardMediaMetadata[],
): Map<string, PublicDashboardMediaMetadata> {
  const resolvedItems = mediaItems.flatMap(
    (item, index): Array<PublicDashboardMediaMetadata & { id: string }> => {
      // A curated case study can only replace its committed evidence after an
      // explicit media selection made later than the code-reviewed copy boundary.
      // Publication may update `updatedAt`; `selectedForPublicAt` is the stable,
      // per-asset review signal.
      if (item.contentId && STATIC_CASE_STUDY_IDS.has(item.contentId)) {
        const sourceDictionary = readLocaleFile("en");
        const approvedAt = Date.parse(
          sourceDictionary[item.contentId]?.approvedAt ?? "",
        );
        if (
          !Number.isFinite(approvedAt) ||
          !item.selectedForPublicAt ||
          item.selectedForPublicAt <= approvedAt
        ) {
          return [];
        }
      }

      const resolution = resolvePublicMediaUrl(
        {
          storageProvider: item.storageProvider ?? "external",
          storageKey: item.storageKey,
          ...(item.publicUrl ? { publicUrl: item.publicUrl } : {}),
        },
        {
          ...(process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH
            ? {
                cloudflareImagesAccountHash:
                  process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH,
              }
            : {}),
        },
      );

      if (
        item.status === "published" &&
        item.selectedForPublic === true &&
        resolution.status !== "resolved"
      ) {
        throw new Error(
          `Selected public media for ${item.contentId ?? "an unscoped asset"} is invalid: ${resolution.reason}`,
        );
      }

      if (resolution.status !== "resolved") return [];

      return [
        {
          ...item,
          id:
            item.id ??
            `${item.contentId ?? "unscoped"}:${item.usage}:${item.updatedAt}:${index}`,
          storageProvider: item.storageProvider ?? "external",
          publicUrl: resolution.url,
        },
      ];
    },
  );
  const decision = selectPublicationMedia(resolvedItems, "public-build");

  return new Map(
    decision.selected.flatMap((item) =>
      item.contentId ? [[item.contentId, item] as const] : [],
    ),
  );
}

export function buildGeneratedPublicMedia(
  mediaItems: DashboardMediaMetadata[],
): Record<
  string,
  {
    src: string;
    alt: string;
    kind: string;
  }
> {
  const mediaByContentId = publicMediaItemsByContentId(mediaItems);
  const entries = [...mediaByContentId.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return Object.fromEntries(
    entries.map(([contentId, item]) => [
      contentId,
      {
        src: item.publicUrl,
        alt: item.altText,
        kind: generatedMediaKind(item),
      },
    ]),
  );
}

function writeGeneratedPublicMedia(
  mediaLiteral: ReturnType<typeof buildGeneratedPublicMedia>,
): number {
  mkdirSync(generatedSiteDir, { recursive: true });
  writeFileSync(
    generatedMediaFile,
    [
      "export interface DashboardPublicMediaAsset {",
      "  src: string;",
      "  thumbSrc?: string;",
      "  alt: string;",
      "  kind: string;",
      "}",
      "",
      `export const DASHBOARD_PUBLIC_MEDIA_BY_CONTENT_ID: Record<string, DashboardPublicMediaAsset> = ${JSON.stringify(mediaLiteral, null, 2)};`,
      "",
    ].join("\n"),
  );

  return Object.keys(mediaLiteral).length;
}

function buildGeneratedPublicSettings(settings: DashboardSiteSetting[]): {
  PUBLIC_WHATSAPP_URL?: string;
} {
  const activeEnvironment =
    process.env.AOHYS_ENV === "production" ? "production" : "preview";
  const publicSettings = settings.filter(
    (setting) => setting.classification === "public-build-value",
  );
  const whatsappSetting =
    publicSettings.find(
      (setting) =>
        setting.environment === activeEnvironment &&
        setting.key === "PUBLIC_WHATSAPP_URL",
    ) ??
    publicSettings.find((setting) => setting.key === "PUBLIC_WHATSAPP_URL");
  const normalizedWhatsappUrl = whatsappSetting?.value
    ? normalizePublicWhatsappUrl(whatsappSetting.value)
    : undefined;
  const settingsLiteral = normalizedWhatsappUrl
    ? { PUBLIC_WHATSAPP_URL: normalizedWhatsappUrl }
    : {};

  return settingsLiteral;
}

function writeGeneratedPublicSettings(
  settingsLiteral: ReturnType<typeof buildGeneratedPublicSettings>,
): number {
  mkdirSync(generatedSiteDir, { recursive: true });
  writeFileSync(
    generatedSettingsFile,
    [
      "export const DASHBOARD_PUBLIC_SETTINGS: {",
      "  PUBLIC_WHATSAPP_URL?: string;",
      `} = ${JSON.stringify(settingsLiteral, null, 2)};`,
      "",
    ].join("\n"),
  );

  return Object.keys(settingsLiteral).length;
}

function hasPublicCaseStudyEntry(
  dictionary: LocaleDictionary,
  contentId: string,
): boolean {
  const entry = dictionary[contentId];
  const caseStudy = entry?.caseStudyContent;

  return Boolean(
    entry?.path &&
    entry.title &&
    entry.summary &&
    entry.seoDescription &&
    caseStudy?.statusLabel &&
    caseStudy.overview &&
    caseStudy.problem?.body &&
    caseStudy.businessOutcome?.body &&
    caseStudy.role?.body &&
    caseStudy.constraints?.body &&
    caseStudy.architectureDecisions?.body &&
    caseStudy.executionHighlights?.body &&
    caseStudy.qualitySecurityPerformance?.body &&
    caseStudy.publicEvidenceTitle &&
    caseStudy.confidentialityNote?.body,
  );
}

function hasPublicEvidence(
  caseStudy: LocalizedEntry["caseStudyContent"],
): boolean {
  return Boolean(
    caseStudy?.publicEvidence?.some(
      (evidence) =>
        evidence.publicSafe === true && /^https?:\/\//.test(evidence.href),
    ),
  );
}

export function publicProjectIdsFromDictionaries(
  dictionaries: Record<Locale, LocaleDictionary>,
  candidateContentIds: readonly string[],
  publicMediaByContentId: ReadonlyMap<
    string,
    DashboardMediaMetadata
  > = new Map(),
): string[] {
  const seen = new Set<string>();
  const projectIds: string[] = [];

  for (const contentId of candidateContentIds) {
    const hasSelectedMedia = publicMediaByContentId.has(contentId);

    if (
      seen.has(contentId) ||
      STATIC_CASE_STUDY_IDS.has(contentId) ||
      !isCaseStudyContentId(contentId) ||
      !hasPublicCaseStudyEntry(dictionaries.en, contentId) ||
      !hasPublicCaseStudyEntry(dictionaries.es, contentId) ||
      (!hasSelectedMedia &&
        (!hasPublicEvidence(dictionaries.en[contentId]?.caseStudyContent) ||
          !hasPublicEvidence(dictionaries.es[contentId]?.caseStudyContent)))
    ) {
      continue;
    }

    seen.add(contentId);
    projectIds.push(contentId);
  }

  return projectIds.sort((left, right) => left.localeCompare(right));
}

function writeGeneratedPublicProjectIds(projectIds: readonly string[]): number {
  mkdirSync(generatedContentGraphDir, { recursive: true });
  writeFileSync(
    generatedPublicProjectsFile,
    [
      "// Generated by scripts/apply-dashboard-published-content.ts.",
      "export const DASHBOARD_PUBLIC_PROJECT_IDS: readonly string[] = [",
      ...projectIds.map((projectId) => `  ${JSON.stringify(projectId)},`),
      "];",
      "",
    ].join("\n"),
  );

  return projectIds.length;
}

export function applyValidatedDashboardContent<T>(
  value: unknown,
  apply: (content: DashboardContentPayload) => T,
): T {
  const content = parseDashboardContentPayload(value);
  return apply(content);
}

function applyDashboardContent(content: DashboardContentPayload): void {
  const dictionaries: Record<Locale, LocaleDictionary> = {
    en: readLocaleFile("en"),
    es: readLocaleFile("es"),
  };

  let appliedProjects = 0;
  let appliedResumes = 0;
  const publishedProjectContentIds: string[] = [];

  for (const draft of content.projectDrafts) {
    if (!draft.publishedAt) continue;
    publishedProjectContentIds.push(draft.contentId);
    if (applyProjectDraft(dictionaries[draft.locale], draft))
      appliedProjects += 1;
  }

  for (const draft of content.resumeDrafts) {
    if (
      draft.publishedAt &&
      applyResumeDraft(dictionaries[draft.locale], draft)
    ) {
      appliedResumes += 1;
    }
  }

  assertPublicClaimsSafe(
    dictionaries.en,
    "dashboard-applied English public content",
  );
  assertPublicClaimsSafe(
    dictionaries.es,
    "dashboard-applied Spanish public content",
  );

  const publicMediaByContentId = publicMediaItemsByContentId(content.media);
  const publicProjectIds = publicProjectIdsFromDictionaries(
    dictionaries,
    publishedProjectContentIds,
    publicMediaByContentId,
  );
  const mediaLiteral = buildGeneratedPublicMedia(content.media);
  const settingsLiteral = buildGeneratedPublicSettings(content.settings);

  writeLocaleFile("en", dictionaries.en);
  writeLocaleFile("es", dictionaries.es);
  const generatedPublicProjects =
    writeGeneratedPublicProjectIds(publicProjectIds);
  const appliedMedia = writeGeneratedPublicMedia(mediaLiteral);
  const appliedSettings = writeGeneratedPublicSettings(settingsLiteral);

  console.log(
    `Applied ${appliedProjects} published project draft(s), ${appliedResumes} published resume draft(s), ${appliedMedia} media asset(s), ${appliedSettings} public setting(s), and ${generatedPublicProjects} generated public project id(s).`,
  );
}

async function main(): Promise<void> {
  const content = await loadDashboardContent();

  if (!content) {
    return;
  }
  applyValidatedDashboardContent(content, applyDashboardContent);
}

const invokedScriptUrl = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;

if (invokedScriptUrl && import.meta.url === invokedScriptUrl) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
