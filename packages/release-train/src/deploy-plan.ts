import { type ReleaseEnvironment } from "@aohys/core/domain";
import {
  CANONICAL_ORIGIN,
  CLOUDFLARE_PROJECT_NAME,
  RELEASE_TARGETS,
} from "@aohys/core/release-targets";

export { CLOUDFLARE_PROJECT_NAME };

export interface CloudflarePagesDeployPlan {
  environment: ReleaseEnvironment;
  githubEnvironment: ReleaseEnvironment;
  branch: "develop" | "main";
  projectName: typeof CLOUDFLARE_PROJECT_NAME;
  directory: "apps/site/dist";
  command: readonly string[];
  siteUrl: string;
  canonicalUrl: string;
}

const SITE_DIST_DIRECTORY = "apps/site/dist" as const;

export function buildCloudflarePagesDeployPlan(
  environment: ReleaseEnvironment,
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
    canonicalUrl: CANONICAL_ORIGIN,
  };
}
