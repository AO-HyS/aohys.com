import { adminAction } from "./lib/functions.js";
import { v, type Infer, type ObjectType } from "convex/values";
import type { FunctionReference } from "convex/server";
import { internal } from "./_generated/api.js";
import {
  ConfirmedProviderFailure,
  createCloudflareImagesDirectUpload,
  type PublishWorkflowResult,
} from "../src/dashboard-providers.js";
import { auditTarget, sessionActor } from "./lib/audit.js";
import {
  publicationSummaryValidator,
  type publishDurablyArgs,
  type publishDurablyReturns,
} from "./model/publication.js";
import {
  localeValidator,
  mediaUsageValidator,
  publicationScopeValidator,
} from "./lib/validators.js";
import { type ReleaseEnvironment } from "@aohys/core/domain";
import { PUBLISH_TARGET, RELEASE_TARGETS } from "@aohys/core/release-targets";

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

type DurablePublishResult = Infer<typeof publishDurablyReturns>;

function getPublishEnvironment(): ReleaseEnvironment {
  const environment = process.env.AOHYS_ENV;

  if (environment === "preview" || environment === "production") {
    return environment;
  }

  throw new Error(
    "AOHYS_ENV must be preview or production to publish content.",
  );
}

export const createMediaUploadUrl = adminAction({
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
    try {
      return await createCloudflareImagesDirectUpload(args, {
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
    } catch (error) {
      // The upload is never retried to repair the audit trail; if this write
      // fails, the event stays attempted.
      await ctx
        .runMutation(internal.audit.recordOutcome, {
          correlationId: ctx.auditCorrelationId,
          outcome:
            error instanceof ConfirmedProviderFailure ? "failed" : "unknown",
          target: auditTarget(args),
        })
        .catch(() => undefined);
      throw error;
    }
  },
});

export const publishContent = adminAction({
  args: {
    scope: publicationScopeValidator,
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
  ): Promise<
    Omit<DurablePublishResult, "workflowPending"> & {
      workflow: PublishWorkflowResult;
    }
  > => {
    const environment = getPublishEnvironment();
    const providerConfigured = Boolean(
      process.env.PUBLISH_GITHUB_TOKEN?.trim(),
    );

    const publicationMutation = internal.publication
      .publishFromDashboard as FunctionReference<
      "mutation",
      "internal",
      ObjectType<typeof publishDurablyArgs>,
      DurablePublishResult
    >;
    const result: DurablePublishResult = await ctx.runMutation(
      publicationMutation,
      {
        ...args,
        targetEnvironment: environment,
        requestedBy: String(ctx.admin._id),
        actor: sessionActor(ctx.admin),
        providerConfigured,
      },
    );
    const workflow: PublishWorkflowResult =
      providerConfigured && result.workflowPending
        ? {
            status: "queued",
            repository:
              process.env.PUBLISH_GITHUB_REPOSITORY?.trim() ||
              PUBLISH_TARGET.repository,
            workflowId:
              process.env.PUBLISH_GITHUB_WORKFLOW_ID?.trim() ||
              PUBLISH_TARGET.workflowId,
            ref: RELEASE_TARGETS[environment].branch,
          }
        : {
            status: "not-configured",
            reason: providerConfigured
              ? "No new workflow dispatch is pending for this publication request."
              : "PUBLISH_GITHUB_TOKEN is missing.",
          };
    const { workflowPending: _workflowPending, ...publicResult } = result;

    return {
      ...publicResult,
      workflow,
    };
  },
});
