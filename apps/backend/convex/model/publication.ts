import { v, type ObjectType } from "convex/values";
import type { MutationCtx } from "../_generated/server.js";
import { internal } from "../_generated/api.js";
import {
  createPublicationIdentity,
  parseCanonicalJson,
  type PublicationSource,
} from "../../src/publication-contract.js";
import {
  publishContentArgs,
  publishContentHandler,
} from "./content/publication.js";
import { localeValidator, withinLimit } from "./content/shared.js";

export const publicationTargetValidator = v.union(
  v.literal("preview"),
  v.literal("production"),
);

export const publicationStateValidator = v.union(
  v.literal("published-locally"),
  v.literal("release-requested"),
  v.literal("release-acknowledged"),
  v.literal("release-failed"),
  v.literal("deployed"),
  v.literal("rollback-needed"),
);

export const publicationSummaryValidator = v.object({
  requestKey: v.string(),
  publicationAttemptId: v.optional(v.string()),
  scope: publishContentArgs.scope,
  contentId: v.optional(v.string()),
  locale: v.optional(localeValidator),
  targetEnvironment: publicationTargetValidator,
  state: publicationStateValidator,
  retryable: v.boolean(),
  updatedAt: v.number(),
});

export const publishDurablyArgs = {
  ...publishContentArgs,
  targetEnvironment: publicationTargetValidator,
  requestedBy: v.string(),
  providerConfigured: v.boolean(),
};

export const publishDurablyReturns = v.object({
  publishedAt: v.number(),
  projectDraftsPublished: v.number(),
  resumeDraftsPublished: v.number(),
  mediaPublished: v.number(),
  publication: publicationSummaryValidator,
});

export async function publishDurablyHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof publishDurablyArgs>,
) {
  const source = await readPublicationSource(ctx, args);
  const identity = await createPublicationIdentity({
    scope: args.scope,
    ...(args.contentId ? { contentId: args.contentId } : {}),
    ...(args.locale ? { locale: args.locale } : {}),
    targetEnvironment: args.targetEnvironment,
    source,
  });
  let request = await ctx.db
    .query("publicationRequests")
    .withIndex("by_request_key", (query) =>
      query.eq("requestKey", identity.requestKey),
    )
    .unique();

  if (!request) {
    const localResult = await publishContentHandler(ctx, args);
    const now = localResult.publishedAt;
    const requestId = await ctx.db.insert("publicationRequests", {
      ...identity,
      scope: args.scope,
      ...(args.contentId ? { contentId: args.contentId } : {}),
      ...(args.locale ? { locale: args.locale } : {}),
      targetEnvironment: args.targetEnvironment,
      requestedBy: args.requestedBy,
      state: "published-locally",
      latestAttemptNumber: 0,
      ...localResult,
      createdAt: now,
      updatedAt: now,
    });
    request = await ctx.db.get("publicationRequests", requestId);
    if (!request) throw new Error("Publication request could not be created.");
  }
  if (!request) throw new Error("Publication request is missing.");

  const now = Date.now();
  let publicationAttemptId: string | undefined;
  if (args.providerConfigured && mayScheduleAttempt(request)) {
    const attemptNumber = request.latestAttemptNumber + 1;
    publicationAttemptId = `${request.requestKey}.${attemptNumber}`;
    const attemptId = await ctx.db.insert("publicationAttempts", {
      requestId: request._id,
      publicationAttemptId,
      attemptNumber,
      state: "scheduled",
      retryable: false,
      createdAt: now,
      updatedAt: now,
    });
    const schedulerJobId = await ctx.scheduler.runAfter(
      0,
      internal.publicationActions.dispatch,
      { attemptId },
    );
    await Promise.all([
      ctx.db.patch("publicationAttempts", attemptId, { schedulerJobId }),
      ctx.db.patch("publicationRequests", request._id, {
        state: "release-requested",
        retryable: undefined,
        latestAttemptNumber: attemptNumber,
        updatedAt: now,
      }),
    ]);
    const refreshedRequest = await ctx.db.get(
      "publicationRequests",
      request._id,
    );
    if (!refreshedRequest) throw new Error("Publication request disappeared.");
    request = refreshedRequest;
  } else if (request.latestAttemptNumber > 0) {
    const requestForAttempt = request;
    const latestAttempt = await ctx.db
      .query("publicationAttempts")
      .withIndex("by_request_id_and_attempt_number", (query) =>
        query
          .eq("requestId", requestForAttempt._id)
          .eq("attemptNumber", requestForAttempt.latestAttemptNumber),
      )
      .unique();
    publicationAttemptId = latestAttempt?.publicationAttemptId;
  }

  return {
    publishedAt: request.publishedAt,
    projectDraftsPublished: request.projectDraftsPublished,
    resumeDraftsPublished: request.resumeDraftsPublished,
    mediaPublished: request.mediaPublished,
    publication: summarizeRequest(request, publicationAttemptId),
  };
}

function mayScheduleAttempt(request: {
  state: string;
  retryable?: boolean;
  latestAttemptNumber: number;
}) {
  return (
    (request.state === "published-locally" &&
      request.latestAttemptNumber === 0) ||
    (request.state === "release-failed" && request.retryable === true)
  );
}

function summarizeRequest(
  request: {
    requestKey: string;
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
    retryable?: boolean;
    updatedAt: number;
  },
  publicationAttemptId?: string,
) {
  return {
    requestKey: request.requestKey,
    ...(publicationAttemptId ? { publicationAttemptId } : {}),
    scope: request.scope,
    ...(request.contentId ? { contentId: request.contentId } : {}),
    ...(request.locale ? { locale: request.locale } : {}),
    targetEnvironment: request.targetEnvironment,
    state: request.state,
    retryable: request.retryable === true,
    updatedAt: request.updatedAt,
  };
}

async function readPublicationSource(
  ctx: MutationCtx,
  args: ObjectType<typeof publishDurablyArgs>,
): Promise<PublicationSource> {
  const projectDrafts =
    args.scope === "project" || args.scope === "all"
      ? args.contentId
        ? await ctx.db
            .query("projectDrafts")
            .withIndex("by_content_id", (query) =>
              query.eq("contentId", args.contentId ?? ""),
            )
            .take(3)
        : await ctx.db.query("projectDrafts").take(201)
      : [];
  const media =
    args.scope === "project" || args.scope === "all"
      ? args.contentId
        ? await ctx.db
            .query("mediaMetadata")
            .withIndex("by_content_id_and_usage", (query) =>
              query.eq("contentId", args.contentId),
            )
            .take(101)
        : await ctx.db.query("mediaMetadata").take(501)
      : [];
  const resumeDrafts =
    args.scope === "resume" || args.scope === "all"
      ? args.locale
        ? await ctx.db
            .query("resumeDrafts")
            .withIndex("by_locale", (query) =>
              query.eq("locale", args.locale ?? "en"),
            )
            .take(2)
        : await ctx.db.query("resumeDrafts").take(11)
      : [];
  const settings =
    args.scope === "all"
      ? await ctx.db
          .query("siteSettings")
          .withIndex("by_environment_and_key", (query) =>
            query.eq("environment", args.targetEnvironment),
          )
          .take(101)
      : [];

  const boundedProjects = withinLimit(
    projectDrafts,
    args.contentId ? 2 : 200,
    "Publication source project drafts",
  );
  const boundedMedia = withinLimit(
    media,
    args.contentId ? 100 : 500,
    "Publication source media",
  );
  const boundedResume = withinLimit(
    resumeDrafts,
    args.locale ? 1 : 10,
    "Publication source resume drafts",
  );
  const boundedSettings = withinLimit(
    settings,
    100,
    "Publication source settings",
  );

  return {
    projects: boundedProjects.map((draft) => ({
      contentId: draft.contentId,
      locale: draft.locale,
      localizedSlug: draft.localizedSlug,
      title: draft.title,
      summary: draft.summary,
      seoDescription: draft.seoDescription,
      projectUrl: draft.projectUrl,
      ctaLabel: draft.ctaLabel,
      ctaHref: draft.ctaHref,
      achievements: draft.achievements,
      structureNotes: draft.structureNotes,
      updatedAt: draft.updatedAt,
    })),
    resume: boundedResume.map((draft) => {
      let content: unknown;
      try {
        content = parseCanonicalJson(draft.contentJson);
      } catch {
        throw new Error("Resume publication contentJson is invalid.");
      }
      return { locale: draft.locale, content, updatedAt: draft.updatedAt };
    }),
    media: boundedMedia.map((item) => ({
      storageProvider: item.storageProvider,
      storageKey: item.storageKey,
      publicUrl: item.publicUrl,
      altText: item.altText,
      contentId: item.contentId,
      usage: item.usage,
      locale: item.locale,
      selectedForPublic: item.selectedForPublic,
      selectedForPublicAt: item.selectedForPublicAt,
    })),
    settings: boundedSettings.map((item) => ({
      key: item.key,
      value: item.value,
      classification: item.classification,
      updatedAt: item.updatedAt,
    })),
  };
}
