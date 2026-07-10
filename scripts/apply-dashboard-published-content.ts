import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { hasConvexDeploymentAccess, runConvexFunction } from "./convex-run.js";

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

export interface DashboardMediaMetadata {
  storageProvider?: "cloudflare-images" | "cloudflare-r2" | "external";
  storageKey: string;
  publicUrl?: string;
  altText: string;
  contentId?: string;
  usage: "case-study" | "resume" | "architecture" | "site";
  status: "draft" | "published" | "archived";
  locale?: Locale;
  selectedForPublic?: boolean;
  updatedAt: number;
}

type PublicDashboardMediaMetadata = DashboardMediaMetadata & { publicUrl: string };

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

const localeFiles: Record<Locale, string> = {
  en: path.resolve("packages/content-graph/src/locales/en.json"),
  es: path.resolve("packages/content-graph/src/locales/es.json"),
};
const generatedContentGraphDir = path.resolve("packages/content-graph/src/generated");
const generatedPublicProjectsFile = path.join(generatedContentGraphDir, "dashboard-public-projects.ts");
const generatedSiteDir = path.resolve("apps/site/src/generated");
const generatedMediaFile = path.join(generatedSiteDir, "dashboard-public-media.ts");
const generatedSettingsFile = path.join(generatedSiteDir, "dashboard-public-settings.ts");

const STATIC_CASE_STUDY_IDS = new Set([
  "case-study:casa-roca",
  "case-study:the-barber-central",
  "case-study:nutri-plan",
  "case-study:enterprise-systems",
  "case-study:engineering-practice",
]);

async function loadDashboardContent(): Promise<DashboardContentPayload | null> {
  if (!hasConvexDeploymentAccess()) {
    console.log("Dashboard published content bridge skipped: CONVEX_DEPLOY_KEY and CONVEX_DEPLOYMENT are missing.");
    return null;
  }

  return runConvexFunction<DashboardContentPayload>("content:listForDashboardInternal", {});
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

function localized(locale: Locale, english: string, spanish: string): string {
  return locale === "es" ? spanish : english;
}

function isCaseStudyContentId(contentId: string): boolean {
  return /^case-study:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contentId);
}

function slugFromContentId(contentId: string): string {
  return contentId.slice("case-study:".length);
}

function projectPath(contentId: string, locale: Locale): string {
  const slug = slugFromContentId(contentId);

  return locale === "es" ? `/es/casos/${slug}` : `/case-studies/${slug}`;
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

function contentIdFromPath(href: string, locale: Locale): string | undefined {
  const normalized = href.replace(/\/$/, "");

  if (locale === "es") {
    if (normalized === "/es/contacto") return "contact";
    if (normalized === "/es/blog" || normalized === "/es/casos") return "case-studies";
    if (normalized === "/es/precios" || normalized === "/es/cv" || normalized === "/es/curriculum") return "resume";
    if (normalized === "/es/arquitectura") return "architecture";
    const dynamicMatch = normalized.match(/^\/es\/(?:blog|casos)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);

    if (dynamicMatch?.[1]) {
      return `case-study:${dynamicMatch[1]}`;
    }

    return undefined;
  }

  if (normalized === "/contact") return "contact";
  if (normalized === "/blog" || normalized === "/case-studies") return "case-studies";
  if (normalized === "/pricing" || normalized === "/resume") return "resume";
  if (normalized === "/architecture") return "architecture";
  const dynamicMatch = normalized.match(/^\/(?:blog|case-studies)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);

  if (dynamicMatch?.[1]) {
    return `case-study:${dynamicMatch[1]}`;
  }

  return undefined;
}

function publicHrefForDraft(draft: DashboardProjectDraft): string | undefined {
  return draft.projectUrl || (draft.ctaHref.startsWith("http") ? draft.ctaHref : undefined);
}

function achievementFallbackForDraft(draft: DashboardProjectDraft): string {
  return localized(
    draft.locale,
    `${draft.title} has a public case-study narrative published from the dashboard.`,
    `${draft.title} tiene una narrativa pública publicada desde el dashboard.`,
  );
}

function structureFallbackForDraft(draft: DashboardProjectDraft): string {
  return localized(
    draft.locale,
    `${draft.title} uses the public content graph to expose only safe project context.`,
    `${draft.title} usa el grafo público de contenido para exponer sólo contexto seguro del proyecto.`,
  );
}

function createProjectEntry(draft: DashboardProjectDraft): LocalizedEntry {
  const locale = draft.locale;
  const title = draft.title;
  const publicHref = publicHrefForDraft(draft);
  const achievementFallback = achievementFallbackForDraft(draft);
  const structureFallback = structureFallbackForDraft(draft);

  return {
    path: projectPath(draft.contentId, locale),
    title,
    summary: draft.summary,
    seoDescription: draft.seoDescription,
    primaryActionLabel: draft.ctaLabel,
    secondaryActionLabel: localized(locale, "Back to selected work", "Volver a casos"),
    secondaryActionContentId: "case-studies",
    caseStudyContent: {
      statusLabel: localized(locale, "Published dashboard project", "Proyecto publicado desde dashboard"),
      overview: draft.summary,
      problem: {
        title: localized(locale, "Problem", "Problema"),
        body: draft.summary,
      },
      businessOutcome: {
        title: localized(locale, "Business outcome", "Resultado de negocio"),
        body: firstParagraphOrFallback(draft.achievements, achievementFallback),
      },
      role: {
        title: localized(locale, "Role", "Rol"),
        body: localized(
          locale,
          "Product engineering, delivery planning, public-content shaping, and safe publication from the dashboard workflow.",
          "Ingeniería de producto, planeación de entrega, estructura de contenido público y publicación segura desde el flujo de dashboard.",
        ),
      },
      constraints: {
        title: localized(locale, "Constraints", "Restricciones"),
        body: localized(
          locale,
          "The public case study can show sanitized project context and links, while private implementation details, credentials, operations data, and client-specific records stay out of the public site.",
          "El caso público puede mostrar contexto sanitizado del proyecto y enlaces, mientras detalles privados de implementación, credenciales, datos operativos y registros específicos del cliente quedan fuera del sitio público.",
        ),
      },
      architectureDecisions: {
        title: localized(locale, "Architecture decisions", "Decisiones de arquitectura"),
        body: firstParagraphOrFallback(draft.structureNotes, structureFallback),
      },
      executionHighlights: {
        title: localized(locale, "Execution highlights", "Ejecución"),
        body: restParagraphsOrFallback(draft.achievements, achievementFallback),
      },
      qualitySecurityPerformance: {
        title: localized(locale, "Quality, security, and performance", "Calidad, seguridad y rendimiento"),
        body: restParagraphsOrFallback(draft.structureNotes, structureFallback),
      },
      publicEvidenceTitle: localized(locale, "Public links", "Enlaces públicos"),
      publicEvidence: publicHref
        ? [
            {
              label: localized(locale, "Live site", "Sitio en vivo"),
              description: localized(locale, `Open ${title}.`, `Abrir ${title}.`),
              href: publicHref,
              altText: title,
              kind: "public-site",
              publicSafe: true,
            },
          ]
        : [],
      confidentialityNote: {
        title: localized(locale, "Confidentiality note", "Nota de confidencialidad"),
        body: localized(
          locale,
          "Only public-safe project context is shown here. Private code, dashboards, credentials, analytics, operational records, and customer data remain private.",
          "Aquí sólo se muestra contexto seguro para publicación. Código privado, dashboards, credenciales, analíticas, registros operativos y datos de clientes permanecen privados.",
        ),
      },
    },
  };
}

export function applyProjectDraft(dictionary: LocaleDictionary, draft: DashboardProjectDraft): boolean {
  let entry = dictionary[draft.contentId];

  if (!entry) {
    if (!isCaseStudyContentId(draft.contentId)) {
      console.log(`Skipping unknown content entry ${draft.contentId} (${draft.locale}).`);
      return false;
    }

    entry = createProjectEntry(draft);
    dictionary[draft.contentId] = entry;
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
    const achievementFallback = achievementFallbackForDraft(draft);
    const structureFallback = structureFallbackForDraft(draft);

    entry.caseStudyContent.overview = draft.summary;

    if (entry.caseStudyContent.businessOutcome) {
      entry.caseStudyContent.businessOutcome.body = firstParagraphOrFallback(draft.achievements, achievementFallback);
    }

    if (entry.caseStudyContent.executionHighlights) {
      entry.caseStudyContent.executionHighlights.body = restParagraphsOrFallback(draft.achievements, achievementFallback);
    }

    if (entry.caseStudyContent.architectureDecisions) {
      entry.caseStudyContent.architectureDecisions.body = firstParagraphOrFallback(draft.structureNotes, structureFallback);
    }

    if (entry.caseStudyContent.qualitySecurityPerformance) {
      entry.caseStudyContent.qualitySecurityPerformance.body = restParagraphsOrFallback(draft.structureNotes, structureFallback);
    }

    entry.caseStudyContent.publicEvidenceTitle = draft.locale === "es" ? "Enlaces públicos" : "Public links";

    const publicHref = publicHrefForDraft(draft);

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

  return true;
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

export function publicMediaItemsByContentId(mediaItems: DashboardMediaMetadata[]): Map<string, DashboardMediaMetadata> {
  const mediaByContentId = new Map<string, PublicDashboardMediaMetadata>();

  for (const item of mediaItems) {
    const publicUrl = publicMediaUrl(item);

    if (
      !item.contentId ||
      !publicUrl ||
      item.status !== "published" ||
      (item.usage !== "case-study" && item.usage !== "site" && item.usage !== "architecture")
    ) {
      continue;
    }

    const publicItem: PublicDashboardMediaMetadata = {
      ...item,
      publicUrl,
    };
    const existing = mediaByContentId.get(item.contentId);
    const itemIsSelected = item.selectedForPublic === true;
    const existingIsSelected = existing?.selectedForPublic === true;

    if (
      !existing ||
      (itemIsSelected && !existingIsSelected) ||
      (itemIsSelected === existingIsSelected && item.updatedAt > existing.updatedAt)
    ) {
      mediaByContentId.set(item.contentId, publicItem);
    }
  }

  return mediaByContentId;
}

function publicMediaUrl(item: DashboardMediaMetadata): string | undefined {
  if (item.publicUrl) {
    return item.publicUrl;
  }

  if (isHttpUrl(item.storageKey)) {
    return item.storageKey;
  }

  if (isPublicAssetPath(item.storageKey)) {
    return item.storageKey.startsWith("/") ? item.storageKey : `/${item.storageKey}`;
  }

  const accountHash = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH?.trim();

  if (item.storageProvider !== "cloudflare-images" || !accountHash) {
    return undefined;
  }

  return `https://imagedelivery.net/${accountHash}/${item.storageKey}/public`;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isPublicAssetPath(value: string): boolean {
  const path = value.split(/[?#]/, 1)[0] ?? "";

  if (!/^(?:\/)?images\/.+\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(path)) {
    return false;
  }

  return publicAssetPathSegments(path).every(isSafePublicAssetPathSegment);
}

function publicAssetPathSegments(path: string): string[] {
  return (path.startsWith("/") ? path.slice(1) : path).split("/");
}

function isSafePublicAssetPathSegment(segment: string): boolean {
  if (!segment) {
    return false;
  }

  try {
    const decodedSegment = decodeURIComponent(segment);

    return decodedSegment !== "." && decodedSegment !== ".." && !decodedSegment.includes("/") && !decodedSegment.includes("\\");
  } catch {
    return false;
  }
}

function writeGeneratedPublicMedia(mediaItems: DashboardMediaMetadata[]): number {
  const mediaByContentId = publicMediaItemsByContentId(mediaItems);

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

function hasPublicCaseStudyEntry(dictionary: LocaleDictionary, contentId: string): boolean {
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

function hasPublicEvidence(caseStudy: LocalizedEntry["caseStudyContent"]): boolean {
  return Boolean(
    caseStudy?.publicEvidence?.some((evidence) => (
      evidence.publicSafe === true &&
      /^https?:\/\//.test(evidence.href)
    )),
  );
}

export function publicProjectIdsFromDictionaries(
  dictionaries: Record<Locale, LocaleDictionary>,
  candidateContentIds: readonly string[],
  publicMediaByContentId: ReadonlyMap<string, DashboardMediaMetadata> = new Map(),
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
  writeFileSync(generatedPublicProjectsFile, [
    "// Generated by scripts/apply-dashboard-published-content.ts.",
    "export const DASHBOARD_PUBLIC_PROJECT_IDS: readonly string[] = [",
    ...projectIds.map((projectId) => `  ${JSON.stringify(projectId)},`),
    "];",
    "",
  ].join("\n"));

  return projectIds.length;
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
  const publishedProjectContentIds: string[] = [];

  for (const draft of content.projectDrafts ?? []) {
    if (!draft.publishedAt) {
      continue;
    }

    publishedProjectContentIds.push(draft.contentId);

    if (applyProjectDraft(dictionaries[draft.locale], draft)) {
      appliedProjects += 1;
    }
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
  const publicMediaByContentId = publicMediaItemsByContentId(content.media ?? []);
  const publicProjectIds = publicProjectIdsFromDictionaries(
    dictionaries,
    publishedProjectContentIds,
    publicMediaByContentId,
  );
  const generatedPublicProjects = writeGeneratedPublicProjectIds(publicProjectIds);
  const appliedMedia = writeGeneratedPublicMedia(content.media ?? []);
  const appliedSettings = writeGeneratedPublicSettings(content.settings ?? []);

  console.log(`Applied ${appliedProjects} published project draft(s), ${appliedResumes} published resume draft(s), ${appliedMedia} media asset(s), ${appliedSettings} public setting(s), and ${generatedPublicProjects} generated public project id(s).`);
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
