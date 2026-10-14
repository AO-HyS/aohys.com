import {
  ENVIRONMENTS,
  RELEASE_ENVIRONMENTS,
  VARIABLE_DESTINATIONS,
  type Environment,
  type GithubValueSource,
  type ReleaseEnvironment,
  type VariableDestination,
  type VariableClassification,
} from "@aohys/core/domain";

export type VariableExposure = "public-browser" | "server-only";

export type ProviderName =
  | "core"
  | "cloudflare"
  | "convex"
  | "better-auth"
  | "github"
  | "posthog"
  | "resend";

export interface EnvironmentVariableDefinition {
  name: string;
  provider: ProviderName;
  classification: VariableClassification;
  exposure: VariableExposure;
  requiredIn: readonly Environment[];
  requiredTargets?: readonly EnvironmentValidationTarget[];
  description: string;
  // Delivery targets; sync scripts, the Convex runtime and the release
  // workflow derive their variable lists from this field.
  destinations: readonly VariableDestination[];
  // How release jobs receive the value; environments default to both.
  github?: {
    source: GithubValueSource;
    environments?: readonly ReleaseEnvironment[];
  };
  // Value written to .env.example; omitted variables are CI-only.
  localExample?: string;
}

export interface EnvironmentValidationResult {
  ok: boolean;
  errors: string[];
}

export type EnvironmentValidationTarget =
  | "runtime"
  | "release"
  | "dashboard-runtime"
  | "auth-runtime";

export interface EnvironmentValidationOptions {
  target?: EnvironmentValidationTarget;
}

const DEFAULT_REQUIRED_TARGETS = [
  "runtime",
  "release",
] as const satisfies readonly EnvironmentValidationTarget[];
const DASHBOARD_RUNTIME_TARGETS = [
  "runtime",
  "release",
  "dashboard-runtime",
  "auth-runtime",
] as const satisfies readonly EnvironmentValidationTarget[];
const AUTH_RUNTIME_TARGETS = [
  "runtime",
  "release",
  "auth-runtime",
] as const satisfies readonly EnvironmentValidationTarget[];
const CONVEX_CLIENT_TARGETS = [
  "runtime",
  "release",
  "dashboard-runtime",
] as const satisfies readonly EnvironmentValidationTarget[];
const RELEASE_CONTEXT_TARGETS = [
  "runtime",
  "release",
  "dashboard-runtime",
] as const satisfies readonly EnvironmentValidationTarget[];

// Every destination except the Pages runtime bindings.
const CONVEX_RUNTIME_AND_RELEASE = [
  "convex-runtime",
  "release-job",
] as const satisfies readonly VariableDestination[]; // domain-vocabulary-ok

const DEFINITIONS: EnvironmentVariableDefinition[] = [
  {
    name: "AOHYS_ENV",
    provider: "core",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ENVIRONMENTS,
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Environment Contract name for the current runtime.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "environment-name",
    },
    localExample: "local",
  },
  {
    name: "PUBLIC_SITE_URL",
    provider: "core",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ENVIRONMENTS,
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Canonical URL for the current public site environment.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "variable",
    },
    localExample: "http://localhost:4321",
  },
  {
    name: "PUBLIC_CONTACT_ENDPOINT",
    provider: "core",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ENVIRONMENTS,
    description:
      "Public contact submission endpoint, backed by the Convex HTTP action.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "variable",
    },
    localExample: "",
  },
  {
    name: "CONVEX_URL",
    provider: "convex",
    classification: "provider-output",
    exposure: "public-browser",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: CONVEX_CLIENT_TARGETS,
    description:
      "Convex deployment URL consumed by server code and the dashboard SPA runtime.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "variable",
    },
    localExample: "",
  },
  {
    name: "CONVEX_DEPLOYMENT",
    provider: "convex",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    description: "Convex deployment selector for the target environment.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "variable",
    },
    localExample: "",
  },
  {
    name: "CONVEX_SITE_URL",
    provider: "convex",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Convex HTTP actions URL generated for the target deployment.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "variable",
    },
    localExample: "",
  },
  {
    name: "CONVEX_DEPLOY_KEY",
    provider: "convex",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: ["release"],
    description:
      "GitHub Environment secret used by CI/release flows to deploy Convex.",
    destinations: ["release-job"],
    github: {
      source: "secret",
    },
    localExample: "",
  },
  {
    name: "PUBLIC_POSTHOG_KEY",
    provider: "posthog",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ["production"], // domain-vocabulary-ok
    description:
      "Production-only PostHog public key; browser traffic uses the first-party /ingest proxy.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "variable",
      environments: ["production"], // domain-vocabulary-ok
    },
    localExample: "",
  },
  {
    name: "PUBLIC_RELEASE_SHA",
    provider: "github",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: RELEASE_CONTEXT_TARGETS,
    description:
      "Full github.sha shared by public browser, edge, and Convex telemetry.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "release-sha",
    },
  },
  {
    name: "VITE_RELEASE_SHA",
    provider: "github",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: ["release"],
    description:
      "Full github.sha embedded in the private dashboard browser bundle.",
    destinations: ["release-job"],
    github: {
      source: "release-sha",
    },
  },
  {
    name: "RESEND_API_KEY",
    provider: "resend",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    description: "Server-only Resend API key for lead notifications.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "secret",
    },
    localExample: "",
  },
  {
    name: "RESEND_FROM",
    provider: "resend",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ENVIRONMENTS,
    description: "Verified sender identity for lead notifications.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "variable",
    },
    localExample: "Alejandro Ortiz <contact@aohys.com>",
  },
  {
    name: "LEAD_NOTIFICATION_EMAIL",
    provider: "resend",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ENVIRONMENTS,
    description: "Admin inbox for lead notification delivery.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "variable",
    },
    localExample: "alejandro.ortiz@aohys.com",
  },
  {
    name: "BETTER_AUTH_SECRET",
    provider: "better-auth",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: AUTH_RUNTIME_TARGETS,
    description:
      "Better Auth secret for signed auth state, owned by the auth runtime.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "secret",
    },
    localExample: "",
  },
  {
    name: "BETTER_AUTH_URL",
    provider: "better-auth",
    classification: "provider-output",
    exposure: "public-browser",
    requiredIn: ENVIRONMENTS,
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Trusted Better Auth base URL for the current environment.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "variable",
    },
    localExample: "http://localhost:4321",
  },
  {
    name: "BETTER_AUTH_TRUSTED_ORIGINS",
    provider: "better-auth",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ENVIRONMENTS,
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description:
      "Comma-separated origins accepted by Better Auth for the current environment.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "variable",
    },
    localExample: "http://localhost:4321",
  },
  {
    name: "ADMIN_EMAIL",
    provider: "better-auth",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ENVIRONMENTS,
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Comma-separated admin allowlist email addresses.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "variable",
    },
    localExample: "alejandro.ortiz@aohys.com",
  },
  {
    name: "GOOGLE_CLIENT_ID",
    provider: "better-auth",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: AUTH_RUNTIME_TARGETS,
    description:
      "Google OAuth client identifier used by Better Auth social sign-in.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "variable",
    },
    localExample: "",
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    provider: "better-auth",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: AUTH_RUNTIME_TARGETS,
    description:
      "Google OAuth client secret used only by Better Auth server routes.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "secret",
    },
    localExample: "",
  },
  {
    name: "CLOUDFLARE_ACCOUNT_ID",
    provider: "cloudflare",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: ["release"],
    description:
      "Cloudflare account identifier for release workflows and Images direct-upload URLs.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "secret",
    },
    localExample: "",
  },
  {
    name: "CLOUDFLARE_API_TOKEN",
    provider: "cloudflare",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: ["release"],
    description:
      "GitHub Environment secret used by Wrangler to deploy Cloudflare Pages.",
    destinations: ["release-job"],
    github: {
      source: "secret",
    },
    localExample: "",
  },
  {
    name: "CLOUDFLARE_PROJECT_NAME",
    provider: "cloudflare",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: ["release"],
    description: "Cloudflare Pages/Workers project name.",
    destinations: ["release-job"],
    github: {
      source: "variable",
    },
    localExample: "aohys-com",
  },
  {
    name: "CLOUDFLARE_IMAGES_ACCOUNT_HASH",
    provider: "cloudflare",
    classification: "provider-output",
    exposure: "public-browser",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: ["release", "dashboard-runtime"],
    description:
      "Cloudflare Images delivery account hash for dashboard media URLs.",
    destinations: VARIABLE_DESTINATIONS,
    github: {
      source: "variable",
    },
    localExample: "",
  },
  {
    name: "CLOUDFLARE_IMAGES_API_TOKEN",
    provider: "cloudflare",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: ["release"],
    description:
      "Narrow Cloudflare Images token used by Convex to create direct upload URLs.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "secret",
    },
    localExample: "",
  },
  {
    name: "PUBLISH_GITHUB_TOKEN",
    provider: "github",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: RELEASE_ENVIRONMENTS,
    requiredTargets: ["release"],
    description:
      "Token used by Convex to queue the Release Train workflow after dashboard publish.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "secret",
    },
  },
  {
    name: "PUBLISH_GITHUB_REPOSITORY",
    provider: "github",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: [],
    description:
      "Optional owner/repo override for dashboard-triggered publish workflow dispatch.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "variable",
    },
  },
  {
    name: "PUBLISH_GITHUB_WORKFLOW_ID",
    provider: "github",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: [],
    description:
      "Optional workflow file override for dashboard-triggered publish workflow dispatch.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "variable",
    },
  },
  {
    name: "PUBLIC_CONTACT_EMAIL",
    provider: "core",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ENVIRONMENTS,
    description: "Public contact email displayed in the site.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "variable",
    },
    localExample: "alejandro.ortiz@aohys.com",
  },
  {
    name: "PUBLIC_WHATSAPP_URL",
    provider: "core",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ENVIRONMENTS,
    description: "Public WhatsApp contact URL.",
    destinations: CONVEX_RUNTIME_AND_RELEASE,
    github: {
      source: "variable",
    },
    localExample: "",
  },
  {
    name: "SMOKE_CONTACT_SUBMIT",
    provider: "core",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: [],
    description:
      "Opt-in flag for the preview release smoke to submit a real contact lead.",
    destinations: ["release-job"],
    github: {
      source: "variable",
      environments: ["preview"], // domain-vocabulary-ok
    },
  },
];

export function getEnvironmentVariableDefinitions(): EnvironmentVariableDefinition[] {
  return [...DEFINITIONS];
}

// Variables delivered to a destination, optionally only those required in
// one environment.
export function getVariableNamesForDestination(
  destination: VariableDestination,
  environment?: Environment,
): string[] {
  return DEFINITIONS.filter(
    (definition) =>
      definition.destinations.includes(destination) &&
      (environment === undefined ||
        definition.requiredIn.includes(environment)),
  ).map((definition) => definition.name);
}

export function validateEnvironmentContract(
  environment: Environment,
  values: Record<string, string | undefined>,
  options: EnvironmentValidationOptions = {},
): EnvironmentValidationResult {
  const errors: string[] = [];
  const target = options.target ?? "release";

  if (!ENVIRONMENTS.includes(environment)) {
    errors.push(`${environment} is not a supported environment.`);
  }

  for (const definition of DEFINITIONS) {
    const requiredTargets =
      definition.requiredTargets ?? DEFAULT_REQUIRED_TARGETS;
    const isRequired =
      definition.requiredIn.includes(environment) &&
      requiredTargets.includes(target);

    if (isRequired && !values[definition.name]) {
      const scope = definition.requiredTargets ? ` ${target}` : "";
      errors.push(`${definition.name} is required for ${environment}${scope}.`);
    }

    if (
      definition.classification === "server-secret" &&
      (definition.exposure !== "server-only" ||
        definition.name.startsWith("PUBLIC_"))
    ) {
      errors.push(
        `${definition.name} is a server secret and must not be public.`,
      );
    }
  }

  const publicSiteUrl = values.PUBLIC_SITE_URL;
  if (
    environment === "production" &&
    publicSiteUrl &&
    !hasExactOrigin(publicSiteUrl, "https://aohys.com")
  ) {
    errors.push(
      "PUBLIC_SITE_URL must point to https://aohys.com in production.",
    );
  }

  const betterAuthTrustedOrigins = parseCommaSeparatedOrigins(
    values.BETTER_AUTH_TRUSTED_ORIGINS,
  );
  const betterAuthUrl = values.BETTER_AUTH_URL;
  if (
    betterAuthUrl &&
    betterAuthTrustedOrigins.length > 0 &&
    !betterAuthTrustedOrigins.includes(betterAuthUrl)
  ) {
    errors.push("BETTER_AUTH_TRUSTED_ORIGINS must include BETTER_AUTH_URL.");
  }

  if (
    publicSiteUrl &&
    betterAuthTrustedOrigins.length > 0 &&
    !betterAuthTrustedOrigins.includes(publicSiteUrl)
  ) {
    errors.push("BETTER_AUTH_TRUSTED_ORIGINS must include PUBLIC_SITE_URL.");
  }

  const adminEmails = parseCommaSeparatedValues(values.ADMIN_EMAIL);
  if (adminEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors.push("ADMIN_EMAIL must contain valid email addresses.");
  }

  const convexDeployment = values.CONVEX_DEPLOYMENT;
  if (environment === "production" && convexDeployment?.includes("preview")) {
    errors.push("CONVEX_DEPLOYMENT must not point to preview in production.");
  }

  const publicReleaseSha = normalizeGitCommitSha(values.PUBLIC_RELEASE_SHA);
  const dashboardReleaseSha = normalizeGitCommitSha(values.VITE_RELEASE_SHA);
  if (values.PUBLIC_RELEASE_SHA && !publicReleaseSha) {
    errors.push("PUBLIC_RELEASE_SHA must be a full 40-character git SHA.");
  }
  if (values.VITE_RELEASE_SHA && !dashboardReleaseSha) {
    errors.push("VITE_RELEASE_SHA must be a full 40-character git SHA.");
  }
  if (
    publicReleaseSha &&
    dashboardReleaseSha &&
    publicReleaseSha !== dashboardReleaseSha
  ) {
    errors.push("PUBLIC_RELEASE_SHA and VITE_RELEASE_SHA must match.");
  }

  return { ok: errors.length === 0, errors };
}

function normalizeGitCommitSha(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^[0-9a-f]{40}$/.test(normalized)
    ? normalized
    : undefined;
}

function hasExactOrigin(value: string, expectedOrigin: string): boolean {
  try {
    return new URL(value).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function parseCommaSeparatedOrigins(value: string | undefined): string[] {
  return parseCommaSeparatedValues(value);
}

function parseCommaSeparatedValues(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
