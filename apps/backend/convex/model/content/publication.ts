import { selectPublicationMedia } from "@aohys/core";
import { v, type ObjectType } from "convex/values";
import type { MutationCtx } from "../../_generated/server.js";
import { localeValidator, withinLimit } from "./shared.js";

export const publishContentArgs = {
  scope: v.union(v.literal("project"), v.literal("resume"), v.literal("all")),
  contentId: v.optional(v.string()),
  locale: v.optional(localeValidator),
};

export const publishContentReturns = v.object({
  publishedAt: v.number(),
  projectDraftsPublished: v.number(),
  resumeDraftsPublished: v.number(),
  mediaPublished: v.number(),
});

export async function publishContentHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof publishContentArgs>,
) {
  const publishedAt = Date.now();
  let projectDraftsPublished = 0;
  let resumeDraftsPublished = 0;
  let mediaPublished = 0;

  if (args.scope === "project" || args.scope === "all") {
    const projectDrafts = args.contentId
      ? await ctx.db
          .query("projectDrafts")
          .withIndex("by_content_id", (query) =>
            query.eq("contentId", args.contentId ?? ""),
          )
          .take(3)
      : await ctx.db.query("projectDrafts").take(201);
    const boundedProjectDrafts = withinLimit(
      projectDrafts,
      args.contentId ? 2 : 200,
      "Project publication drafts",
    );
    await Promise.all(
      boundedProjectDrafts.map((draft) =>
        ctx.db.patch(draft._id, { publishedAt }),
      ),
    );
    projectDraftsPublished = boundedProjectDrafts.length;

    const mediaRows = args.contentId
      ? await ctx.db
          .query("mediaMetadata")
          .withIndex("by_content_id_and_usage", (query) =>
            query.eq("contentId", args.contentId),
          )
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
    await Promise.all(
      publicationDecision.selected.map((media) =>
        ctx.db.patch(media._id, {
          status: "published",
          updatedAt: publishedAt,
        }),
      ),
    );
    await Promise.all(
      publicationDecision.displaced.map((media) =>
        ctx.db.patch(media._id, { status: "draft", updatedAt: publishedAt }),
      ),
    );
    mediaPublished = publicationDecision.selected.length;
  }

  if (args.scope === "resume" || args.scope === "all") {
    const resumeDrafts = args.locale
      ? await ctx.db
          .query("resumeDrafts")
          .withIndex("by_locale", (query) =>
            query.eq("locale", args.locale ?? "en"),
          )
          .take(2)
      : await ctx.db.query("resumeDrafts").take(11);
    const boundedResumeDrafts = withinLimit(
      resumeDrafts,
      args.locale ? 1 : 10,
      "Resume publication drafts",
    );
    await Promise.all(
      boundedResumeDrafts.map((draft) =>
        ctx.db.patch(draft._id, { publishedAt }),
      ),
    );
    resumeDraftsPublished = boundedResumeDrafts.length;
  }

  return {
    publishedAt,
    projectDraftsPublished,
    resumeDraftsPublished,
    mediaPublished,
  };
}
