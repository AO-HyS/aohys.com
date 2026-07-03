import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Locale = "en" | "es";

interface DashboardProjectDraft {
  contentId: string;
  locale: Locale;
  title: string;
  summary: string;
  seoDescription: string;
  projectUrl?: string;
  ctaLabel: string;
  ctaHref: string;
  achievements: string;
  structureNotes: string;
  publishedAt?: number;
}

interface DashboardResumeDraft {
  locale: Locale;
  contentJson: string;
  publishedAt?: number;
}

interface DashboardMediaMetadata {
  storageKey: string;
  publicUrl?: string;
  altText: string;
  contentId?: string;
  usage: "case-study" | "resume" | "architecture" | "site";
  status: "draft" | "published" | "archived";
  locale?: Locale;
  updatedAt: number;
}

interface DashboardSiteSetting {
  key: string;
  environment: "local" | "preview" | "production";
  value: string;
  classification: "public-build-value" | "provider-output" | "policy-value";
  updatedAt: number;
}

interface DashboardContentPayload {
  projectDrafts?: DashboardProjectDraft[];
  resumeDrafts?: DashboardResumeDraft[];
  media?: DashboardMediaMetadata[];
  settings?: DashboardSiteSetting[];
}

interface LocalizedEntry {
  title?: string;
  summary?: string;
  seoDescription?: string;
  primaryActionLabel?: string;
  primaryActionContentId?: string;
  caseStudyContent?: {
    overview?: string;
    businessOutcome?: { body?: string };
    architectureDecisions?: { body?: string };
    executionHighlights?: { body?: string };
    qualitySecurityPerformance?: { body?: string };
    publicEvidenceTitle?: string;
    publicEvidence?: Array<{
      label: string;
      description: string;
      href: string;
      altText: string;
      kind: string;
      publicSafe: boolean;
    }>;
  };
  resumeContent?: unknown;
}

type LocaleDictionary = Record<string, LocalizedEntry>;

const localeFiles: Record<Locale, string> = {
  en: path.resolve("packages/content-graph/src/locales/en.json"),
  es: path.resolve("packages/content-graph/src/locales/es.json"),
};
const generatedSiteDir = path.resolve("apps/site/src/generated");
const generatedMediaFile = path.join(generatedSiteDir, "dashboard-public-media.ts");
const generatedSettingsFile = path.join(generatedSiteDir, "dashboard-public-settings.ts");

function endpointFor(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/dashboard/content`;
}

async function loadDashboardContent(): Promise<DashboardContentPayload | null> {
  const convexSiteUrl = process.env.CONVEX_SITE_URL?.trim();
  const dashboardToken = process.env.DASHBOARD_API_TOKEN?.trim();

  if (!convexSiteUrl || !dashboardToken) {
    console.log("Dashboard published content bridge skipped: CONVEX_SITE_URL or DASHBOARD_API_TOKEN is missing.");
    return null;
  }

  const response = await fetch(endpointFor(convexSiteUrl), {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${dashboardToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Dashboard published content bridge failed with HTTP ${response.status}.`);
  }

  return await response.json() as DashboardContentPayload;
}

function readLocaleFile(locale: Locale): LocaleDictionary {
  return JSON.parse(readFileSync(localeFiles[locale], "utf8")) as LocaleDictionary;
}

function writeLocaleFile(locale: Locale, dictionary: LocaleDictionary): void {
  writeFileSync(localeFiles[locale], `${JSON.stringify(dictionary, null, 2)}\n`);
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

function contentIdFromPath(href: string, locale: Locale): string | undefined {
  const normalized = href.replace(/\/$/, "");

  if (locale === "es") {
    if (normalized === "/es/contacto") return "contact";
    if (normalized === "/es/casos") return "case-studies";
    if (normalized === "/es/cv") return "resume";
    if (normalized === "/es/arquitectura") return "architecture";
    return undefined;
  }

  if (normalized === "/contact") return "contact";
  if (normalized === "/case-studies") return "case-studies";
  if (normalized === "/resume") return "resume";
  if (normalized === "/architecture") return "architecture";

  return undefined;
}

function applyProjectDraft(dictionary: LocaleDictionary, draft: DashboardProjectDraft): void {
  const entry = dictionary[draft.contentId];

  if (!entry) {
    console.log(`Skipping unknown content entry ${draft.contentId} (${draft.locale}).`);
    return;
  }

  entry.title = draft.title;
  entry.summary = draft.summary;
  entry.seoDescription = draft.seoDescription;
  entry.primaryActionLabel = draft.ctaLabel;

  const actionContentId = contentIdFromPath(draft.ctaHref, draft.locale);

  if (actionContentId) {
    entry.primaryActionContentId = actionContentId;
  }

  if (entry.caseStudyContent) {
    entry.caseStudyContent.overview = draft.summary;

    if (entry.caseStudyContent.businessOutcome) {
      entry.caseStudyContent.businessOutcome.body = firstParagraph(draft.achievements);
    }

    if (entry.caseStudyContent.executionHighlights) {
      entry.caseStudyContent.executionHighlights.body = restParagraphs(draft.achievements);
    }

    if (entry.caseStudyContent.architectureDecisions) {
      entry.caseStudyContent.architectureDecisions.body = firstParagraph(draft.structureNotes);
    }

    if (entry.caseStudyContent.qualitySecurityPerformance) {
      entry.caseStudyContent.qualitySecurityPerformance.body = restParagraphs(draft.structureNotes);
    }

    entry.caseStudyContent.publicEvidenceTitle = draft.locale === "es" ? "Enlaces públicos" : "Public links";

    const publicHref = draft.projectUrl || (draft.ctaHref.startsWith("http") ? draft.ctaHref : undefined);

    if (publicHref) {
      entry.caseStudyContent.publicEvidence = [
        {
          label: draft.locale === "es" ? "Sitio en vivo" : "Live site",
          description: draft.locale === "es" ? `Abrir ${draft.title}.` : `Open ${draft.title}.`,
          href: publicHref,
          altText: draft.title,
          kind: "public-site",
          publicSafe: true,
        },
      ];
    }
  }
}

function applyResumeDraft(dictionary: LocaleDictionary, draft: DashboardResumeDraft): void {
  const resume = dictionary.resume;

  if (!resume) {
    throw new Error(`Resume content entry is missing for ${draft.locale}.`);
  }

  resume.resumeContent = JSON.parse(draft.contentJson) as unknown;
}

function generatedMediaKind(item: DashboardMediaMetadata): string {
  const normalizedStorageKey = item.storageKey.toLowerCase();

  if (normalizedStorageKey.includes("dashboard") || normalizedStorageKey.includes("admin")) {
    return "dashboard";
  }

  if (normalizedStorageKey.includes("diagram") || item.usage === "architecture") {
    return "diagram";
  }

  if (normalizedStorageKey.includes("landing")) {
    return "landing";
  }

  return "site";
}

function writeGeneratedPublicMedia(mediaItems: DashboardMediaMetadata[]): number {
  const mediaByContentId = new Map<string, DashboardMediaMetadata>();

  for (const item of mediaItems) {
    if (
      !item.contentId ||
      !item.publicUrl ||
      item.status !== "published" ||
      (item.usage !== "case-study" && item.usage !== "site" && item.usage !== "architecture")
    ) {
      continue;
    }

    const existing = mediaByContentId.get(item.contentId);

    if (!existing || item.updatedAt > existing.updatedAt) {
      mediaByContentId.set(item.contentId, item);
    }
  }

  const entries = [...mediaByContentId.entries()].sort(([left], [right]) => left.localeCompare(right));
  const mediaLiteral = Object.fromEntries(entries.map(([contentId, item]) => [
    contentId,
    {
      src: item.publicUrl,
      alt: item.altText,
      kind: generatedMediaKind(item),
    },
  ]));

  mkdirSync(generatedSiteDir, { recursive: true });
  writeFileSync(generatedMediaFile, [
    "export interface DashboardPublicMediaAsset {",
    "  src: string;",
    "  thumbSrc?: string;",
    "  alt: string;",
    "  kind: string;",
    "}",
    "",
    `export const DASHBOARD_PUBLIC_MEDIA_BY_CONTENT_ID: Record<string, DashboardPublicMediaAsset> = ${JSON.stringify(mediaLiteral, null, 2)};`,
    "",
  ].join("\n"));

  return entries.length;
}

function writeGeneratedPublicSettings(settings: DashboardSiteSetting[]): number {
  const activeEnvironment = process.env.AOHYS_ENV === "production" ? "production" : "preview";
  const publicSettings = settings.filter((setting) => setting.classification === "public-build-value");
  const whatsappSetting = publicSettings.find((setting) =>
    setting.environment === activeEnvironment &&
    setting.key === "PUBLIC_WHATSAPP_URL",
  ) ?? publicSettings.find((setting) => setting.key === "PUBLIC_WHATSAPP_URL");
  const settingsLiteral = whatsappSetting?.value
    ? { PUBLIC_WHATSAPP_URL: whatsappSetting.value }
    : {};

  mkdirSync(generatedSiteDir, { recursive: true });
  writeFileSync(generatedSettingsFile, [
    "export const DASHBOARD_PUBLIC_SETTINGS: {",
    "  PUBLIC_WHATSAPP_URL?: string;",
    `} = ${JSON.stringify(settingsLiteral, null, 2)};`,
    "",
  ].join("\n"));

  return Object.keys(settingsLiteral).length;
}

async function main(): Promise<void> {
  const content = await loadDashboardContent();

  if (!content) {
    return;
  }

  const dictionaries: Record<Locale, LocaleDictionary> = {
    en: readLocaleFile("en"),
    es: readLocaleFile("es"),
  };
  let appliedProjects = 0;
  let appliedResumes = 0;

  for (const draft of content.projectDrafts ?? []) {
    if (!draft.publishedAt) {
      continue;
    }

    applyProjectDraft(dictionaries[draft.locale], draft);
    appliedProjects += 1;
  }

  for (const draft of content.resumeDrafts ?? []) {
    if (!draft.publishedAt) {
      continue;
    }

    applyResumeDraft(dictionaries[draft.locale], draft);
    appliedResumes += 1;
  }

  writeLocaleFile("en", dictionaries.en);
  writeLocaleFile("es", dictionaries.es);
  const appliedMedia = writeGeneratedPublicMedia(content.media ?? []);
  const appliedSettings = writeGeneratedPublicSettings(content.settings ?? []);

  console.log(`Applied ${appliedProjects} published project draft(s), ${appliedResumes} published resume draft(s), ${appliedMedia} media asset(s), and ${appliedSettings} public setting(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
