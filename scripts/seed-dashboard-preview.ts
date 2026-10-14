import {
  getCaseStudyPageContent,
  getLocalizedPath,
  getLocaleVariant,
  type ContentId,
} from "../packages/content-graph/src/index.ts";
import { hasConvexDeploymentAccess, runConvexFunction } from "./convex-run.js";
import type { internal } from "@aohys/backend/convex/_generated/api";
import type { FunctionArgs } from "convex/server";
import { parseDashboardContentPayload } from "./apply-dashboard-published-content.js";

type DashboardProjectDraftPayload = FunctionArgs<
  typeof internal.content.upsertProjectDraftFromDashboard
>;
type DashboardSiteSettingPayload = FunctionArgs<
  typeof internal.content.upsertSiteSettingFromDashboard
>;
import {
  LOCALES,
  type CaseStudyEvidenceStatus,
  type CaseStudyStatus,
} from "@aohys/core/domain";

const PROJECT_IDS = [
  "case-study:casa-roca",
  "case-study:the-barber-central",
  "case-study:nutri-plan",
  "case-study:enterprise-systems",
  "case-study:engineering-practice",
] as const satisfies readonly ContentId[];

const DEFAULT_WHATSAPP_URL = "https://wa.me/522299020825";
const DRY_RUN_FLAG = "--dry-run";

type ProjectId = (typeof PROJECT_IDS)[number];

interface ProjectSeedDefinition {
  status: CaseStudyStatus;
  evidenceStatus: CaseStudyEvidenceStatus;
  projectUrl?: string;
}

const projectSeedDefinitions: Record<ProjectId, ProjectSeedDefinition> = {
  "case-study:casa-roca": {
    status: "production-proof",
    evidenceStatus: "published",
    projectUrl: "https://casa-roca.mx",
  },
  "case-study:the-barber-central": {
    status: "active-build",
    evidenceStatus: "sanitized",
    projectUrl: "https://the-barber-central-landing.a-ortizcrr.workers.dev",
  },
  "case-study:nutri-plan": {
    status: "private-build",
    evidenceStatus: "sanitized",
    projectUrl: "https://aohys.com/case-studies/nutri-plan",
  },
  "case-study:enterprise-systems": {
    status: "enterprise-confidential",
    evidenceStatus: "sanitized",
    projectUrl: "https://aohys.com/case-studies/enterprise-systems",
  },
  "case-study:engineering-practice": {
    status: "engineering-practice",
    evidenceStatus: "published",
    projectUrl: "https://github.com/AO-HyS/aohys.com",
  },
};

function isDryRun(): boolean {
  return process.argv.includes(DRY_RUN_FLAG);
}

function projectPayloads(): DashboardProjectDraftPayload[] {
  return PROJECT_IDS.flatMap((contentId) => {
    const definition = projectSeedDefinitions[contentId];

    return LOCALES.map((locale) => {
      const variant = getLocaleVariant(contentId, locale);
      const caseStudy = getCaseStudyPageContent(contentId, locale);
      if (!caseStudy) {
        throw new Error(
          `Missing approved case-study content: ${contentId} (${locale}).`,
        );
      }

      if (!variant.primaryActionContentId || !variant.primaryActionLabel) {
        throw new Error(
          `Missing primary action for approved content: ${contentId} (${locale}).`,
        );
      }

      return {
        contentId,
        status: definition.status,
        evidenceStatus: definition.evidenceStatus,
        locale,
        title: variant.title,
        summary: variant.summary,
        seoDescription: variant.seoDescription,
        ...(definition.projectUrl ? { projectUrl: definition.projectUrl } : {}),
        ctaLabel: variant.primaryActionLabel,
        ctaHref: getLocalizedPath(variant.primaryActionContentId, locale),
        achievements: [
          caseStudy.businessOutcome.body,
          caseStudy.executionHighlights.body,
        ].join("\n\n"),
        structureNotes: [
          caseStudy.architectureDecisions.body,
          caseStudy.qualitySecurityPerformance.body,
        ].join("\n\n"),
      };
    });
  });
}

function siteSettingPayloads(): DashboardSiteSettingPayload[] {
  return [
    {
      key: "PUBLIC_WHATSAPP_URL",
      environment: "preview",
      value: process.env.PUBLIC_WHATSAPP_URL?.trim() || DEFAULT_WHATSAPP_URL,
      classification: "public-build-value",
    },
  ];
}

async function main(): Promise<void> {
  const dryRun = isDryRun();

  if (!dryRun && process.env.AOHYS_ENV !== "preview") {
    throw new Error("Dashboard preview seed only runs when AOHYS_ENV=preview.");
  }

  const projects = projectPayloads();
  const settings = siteSettingPayloads();

  if (dryRun) {
    console.log(
      `Dashboard preview seed dry run passed: ${projects.length} project drafts, ${settings.length} settings.`,
    );
    return;
  }

  if (!hasConvexDeploymentAccess()) {
    throw new Error(
      "CONVEX_DEPLOY_KEY or CONVEX_DEPLOYMENT is required to seed the preview dashboard.",
    );
  }

  const existingContent = runConvexFunction(
    "content:listForDashboardInternal",
    {},
    parseDashboardContentPayload,
  );
  const existingProjectsByKey = new Map(
    existingContent.projectDrafts.map((project) => [
      `${project.contentId}:${project.locale}`,
      project,
    ]),
  );
  const existingSettingKeys = new Set(
    existingContent.settings.map(
      (setting) => `${setting.environment}:${setting.key}`,
    ),
  );
  const missingProjects = projects.filter((project) => {
    const existingProject = existingProjectsByKey.get(
      `${project.contentId}:${project.locale}`,
    );

    return !existingProject;
  });
  const missingSettings = settings.filter(
    (setting) =>
      !existingSettingKeys.has(`${setting.environment}:${setting.key}`),
  );

  for (const project of missingProjects) {
    runConvexFunction(
      "content:upsertProjectDraftFromDashboard",
      project,
      () => undefined,
    );
  }

  for (const setting of missingSettings) {
    runConvexFunction(
      "content:upsertSiteSettingFromDashboard",
      setting,
      () => undefined,
    );
  }

  console.log(
    `Seeded dashboard preview content: ${missingProjects.length} missing project drafts, ${missingSettings.length} missing settings. Preserved existing dashboard edits.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
