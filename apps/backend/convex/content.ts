import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js";
import { requireAdmin } from "./auth.js";
import {
  archiveMediaHandler,
  createMediaMetadataArgs,
  createMediaMetadataHandler,
  createMediaMetadataReturns,
  deleteMediaHandler,
  deleteMediaReturns,
  projectMediaArgs,
  selectMediaForPublicHandler,
  updateMediaReturns,
} from "./model/content/media.js";
import {
  dashboardOverviewArgs,
  dashboardOverviewReturns,
  getDashboardOverviewHandler,
  listForDashboardHandler,
  listForDashboardReturns,
} from "./model/content/overview.js";
import {
  createProjectArgs,
  createProjectHandler,
  createProjectReturns,
  upsertProjectDraftArgs,
  upsertProjectDraftHandler,
  upsertProjectDraftReturns,
} from "./model/content/projects.js";
import {
  publishContentArgs,
  publishContentHandler,
  publishContentReturns,
} from "./model/content/publication.js";
import {
  createResumeVersionArgs,
  createResumeVersionHandler,
  createResumeVersionReturns,
  upsertResumeDraftArgs,
  upsertResumeDraftHandler,
  upsertResumeDraftReturns,
} from "./model/content/resume.js";
import {
  upsertSiteSettingArgs,
  upsertSiteSettingHandler,
  upsertSiteSettingReturns,
} from "./model/content/settings.js";

export const getDashboardOverview = query({
  args: dashboardOverviewArgs,
  returns: dashboardOverviewReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return getDashboardOverviewHandler(ctx, args);
  },
});

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
  handler: listForDashboardHandler,
});

export const upsertProjectDraft = mutation({
  args: upsertProjectDraftArgs,
  returns: upsertProjectDraftReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return upsertProjectDraftHandler(ctx, args);
  },
});

export const createProject = mutation({
  args: createProjectArgs,
  returns: createProjectReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return createProjectHandler(ctx, args);
  },
});

export const upsertProjectDraftFromDashboard = internalMutation({
  args: upsertProjectDraftArgs,
  returns: upsertProjectDraftReturns,
  handler: upsertProjectDraftHandler,
});

export const upsertResumeDraft = mutation({
  args: upsertResumeDraftArgs,
  returns: upsertResumeDraftReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return upsertResumeDraftHandler(ctx, args);
  },
});

export const publishContentFromDashboard = internalMutation({
  args: publishContentArgs,
  returns: publishContentReturns,
  handler: publishContentHandler,
});

export const createMediaMetadata = mutation({
  args: createMediaMetadataArgs,
  returns: createMediaMetadataReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return createMediaMetadataHandler(ctx, args);
  },
});

export const selectMediaForPublic = mutation({
  args: projectMediaArgs,
  returns: updateMediaReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return selectMediaForPublicHandler(ctx, args);
  },
});

export const archiveMedia = mutation({
  args: projectMediaArgs,
  returns: updateMediaReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return archiveMediaHandler(ctx, args);
  },
});

export const deleteMedia = mutation({
  args: projectMediaArgs,
  returns: deleteMediaReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return deleteMediaHandler(ctx, args);
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
  handler: upsertSiteSettingHandler,
});

export const createResumeVersion = mutation({
  args: createResumeVersionArgs,
  returns: createResumeVersionReturns,
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return createResumeVersionHandler(ctx, args);
  },
});
