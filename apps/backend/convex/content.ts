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
  title: v.string(),
  summary: v.string(),
  seoDescription: v.string(),
  projectUrl: v.optional(v.string()),
  ctaLabel: v.string(),
  ctaHref: v.string(),
  achievements: v.string(),
  structureNotes: v.string(),
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

async function listForDashboardHandler(ctx: QueryCtx) {
  const [caseStudies, projectDrafts, resumeDrafts, media, settings, resumeVersions] = await Promise.all([
    ctx.db.query("caseStudyMetadata").collect(),
    ctx.db.query("projectDrafts").collect(),
    ctx.db.query("resumeDrafts").collect(),
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
      publishedAt: projectDraft.publishedAt,
    })),
    resumeDrafts: resumeDrafts.map((resumeDraft) => ({
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

function publicMediaUrl(
  media: {
    storageProvider: "cloudflare-images" | "cloudflare-r2" | "external";
    storageKey: string;
    publicUrl?: string;
  },
): string | undefined {
  if (media.publicUrl) {
    return media.publicUrl;
  }

  if (isHttpUrl(media.storageKey)) {
    return media.storageKey;
  }

  if (isPublicAssetPath(media.storageKey)) {
    return media.storageKey.startsWith("/") ? media.storageKey : `/${media.storageKey}`;
  }

  const accountHash = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH?.trim();

  if (media.storageProvider !== "cloudflare-images" || !accountHash) {
    return undefined;
  }

  return `https://imagedelivery.net/${accountHash}/${media.storageKey}/public`;
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
  return /^(?:\/)?images\/.+\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value);
}

async function upsertProjectDraftHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof upsertProjectDraftArgs>,
) {
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
          .collect()
        : await ctx.db.query("projectDrafts").collect();

      await Promise.all(projectDrafts.map((projectDraft) =>
        ctx.db.patch(projectDraft._id, { publishedAt }),
      ));
      projectDraftsPublished = projectDrafts.length;

      const mediaRows = args.contentId
        ? await ctx.db
          .query("mediaMetadata")
          .withIndex("by_content_id", (query) => query.eq("contentId", args.contentId))
          .collect()
        : await ctx.db.query("mediaMetadata").collect();
      const mediaByPublicSlot = new Map<string, typeof mediaRows>();
      const mediaPublicSlotKey = (media: (typeof mediaRows)[number]) =>
        `${media.contentId ?? media._id}:${media.usage}`;

      for (const media of mediaRows) {
        const groupKey = mediaPublicSlotKey(media);
        mediaByPublicSlot.set(groupKey, [...(mediaByPublicSlot.get(groupKey) ?? []), media]);
      }

      const exclusivePublicSlotKeys = new Set<string>();
      const publishableMediaRows = [...mediaByPublicSlot.entries()].flatMap(([groupKey, projectMediaRows]) => {
        const selectedRows = projectMediaRows.filter((media) =>
          media.selectedForPublic === true && media.status !== "archived",
        );

        if (selectedRows.length > 0) {
          exclusivePublicSlotKeys.add(groupKey);

          return selectedRows;
        }

        const latestFallback = projectMediaRows
          .filter((media) => media.status !== "archived")
          .sort((left, right) => right.updatedAt - left.updatedAt)[0];

        if (latestFallback) {
          exclusivePublicSlotKeys.add(groupKey);

          return [latestFallback];
        }

        return [];
      });

      await Promise.all(publishableMediaRows.map((media) =>
        ctx.db.patch(media._id, {
          status: "published",
          updatedAt: publishedAt,
        }),
      ));
      if (exclusivePublicSlotKeys.size > 0) {
        const publishableIds = new Set(publishableMediaRows.map((media) => media._id));
        const unselectedRows = mediaRows.filter((media) =>
          exclusivePublicSlotKeys.has(mediaPublicSlotKey(media))
          && media.status === "published"
          && !publishableIds.has(media._id),
        );

        await Promise.all(unselectedRows.map((media) =>
          ctx.db.patch(media._id, {
            status: "draft",
            updatedAt: publishedAt,
          }),
        ));
      }
      mediaPublished = publishableMediaRows.length;
    }

    if (args.scope === "resume" || args.scope === "all") {
      const resumeDrafts = args.locale
        ? await ctx.db
          .query("resumeDrafts")
          .withIndex("by_locale", (query) => query.eq("locale", args.locale ?? "en"))
          .collect()
        : await ctx.db.query("resumeDrafts").collect();

      await Promise.all(resumeDrafts.map((resumeDraft) =>
        ctx.db.patch(resumeDraft._id, { publishedAt }),
      ));
      resumeDraftsPublished = resumeDrafts.length;
    }

    return {
      publishedAt,
      projectDraftsPublished,
      resumeDraftsPublished,
      mediaPublished,
    };
  },
});

export const upsertCaseStudyMetadata = mutation({
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
    await requireAdmin(ctx);

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

export const createMediaMetadata = mutation({
  args: {
    storageProvider: mediaStorageProviderValidator,
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
        .withIndex("by_content_id", (query) => query.eq("contentId", args.contentId))
        .collect();

      await Promise.all(siblingMedia
        .filter((item) => item.usage === args.usage)
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
      .withIndex("by_content_id", (query) => query.eq("contentId", args.contentId))
      .collect();

    await Promise.all(siblingMedia
      .filter((item) => item.usage === selectedMedia.usage && item._id !== args.mediaId)
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
