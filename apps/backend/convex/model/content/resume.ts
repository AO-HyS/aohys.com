import { v, type ObjectType } from "convex/values";
import type { MutationCtx } from "../../_generated/server.js";
import { localeValidator, withinLimit } from "./shared.js";

export const upsertResumeDraftArgs = {
  locale: localeValidator,
  contentJson: v.string(),
};

export const upsertResumeDraftReturns = v.object({
  locale: localeValidator,
  updatedAt: v.number(),
});

export const createResumeVersionArgs = {
  locale: localeValidator,
  version: v.string(),
  pdfPath: v.string(),
  isPublished: v.boolean(),
};

export const createResumeVersionReturns = v.object({
  resumeVersionId: v.id("resumeVersions"),
  publishedAt: v.optional(v.number()),
});

export async function upsertResumeDraftHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof upsertResumeDraftArgs>,
) {
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
  return { locale: args.locale, updatedAt };
}

export async function createResumeVersionHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof createResumeVersionArgs>,
) {
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
    await Promise.all(
      publishedVersions.map((resumeVersion) =>
        ctx.db.patch(resumeVersion._id, {
          isPublished: false,
          publishedAt: undefined,
        }),
      ),
    );
  }

  const resumeVersionId = await ctx.db.insert("resumeVersions", {
    locale: args.locale,
    version: args.version,
    pdfPath: args.pdfPath,
    isPublished: args.isPublished,
    createdAt: now,
    ...(publishedAt !== undefined ? { publishedAt } : {}),
  });
  return {
    resumeVersionId,
    ...(publishedAt !== undefined ? { publishedAt } : {}),
  };
}
