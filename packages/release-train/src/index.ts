import {
  validateEnvironmentContract,
  type EnvironmentValidationResult,
} from "@aohys/environment";

export {
  ensureCloudflarePagesDomain,
  parseCloudflareProductionDomainEnvironment,
  type CloudflareProductionDomainConfig,
  type CloudflarePagesDomain,
  type CloudflarePagesDomainStatus,
  type EnsureCloudflarePagesDomainOptions,
  type EnsureCloudflarePagesDomainResult,
} from "./cloudflare-pages-domain.js";

export type ReleaseDeploymentEnvironment = "preview" | "production";

export interface CloudflarePagesDeployPlan {
  environment: ReleaseDeploymentEnvironment;
  githubEnvironment: ReleaseDeploymentEnvironment;
  branch: "develop" | "main";
  projectName: "aohys-com";
  directory: "apps/site/dist";
  command: readonly string[];
  siteUrl: "https://preview.aohys.com" | "https://aohys.com";
  canonicalUrl: "https://aohys.com";
}

const CLOUDFLARE_PROJECT_NAME = "aohys-com" as const;
const SITE_DIST_DIRECTORY = "apps/site/dist" as const;

const RELEASE_TARGETS = {
  preview: {
    branch: "develop",
    siteUrl: "https://preview.aohys.com",
  },
  production: {
    branch: "main",
    siteUrl: "https://aohys.com",
  },
} as const satisfies Record<
  ReleaseDeploymentEnvironment,
  {
    branch: CloudflarePagesDeployPlan["branch"];
    siteUrl: CloudflarePagesDeployPlan["siteUrl"];
  }
>;

export function buildCloudflarePagesDeployPlan(
  environment: ReleaseDeploymentEnvironment,
): CloudflarePagesDeployPlan {
  const target = RELEASE_TARGETS[environment];

  return {
    environment,
    githubEnvironment: environment,
    branch: target.branch,
    projectName: CLOUDFLARE_PROJECT_NAME,
    directory: SITE_DIST_DIRECTORY,
    command: [
      "wrangler",
      "pages",
      "deploy",
      SITE_DIST_DIRECTORY,
      "--project-name",
      CLOUDFLARE_PROJECT_NAME,
      "--branch",
      target.branch,
    ],
    siteUrl: target.siteUrl,
    canonicalUrl: "https://aohys.com",
  };
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractCloudflarePagesDeploymentUrl(
  output: string,
  projectName: string = CLOUDFLARE_PROJECT_NAME,
): string | undefined {
  const deploymentUrlPattern = new RegExp(
    `https://[a-z0-9-]+\\.${escapeRegexLiteral(projectName)}\\.pages\\.dev`,
    "g",
  );
  const deploymentUrls = output.match(deploymentUrlPattern);

  return deploymentUrls?.at(-1);
}

export function validateReleaseEnvironment(
  environment: ReleaseDeploymentEnvironment,
  values: Record<string, string | undefined>,
): EnvironmentValidationResult {
  const plan = buildCloudflarePagesDeployPlan(environment);
  const contract = validateEnvironmentContract(environment, values, {
    target: "release",
  });
  const errors = [...contract.errors];

  if (values.AOHYS_ENV && values.AOHYS_ENV !== environment) {
    errors.push(`AOHYS_ENV must be ${environment} for ${environment} release.`);
  }

  if (values.PUBLIC_SITE_URL && values.PUBLIC_SITE_URL !== plan.siteUrl) {
    errors.push(`PUBLIC_SITE_URL must be ${plan.siteUrl} for ${environment} release.`);
  }

  if (values.CLOUDFLARE_PROJECT_NAME && values.CLOUDFLARE_PROJECT_NAME !== plan.projectName) {
    errors.push(`CLOUDFLARE_PROJECT_NAME must be ${plan.projectName}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
