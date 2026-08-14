import { execFileSync } from "node:child_process";

type GitHubVariable = { name: string; value: string };
const REPOSITORY = process.env.GH_REPO?.trim() || "AO-HyS/aohys.com";

function readVariables(environment: "preview" | "production"): Map<string, string> {
  const output = execFileSync("gh", ["variable", "list", "--env", environment, "--repo", REPOSITORY, "--json", "name,value"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Map((JSON.parse(output) as GitHubVariable[]).map(({ name, value }) => [name, value]));
}

function auditInjectedEnvironment(): void {
  const environment = process.env.AOHYS_ENV?.trim();
  const key = process.env.PUBLIC_POSTHOG_KEY?.trim();
  if (environment === "production" && !key) throw new Error("production requires PUBLIC_POSTHOG_KEY.");
  if (environment === "preview" && key) throw new Error("preview must not receive PUBLIC_POSTHOG_KEY.");
}

function auditGitHubEnvironments(): void {
  const preview = readVariables("preview");
  const production = readVariables("production");
  if (preview.get("PUBLIC_POSTHOG_KEY")?.trim()) throw new Error("GitHub Environment preview must not define PUBLIC_POSTHOG_KEY.");
  if (!production.get("PUBLIC_POSTHOG_KEY")?.trim()) throw new Error("GitHub Environment production is missing PUBLIC_POSTHOG_KEY.");
}

try {
  process.env.GITHUB_ACTIONS === "true" ? auditInjectedEnvironment() : auditGitHubEnvironments();
  console.log("PostHog production-only environment contract is valid.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
