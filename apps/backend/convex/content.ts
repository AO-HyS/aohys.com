import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server.js";

const localeValidator = v.union(v.literal("en"), v.literal("es"));

const environmentValidator = v.union(
  v.literal("local"),
  v.literal("preview"),
  v.literal("production"),
);

const caseStudyStatusValidator = v.union(
  v.literal("production-proof"),
  v.literal("active-build"),
  v.literal("private-build"),
  v.literal("enterprise-confidential"),
  v.literal("engineering-practice"),
);

const evidenceStatusValidator = v.union(
  v.literal("missing"),
  v.literal("sanitized"),
  v.literal("published"),
);

const mediaStorageProviderValidator = v.union(
  v.literal("cloudflare-images"),
  v.literal("cloudflare-r2"),
  v.literal("external"),
);

const mediaUsageValidator = v.union(
  v.literal("case-study"),
  v.literal("resume"),
  v.literal("architecture"),
  v.literal("site"),
);

const mediaStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

const settingClassificationValidator = v.union(
  v.literal("public-build-value"),
  v.literal("provider-output"),
  v.literal("policy-value"),
);

export const listForDashboard = internalQuery({
  args: {},
  returns: v.object({
    caseStudies: v.array(v.object({
      contentId: v.string(),
      status: caseStudyStatusValidator,
      evidenceStatus: evidenceStatusValidator,
      updatedAt: v.number(),
    })),
    projectDrafts: v.array(v.object({
      contentId: v.string(),
      locale: localeValidator,
      title: v.string(),
      summary: v.string(),
      seoDescription: v.string(),
      projectUrl: v.optional(v.string()),
      ctaLabel: v.string(),
      ctaHref: v.string(),
      achievements: v.string(),
      structureNotes: v.string(),
      updatedAt: v.number(),
    })),
    media: v.array(v.object({
      id: v.id("mediaMetadata"),
      storageProvider: mediaStorageProviderValidator,
      storageKey: v.string(),
      publicUrl: v.optional(v.string()),
      altText: v.string(),
      contentId: v.optional(v.string()),
      usage: mediaUsageValidator,
      status: mediaStatusValidator,
      locale: v.optional(localeValidator),
      updatedAt: v.number(),
    })),
    settings: v.array(v.object({
      key: v.string(),
      environment: environmentValidator,
      value: v.string(),
      classification: settingClassificationValidator,
      updatedAt: v.number(),
    })),
    resumeVersions: v.array(v.object({
      id: v.id("resumeVersions"),
      locale: localeValidator,
      version: v.string(),
      pdfPath: v.string(),
      isPublished: v.boolean(),
      createdAt: v.number(),
      publishedAt: v.optional(v.number()),
    })),
  }),
  handler: async (ctx) => {
    const [caseStudies, projectDrafts, media, settings, resumeVersions] = await Promise.all([
      ctx.db.query("caseStudyMetadata").collect(),
      ctx.db.query("projectDrafts").collect(),
      ctx.db.query("mediaMetadata").take(100),
      ctx.db.query("siteSettings").take(100),
      ctx.db.query("resumeVersions").take(50),
    ]);

    return {
      caseStudies: caseStudies.map((caseStudy) => ({
        contentId: caseStudy.contentId,
        status: caseStudy.status,
        evidenceStatus: caseStudy.evidenceStatus,
        updatedAt: caseStudy.updatedAt,
      })),
      projectDrafts: projectDrafts.map((projectDraft) => ({
        contentId: projectDraft.contentId,
        locale: projectDraft.locale,
        title: projectDraft.title,
        summary: projectDraft.summary,
        seoDescription: projectDraft.seoDescription,
        projectUrl: projectDraft.projectUrl,
        ctaLabel: projectDraft.ctaLabel,
        ctaHref: projectDraft.ctaHref,
        achievements: projectDraft.achievements,
        structureNotes: projectDraft.structureNotes,
        updatedAt: projectDraft.updatedAt,
      })),
      media: media.map((item) => ({
        id: item._id,
        storageProvider: item.storageProvider,
        storageKey: item.storageKey,
        publicUrl: item.publicUrl,
        altText: item.altText,
        contentId: item.contentId,
        usage: item.usage,
        status: item.status,
        locale: item.locale,
        updatedAt: item.updatedAt,
      })),
      settings: settings.map((setting) => ({
        key: setting.key,
        environment: setting.environment,
        value: setting.value,
        classification: setting.classification,
        updatedAt: setting.updatedAt,
      })),
      resumeVersions: resumeVersions.map((resumeVersion) => ({
        id: resumeVersion._id,
        locale: resumeVersion.locale,
        version: resumeVersion.version,
        pdfPath: resumeVersion.pdfPath,
        isPublished: resumeVersion.isPublished,
        createdAt: resumeVersion.createdAt,
        publishedAt: resumeVersion.publishedAt,
      })),
    };
  },
});

export const upsertProjectDraftFromDashboard = internalMutation({
  args: {
    contentId: v.string(),
    status: caseStudyStatusValidator,
    evidenceStatus: evidenceStatusValidator,
    locale: localeValidator,
    title: v.string(),
    summary: v.string(),
    seoDescription: v.string(),
    projectUrl: v.optional(v.string()),
    ctaLabel: v.string(),
    ctaHref: v.string(),
    achievements: v.string(),
    structureNotes: v.string(),
  },
  returns: v.object({
    contentId: v.string(),
    locale: localeValidator,
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const updatedAt = Date.now();
    const existingCaseStudy = await ctx.db
      .query("caseStudyMetadata")
      .withIndex("by_content_id", (query) => query.eq("contentId", args.contentId))
      .first();

    if (existingCaseStudy) {
      await ctx.db.patch(existingCaseStudy._id, {
        status: args.status,
        evidenceStatus: args.evidenceStatus,
        updatedAt,
      });
    } else {
      await ctx.db.insert("caseStudyMetadata", {
        contentId: args.contentId,
        status: args.status,
        evidenceStatus: args.evidenceStatus,
        updatedAt,
      });
    }

    const existingProjectDraft = await ctx.db
      .query("projectDrafts")
      .withIndex("by_content_id_and_locale", (query) =>
        query.eq("contentId", args.contentId).eq("locale", args.locale),
      )
      .first();
    const projectDraft = {
      contentId: args.contentId,
      locale: args.locale,
      title: args.title,
      summary: args.summary,
      seoDescription: args.seoDescription,
      projectUrl: args.projectUrl,
      ctaLabel: args.ctaLabel,
      ctaHref: args.ctaHref,
      achievements: args.achievements,
      structureNotes: args.structureNotes,
      updatedAt,
    };

    if (existingProjectDraft) {
      await ctx.db.patch(existingProjectDraft._id, projectDraft);
    } else {
      await ctx.db.insert("projectDrafts", projectDraft);
    }

    return {
      contentId: args.contentId,
      locale: args.locale,
      updatedAt,
    };
  },
});

export const upsertCaseStudyMetadataFromDashboard = internalMutation({
  args: {
    contentId: v.string(),
    status: caseStudyStatusValidator,
    evidenceStatus: evidenceStatusValidator,
  },
  returns: v.object({
    contentId: v.string(),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const updatedAt = Date.now();
    const existing = await ctx.db
      .query("caseStudyMetadata")
      .withIndex("by_content_id", (query) => query.eq("contentId", args.contentId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        evidenceStatus: args.evidenceStatus,
        updatedAt,
      });
    } else {
      await ctx.db.insert("caseStudyMetadata", {
        ...args,
        updatedAt,
      });
    }

    return {
      contentId: args.contentId,
      updatedAt,
    };
  },
});

export const createMediaMetadataFromDashboard = internalMutation({
  args: {
    storageProvider: mediaStorageProviderValidator,
    storageKey: v.string(),
    publicUrl: v.optional(v.string()),
    altText: v.string(),
    contentId: v.optional(v.string()),
    usage: mediaUsageValidator,
    status: mediaStatusValidator,
    locale: v.optional(localeValidator),
  },
  returns: v.object({
    mediaId: v.id("mediaMetadata"),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const mediaId = await ctx.db.insert("mediaMetadata", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return {
      mediaId,
      updatedAt: now,
    };
  },
});

export const upsertSiteSettingFromDashboard = internalMutation({
  args: {
    key: v.string(),
    environment: environmentValidator,
    value: v.string(),
    classification: settingClassificationValidator,
  },
  returns: v.object({
    key: v.string(),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const updatedAt = Date.now();
    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_environment_and_key", (query) =>
        query.eq("environment", args.environment).eq("key", args.key),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        classification: args.classification,
        updatedAt,
      });
    } else {
      await ctx.db.insert("siteSettings", {
        ...args,
        updatedAt,
      });
    }

    return {
      key: args.key,
      updatedAt,
    };
  },
});

export const createResumeVersionFromDashboard = internalMutation({
  args: {
    locale: localeValidator,
    version: v.string(),
    pdfPath: v.string(),
    isPublished: v.boolean(),
  },
  returns: v.object({
    resumeVersionId: v.id("resumeVersions"),
    publishedAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const publishedAt = args.isPublished ? now : undefined;

    if (args.isPublished) {
      const publishedVersions = await ctx.db
        .query("resumeVersions")
        .withIndex("by_locale_and_published", (query) =>
          query.eq("locale", args.locale).eq("isPublished", true),
        )
        .collect();

      await Promise.all(publishedVersions.map((resumeVersion) =>
        ctx.db.patch(resumeVersion._id, {
          isPublished: false,
          publishedAt: undefined,
        }),
      ));
    }

    const resumeVersionId = await ctx.db.insert("resumeVersions", {
      locale: args.locale,
      version: args.version,
      pdfPath: args.pdfPath,
      isPublished: args.isPublished,
      createdAt: now,
      publishedAt,
    });

    return {
      resumeVersionId,
      publishedAt,
    };
  },
});
