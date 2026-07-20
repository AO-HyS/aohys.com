import { api as convexApi } from "@aohys/backend/convex/_generated/api";
import {
  PUBLIC_CONTENT_NODES,
  STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID,
  getCaseStudyPageContent,
  getLocaleVariant,
  getResumePageContent,
} from "@aohys/content-graph";
import type { FunctionReturnType } from "convex/server";
import type {
  DashboardContentPayload,
  DashboardMediaMetadata,
  DashboardProject,
  DashboardProjectDraft,
  DashboardProjectImage,
  DashboardResumeContent,
} from "@/types";
import { resolvePublicMediaUrl } from "@/lib/media-upload";

export type DashboardConvexContentPayload = FunctionReturnType<typeof convexApi.content.listForDashboard>;

type DashboardCaseStudyMetadata = Pick<
  DashboardProject,
  "contentId" | "status" | "evidenceStatus" | "updatedAt"
>;

export function resolveProjectMediaPreview(images: DashboardProjectImage[]) {
  const mediaImages = images.filter((image) => image.source === "media-metadata");
  const selectedImageCandidate = mediaImages.find(
    (image) => image.selectedForPublic && image.status !== "archived",
  );
  const selectedImageNeedsReview = Boolean(selectedImageCandidate && !selectedImageCandidate.selectedForPublicAt);
  const selectedImage = selectedImageNeedsReview ? undefined : selectedImageCandidate;
  const contentGraphImage = images.find((image) => image.source === "content-graph");
  const fallbackImage = selectedImage
    ? undefined
    : selectedImageNeedsReview
      ? contentGraphImage
        ?? mediaImages.find((image) => image.status === "published" && image !== selectedImageCandidate)
        ?? mediaImages.find((image) => image.status !== "archived" && image !== selectedImageCandidate)
      : mediaImages.find((image) => image.status === "published")
        ?? mediaImages.find((image) => image.status !== "archived")
        ?? contentGraphImage;

  return {
    previewImage: selectedImage ?? fallbackImage,
    selectedImage,
    selectedImageCandidate,
    selectedImageNeedsReview,
  };
}

export function buildDashboardContentPayload(
  content: DashboardConvexContentPayload,
  imagesAccountHash?: string,
): DashboardContentPayload {
  const media = content.media ?? [];

  return {
    projects: buildDashboardProjectRows(content, media, imagesAccountHash),
    media,
    settings: content.settings ?? [],
    resumeContent: {
      en: getResumePageContent("en") as DashboardResumeContent,
      es: getResumePageContent("es") as DashboardResumeContent,
    },
    resumeDrafts: content.resumeDrafts ?? [],
    resumeVersions: content.resumeVersions ?? [],
  };
}

function buildDashboardProjectRows(
  content: DashboardConvexContentPayload,
  mediaRows: DashboardMediaMetadata[],
  imagesAccountHash?: string,
): DashboardProject[] {
  const caseStudyRows = buildDashboardCaseStudyRows(content.caseStudies ?? []);
  const metadataByContentId = new Map<string, DashboardCaseStudyMetadata>();

  for (const row of caseStudyRows) {
    metadataByContentId.set(row.contentId, row);
  }

  for (const row of content.caseStudies ?? []) {
    metadataByContentId.set(row.contentId, row);
  }

  const draftsByContentIdAndLocale = new Map(
    (content.projectDrafts ?? []).map((draft) => [`${draft.contentId}:${draft.locale}`, draft]),
  );
  const staticCaseStudyNodes = PUBLIC_CONTENT_NODES.filter((node) => node.type === "case-study");
  const staticContentIds = staticCaseStudyNodes.map((node) => node.id);
  const activeMediaRows = mediaRows.filter((item) => item.status !== "archived");
  const dynamicContentIds = [
    ...(content.caseStudies ?? []).map((row) => row.contentId),
    ...(content.projectDrafts ?? []).map((draft) => draft.contentId),
    ...activeMediaRows.map((item) => item.contentId).filter((contentId): contentId is string => Boolean(contentId)),
  ].filter((contentId) => isCaseStudyContentId(contentId));
  const projectContentIds = unique([...staticContentIds, ...dynamicContentIds]);

  return projectContentIds.map((contentId) => {
    const node = staticCaseStudyNodes.find((item) => item.id === contentId);
    const metadata = metadataByContentId.get(contentId);
    const englishDraft = draftsByContentIdAndLocale.get(`${contentId}:en`);
    const spanishDraft = draftsByContentIdAndLocale.get(`${contentId}:es`);
    const englishVariant = node
      ? getLocaleVariant(node, "en")
      : fallbackProjectVariant(contentId, "en", englishDraft);
    const spanishVariant = node
      ? getLocaleVariant(node, "es")
      : fallbackProjectVariant(contentId, "es", spanishDraft ?? englishDraft);
    const publicEvidence = node ? getCaseStudyPageContent(node.id, "en")?.publicEvidence ?? [] : [];
    const staticEvidenceImage = STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID[contentId];
    const media = activeMediaRows.filter((item) => item.contentId === contentId);
    const firstProjectUrl = publicEvidence.find((item) => isHttpUrl(item.href))?.href;
    const firstDraftUrl = (content.projectDrafts ?? [])
      .find((draft) => draft.contentId === contentId && draft.projectUrl)?.projectUrl;

    return {
      contentId,
      title: englishVariant.title,
      englishPath: englishVariant.path,
      spanishPath: spanishVariant.path,
      sitemapIncluded: node ? node.status === "published" && node.sitemap.include : true,
      status: metadata?.status ?? "active-build",
      evidenceStatus: metadata?.evidenceStatus ?? "missing",
      projectUrl: firstDraftUrl ?? firstProjectUrl,
      updatedAt: metadata?.updatedAt ?? 0,
      locales: (["en", "es"] as const).map((locale) => {
        const draft = draftsByContentIdAndLocale.get(`${contentId}:${locale}`);
        const oppositeDraft = draftsByContentIdAndLocale.get(`${contentId}:${locale === "en" ? "es" : "en"}`);
        const variant = node
          ? getLocaleVariant(node, locale)
          : fallbackProjectVariant(contentId, locale, draft ?? oppositeDraft);
        const pageContent = node ? getCaseStudyPageContent(node.id, locale) : undefined;

        return {
          locale,
          path: variant.path,
          title: variant.title,
          summary: variant.summary,
          seoDescription: variant.seoDescription,
          ctaLabel: variant.primaryActionLabel ?? "Contact",
          ctaHref: variant.primaryActionContentId
            ? getLocaleVariant(variant.primaryActionContentId, locale).path
            : variant.path,
          overview: pageContent?.overview ?? variant.summary,
          achievements: [
            pageContent?.businessOutcome.body,
            pageContent?.executionHighlights.body,
          ].filter(Boolean).join("\n\n") || variant.summary,
          structureNotes: [
            pageContent?.architectureDecisions.body,
            pageContent?.qualitySecurityPerformance.body,
          ].filter(Boolean).join("\n\n") || variant.summary,
          draft,
        };
      }),
      images: [
        ...publicEvidence.map((asset, index) => ({
          label: asset.label,
          altText: asset.altText,
          source: "content-graph" as const,
          href: asset.href,
          src: isImageHref(asset.href)
            ? asset.href
            : index === 0
              ? staticEvidenceImage?.thumbSrc ?? staticEvidenceImage?.src
              : undefined,
        })),
        ...media.map((item) => {
          const resolution = resolvePublicMediaUrl(item, {
            cloudflareImagesAccountHash: imagesAccountHash,
          });
          const deliveryUrl = resolution.status === "resolved" ? resolution.url : undefined;

          return {
            id: item.id,
            label: item.storageKey,
            altText: item.altText,
            source: "media-metadata" as const,
            href: deliveryUrl,
            src: deliveryUrl,
            previewStatus: resolution.status === "resolved"
              ? "ready" as const
              : resolution.status === "invalid"
                ? "invalid-reference" as const
                : resolution.status,
            previewIssue: resolution.status === "resolved" ? undefined : resolution.reason,
            storageKey: item.storageKey,
            status: item.status,
            usage: item.usage,
            selectedForPublic: item.selectedForPublic,
            selectedForPublicAt: item.selectedForPublicAt,
          };
        }),
      ],
    };
  });
}

function buildDashboardCaseStudyRows(
  metadataRows: DashboardConvexContentPayload["caseStudies"],
): Array<DashboardCaseStudyMetadata & Pick<DashboardProject, "title" | "englishPath" | "spanishPath" | "sitemapIncluded">> {
  const metadataByContentId = new Map(metadataRows.map((row) => [row.contentId, row]));

  return PUBLIC_CONTENT_NODES
    .filter((node) => node.type === "case-study")
    .map((node) => {
      const englishVariant = getLocaleVariant(node, "en");
      const spanishVariant = getLocaleVariant(node, "es");
      const metadata = metadataByContentId.get(node.id);

      return {
        contentId: node.id,
        title: englishVariant.title,
        englishPath: englishVariant.path,
        spanishPath: spanishVariant.path,
        sitemapIncluded: node.status === "published" && node.sitemap.include,
        status: metadata?.status ?? "active-build",
        evidenceStatus: metadata?.evidenceStatus ?? "missing",
        updatedAt: metadata?.updatedAt ?? 0,
      };
    });
}

function fallbackProjectVariant(
  contentId: string,
  locale: "en" | "es",
  draft?: DashboardProjectDraft,
): {
  path: string;
  title: string;
  summary: string;
  seoDescription: string;
  primaryActionLabel?: string;
  primaryActionContentId?: string;
} {
  const slug = draft?.localizedSlug ?? slugFromContentId(contentId);
  const fallbackTitle = titleFromSlug(slug);
  const fallbackSummary = locale === "es"
    ? "Borrador de caso publico creado desde el dashboard."
    : "Public case-study draft created from the dashboard.";

  return {
    path: locale === "es" ? `/es/casos/${slug}` : `/case-studies/${slug}`,
    title: draft?.title ?? fallbackTitle,
    summary: draft?.summary ?? fallbackSummary,
    seoDescription: draft?.seoDescription ?? draft?.summary ?? fallbackSummary,
    primaryActionLabel: draft?.ctaLabel ?? (locale === "es" ? "Hablemos" : "Let's talk"),
    primaryActionContentId: "contact",
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isCaseStudyContentId(value: string | undefined): value is string {
  return Boolean(value && /^case-study:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value));
}

function slugFromContentId(contentId: string): string {
  return contentId.replace(/^case-study:/, "");
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isImageHref(value: string): boolean {
  return /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value);
}
