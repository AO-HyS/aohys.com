import { v } from "convex/values";
import { action } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { requireAdmin } from "./auth.js";
import {
  createCloudflareImagesDirectUpload,
  triggerGitHubPublishWorkflow,
  type PublishWorkflowResult,
} from "../src/dashboard-providers.js";

const localeValidator = v.union(v.literal("en"), v.literal("es"));

const mediaUsageValidator = v.union(
  v.literal("case-study"),
  v.literal("resume"),
  v.literal("architecture"),
  v.literal("site"),
);

const publishWorkflowValidator = v.union(
  v.object({
    status: v.literal("queued"),
    repository: v.string(),
    workflowId: v.string(),
    ref: v.string(),
  }),
  v.object({
    status: v.literal("not-configured"),
    reason: v.string(),
  }),
);

type PublishContentMutationResult = {
  publishedAt: number;
  projectDraftsPublished: number;
  resumeDraftsPublished: number;
  mediaPublished: number;
};

function getPublishEnvironment(): "local" | "preview" | "production" {
  const environment = process.env.AOHYS_ENV;

  if (
    environment === "local" ||
    environment === "preview" ||
    environment === "production"
  ) {
    return environment;
  }

  return "production";
}

export const createMediaUploadUrl = action({
  args: {
    storageKey: v.string(),
    altText: v.string(),
    contentId: v.optional(v.string()),
    usage: mediaUsageValidator,
    locale: v.optional(localeValidator),
    selectedForPublic: v.optional(v.boolean()),
  },
  returns: v.object({
    imageId: v.string(),
    publicUrl: v.string(),
    uploadURL: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    return createCloudflareImagesDirectUpload(args, {
      accountHash: process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_IMAGES_API_TOKEN,
    });
  },
});

export const publishContent = action({
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
    workflow: publishWorkflowValidator,
  }),
  handler: async (ctx, args): Promise<PublishContentMutationResult & { workflow: PublishWorkflowResult }> => {
    await requireAdmin(ctx);

    const result: PublishContentMutationResult = await ctx.runMutation(
      internal.content.publishContentFromDashboard,
      args,
    );
    const workflow = await triggerGitHubPublishWorkflow({
      environment: getPublishEnvironment(),
      repository: process.env.PUBLISH_GITHUB_REPOSITORY,
      token: process.env.PUBLISH_GITHUB_TOKEN,
      workflowId: process.env.PUBLISH_GITHUB_WORKFLOW_ID,
    });

    return {
      ...result,
      workflow,
    };
  },
});
