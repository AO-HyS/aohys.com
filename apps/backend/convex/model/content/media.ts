import { v, type ObjectType } from "convex/values";
import type { MutationCtx } from "../../_generated/server.js";
import { localeValidator, withinLimit } from "./shared.js";

export const mediaStorageProviderValidator = v.union(
  v.literal("cloudflare-images"),
  v.literal("cloudflare-r2"),
  v.literal("external"),
);

const writableMediaStorageProviderValidator = v.union(
  v.literal("cloudflare-images"),
  v.literal("external"),
);

export const mediaUsageValidator = v.union(
  v.literal("case-study"),
  v.literal("resume"),
  v.literal("architecture"),
  v.literal("site"),
);

export const mediaStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const createMediaMetadataArgs = {
  storageProvider: writableMediaStorageProviderValidator,
  storageKey: v.string(),
  publicUrl: v.optional(v.string()),
  altText: v.string(),
  contentId: v.optional(v.string()),
  usage: mediaUsageValidator,
  status: mediaStatusValidator,
  locale: v.optional(localeValidator),
  selectedForPublic: v.optional(v.boolean()),
};

export const createMediaMetadataReturns = v.object({
  mediaId: v.id("mediaMetadata"),
  updatedAt: v.number(),
});

export const projectMediaArgs = {
  mediaId: v.id("mediaMetadata"),
  contentId: v.string(),
};

export const updateMediaReturns = v.object({
  mediaId: v.id("mediaMetadata"),
  updatedAt: v.number(),
});

export const deleteMediaReturns = v.object({
  mediaId: v.id("mediaMetadata"),
  deletedAt: v.number(),
});

async function listSiblingMedia(ctx: MutationCtx, contentId: string) {
  const siblingMedia = await ctx.db
    .query("mediaMetadata")
    .withIndex("by_content_id_and_usage", (query) =>
      query.eq("contentId", contentId),
    )
    .take(101);
  return withinLimit(siblingMedia, 100, "Project media selection");
}

function isPublicSelection(item: {
  selectedForPublic?: boolean;
  selectedForPublicAt?: number;
}) {
  return (
    item.selectedForPublic === true || item.selectedForPublicAt !== undefined
  );
}

export async function createMediaMetadataHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof createMediaMetadataArgs>,
) {
  const now = Date.now();
  if (args.selectedForPublic && args.contentId) {
    const siblingMedia = await listSiblingMedia(ctx, args.contentId);
    await Promise.all(
      siblingMedia.filter(isPublicSelection).map((item) =>
        ctx.db.patch(item._id, {
          selectedForPublic: false,
          selectedForPublicAt: undefined,
          updatedAt: now,
        }),
      ),
    );
  }

  const mediaId = await ctx.db.insert("mediaMetadata", {
    ...args,
    ...(args.selectedForPublic ? { selectedForPublicAt: now } : {}),
    createdAt: now,
    updatedAt: now,
  });
  return { mediaId, updatedAt: now };
}

export async function selectMediaForPublicHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof projectMediaArgs>,
) {
  const now = Date.now();
  const selectedMedia = await ctx.db.get(args.mediaId);
  if (!selectedMedia || selectedMedia.contentId !== args.contentId) {
    throw new Error("Selected media does not belong to this project.");
  }

  const siblingMedia = await listSiblingMedia(ctx, args.contentId);
  await Promise.all(
    siblingMedia
      .filter((item) => item._id !== args.mediaId && isPublicSelection(item))
      .map((item) =>
        ctx.db.patch(item._id, {
          selectedForPublic: false,
          selectedForPublicAt: undefined,
          updatedAt: now,
        }),
      ),
  );
  await ctx.db.patch(args.mediaId, {
    selectedForPublic: true,
    selectedForPublicAt: now,
    status:
      selectedMedia.status === "archived" ? "draft" : selectedMedia.status,
    updatedAt: now,
  });
  return { mediaId: args.mediaId, updatedAt: now };
}

export async function archiveMediaHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof projectMediaArgs>,
) {
  const now = Date.now();
  const media = await ctx.db.get(args.mediaId);
  if (!media || media.contentId !== args.contentId) {
    throw new Error("Selected media does not belong to this project.");
  }
  await ctx.db.patch(args.mediaId, {
    selectedForPublic: false,
    selectedForPublicAt: undefined,
    status: "archived",
    updatedAt: now,
  });
  return { mediaId: args.mediaId, updatedAt: now };
}

export async function deleteMediaHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof projectMediaArgs>,
) {
  const media = await ctx.db.get(args.mediaId);
  if (!media || media.contentId !== args.contentId) {
    throw new Error("Selected media does not belong to this project.");
  }
  await ctx.db.delete(args.mediaId);
  return { mediaId: args.mediaId, deletedAt: Date.now() };
}
