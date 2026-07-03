import { assertOneOf, trimToUndefined } from "@aohys/core";

export const DASHBOARD_CASE_STUDY_CONTENT_IDS = [
  "case-study:casa-roca",
  "case-study:the-barber-central",
  "case-study:nutri-plan",
  "case-study:enterprise-systems",
  "case-study:engineering-practice",
] as const;

export const DASHBOARD_CASE_STUDY_STATUSES = [
  "production-proof",
  "active-build",
  "private-build",
  "enterprise-confidential",
  "engineering-practice",
] as const;

export const DASHBOARD_EVIDENCE_STATUSES = ["missing", "sanitized", "published"] as const;
export const DASHBOARD_MEDIA_STORAGE_PROVIDERS = ["cloudflare-images", "cloudflare-r2", "external"] as const;
export const DASHBOARD_MEDIA_USAGES = ["case-study", "resume", "architecture", "site"] as const;
export const DASHBOARD_MEDIA_STATUSES = ["draft", "published", "archived"] as const;
export const DASHBOARD_LOCALES = ["en", "es"] as const;
export const DASHBOARD_ENVIRONMENTS = ["local", "preview", "production"] as const;
export const DASHBOARD_PUBLISH_SCOPES = ["project", "resume", "all"] as const;
export const DASHBOARD_SETTING_CLASSIFICATIONS = [
  "public-build-value",
  "provider-output",
  "policy-value",
] as const;

export type DashboardCaseStudyContentId = (typeof DASHBOARD_CASE_STUDY_CONTENT_IDS)[number];
export type DashboardCaseStudyStatus = (typeof DASHBOARD_CASE_STUDY_STATUSES)[number];
export type DashboardEvidenceStatus = (typeof DASHBOARD_EVIDENCE_STATUSES)[number];
export type DashboardMediaStorageProvider = (typeof DASHBOARD_MEDIA_STORAGE_PROVIDERS)[number];
export type DashboardMediaUsage = (typeof DASHBOARD_MEDIA_USAGES)[number];
export type DashboardMediaStatus = (typeof DASHBOARD_MEDIA_STATUSES)[number];
export type DashboardLocale = (typeof DASHBOARD_LOCALES)[number];
export type DashboardEnvironment = (typeof DASHBOARD_ENVIRONMENTS)[number];
export type DashboardPublishScope = (typeof DASHBOARD_PUBLISH_SCOPES)[number];
export type DashboardSettingClassification = (typeof DASHBOARD_SETTING_CLASSIFICATIONS)[number];

export interface DashboardCaseStudyMetadataPayload {
  contentId: DashboardCaseStudyContentId;
  status: DashboardCaseStudyStatus;
  evidenceStatus: DashboardEvidenceStatus;
}

export interface DashboardProjectDraftPayload extends DashboardCaseStudyMetadataPayload {
  locale: DashboardLocale;
  title: string;
  summary: string;
  seoDescription: string;
  projectUrl?: string;
  ctaLabel: string;
  ctaHref: string;
  achievements: string;
  structureNotes: string;
}

export interface DashboardMediaMetadataPayload {
  storageProvider: DashboardMediaStorageProvider;
  storageKey: string;
  publicUrl?: string;
  altText: string;
  contentId?: DashboardCaseStudyContentId;
  usage: DashboardMediaUsage;
  status: DashboardMediaStatus;
  locale?: DashboardLocale;
}

export interface DashboardMediaUploadPayload {
  storageKey: string;
  altText: string;
  contentId?: DashboardCaseStudyContentId;
  usage: DashboardMediaUsage;
  locale?: DashboardLocale;
}

export interface DashboardSiteSettingPayload {
  key: string;
  environment: DashboardEnvironment;
  value: string;
  classification: DashboardSettingClassification;
}

export interface DashboardResumeVersionPayload {
  locale: DashboardLocale;
  version: string;
  pdfPath: string;
  isPublished: boolean;
}

export interface DashboardResumeDraftPayload {
  locale: DashboardLocale;
  contentJson: string;
}

export interface DashboardPublishPayload {
  scope: DashboardPublishScope;
  contentId?: DashboardCaseStudyContentId;
  locale?: DashboardLocale;
}

interface DashboardCaseStudyMetadataRawPayload {
  contentId?: string;
  status?: string;
  evidenceStatus?: string;
}

interface DashboardProjectDraftRawPayload extends DashboardCaseStudyMetadataRawPayload {
  locale?: string;
  title?: string;
  summary?: string;
  seoDescription?: string;
  projectUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  achievements?: string;
  structureNotes?: string;
}

interface DashboardMediaMetadataRawPayload {
  storageProvider?: string;
  storageKey?: string;
  publicUrl?: string;
  altText?: string;
  contentId?: string;
  usage?: string;
  status?: string;
  locale?: string;
}

interface DashboardMediaUploadRawPayload {
  storageKey?: string;
  altText?: string;
  contentId?: string;
  usage?: string;
  locale?: string;
}

interface DashboardSiteSettingRawPayload {
  key?: string;
  environment?: string;
  value?: string;
  classification?: string;
}

interface DashboardResumeVersionRawPayload {
  locale?: string;
  version?: string;
  pdfPath?: string;
  isPublished?: boolean;
}

interface DashboardResumeDraftRawPayload {
  locale?: string;
  contentJson?: string;
}

interface DashboardPublishRawPayload {
  scope?: string;
  contentId?: string;
  locale?: string;
}

export async function parseDashboardCaseStudyMetadataPayload(
  request: Request,
): Promise<DashboardCaseStudyMetadataPayload> {
  const payload = await readJsonPayload<DashboardCaseStudyMetadataRawPayload>(request);
  const contentId = requireTrimmed(payload.contentId, "contentId");
  const status = requireTrimmed(payload.status, "status");
  const evidenceStatus = requireTrimmed(payload.evidenceStatus, "evidenceStatus");

  assertOneOf(contentId, DASHBOARD_CASE_STUDY_CONTENT_IDS, "contentId");
  assertOneOf(status, DASHBOARD_CASE_STUDY_STATUSES, "status");
  assertOneOf(evidenceStatus, DASHBOARD_EVIDENCE_STATUSES, "evidenceStatus");

  return {
    contentId,
    status,
    evidenceStatus,
  };
}

export async function parseDashboardProjectDraftPayload(
  request: Request,
): Promise<DashboardProjectDraftPayload> {
  const payload = await readJsonPayload<DashboardProjectDraftRawPayload>(request);
  const contentId = requireTrimmed(payload.contentId, "contentId");
  const status = requireTrimmed(payload.status, "status");
  const evidenceStatus = requireTrimmed(payload.evidenceStatus, "evidenceStatus");
  const locale = requireTrimmed(payload.locale, "locale");
  const title = requireTrimmed(payload.title, "title");
  const summary = requireTrimmed(payload.summary, "summary");
  const seoDescription = requireTrimmed(payload.seoDescription, "seoDescription");
  const ctaLabel = requireTrimmed(payload.ctaLabel, "ctaLabel");
  const ctaHref = requireTrimmed(payload.ctaHref, "ctaHref");
  const achievements = requireTrimmed(payload.achievements, "achievements");
  const structureNotes = requireTrimmed(payload.structureNotes, "structureNotes");
  const projectUrl = trimToUndefined(payload.projectUrl);

  assertOneOf(contentId, DASHBOARD_CASE_STUDY_CONTENT_IDS, "contentId");
  assertOneOf(status, DASHBOARD_CASE_STUDY_STATUSES, "status");
  assertOneOf(evidenceStatus, DASHBOARD_EVIDENCE_STATUSES, "evidenceStatus");
  assertOneOf(locale, DASHBOARD_LOCALES, "locale");

  if (projectUrl && !isHttpUrl(projectUrl)) {
    throw new Error("Project URL must be an http or https URL.");
  }

  if (!isSafePublicHref(ctaHref)) {
    throw new Error("CTA href must be a public path or an http or https URL.");
  }

  return {
    contentId,
    status,
    evidenceStatus,
    locale,
    title,
    summary,
    seoDescription,
    projectUrl,
    ctaLabel,
    ctaHref,
    achievements,
    structureNotes,
  };
}

export async function parseDashboardMediaMetadataPayload(
  request: Request,
): Promise<DashboardMediaMetadataPayload> {
  const payload = await readJsonPayload<DashboardMediaMetadataRawPayload>(request);
  const storageProvider = requireTrimmed(payload.storageProvider, "storageProvider");
  const storageKey = normalizeStorageKey(requireTrimmed(payload.storageKey, "storageKey"));
  const altText = requireTrimmed(payload.altText, "altText");
  const usage = requireTrimmed(payload.usage, "usage");
  const status = requireTrimmed(payload.status, "status");
  const publicUrl = trimToUndefined(payload.publicUrl);
  const contentId = trimToUndefined(payload.contentId);
  const locale = trimToUndefined(payload.locale);
  let validatedContentId: DashboardCaseStudyContentId | undefined;
  let validatedLocale: DashboardLocale | undefined;

  assertOneOf(storageProvider, DASHBOARD_MEDIA_STORAGE_PROVIDERS, "storageProvider");
  assertOneOf(usage, DASHBOARD_MEDIA_USAGES, "usage");
  assertOneOf(status, DASHBOARD_MEDIA_STATUSES, "status");

  if (contentId) {
    assertOneOf(contentId, DASHBOARD_CASE_STUDY_CONTENT_IDS, "contentId");
    validatedContentId = contentId;
  }

  if (locale) {
    assertOneOf(locale, DASHBOARD_LOCALES, "locale");
    validatedLocale = locale;
  }

  if (!altText) {
    throw new Error("Media alt text is required.");
  }

  if (publicUrl && !isHttpUrl(publicUrl)) {
    throw new Error("Media publicUrl must be an http or https URL.");
  }

  return {
    storageProvider,
    storageKey,
    publicUrl,
    altText,
    contentId: validatedContentId,
    usage,
    status,
    locale: validatedLocale,
  };
}

export async function parseDashboardMediaUploadPayload(
  request: Request,
): Promise<DashboardMediaUploadPayload> {
  const payload = await readJsonPayload<DashboardMediaUploadRawPayload>(request);
  const storageKey = normalizeStorageKey(requireTrimmed(payload.storageKey, "storageKey"));
  const altText = requireTrimmed(payload.altText, "altText");
  const usage = requireTrimmed(payload.usage, "usage");
  const contentId = trimToUndefined(payload.contentId);
  const locale = trimToUndefined(payload.locale);
  let validatedContentId: DashboardCaseStudyContentId | undefined;
  let validatedLocale: DashboardLocale | undefined;

  assertOneOf(usage, DASHBOARD_MEDIA_USAGES, "usage");

  if (contentId) {
    assertOneOf(contentId, DASHBOARD_CASE_STUDY_CONTENT_IDS, "contentId");
    validatedContentId = contentId;
  }

  if (locale) {
    assertOneOf(locale, DASHBOARD_LOCALES, "locale");
    validatedLocale = locale;
  }

  return {
    storageKey,
    altText,
    contentId: validatedContentId,
    usage,
    locale: validatedLocale,
  };
}

export async function parseDashboardSiteSettingPayload(
  request: Request,
): Promise<DashboardSiteSettingPayload> {
  const payload = await readJsonPayload<DashboardSiteSettingRawPayload>(request);
  const key = requireTrimmed(payload.key, "key");
  const environment = requireTrimmed(payload.environment, "environment");
  const value = requireTrimmed(payload.value, "value");
  const classification = requireTrimmed(payload.classification, "classification");

  assertOneOf(environment, DASHBOARD_ENVIRONMENTS, "environment");
  assertOneOf(classification, DASHBOARD_SETTING_CLASSIFICATIONS, "classification");

  if (!key.startsWith("PUBLIC_")) {
    throw new Error("Only PUBLIC_ site settings can be edited from this workflow.");
  }

  return {
    key,
    environment,
    value,
    classification,
  };
}

export async function parseDashboardResumeDraftPayload(
  request: Request,
): Promise<DashboardResumeDraftPayload> {
  const payload = await readJsonPayload<DashboardResumeDraftRawPayload>(request);
  const locale = requireTrimmed(payload.locale, "locale");
  const contentJson = requireTrimmed(payload.contentJson, "contentJson");

  assertOneOf(locale, DASHBOARD_LOCALES, "locale");
  assertValidResumeDraftJson(contentJson);

  return {
    locale,
    contentJson,
  };
}

export async function parseDashboardPublishPayload(
  request: Request,
): Promise<DashboardPublishPayload> {
  const payload = await readJsonPayload<DashboardPublishRawPayload>(request);
  const scope = requireTrimmed(payload.scope, "scope");
  const contentId = trimToUndefined(payload.contentId);
  const locale = trimToUndefined(payload.locale);
  let validatedContentId: DashboardCaseStudyContentId | undefined;
  let validatedLocale: DashboardLocale | undefined;

  assertOneOf(scope, DASHBOARD_PUBLISH_SCOPES, "scope");

  if (contentId) {
    assertOneOf(contentId, DASHBOARD_CASE_STUDY_CONTENT_IDS, "contentId");
    validatedContentId = contentId;
  }

  if (locale) {
    assertOneOf(locale, DASHBOARD_LOCALES, "locale");
    validatedLocale = locale;
  }

  if (scope === "project" && !validatedContentId) {
    throw new Error("contentId is required for project publish.");
  }

  if (scope === "resume" && !validatedLocale) {
    throw new Error("locale is required for resume publish.");
  }

  return {
    scope,
    contentId: validatedContentId,
    locale: validatedLocale,
  };
}

export async function parseDashboardResumeVersionPayload(
  request: Request,
): Promise<DashboardResumeVersionPayload> {
  const payload = await readJsonPayload<DashboardResumeVersionRawPayload>(request);
  const locale = requireTrimmed(payload.locale, "locale");
  const version = requireTrimmed(payload.version, "version");
  const pdfPath = requireTrimmed(payload.pdfPath, "pdfPath");

  assertOneOf(locale, DASHBOARD_LOCALES, "locale");

  if (!pdfPath.startsWith("/downloads/") || !pdfPath.endsWith(".pdf")) {
    throw new Error("Resume pdfPath must point to a public downloads PDF.");
  }

  return {
    locale,
    version,
    pdfPath,
    isPublished: payload.isPublished === true,
  };
}

async function readJsonPayload<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new Error("Invalid dashboard content payload.");
  }
}

function requireTrimmed(value: string | undefined, fieldName: string): string {
  const trimmed = trimToUndefined(value);

  if (!trimmed) {
    if (fieldName === "altText") {
      throw new Error("Media alt text is required.");
    }

    throw new Error(`${fieldName} is required.`);
  }

  return trimmed;
}

function normalizeStorageKey(value: string): string {
  const normalized = value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/");

  if (!normalized || normalized.includes("..")) {
    throw new Error("storageKey must be a safe Cloudflare image path.");
  }

  return normalized;
}

function assertValidResumeDraftJson(contentJson: string): void {
  let payload: unknown;

  try {
    payload = JSON.parse(contentJson);
  } catch {
    throw new Error("contentJson must be valid JSON.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("contentJson must be a resume content object.");
  }

  const record = payload as Record<string, unknown>;
  const requiredTextFields = ["name", "role", "location", "intro"];

  for (const field of requiredTextFields) {
    if (typeof record[field] !== "string" || !record[field]) {
      throw new Error(`resume.${field} is required.`);
    }
  }

  for (const field of ["summary", "highlights", "projects", "experience", "skills", "education", "languages"]) {
    if (!Array.isArray(record[field])) {
      throw new Error(`resume.${field} must be an array.`);
    }
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafePublicHref(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }

  return isHttpUrl(value);
}
