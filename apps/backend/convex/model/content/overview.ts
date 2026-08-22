import { v, type ObjectType } from "convex/values";
import type { QueryCtx } from "../../_generated/server.js";
import { buildDashboardOverview } from "../../../src/dashboard-overview.js";
import {
  mediaStatusValidator,
  mediaStorageProviderValidator,
  mediaUsageValidator,
} from "./media.js";
import {
  caseStudyStatusValidator,
  evidenceStatusValidator,
  projectDraftValidator,
} from "./projects.js";
import {
  environmentValidator,
  localeValidator,
  publicMediaUrl,
  withinLimit,
} from "./shared.js";
import { settingClassificationValidator } from "./settings.js";

const overviewPathValidator = v.union(
  v.literal("/projects"),
  v.literal("/resume"),
  v.literal("/settings"),
);

const overviewGateStatusValidator = v.union(
  v.literal("clear"),
  v.literal("ready"),
  v.literal("blocked"),
  v.literal("unavailable"),
);

export const dashboardOverviewArgs = { environment: environmentValidator };

export const dashboardOverviewReturns = v.object({
  environment: environmentValidator,
  state: v.union(
    v.literal("clear"),
    v.literal("action-required"),
    v.literal("ready-to-queue"),
    v.literal("partial"),
  ),
  gates: v.array(
    v.object({
      id: v.union(
        v.literal("project-copy"),
        v.literal("evidence"),
        v.literal("resume"),
        v.literal("public-contact"),
        v.literal("release-provider"),
      ),
      label: v.string(),
      status: overviewGateStatusValidator,
      reason: v.string(),
      actionLabel: v.optional(v.string()),
      actionPath: v.optional(overviewPathValidator),
    }),
  ),
  blockers: v.array(
    v.object({
      code: v.union(
        v.literal("data-limit-reached"),
        v.literal("project-copy-incomplete"),
        v.literal("project-evidence-incomplete"),
        v.literal("resume-incomplete"),
        v.literal("public-contact-invalid"),
        v.literal("release-provider-unavailable"),
      ),
      title: v.string(),
      reason: v.string(),
      actionLabel: v.optional(v.string()),
      actionPath: v.optional(overviewPathValidator),
    }),
  ),
  nextAction: v.optional(
    v.object({
      label: v.string(),
      path: overviewPathValidator,
      reason: v.string(),
    }),
  ),
  release: v.object({
    providerState: v.union(v.literal("configured"), v.literal("unavailable")),
    workflowState: v.literal("not-requested"),
    deploymentState: v.literal("unknown"),
  }),
});

export const listForDashboardReturns = v.object({
  caseStudies: v.array(
    v.object({
      contentId: v.string(),
      status: caseStudyStatusValidator,
      evidenceStatus: evidenceStatusValidator,
      updatedAt: v.number(),
    }),
  ),
  projectDrafts: v.array(projectDraftValidator),
  resumeDrafts: v.array(
    v.object({
      locale: localeValidator,
      contentJson: v.string(),
      updatedAt: v.number(),
      publishedAt: v.optional(v.number()),
    }),
  ),
  media: v.array(
    v.object({
      id: v.id("mediaMetadata"),
      storageProvider: mediaStorageProviderValidator,
      storageKey: v.string(),
      publicUrl: v.optional(v.string()),
      altText: v.string(),
      contentId: v.optional(v.string()),
      usage: mediaUsageValidator,
      status: mediaStatusValidator,
      locale: v.optional(localeValidator),
      selectedForPublic: v.optional(v.boolean()),
      selectedForPublicAt: v.optional(v.number()),
      updatedAt: v.number(),
    }),
  ),
  settings: v.array(
    v.object({
      key: v.string(),
      environment: environmentValidator,
      value: v.string(),
      classification: settingClassificationValidator,
      updatedAt: v.number(),
    }),
  ),
  resumeVersions: v.array(
    v.object({
      id: v.id("resumeVersions"),
      locale: localeValidator,
      version: v.string(),
      pdfPath: v.string(),
      isPublished: v.boolean(),
      createdAt: v.number(),
      publishedAt: v.optional(v.number()),
    }),
  ),
});

export async function listForDashboardHandler(ctx: QueryCtx) {
  const [
    caseStudies,
    projectDrafts,
    resumeDrafts,
    media,
    settings,
    resumeVersions,
  ] = await Promise.all([
    ctx.db.query("caseStudyMetadata").take(101),
    ctx.db.query("projectDrafts").take(201),
    ctx.db.query("resumeDrafts").take(11),
    ctx.db.query("mediaMetadata").order("desc").take(101),
    ctx.db.query("siteSettings").order("desc").take(101),
    ctx.db.query("resumeVersions").order("desc").take(51),
  ]);

  return {
    caseStudies: withinLimit(caseStudies, 100, "Case study metadata").map(
      (item) => ({
        contentId: item.contentId,
        status: item.status,
        evidenceStatus: item.evidenceStatus,
        updatedAt: item.updatedAt,
      }),
    ),
    projectDrafts: withinLimit(projectDrafts, 200, "Project drafts").map(
      (item) => ({
        contentId: item.contentId,
        locale: item.locale,
        localizedSlug: item.localizedSlug,
        title: item.title,
        summary: item.summary,
        seoDescription: item.seoDescription,
        projectUrl: item.projectUrl,
        ctaLabel: item.ctaLabel,
        ctaHref: item.ctaHref,
        achievements: item.achievements,
        structureNotes: item.structureNotes,
        updatedAt: item.updatedAt,
        publishedAt: item.publishedAt,
      }),
    ),
    resumeDrafts: withinLimit(resumeDrafts, 10, "Resume drafts").map(
      (item) => ({
        locale: item.locale,
        contentJson: item.contentJson,
        updatedAt: item.updatedAt,
        publishedAt: item.publishedAt,
      }),
    ),
    media: withinLimit(media, 100, "Media metadata").map((item) => ({
      id: item._id,
      storageProvider: item.storageProvider,
      storageKey: item.storageKey,
      publicUrl: publicMediaUrl(item),
      altText: item.altText,
      contentId: item.contentId,
      usage: item.usage,
      status: item.status,
      locale: item.locale,
      selectedForPublic: item.selectedForPublic,
      selectedForPublicAt: item.selectedForPublicAt,
      updatedAt: item.updatedAt,
    })),
    settings: withinLimit(settings, 100, "Site settings").map((item) => ({
      key: item.key,
      environment: item.environment,
      value: item.value,
      classification: item.classification,
      updatedAt: item.updatedAt,
    })),
    resumeVersions: withinLimit(resumeVersions, 50, "Resume versions").map(
      (item) => ({
        id: item._id,
        locale: item.locale,
        version: item.version,
        pdfPath: item.pdfPath,
        isPublished: item.isPublished,
        createdAt: item.createdAt,
        publishedAt: item.publishedAt,
      }),
    ),
  };
}

export async function getDashboardOverviewHandler(
  ctx: QueryCtx,
  args: ObjectType<typeof dashboardOverviewArgs>,
) {
  const [
    caseStudies,
    projectDrafts,
    resumeDrafts,
    draftMedia,
    publishedMedia,
    settings,
  ] = await Promise.all([
    ctx.db.query("caseStudyMetadata").order("desc").take(101),
    ctx.db.query("projectDrafts").order("desc").take(201),
    ctx.db.query("resumeDrafts").order("desc").take(11),
    ctx.db
      .query("mediaMetadata")
      .withIndex("by_status_and_usage", (query) =>
        query.eq("status", "draft").eq("usage", "case-study"),
      )
      .order("desc")
      .take(101),
    ctx.db
      .query("mediaMetadata")
      .withIndex("by_status_and_usage", (query) =>
        query.eq("status", "published").eq("usage", "case-study"),
      )
      .order("desc")
      .take(101),
    ctx.db
      .query("siteSettings")
      .withIndex("by_environment_and_key", (query) =>
        query.eq("environment", args.environment),
      )
      .order("desc")
      .take(101),
  ]);

  return buildDashboardOverview({
    environment: args.environment,
    truncated:
      caseStudies.length > 100 ||
      projectDrafts.length > 200 ||
      resumeDrafts.length > 10 ||
      draftMedia.length > 100 ||
      publishedMedia.length > 100 ||
      settings.length > 100,
    caseStudies: caseStudies.slice(0, 100).map((item) => ({
      contentId: item.contentId,
      evidenceStatus: item.evidenceStatus,
    })),
    projectDrafts: projectDrafts.slice(0, 200).map((item) => ({
      contentId: item.contentId,
      locale: item.locale,
      title: item.title,
      summary: item.summary,
      seoDescription: item.seoDescription,
      ctaLabel: item.ctaLabel,
      ctaHref: item.ctaHref,
      achievements: item.achievements,
      structureNotes: item.structureNotes,
      publishedAt: item.publishedAt,
    })),
    media: [
      ...draftMedia.slice(0, 100).map((item) => ({
        contentId: item.contentId,
        status: "draft" as const,
        selectedForPublic: item.selectedForPublic,
      })),
      ...publishedMedia.slice(0, 100).map((item) => ({
        contentId: item.contentId,
        status: "published" as const,
        selectedForPublic: item.selectedForPublic,
      })),
    ],
    resumeDrafts: resumeDrafts.slice(0, 10).map((item) => ({
      locale: item.locale,
      contentJson: item.contentJson,
      publishedAt: item.publishedAt,
    })),
    settings: settings.slice(0, 100).map((item) => ({
      key: item.key,
      value: item.value,
      classification: item.classification,
    })),
    releaseProviderConfigured: Boolean(
      process.env.PUBLISH_GITHUB_TOKEN?.trim(),
    ),
  });
}
