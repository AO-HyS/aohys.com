// Frozen facade contract from IM-06 plus the additive IM-08 publication fields.
type Validator = { type: string; value?: unknown; tableName?: string };
type OptionalField = { optional: true; fieldType: Validator };
type Field = Validator | OptionalField;

const string = (): Validator => ({ type: "string" });
const number = (): Validator => ({ type: "number" });
const boolean = (): Validator => ({ type: "boolean" });
const literal = (value: string): Validator => ({ type: "literal", value });
const union = (...value: Validator[]): Validator => ({ type: "union", value });
const array = (value: Validator): Validator => ({ type: "array", value });
const id = (tableName: string): Validator => ({ type: "id", tableName });
const optional = (fieldType: Validator): OptionalField => ({
  optional: true,
  fieldType,
});
const object = (fields: Record<string, Field>): Validator => ({
  type: "object",
  value: Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [
      name,
      "optional" in field
        ? { fieldType: field.fieldType, optional: true }
        : { fieldType: field, optional: false },
    ]),
  ),
});

const locale = union(literal("en"), literal("es"));
const environment = union(
  literal("local"),
  literal("preview"),
  literal("production"),
);
const caseStudyStatus = union(
  literal("production-proof"),
  literal("active-build"),
  literal("private-build"),
  literal("enterprise-confidential"),
  literal("engineering-practice"),
);
const evidenceStatus = union(
  literal("missing"),
  literal("sanitized"),
  literal("published"),
);
const mediaStorageProvider = union(
  literal("cloudflare-images"),
  literal("cloudflare-r2"),
  literal("external"),
);
const writableMediaStorageProvider = union(
  literal("cloudflare-images"),
  literal("external"),
);
const mediaUsage = union(
  literal("case-study"),
  literal("resume"),
  literal("architecture"),
  literal("site"),
);
const mediaStatus = union(
  literal("draft"),
  literal("published"),
  literal("archived"),
);
const settingClassification = union(
  literal("public-build-value"),
  literal("provider-output"),
  literal("policy-value"),
);
const overviewPath = union(
  literal("/projects"),
  literal("/resume"),
  literal("/settings"),
);
const overviewGateStatus = union(
  literal("clear"),
  literal("ready"),
  literal("blocked"),
  literal("unavailable"),
);

const projectDraftFields = {
  contentId: string(),
  locale,
  localizedSlug: optional(string()),
  title: string(),
  summary: string(),
  seoDescription: string(),
  projectUrl: optional(string()),
  ctaLabel: string(),
  ctaHref: string(),
  achievements: string(),
  structureNotes: string(),
};

const upsertProjectArgs = object({
  ...projectDraftFields,
  status: caseStudyStatus,
  evidenceStatus,
});

const localizedProjectDraft = object({
  localizedSlug: string(),
  title: string(),
  summary: string(),
  seoDescription: string(),
  projectUrl: optional(string()),
  ctaLabel: string(),
  achievements: string(),
  structureNotes: string(),
});

const projectMediaArgs = object({
  mediaId: id("mediaMetadata"),
  contentId: string(),
});
const updateMediaReturns = object({
  mediaId: id("mediaMetadata"),
  updatedAt: number(),
});
const upsertProjectReturns = object({
  contentId: string(),
  locale,
  updatedAt: number(),
});
const upsertSettingArgs = object({
  key: string(),
  environment,
  value: string(),
  classification: settingClassification,
});
const upsertSettingReturns = object({ key: string(), updatedAt: number() });
const publicationArgs = object({
  scope: union(literal("project"), literal("resume"), literal("all")),
  contentId: optional(string()),
  locale: optional(locale),
});
const publicationReturns = object({
  publishedAt: number(),
  projectDraftsPublished: number(),
  resumeDraftsPublished: number(),
  mediaPublished: number(),
});
const publicationTarget = union(literal("preview"), literal("production"));
const publicationState = union(
  literal("published-locally"),
  literal("release-requested"),
  literal("release-acknowledged"),
  literal("release-failed"),
  literal("deployed"),
  literal("rollback-needed"),
);
const publicationSummary = object({
  requestKey: string(),
  publicationAttemptId: optional(string()),
  scope: union(literal("project"), literal("resume"), literal("all")),
  contentId: optional(string()),
  locale: optional(locale),
  targetEnvironment: publicationTarget,
  state: publicationState,
  retryable: boolean(),
  updatedAt: number(),
});

const dashboardOverviewReturns = object({
  environment,
  state: union(
    literal("clear"),
    literal("action-required"),
    literal("ready-to-queue"),
    literal("partial"),
  ),
  gates: array(
    object({
      id: union(
        literal("project-copy"),
        literal("evidence"),
        literal("resume"),
        literal("public-contact"),
        literal("release-provider"),
      ),
      label: string(),
      status: overviewGateStatus,
      reason: string(),
      actionLabel: optional(string()),
      actionPath: optional(overviewPath),
    }),
  ),
  blockers: array(
    object({
      code: union(
        literal("data-limit-reached"),
        literal("project-copy-incomplete"),
        literal("project-evidence-incomplete"),
        literal("resume-incomplete"),
        literal("public-contact-invalid"),
        literal("release-provider-unavailable"),
      ),
      title: string(),
      reason: string(),
      actionLabel: optional(string()),
      actionPath: optional(overviewPath),
    }),
  ),
  nextAction: optional(
    object({ label: string(), path: overviewPath, reason: string() }),
  ),
  release: object({
    providerState: union(literal("configured"), literal("unavailable")),
    workflowState: union(
      literal("not-requested"),
      literal("requested"),
      literal("acknowledged"),
      literal("failed"),
    ),
    deploymentState: union(
      literal("unknown"),
      literal("deployed"),
      literal("rollback-needed"),
    ),
  }),
  publication: optional(publicationSummary),
});

const listForDashboardReturns = object({
  caseStudies: array(
    object({
      contentId: string(),
      status: caseStudyStatus,
      evidenceStatus,
      updatedAt: number(),
    }),
  ),
  projectDrafts: array(
    object({
      ...projectDraftFields,
      updatedAt: number(),
      publishedAt: optional(number()),
    }),
  ),
  resumeDrafts: array(
    object({
      locale,
      contentJson: string(),
      updatedAt: number(),
      publishedAt: optional(number()),
    }),
  ),
  media: array(
    object({
      id: id("mediaMetadata"),
      storageProvider: mediaStorageProvider,
      storageKey: string(),
      publicUrl: optional(string()),
      altText: string(),
      contentId: optional(string()),
      usage: mediaUsage,
      status: mediaStatus,
      locale: optional(locale),
      selectedForPublic: optional(boolean()),
      selectedForPublicAt: optional(number()),
      updatedAt: number(),
    }),
  ),
  settings: array(
    object({
      key: string(),
      environment,
      value: string(),
      classification: settingClassification,
      updatedAt: number(),
    }),
  ),
  resumeVersions: array(
    object({
      id: id("resumeVersions"),
      locale,
      version: string(),
      pdfPath: string(),
      isPublished: boolean(),
      createdAt: number(),
      publishedAt: optional(number()),
    }),
  ),
  publications: array(publicationSummary),
});

export const contentContract = {
  archiveMedia: {
    visibility: "public",
    args: projectMediaArgs,
    returns: updateMediaReturns,
  },
  createMediaMetadata: {
    visibility: "public",
    args: object({
      storageProvider: writableMediaStorageProvider,
      storageKey: string(),
      publicUrl: optional(string()),
      altText: string(),
      contentId: optional(string()),
      usage: mediaUsage,
      status: mediaStatus,
      locale: optional(locale),
      selectedForPublic: optional(boolean()),
    }),
    returns: object({ mediaId: id("mediaMetadata"), updatedAt: number() }),
  },
  createProject: {
    visibility: "public",
    args: object({
      contentKey: string(),
      status: caseStudyStatus,
      evidenceStatus,
      en: localizedProjectDraft,
      es: localizedProjectDraft,
    }),
    returns: object({ contentId: string(), updatedAt: number() }),
  },
  createResumeVersion: {
    visibility: "public",
    args: object({
      locale,
      version: string(),
      pdfPath: string(),
      isPublished: boolean(),
    }),
    returns: object({
      resumeVersionId: id("resumeVersions"),
      publishedAt: optional(number()),
    }),
  },
  deleteMedia: {
    visibility: "public",
    args: projectMediaArgs,
    returns: object({ mediaId: id("mediaMetadata"), deletedAt: number() }),
  },
  getDashboardOverview: {
    visibility: "public",
    args: object({ environment }),
    returns: dashboardOverviewReturns,
  },
  listForDashboard: {
    visibility: "public",
    args: object({}),
    returns: listForDashboardReturns,
  },
  listForDashboardInternal: {
    visibility: "internal",
    args: object({}),
    returns: listForDashboardReturns,
  },
  publishContentFromDashboard: {
    visibility: "internal",
    args: publicationArgs,
    returns: publicationReturns,
  },
  selectMediaForPublic: {
    visibility: "public",
    args: projectMediaArgs,
    returns: updateMediaReturns,
  },
  upsertProjectDraft: {
    visibility: "public",
    args: upsertProjectArgs,
    returns: upsertProjectReturns,
  },
  upsertProjectDraftFromDashboard: {
    visibility: "internal",
    args: upsertProjectArgs,
    returns: upsertProjectReturns,
  },
  upsertResumeDraft: {
    visibility: "public",
    args: object({ locale, contentJson: string() }),
    returns: object({ locale, updatedAt: number() }),
  },
  upsertSiteSetting: {
    visibility: "public",
    args: upsertSettingArgs,
    returns: upsertSettingReturns,
  },
  upsertSiteSettingFromDashboard: {
    visibility: "internal",
    args: upsertSettingArgs,
    returns: upsertSettingReturns,
  },
} as const;
