// The one place the release and publication targets are named. Code that
// deploys, dispatches, audits or recognizes them imports from here. Plain
// TypeScript with erasable syntax only, so Node scripts can import it too.

export const CLOUDFLARE_PROJECT_NAME = "aohys-com";

// Hostname suffix of every Cloudflare Pages deployment of the project.
export const PAGES_DEV_SUFFIX = `.${CLOUDFLARE_PROJECT_NAME}.pages.dev`;

// The workflow the dashboard dispatches to publish, and its repository.
export const PUBLISH_TARGET = {
  repository: "AO-HyS/aohys.com",
  workflowId: "release-train.yml",
} as const;

export const RELEASE_TARGETS = {
  preview: { branch: "develop", siteUrl: "https://preview.aohys.com" },
  production: { branch: "main", siteUrl: "https://aohys.com" },
} as const;

// PostHog ingest is proxied by the public site of the environment.
export function postHogIngestHost(siteUrl: string): string {
  return new URL("/ingest", siteUrl).href.replace(/\/$/u, "");
}
