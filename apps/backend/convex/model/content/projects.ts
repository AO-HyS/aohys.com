import { v, type ObjectType } from "convex/values";
import type { MutationCtx } from "../../_generated/server.js";
import {
  localizedCaseStudyPath,
  requireCaseStudyContentId,
  requireSafeProjectKey,
  requireUnreservedStaticSlug,
} from "../../../src/project-identity.js";
import { localeValidator } from "./shared.js";

export const caseStudyStatusValidator = v.union(
  v.literal("production-proof"),
  v.literal("active-build"),
  v.literal("private-build"),
  v.literal("enterprise-confidential"),
  v.literal("engineering-practice"),
);

export const evidenceStatusValidator = v.union(
  v.literal("missing"),
  v.literal("sanitized"),
  v.literal("published"),
);

export const projectDraftValidator = v.object({
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
});

export const upsertProjectDraftArgs = {
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

export const createProjectArgs = {
  contentKey: v.string(),
  status: caseStudyStatusValidator,
  evidenceStatus: evidenceStatusValidator,
  en: v.object(localizedProjectDraftArgs),
  es: v.object(localizedProjectDraftArgs),
};

export const upsertProjectDraftReturns = v.object({
  contentId: v.string(),
  locale: localeValidator,
  updatedAt: v.number(),
});

export const createProjectReturns = v.object({
  contentId: v.string(),
  updatedAt: v.number(),
});

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
    throw new Error(
      `The ${locale.toUpperCase()} localized slug already belongs to another project.`,
    );
  }

  const legacyContentId = `case-study:${localizedSlug}`;
  if (legacyContentId !== contentId) {
    const legacyMetadata = await ctx.db
      .query("caseStudyMetadata")
      .withIndex("by_content_id", (query) =>
        query.eq("contentId", legacyContentId),
      )
      .first();
    if (legacyMetadata) {
      throw new Error(
        `The ${locale.toUpperCase()} localized slug collides with an existing legacy project route.`,
      );
    }
  }
}

export async function upsertProjectDraftHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof upsertProjectDraftArgs>,
) {
  requireCaseStudyContentId(args.contentId);
  if (args.localizedSlug !== undefined) {
    requireSafeProjectKey(args.localizedSlug, "Localized slug");
    await requireAvailableLocalizedSlug(
      ctx,
      args.contentId,
      args.locale,
      args.localizedSlug,
    );
  }
  const updatedAt = Date.now();
  const existingCaseStudy = await ctx.db
    .query("caseStudyMetadata")
    .withIndex("by_content_id", (query) =>
      query.eq("contentId", args.contentId),
    )
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
    ...(args.localizedSlug ? { localizedSlug: args.localizedSlug } : {}),
    title: args.title,
    summary: args.summary,
    seoDescription: args.seoDescription,
    ...(args.projectUrl ? { projectUrl: args.projectUrl } : {}),
    ctaLabel: args.ctaLabel,
    ctaHref: args.ctaHref,
    achievements: args.achievements,
    structureNotes: args.structureNotes,
    updatedAt,
  };

  if (existingProjectDraft) {
    await ctx.db.patch(existingProjectDraft._id, {
      ...projectDraft,
      publishedAt: undefined,
    });
  } else {
    await ctx.db.insert("projectDrafts", projectDraft);
  }

  return { contentId: args.contentId, locale: args.locale, updatedAt };
}

export async function createProjectHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof createProjectArgs>,
) {
  requireSafeProjectKey(args.contentKey, "Content key");
  requireSafeProjectKey(args.en.localizedSlug, "English slug");
  requireSafeProjectKey(args.es.localizedSlug, "Spanish slug");

  const contentId = `case-study:${args.contentKey}`;
  const [metadataRows, draftRows] = await Promise.all([
    ctx.db
      .query("caseStudyMetadata")
      .withIndex("by_content_id", (query) => query.eq("contentId", contentId))
      .take(2),
    ctx.db
      .query("projectDrafts")
      .withIndex("by_content_id", (query) => query.eq("contentId", contentId))
      .take(3),
  ]);
  if (metadataRows.length > 0 || draftRows.length > 0) {
    throw new Error("A project with this content key already exists.");
  }
  await requireAvailableLocalizedSlug(
    ctx,
    contentId,
    "en",
    args.en.localizedSlug,
  );
  await requireAvailableLocalizedSlug(
    ctx,
    contentId,
    "es",
    args.es.localizedSlug,
  );

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
}
