import { execFileSync } from "node:child_process";

type GitHubVariable = {
  name: string;
  value: string;
};

const REPOSITORY = process.env.GH_REPO?.trim() || "AO-HyS/aohys.com";
const ENVIRONMENTS = ["preview", "production"] as const;
type EnvironmentName = (typeof ENVIRONMENTS)[number];

function readEnvironmentVariables(environment: EnvironmentName): Map<string, string> {
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
  environment: EnvironmentName,
  name: string,
): string {
  const value = variables.get(name)?.trim();

  if (!value) {
    throw new Error(`GitHub Environment ${environment} is missing ${name}.`);
  }

  return value;
}

function requireCurrentEnvironment(): EnvironmentName {
  const environment = process.env.AOHYS_ENV?.trim();

  if (!environment || !ENVIRONMENTS.includes(environment as EnvironmentName)) {
    throw new Error("AOHYS_ENV must be preview or production when auditing PostHog in GitHub Actions.");
  }

  return environment as EnvironmentName;
}

function readCurrentEnvironmentVariables(): Map<string, string> {
  return new Map(
    ["PUBLIC_POSTHOG_KEY", "PUBLIC_POSTHOG_HOST", "PUBLIC_POSTHOG_AUTOCAPTURE"].map((name) => [
      name,
      process.env[name] ?? "",
    ]),
  );
}

function assertPostHogPolicy(
  environment: EnvironmentName,
  postHogHost: string,
  postHogAutocapture: string,
): void {
  if (postHogHost !== "https://us.i.posthog.com") {
    throw new Error(`${environment} PUBLIC_POSTHOG_HOST must be https://us.i.posthog.com.`);
  }

  if (postHogAutocapture !== "false") {
    throw new Error(`${environment} PUBLIC_POSTHOG_AUTOCAPTURE must stay false.`);
  }
}

function auditCurrentGitHubActionsEnvironment(): void {
  const environment = requireCurrentEnvironment();
  const variables = readCurrentEnvironmentVariables();
  requireVariable(variables, environment, "PUBLIC_POSTHOG_KEY");
  const postHogHost = requireVariable(variables, environment, "PUBLIC_POSTHOG_HOST");
  const postHogAutocapture = requireVariable(variables, environment, "PUBLIC_POSTHOG_AUTOCAPTURE");
  assertPostHogPolicy(environment, postHogHost, postHogAutocapture);

  console.log(
    `PostHog ${environment} environment values are valid. GitHub Environment cross-check is skipped in Actions because GITHUB_TOKEN cannot read environment variables; Cloudflare runtime audit verifies deployed preview/production separation.`,
  );
}

function auditGitHubEnvironmentSeparation(): void {
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

  assertPostHogPolicy("preview", previewHost, previewAutocapture);
  assertPostHogPolicy("production", productionHost, productionAutocapture);

  console.log("PostHog environment separation is valid. Preview and production use different project keys.");
}

try {
  if (process.env.GITHUB_ACTIONS === "true") {
    auditCurrentGitHubActionsEnvironment();
  } else {
    auditGitHubEnvironmentSeparation();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
