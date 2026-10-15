import {
  validateEnvironmentContract,
  type EnvironmentValidationResult,
} from "@aohys/environment";
import { type ReleaseEnvironment } from "@aohys/core/domain";

export {
  ensureCloudflarePagesDomain,
  parseCloudflareProductionDomainEnvironment,
  type CloudflareProductionDomainConfig,
  type CloudflarePagesDomain,
  type CloudflarePagesDomainStatus,
  type EnsureCloudflarePagesDomainOptions,
  type EnsureCloudflarePagesDomainResult,
} from "./cloudflare-pages-domain.js";

export {
  buildReleasePlan,
  formatReleaseStep,
  type ReleaseStep,
} from "./release-plan.js";

import {
  buildCloudflarePagesDeployPlan,
  CLOUDFLARE_PROJECT_NAME,
} from "./deploy-plan.js";

export {
  buildCloudflarePagesDeployPlan,
  type CloudflarePagesDeployPlan,
} from "./deploy-plan.js";

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
  environment: ReleaseEnvironment,
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
    errors.push(
      `PUBLIC_SITE_URL must be ${plan.siteUrl} for ${environment} release.`,
    );
  }

  if (
    values.CLOUDFLARE_PROJECT_NAME &&
    values.CLOUDFLARE_PROJECT_NAME !== plan.projectName
  ) {
    errors.push(`CLOUDFLARE_PROJECT_NAME must be ${plan.projectName}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
