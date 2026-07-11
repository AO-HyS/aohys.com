import { normalizePublicWhatsappUrl, resolvePublicMediaUrl, selectPublicationMedia } from "@aohys/core";
import { v, type ObjectType } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server.js";
import { requireAdmin } from "./auth.js";
import { buildDashboardOverview } from "../src/dashboard-overview.js";
import { localizedCaseStudyPath, requireCaseStudyContentId, requireSafeProjectKey, requireUnreservedStaticSlug } from "../src/project-identity.js";

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

const writableMediaStorageProviderValidator = v.union(
  v.literal("cloudflare-images"),
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

const dashboardOverviewReturns = v.object({
  environment: environmentValidator,
  state: v.union(
    v.literal("clear"),
    v.literal("action-required"),
    v.literal("ready-to-queue"),
    v.literal("partial"),
  ),
  gates: v.array(v.object({
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
  })),
  blockers: v.array(v.object({
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
  })),
  nextAction: v.optional(v.object({
    label: v.string(),
    path: overviewPathValidator,
    reason: v.string(),
  })),
  release: v.object({
    providerState: v.union(v.literal("configured"), v.literal("unavailable")),
    workflowState: v.literal("not-requested"),
    deploymentState: v.literal("unknown"),
  }),
});

const listForDashboardReturns = v.object({
  caseStudies: v.array(v.object({
    contentId: v.string(),
    status: caseStudyStatusValidator,
    evidenceStatus: evidenceStatusValidator,
    updatedAt: v.number(),
  })),
  projectDrafts: v.array(v.object({
    contentId: v.string(),
    locale: localeValidator,
    localizedSlug: v.optional(v.string()),
    title: v.string(),
    summary: v.string(),
    seoDescription: v.string(),
    projectUrl: v.optional(v.string()),
    ctaLabel: v.string(),
    ctaHref: v.string(),
    achievements: v.string(),
    structureNotes: v.string(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })),
  resumeDrafts: v.array(v.object({
    locale: localeValidator,
    contentJson: v.string(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
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
    selectedForPublic: v.optional(v.boolean()),
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
});

const upsertProjectDraftArgs = {
  contentId: v.string(),
  status: caseStudyStatusValidator,
  evidenceStatus: evidenceStatusValidator,
  locale: localeValidator,
  localizedSlug: v.optional(v.string()),
  title: v.string(),
  summary: v.string(),
  seoDescription: v.string(),
  projectUrl: v.optional(v.string()),
  ctaLabel: v.string(),
  ctaHref: v.string(),
  achievements: v.string(),
  structureNotes: v.string(),
};

const localizedProjectDraftArgs = {
  localizedSlug: v.string(),
  title: v.string(),
  summary: v.string(),
  seoDescription: v.string(),
  projectUrl: v.optional(v.string()),
  ctaLabel: v.string(),
  achievements: v.string(),
  structureNotes: v.string(),
};

async function requireAvailableLocalizedSlug(
  ctx: MutationCtx,
  contentId: string,
  locale: "en" | "es",
  localizedSlug: string,
): Promise<void> {
  requireUnreservedStaticSlug(contentId, locale, localizedSlug);
  const existingDraft = await ctx.db
    .query("projectDrafts")
    .withIndex("by_locale_and_localized_slug", (query) =>
      query.eq("locale", locale).eq("localizedSlug", localizedSlug),
    )
    .first();
  if (existingDraft && existingDraft.contentId !== contentId) {
    throw new Error(`The ${locale.toUpperCase()} localized slug already belongs to another project.`);
  }

  const legacyContentId = `case-study:${localizedSlug}`;
  if (legacyContentId !== contentId) {
    const legacyMetadata = await ctx.db
      .query("caseStudyMetadata")
      .withIndex("by_content_id", (query) => query.eq("contentId", legacyContentId))
      .first();
    if (legacyMetadata) {
      throw new Error(`The ${locale.toUpperCase()} localized slug collides with an existing legacy project route.`);
    }
  }
}

const createProjectArgs = {
  contentKey: v.string(),
  status: caseStudyStatusValidator,
  evidenceStatus: evidenceStatusValidator,
  en: v.object(localizedProjectDraftArgs),
  es: v.object(localizedProjectDraftArgs),
};

const upsertProjectDraftReturns = v.object({
  contentId: v.string(),
  locale: localeValidator,
  updatedAt: v.number(),
});

const upsertSiteSettingArgs = {
  key: v.string(),
  environment: environmentValidator,
  value: v.string(),
  classification: settingClassificationValidator,
};

const upsertSiteSettingReturns = v.object({
  key: v.string(),
  updatedAt: v.number(),
});

function withinLimit<T>(rows: T[], limit: number, label: string): T[] {
  if (rows.length > limit) {
    throw new Error(`${label} exceeds the safe dashboard operation limit.`);
  }

  return rows;
}

async function listForDashboardHandler(ctx: QueryCtx) {
  const [caseStudies, projectDrafts, resumeDrafts, media, settings, resumeVersions] = await Promise.all([
    ctx.db.query("caseStudyMetadata").take(101),
    ctx.db.query("projectDrafts").take(201),
    ctx.db.query("resumeDrafts").take(11),
    ctx.db.query("mediaMetadata").order("desc").take(100),
    ctx.db.query("siteSettings").order("desc").take(100),
    ctx.db.query("resumeVersions").order("desc").take(50),
  ]);

  return {
    caseStudies: withinLimit(caseStudies, 100, "Case study metadata").map((caseStudy) => ({
      contentId: caseStudy.contentId,
      status: caseStudy.status,
      evidenceStatus: caseStudy.evidenceStatus,
      updatedAt: caseStudy.updatedAt,
    })),
    projectDrafts: withinLimit(projectDrafts, 200, "Project drafts").map((projectDraft) => ({
      contentId: projectDraft.contentId,
      locale: projectDraft.locale,
      localizedSlug: projectDraft.localizedSlug,
      title: projectDraft.title,
      summary: projectDraft.summary,
      seoDescription: projectDraft.seoDescription,
      projectUrl: projectDraft.projectUrl,
      ctaLabel: projectDraft.ctaLabel,
      ctaHref: projectDraft.ctaHref,
      achievements: projectDraft.achievements,
      structureNotes: projectDraft.structureNotes,
      updatedAt: projectDraft.updatedAt,
      publishedAt: projectDraft.publishedAt,
    })),
    resumeDrafts: withinLimit(resumeDrafts, 10, "Resume drafts").map((resumeDraft) => ({
      locale: resumeDraft.locale,
      contentJson: resumeDraft.contentJson,
      updatedAt: resumeDraft.updatedAt,
      publishedAt: resumeDraft.publishedAt,
    })),
    media: media.map((item) => ({
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
}

export const getDashboardOverview = query({
  args: {
    environment: environmentValidator,
  },
  returns: dashboardOverviewReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const [caseStudies, projectDrafts, resumeDrafts, draftMedia, publishedMedia, settings] = await Promise.all([
      ctx.db.query("caseStudyMetadata").order("desc").take(101),
      ctx.db.query("projectDrafts").order("desc").take(201),
      ctx.db.query("resumeDrafts").order("desc").take(11),
      ctx.db
        .query("mediaMetadata")
        .withIndex("by_status_and_usage", (query) =>
          query.eq("status", "draft").eq("usage", "case-study")
        )
        .order("desc")
        .take(101),
      ctx.db
        .query("mediaMetadata")
        .withIndex("by_status_and_usage", (query) =>
          query.eq("status", "published").eq("usage", "case-study")
        )
        .order("desc")
        .take(101),
      ctx.db
        .query("siteSettings")
        .withIndex("by_environment_and_key", (query) => query.eq("environment", args.environment))
        .order("desc")
        .take(101),
    ]);

    return buildDashboardOverview({
      environment: args.environment,
      truncated: caseStudies.length > 100
        || projectDrafts.length > 200
        || resumeDrafts.length > 10
        || draftMedia.length > 100
        || publishedMedia.length > 100
        || settings.length > 100,
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
      releaseProviderConfigured: Boolean(process.env.PUBLISH_GITHUB_TOKEN?.trim()),
    });
  },
});

function publicMediaUrl(
  media: {
    storageProvider: "cloudflare-images" | "cloudflare-r2" | "external";
    storageKey: string;
    publicUrl?: string;
  },
): string | undefined {
  const resolution = resolvePublicMediaUrl(media, {
    cloudflareImagesAccountHash: process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH,
  });
  return resolution.status === "resolved" ? resolution.url : undefined;
}

async function upsertProjectDraftHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof upsertProjectDraftArgs>,
) {
  requireCaseStudyContentId(args.contentId);
  if (args.localizedSlug !== undefined) requireSafeProjectKey(args.localizedSlug, "Localized slug");
  if (args.localizedSlug !== undefined) {
    await requireAvailableLocalizedSlug(ctx, args.contentId, args.locale, args.localizedSlug);
  }
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
    localizedSlug: args.localizedSlug,
    title: args.title,
    summary: args.summary,
    seoDescription: args.seoDescription,
    projectUrl: args.projectUrl,
    ctaLabel: args.ctaLabel,
    ctaHref: args.ctaHref,
    achievements: args.achievements,
    structureNotes: args.structureNotes,
    updatedAt,
    publishedAt: undefined,
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
}

async function upsertSiteSettingHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof upsertSiteSettingArgs>,
) {
  const normalizedValue = args.key === "PUBLIC_WHATSAPP_URL"
    ? normalizePublicWhatsappUrl(args.value)
    : undefined;

  if (args.key !== "PUBLIC_WHATSAPP_URL" || !normalizedValue) {
    throw new Error("Only a valid direct PUBLIC_WHATSAPP_URL setting can be saved here.");
  }

  const updatedAt = Date.now();
  const existing = await ctx.db
    .query("siteSettings")
    .withIndex("by_environment_and_key", (query) =>
      query.eq("environment", args.environment).eq("key", args.key),
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      value: normalizedValue,
      classification: args.classification,
      updatedAt,
    });
  } else {
    await ctx.db.insert("siteSettings", {
      ...args,
      value: normalizedValue,
      updatedAt,
    });
  }

  return {
    key: args.key,
    updatedAt,
  };
}

export const listForDashboard = query({
  args: {},
  returns: listForDashboardReturns,
  handler: async (ctx) => {
    await requireAdmin(ctx);

    return listForDashboardHandler(ctx);
  },
});

export const listForDashboardInternal = internalQuery({
  args: {},
  returns: listForDashboardReturns,
  handler: async (ctx) => listForDashboardHandler(ctx),
});

export const upsertProjectDraft = mutation({
  args: upsertProjectDraftArgs,
  returns: upsertProjectDraftReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    return upsertProjectDraftHandler(ctx, args);
  },
});

export const createProject = mutation({
  args: createProjectArgs,
  returns: v.object({ contentId: v.string(), updatedAt: v.number() }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    requireSafeProjectKey(args.contentKey, "Content key");
    requireSafeProjectKey(args.en.localizedSlug, "English slug");
    requireSafeProjectKey(args.es.localizedSlug, "Spanish slug");

    const contentId = `case-study:${args.contentKey}`;
    const [metadataRows, draftRows] = await Promise.all([
      ctx.db.query("caseStudyMetadata").withIndex("by_content_id", (query) => query.eq("contentId", contentId)).take(2),
      ctx.db.query("projectDrafts").withIndex("by_content_id", (query) => query.eq("contentId", contentId)).take(3),
    ]);
    if (metadataRows.length > 0 || draftRows.length > 0) {
      throw new Error("A project with this content key already exists.");
    }
    await requireAvailableLocalizedSlug(ctx, contentId, "en", args.en.localizedSlug);
    await requireAvailableLocalizedSlug(ctx, contentId, "es", args.es.localizedSlug);

    const updatedAt = Date.now();
    await ctx.db.insert("caseStudyMetadata", {
      contentId,
      status: args.status,
      evidenceStatus: args.evidenceStatus,
      updatedAt,
    });
    for (const locale of ["en", "es"] as const) {
      await ctx.db.insert("projectDrafts", {
        contentId,
        locale,
        ...args[locale],
        ctaHref: localizedCaseStudyPath(locale, args[locale].localizedSlug),
        updatedAt,
      });
    }
    return { contentId, updatedAt };
  },
});

export const upsertProjectDraftFromDashboard = internalMutation({
  args: upsertProjectDraftArgs,
  returns: upsertProjectDraftReturns,
  handler: async (ctx, args) => upsertProjectDraftHandler(ctx, args),
});

export const upsertResumeDraft = mutation({
  args: {
    locale: localeValidator,
    contentJson: v.string(),
  },
  returns: v.object({
    locale: localeValidator,
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const updatedAt = Date.now();
    const existingResumeDraft = await ctx.db
      .query("resumeDrafts")
      .withIndex("by_locale", (query) => query.eq("locale", args.locale))
      .first();

    if (existingResumeDraft) {
      await ctx.db.patch(existingResumeDraft._id, {
        contentJson: args.contentJson,
        updatedAt,
        publishedAt: undefined,
      });
    } else {
      await ctx.db.insert("resumeDrafts", {
        locale: args.locale,
        contentJson: args.contentJson,
        updatedAt,
      });
    }

    return {
      locale: args.locale,
      updatedAt,
    };
  },
});

export const publishContentFromDashboard = internalMutation({
  args: {
    scope: v.union(v.literal("project"), v.literal("resume"), v.literal("all")),
    contentId: v.optional(v.string()),
    locale: v.optional(localeValidator),
  },
  returns: v.object({
    publishedAt: v.number(),
    projectDraftsPublished: v.number(),
    resumeDraftsPublished: v.number(),
    mediaPublished: v.number(),
  }),
  handler: async (ctx, args) => {
    const publishedAt = Date.now();
    let projectDraftsPublished = 0;
    let resumeDraftsPublished = 0;
    let mediaPublished = 0;

    if (args.scope === "project" || args.scope === "all") {
      const projectDrafts = args.contentId
        ? await ctx.db
          .query("projectDrafts")
          .withIndex("by_content_id", (query) => query.eq("contentId", args.contentId ?? ""))
          .take(3)
        : await ctx.db.query("projectDrafts").take(201);
      const boundedProjectDrafts = withinLimit(
        projectDrafts,
        args.contentId ? 2 : 200,
        "Project publication drafts",
      );

      await Promise.all(boundedProjectDrafts.map((projectDraft) =>
        ctx.db.patch(projectDraft._id, { publishedAt }),
      ));
      projectDraftsPublished = boundedProjectDrafts.length;

      const mediaRows = args.contentId
        ? await ctx.db
          .query("mediaMetadata")
          .withIndex("by_content_id_and_usage", (query) => query.eq("contentId", args.contentId))
          .take(101)
        : await ctx.db.query("mediaMetadata").take(501);
      const boundedMediaRows = withinLimit(
        mediaRows,
        args.contentId ? 100 : 500,
        "Publication media",
      );
      const publicationDecision = selectPublicationMedia(
        boundedMediaRows.map((media) => ({ ...media, id: media._id })),
        "publication-request",
      );
      const publishableMediaRows = publicationDecision.selected;

      await Promise.all(publishableMediaRows.map((media) =>
        ctx.db.patch(media._id, {
          status: "published",
          updatedAt: publishedAt,
        }),
      ));
      await Promise.all(publicationDecision.displaced.map((media) =>
        ctx.db.patch(media._id, {
          status: "draft",
          updatedAt: publishedAt,
        }),
      ));
      mediaPublished = publishableMediaRows.length;
    }

    if (args.scope === "resume" || args.scope === "all") {
      const resumeDrafts = args.locale
        ? await ctx.db
          .query("resumeDrafts")
          .withIndex("by_locale", (query) => query.eq("locale", args.locale ?? "en"))
          .take(2)
        : await ctx.db.query("resumeDrafts").take(11);
      const boundedResumeDrafts = withinLimit(
        resumeDrafts,
        args.locale ? 1 : 10,
        "Resume publication drafts",
      );

      await Promise.all(boundedResumeDrafts.map((resumeDraft) =>
        ctx.db.patch(resumeDraft._id, { publishedAt }),
      ));
      resumeDraftsPublished = boundedResumeDrafts.length;
    }

    return {
      publishedAt,
      projectDraftsPublished,
      resumeDraftsPublished,
      mediaPublished,
    };
  },
});

export const createMediaMetadata = mutation({
  args: {
    storageProvider: writableMediaStorageProviderValidator,
    storageKey: v.string(),
    publicUrl: v.optional(v.string()),
    altText: v.string(),
    contentId: v.optional(v.string()),
    usage: mediaUsageValidator,
    status: mediaStatusValidator,
    locale: v.optional(localeValidator),
    selectedForPublic: v.optional(v.boolean()),
  },
  returns: v.object({
    mediaId: v.id("mediaMetadata"),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();
    if (args.selectedForPublic && args.contentId) {
      const siblingMedia = await ctx.db
        .query("mediaMetadata")
        .withIndex("by_content_id_and_usage", (query) => query.eq("contentId", args.contentId))
        .take(101);
      withinLimit(siblingMedia, 100, "Project media selection");

      await Promise.all(siblingMedia
        .map((item) => ctx.db.patch(item._id, {
          selectedForPublic: false,
          updatedAt: now,
        })));
    }

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

export const selectMediaForPublic = mutation({
  args: {
    mediaId: v.id("mediaMetadata"),
    contentId: v.string(),
  },
  returns: v.object({
    mediaId: v.id("mediaMetadata"),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const selectedMedia = await ctx.db.get(args.mediaId);

    if (!selectedMedia || selectedMedia.contentId !== args.contentId) {
      throw new Error("Selected media does not belong to this project.");
    }

    const siblingMedia = await ctx.db
      .query("mediaMetadata")
      .withIndex("by_content_id_and_usage", (query) => query.eq("contentId", args.contentId))
      .take(101);
    withinLimit(siblingMedia, 100, "Project media selection");

    await Promise.all(siblingMedia
      .filter((item) => item._id !== args.mediaId)
      .map((item) => ctx.db.patch(item._id, {
        selectedForPublic: false,
        updatedAt: now,
      })));

    await ctx.db.patch(args.mediaId, {
      selectedForPublic: true,
      status: selectedMedia.status === "archived" ? "draft" : selectedMedia.status,
      updatedAt: now,
    });

    return {
      mediaId: args.mediaId,
      updatedAt: now,
    };
  },
});

export const archiveMedia = mutation({
  args: {
    mediaId: v.id("mediaMetadata"),
    contentId: v.string(),
  },
  returns: v.object({
    mediaId: v.id("mediaMetadata"),
    updatedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const media = await ctx.db.get(args.mediaId);

    if (!media || media.contentId !== args.contentId) {
      throw new Error("Selected media does not belong to this project.");
    }

    await ctx.db.patch(args.mediaId, {
      selectedForPublic: false,
      status: "archived",
      updatedAt: now,
    });

    return {
      mediaId: args.mediaId,
      updatedAt: now,
    };
  },
});

export const deleteMedia = mutation({
  args: {
    mediaId: v.id("mediaMetadata"),
    contentId: v.string(),
  },
  returns: v.object({
    mediaId: v.id("mediaMetadata"),
    deletedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const media = await ctx.db.get(args.mediaId);

    if (!media || media.contentId !== args.contentId) {
      throw new Error("Selected media does not belong to this project.");
    }

    await ctx.db.delete(args.mediaId);

    return {
      mediaId: args.mediaId,
      deletedAt: Date.now(),
    };
  },
});

export const upsertSiteSetting = mutation({
  args: upsertSiteSettingArgs,
  returns: upsertSiteSettingReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    return upsertSiteSettingHandler(ctx, args);
  },
});

export const upsertSiteSettingFromDashboard = internalMutation({
  args: upsertSiteSettingArgs,
  returns: upsertSiteSettingReturns,
  handler: async (ctx, args) => upsertSiteSettingHandler(ctx, args),
});

export const createResumeVersion = mutation({
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
    await requireAdmin(ctx);

    const now = Date.now();
    const publishedAt = args.isPublished ? now : undefined;

    if (args.isPublished) {
      const publishedVersions = await ctx.db
        .query("resumeVersions")
        .withIndex("by_locale_and_published", (query) =>
          query.eq("locale", args.locale).eq("isPublished", true),
        )
        .take(51);
      withinLimit(publishedVersions, 50, "Published resume versions");

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
