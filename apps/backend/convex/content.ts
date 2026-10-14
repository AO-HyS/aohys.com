import { adminMutation, adminQuery } from "./lib/functions.js";
import { internalMutation, internalQuery } from "./_generated/server.js";
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

export const getDashboardOverview = adminQuery({
  args: dashboardOverviewArgs,
  returns: dashboardOverviewReturns,
  handler: async (ctx, args) => {
    return getDashboardOverviewHandler(ctx, args);
  },
});

export const listForDashboard = adminQuery({
  args: {},
  returns: listForDashboardReturns,
  handler: async (ctx) => {
    return listForDashboardHandler(ctx);
  },
});

export const listForDashboardInternal = internalQuery({
  args: {},
  returns: listForDashboardReturns,
  handler: listForDashboardHandler,
});

export const upsertProjectDraft = adminMutation({
  args: upsertProjectDraftArgs,
  returns: upsertProjectDraftReturns,
  handler: async (ctx, args) => {
    return upsertProjectDraftHandler(ctx, args);
  },
});

export const createProject = adminMutation({
  args: createProjectArgs,
  returns: createProjectReturns,
  handler: async (ctx, args) => {
    return createProjectHandler(ctx, args);
  },
});

export const upsertProjectDraftFromDashboard = internalMutation({
  args: upsertProjectDraftArgs,
  returns: upsertProjectDraftReturns,
  handler: upsertProjectDraftHandler,
});

export const upsertResumeDraft = adminMutation({
  args: upsertResumeDraftArgs,
  returns: upsertResumeDraftReturns,
  handler: async (ctx, args) => {
    return upsertResumeDraftHandler(ctx, args);
  },
});

export const publishContentFromDashboard = internalMutation({
  args: publishContentArgs,
  returns: publishContentReturns,
  handler: publishContentHandler,
});

export const createMediaMetadata = adminMutation({
  args: createMediaMetadataArgs,
  returns: createMediaMetadataReturns,
  handler: async (ctx, args) => {
    return createMediaMetadataHandler(ctx, args);
  },
});

export const selectMediaForPublic = adminMutation({
  args: projectMediaArgs,
  returns: updateMediaReturns,
  handler: async (ctx, args) => {
    return selectMediaForPublicHandler(ctx, args);
  },
});

export const archiveMedia = adminMutation({
  args: projectMediaArgs,
  returns: updateMediaReturns,
  handler: async (ctx, args) => {
    return archiveMediaHandler(ctx, args);
  },
});

export const deleteMedia = adminMutation({
  args: projectMediaArgs,
  returns: deleteMediaReturns,
  handler: async (ctx, args) => {
    return deleteMediaHandler(ctx, args);
  },
});

export const upsertSiteSetting = adminMutation({
  args: upsertSiteSettingArgs,
  returns: upsertSiteSettingReturns,
  handler: async (ctx, args) => {
    return upsertSiteSettingHandler(ctx, args);
  },
});

export const upsertSiteSettingFromDashboard = internalMutation({
  args: upsertSiteSettingArgs,
  returns: upsertSiteSettingReturns,
  handler: upsertSiteSettingHandler,
});

export const createResumeVersion = adminMutation({
  args: createResumeVersionArgs,
  returns: createResumeVersionReturns,
  handler: async (ctx, args) => {
    return createResumeVersionHandler(ctx, args);
  },
});
