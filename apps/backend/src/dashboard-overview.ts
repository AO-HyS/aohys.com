export type DashboardEnvironment = "local" | "preview" | "production";
export type DashboardLocale = "en" | "es";
export type DashboardOverviewPath = "/projects" | "/resume" | "/settings";
export type DashboardGateStatus = "clear" | "ready" | "blocked" | "unavailable";

export interface DashboardOverviewInput {
  environment: DashboardEnvironment;
  truncated: boolean;
  projectDrafts: Array<{
    contentId: string;
    locale: DashboardLocale;
    title: string;
    summary: string;
    seoDescription: string;
    ctaLabel: string;
    ctaHref: string;
    achievements: string;
    structureNotes: string;
    publishedAt?: number;
  }>;
  caseStudies: Array<{
    contentId: string;
    evidenceStatus: "missing" | "sanitized" | "published";
  }>;
  media: Array<{
    contentId?: string;
    status: "draft" | "published";
    selectedForPublic?: boolean;
  }>;
  resumeDrafts: Array<{
    locale: DashboardLocale;
    contentJson: string;
    publishedAt?: number;
  }>;
  settings: Array<{
    key: string;
    value: string;
    classification: "public-build-value" | "provider-output" | "policy-value";
  }>;
  releaseProviderConfigured: boolean;
}

export interface DashboardOverviewGate {
  id: "project-copy" | "evidence" | "resume" | "public-contact" | "release-provider";
  label: string;
  status: DashboardGateStatus;
  reason: string;
  actionLabel?: string;
  actionPath?: DashboardOverviewPath;
}

export interface DashboardOverviewBlocker {
  code:
    | "data-limit-reached"
    | "project-copy-incomplete"
    | "project-evidence-incomplete"
    | "resume-incomplete"
    | "public-contact-invalid"
    | "release-provider-unavailable";
  title: string;
  reason: string;
  actionLabel?: string;
  actionPath?: DashboardOverviewPath;
}

export interface DashboardOverview {
  environment: DashboardEnvironment;
  state: "clear" | "action-required" | "ready-to-queue" | "partial";
  gates: DashboardOverviewGate[];
  blockers: DashboardOverviewBlocker[];
  nextAction?: {
    label: string;
    path: DashboardOverviewPath;
    reason: string;
  };
  release: {
    providerState: "configured" | "unavailable";
    workflowState: "not-requested";
    deploymentState: "unknown";
  };
}

const REQUIRED_LOCALES = ["en", "es"] as const;
const MAX_BLOCKERS = 8;

export function buildDashboardOverview(input: DashboardOverviewInput): DashboardOverview {
  const pendingProjectDrafts = input.projectDrafts.filter((draft) => draft.publishedAt === undefined);
  const pendingProjectIds = unique(pendingProjectDrafts.map((draft) => draft.contentId));
  const pendingResumeDrafts = input.resumeDrafts.filter((draft) => draft.publishedAt === undefined);

  const projectCopyComplete = pendingProjectIds.every((contentId) =>
    REQUIRED_LOCALES.every((locale) => {
      const draft = pendingProjectDrafts.find((candidate) =>
        candidate.contentId === contentId && candidate.locale === locale
      );
      return draft !== undefined && projectDraftHasRequiredCopy(draft);
    })
  );
  const evidenceComplete = pendingProjectIds.every((contentId) => {
    const metadata = input.caseStudies.find((candidate) => candidate.contentId === contentId);
    const hasSelectedMedia = input.media.some((candidate) =>
      candidate.contentId === contentId && candidate.selectedForPublic === true
    );
    return metadata?.evidenceStatus !== "missing" && metadata !== undefined && hasSelectedMedia;
  });
  const resumeComplete = pendingResumeDrafts.length === 0 || REQUIRED_LOCALES.every((locale) => {
    const draft = pendingResumeDrafts.find((candidate) => candidate.locale === locale);
    return draft !== undefined && isJsonObject(draft.contentJson);
  });
  const publicContact = input.settings.find((setting) =>
    setting.key === "PUBLIC_WHATSAPP_URL" && setting.classification === "public-build-value"
  );
  const publicContactValid = publicContact !== undefined && isPublicWhatsappUrl(publicContact.value);

  const gates: DashboardOverviewGate[] = [
    pendingProjectIds.length === 0
      ? gate("project-copy", "Project copy", "clear", "No unpublished project copy is waiting for review.")
      : projectCopyComplete
        ? gate("project-copy", "Project copy", "ready", "Every pending project has complete English and Spanish release copy.", "Review projects", "/projects")
        : gate("project-copy", "Project copy", "blocked", "At least one pending project is missing a locale or required release field.", "Complete project copy", "/projects"),
    pendingProjectIds.length === 0
      ? gate("evidence", "Project evidence", "clear", "No unpublished project evidence is waiting for review.")
      : evidenceComplete
        ? gate("evidence", "Project evidence", "ready", "Every pending project has reviewed evidence metadata and one selected public asset.", "Review evidence", "/projects")
        : gate("evidence", "Project evidence", "blocked", "At least one pending project is missing reviewed evidence or a selected public asset.", "Complete project evidence", "/projects"),
    pendingResumeDrafts.length === 0
      ? gate("resume", "Resume", "clear", "No unpublished resume draft is waiting for review.")
      : resumeComplete
        ? gate("resume", "Resume", "ready", "English and Spanish resume drafts are valid and ready for deliberate publication.", "Review resume", "/resume")
        : gate("resume", "Resume", "blocked", "Resume publication needs valid English and Spanish drafts.", "Complete resume", "/resume"),
    publicContactValid
      ? gate("public-contact", "Public contact", "clear", "The public WhatsApp destination is a valid wa.me URL.", "Review settings", "/settings")
      : gate("public-contact", "Public contact", "blocked", "PUBLIC_WHATSAPP_URL is missing or is not a valid public wa.me URL.", "Fix public contact", "/settings"),
    input.releaseProviderConfigured
      ? gate("release-provider", "Release provider", "ready", "The Convex release dispatcher has the required GitHub provider configuration.")
      : gate("release-provider", "Release provider", "unavailable", "The release dispatcher is not configured. Dashboard publication cannot queue the Release Train."),
  ];

  const blockers = [
    ...(input.truncated ? [{
      code: "data-limit-reached" as const,
      title: "Readiness is partial",
      reason: "The bounded overview query reached a safety limit. Review the source surfaces before publication.",
    }] : []),
    ...gates.flatMap((item): DashboardOverviewBlocker[] => {
      if (item.status !== "blocked" && item.status !== "unavailable") return [];
      return [{
        code: blockerCodeByGate[item.id],
        title: item.label,
        reason: item.reason,
        actionLabel: item.actionLabel,
        actionPath: item.actionPath,
      }];
    }),
  ].slice(0, MAX_BLOCKERS);
  const firstActionable = blockers.find((blocker) => blocker.actionPath && blocker.actionLabel);
  const readyGate = gates.find((item) => item.status === "ready" && item.actionPath && item.actionLabel);
  const nextSource = firstActionable ?? readyGate;
  const hasPendingContent = pendingProjectIds.length > 0 || pendingResumeDrafts.length > 0;

  return {
    environment: input.environment,
    state: input.truncated
      ? "partial"
      : blockers.length > 0
        ? "action-required"
        : hasPendingContent
          ? "ready-to-queue"
          : "clear",
    gates,
    blockers,
    nextAction: nextSource?.actionPath && nextSource.actionLabel
      ? { label: nextSource.actionLabel, path: nextSource.actionPath, reason: nextSource.reason }
      : undefined,
    release: {
      providerState: input.releaseProviderConfigured ? "configured" : "unavailable",
      workflowState: "not-requested",
      deploymentState: "unknown",
    },
  };
}

const blockerCodeByGate = {
  "project-copy": "project-copy-incomplete",
  evidence: "project-evidence-incomplete",
  resume: "resume-incomplete",
  "public-contact": "public-contact-invalid",
  "release-provider": "release-provider-unavailable",
} as const satisfies Record<DashboardOverviewGate["id"], DashboardOverviewBlocker["code"]>;

function gate(
  id: DashboardOverviewGate["id"],
  label: string,
  status: DashboardGateStatus,
  reason: string,
  actionLabel?: string,
  actionPath?: DashboardOverviewPath,
): DashboardOverviewGate {
  return { id, label, status, reason, actionLabel, actionPath };
}

function projectDraftHasRequiredCopy(draft: DashboardOverviewInput["projectDrafts"][number]): boolean {
  return [
    draft.title,
    draft.summary,
    draft.seoDescription,
    draft.ctaLabel,
    draft.ctaHref,
    draft.achievements,
    draft.structureNotes,
  ].every((value) => value.trim().length > 0);
}

function isJsonObject(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function isPublicWhatsappUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "wa.me" && /^\/\d+$/.test(url.pathname);
  } catch {
    return false;
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
