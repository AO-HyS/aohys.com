import { execFileSync } from "node:child_process";

type GitHubVariable = {
  name: string;
  value: string;
};

const REPOSITORY = process.env.GH_REPO?.trim() || "AO-HyS/aohys.com";
const ENVIRONMENTS = ["preview", "production"] as const;

function readEnvironmentVariables(environment: (typeof ENVIRONMENTS)[number]): Map<string, string> {
  const output = execFileSync(
    "gh",
    [
      "variable",
      "list",
      "--env",
      environment,
      "--repo",
      REPOSITORY,
      "--json",
      "name,value",
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const variables = JSON.parse(output) as GitHubVariable[];

  return new Map(variables.map((variable) => [variable.name, variable.value]));
}

function requireVariable(
  variables: Map<string, string>,
  environment: (typeof ENVIRONMENTS)[number],
  name: string,
): string {
  const value = variables.get(name)?.trim();

  if (!value) {
    throw new Error(`GitHub Environment ${environment} is missing ${name}.`);
  }

  return value;
}

try {
  const preview = readEnvironmentVariables("preview");
  const production = readEnvironmentVariables("production");
  const previewKey = requireVariable(preview, "preview", "PUBLIC_POSTHOG_KEY");
  const productionKey = requireVariable(production, "production", "PUBLIC_POSTHOG_KEY");
  const previewHost = requireVariable(preview, "preview", "PUBLIC_POSTHOG_HOST");
  const productionHost = requireVariable(production, "production", "PUBLIC_POSTHOG_HOST");
  const previewAutocapture = requireVariable(preview, "preview", "PUBLIC_POSTHOG_AUTOCAPTURE");
  const productionAutocapture = requireVariable(production, "production", "PUBLIC_POSTHOG_AUTOCAPTURE");

  if (previewKey === productionKey) {
    throw new Error(
      "GitHub Environment preview and production use the same PUBLIC_POSTHOG_KEY. Create separate PostHog projects and update the environment variables before launch promotion.",
    );
  }

  if (previewHost !== productionHost) {
    throw new Error("PUBLIC_POSTHOG_HOST should match across preview and production unless PostHog region changes intentionally.");
  }

  if (previewAutocapture !== "false" || productionAutocapture !== "false") {
    throw new Error("PUBLIC_POSTHOG_AUTOCAPTURE must stay false for both preview and production.");
  }

  console.log("PostHog environment separation is valid. Preview and production use different project keys.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
