import { type ReleaseEnvironment } from "@aohys/core/domain";

export interface CloudflarePagesDeployPlan {
  environment: ReleaseEnvironment;
  githubEnvironment: ReleaseEnvironment;
  branch: "develop" | "main";
  projectName: "aohys-com";
  directory: "apps/site/dist";
  command: readonly string[];
  siteUrl: "https://preview.aohys.com" | "https://aohys.com";
  canonicalUrl: "https://aohys.com";
}

export const CLOUDFLARE_PROJECT_NAME = "aohys-com" as const;
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
  ReleaseEnvironment,
  {
    branch: CloudflarePagesDeployPlan["branch"];
    siteUrl: CloudflarePagesDeployPlan["siteUrl"];
  }
>;

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
    canonicalUrl: "https://aohys.com",
  };
}
