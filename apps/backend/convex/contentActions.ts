import { v } from "convex/values";
import type { FunctionReference } from "convex/server";
import { action } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { requireAdmin } from "./auth.js";
import {
  createCloudflareImagesDirectUpload,
  type PublishWorkflowResult,
} from "../src/dashboard-providers.js";
import { publicationSummaryValidator } from "./model/publication.js";

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

type DurablePublishResult = {
  publishedAt: number;
  projectDraftsPublished: number;
  resumeDraftsPublished: number;
  mediaPublished: number;
  publication: {
    requestKey: string;
    publicationAttemptId?: string;
    scope: "project" | "resume" | "all";
    contentId?: string;
    locale?: "en" | "es";
    targetEnvironment: "preview" | "production";
    state:
      | "published-locally"
      | "release-requested"
      | "release-acknowledged"
      | "release-failed"
      | "deployed"
      | "rollback-needed";
    retryable: boolean;
    updatedAt: number;
  };
};

function getPublishEnvironment(): "preview" | "production" {
  const environment = process.env.AOHYS_ENV;

  if (environment === "preview" || environment === "production") {
    return environment;
  }

  throw new Error(
    "AOHYS_ENV must be preview or production to publish content.",
  );
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
      ...(process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH
        ? { accountHash: process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH }
        : {}),
      ...(process.env.CLOUDFLARE_ACCOUNT_ID
        ? { accountId: process.env.CLOUDFLARE_ACCOUNT_ID }
        : {}),
      ...(process.env.CLOUDFLARE_IMAGES_API_TOKEN
        ? { apiToken: process.env.CLOUDFLARE_IMAGES_API_TOKEN }
        : {}),
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
    publication: publicationSummaryValidator,
  }),
  handler: async (
    ctx,
    args,
  ): Promise<DurablePublishResult & { workflow: PublishWorkflowResult }> => {
    const user = await requireAdmin(ctx);
    const environment = getPublishEnvironment();
    const providerConfigured = Boolean(
      process.env.PUBLISH_GITHUB_TOKEN?.trim(),
    );

    const publicationMutation = internal.publication
      .publishFromDashboard as FunctionReference<
      "mutation",
      "internal",
      {
        scope: "project" | "resume" | "all";
        contentId?: string;
        locale?: "en" | "es";
        targetEnvironment: "preview" | "production";
        requestedBy: string;
        providerConfigured: boolean;
      },
      DurablePublishResult
    >;
    const result: DurablePublishResult = await ctx.runMutation(
      publicationMutation,
      {
        ...args,
        targetEnvironment: environment,
        requestedBy: String(user._id),
        providerConfigured,
      },
    );
    const workflow: PublishWorkflowResult = providerConfigured
      ? {
          status: "queued",
          repository:
            process.env.PUBLISH_GITHUB_REPOSITORY?.trim() || "AO-HyS/aohys.com",
          workflowId:
            process.env.PUBLISH_GITHUB_WORKFLOW_ID?.trim() ||
            "release-train.yml",
          ref: environment === "production" ? "main" : "develop",
        }
      : {
          status: "not-configured",
          reason: "PUBLISH_GITHUB_TOKEN is missing.",
        };

    return {
      ...result,
      workflow,
    };
  },
});
