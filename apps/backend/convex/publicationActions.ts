"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import { internalAction } from "./_generated/server.js";
import { dispatchGitHubPublication } from "../src/publication-provider.js";

export const dispatch = internalAction({
  args: { attemptId: v.id("publicationAttempts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(
      internal.publication.claimAttempt,
      args,
    );
    if (claim.status === "skipped") return null;
    const result = await dispatchGitHubPublication({
      targetEnvironment: claim.targetEnvironment,
      publicationRequestKey: claim.publicationRequestKey,
      publicationAttemptId: claim.publicationAttemptId,
      ...(process.env.PUBLISH_GITHUB_REPOSITORY
        ? { repository: process.env.PUBLISH_GITHUB_REPOSITORY }
        : {}),
      ...(process.env.PUBLISH_GITHUB_TOKEN
        ? { token: process.env.PUBLISH_GITHUB_TOKEN }
        : {}),
      ...(process.env.PUBLISH_GITHUB_WORKFLOW_ID
        ? { workflowId: process.env.PUBLISH_GITHUB_WORKFLOW_ID }
        : {}),
    });
    await ctx.runMutation(internal.publication.completeAttempt, {
      attemptId: claim.attemptId,
      result:
        result.status === "acknowledged"
          ? {
              status: "acknowledged" as const,
              ...(result.runId ? { runId: result.runId } : {}),
              ...(result.runUrl ? { runUrl: result.runUrl } : {}),
            }
          : result,
    });
    return null;
  },
});
