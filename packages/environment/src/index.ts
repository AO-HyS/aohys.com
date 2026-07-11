export type EnvironmentName = "local" | "preview" | "production";

export type VariableClassification =
  | "public-build-value"
  | "server-secret"
  | "provider-output"
  | "policy-value";

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
  requiredIn: readonly EnvironmentName[];
  requiredTargets?: readonly EnvironmentValidationTarget[];
  description: string;
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

const ENVIRONMENTS = ["local", "preview", "production"] as const satisfies readonly EnvironmentName[];
const DEFAULT_REQUIRED_TARGETS = ["runtime", "release"] as const satisfies readonly EnvironmentValidationTarget[];
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

const DEFINITIONS: EnvironmentVariableDefinition[] = [
  {
    name: "AOHYS_ENV",
    provider: "core",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ["local", "preview", "production"],
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Environment Contract name for the current runtime.",
  },
  {
    name: "PUBLIC_SITE_URL",
    provider: "core",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ["local", "preview", "production"],
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Canonical URL for the current public site environment.",
  },
  {
    name: "PUBLIC_CONTACT_ENDPOINT",
    provider: "core",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ["local", "preview", "production"],
    description: "Public contact submission endpoint, backed by the Convex HTTP action.",
  },
  {
    name: "CONVEX_URL",
    provider: "convex",
    classification: "provider-output",
    exposure: "public-browser",
    requiredIn: ["preview", "production"],
    requiredTargets: CONVEX_CLIENT_TARGETS,
    description: "Convex deployment URL consumed by server code and the dashboard SPA runtime.",
  },
  {
    name: "CONVEX_DEPLOYMENT",
    provider: "convex",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    description: "Convex deployment selector for the target environment.",
  },
  {
    name: "CONVEX_SITE_URL",
    provider: "convex",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Convex HTTP actions URL generated for the target deployment.",
  },
  {
    name: "CONVEX_DEPLOY_KEY",
    provider: "convex",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: ["release"],
    description: "GitHub Environment secret used by CI/release flows to deploy Convex.",
  },
  {
    name: "PUBLIC_POSTHOG_KEY",
    provider: "posthog",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ["preview", "production"],
    description: "PostHog public browser key for analytics capture.",
  },
  {
    name: "PUBLIC_POSTHOG_HOST",
    provider: "posthog",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ["local", "preview", "production"],
    description: "PostHog ingestion host.",
  },
  {
    name: "PUBLIC_POSTHOG_AUTOCAPTURE",
    provider: "posthog",
    classification: "policy-value",
    exposure: "public-browser",
    requiredIn: ["local", "preview", "production"],
    description: "Explicit autocapture policy for the current environment.",
  },
  {
    name: "RESEND_API_KEY",
    provider: "resend",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    description: "Server-only Resend API key for lead notifications.",
  },
  {
    name: "RESEND_FROM",
    provider: "resend",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ["local", "preview", "production"],
    description: "Verified sender identity for lead notifications.",
  },
  {
    name: "LEAD_NOTIFICATION_EMAIL",
    provider: "resend",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ["local", "preview", "production"],
    description: "Admin inbox for lead notification delivery.",
  },
  {
    name: "BETTER_AUTH_SECRET",
    provider: "better-auth",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: AUTH_RUNTIME_TARGETS,
    description: "Better Auth secret for signed auth state, owned by the auth runtime.",
  },
  {
    name: "BETTER_AUTH_URL",
    provider: "better-auth",
    classification: "provider-output",
    exposure: "public-browser",
    requiredIn: ["local", "preview", "production"],
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Trusted Better Auth base URL for the current environment.",
  },
  {
    name: "BETTER_AUTH_TRUSTED_ORIGINS",
    provider: "better-auth",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ["local", "preview", "production"],
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Comma-separated origins accepted by Better Auth for the current environment.",
  },
  {
    name: "ADMIN_EMAIL",
    provider: "better-auth",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: ["local", "preview", "production"],
    requiredTargets: DASHBOARD_RUNTIME_TARGETS,
    description: "Comma-separated admin allowlist email addresses.",
  },
  {
    name: "GOOGLE_CLIENT_ID",
    provider: "better-auth",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: AUTH_RUNTIME_TARGETS,
    description: "Google OAuth client identifier used by Better Auth social sign-in.",
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    provider: "better-auth",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: AUTH_RUNTIME_TARGETS,
    description: "Google OAuth client secret used only by Better Auth server routes.",
  },
  {
    name: "CLOUDFLARE_ACCOUNT_ID",
    provider: "cloudflare",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: ["release"],
    description: "Cloudflare account identifier for release workflows and Images direct-upload URLs.",
  },
  {
    name: "CLOUDFLARE_API_TOKEN",
    provider: "cloudflare",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: ["release"],
    description: "GitHub Environment secret used by Wrangler to deploy Cloudflare Pages.",
  },
  {
    name: "CLOUDFLARE_PROJECT_NAME",
    provider: "cloudflare",
    classification: "provider-output",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: ["release"],
    description: "Cloudflare Pages/Workers project name.",
  },
  {
    name: "CLOUDFLARE_IMAGES_ACCOUNT_HASH",
    provider: "cloudflare",
    classification: "provider-output",
    exposure: "public-browser",
    requiredIn: ["preview", "production"],
    requiredTargets: ["release", "dashboard-runtime"],
    description: "Cloudflare Images delivery account hash for dashboard media URLs.",
  },
  {
    name: "CLOUDFLARE_IMAGES_API_TOKEN",
    provider: "cloudflare",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: ["release"],
    description: "Narrow Cloudflare Images token used by Convex to create direct upload URLs.",
  },
  {
    name: "PUBLISH_GITHUB_TOKEN",
    provider: "github",
    classification: "server-secret",
    exposure: "server-only",
    requiredIn: ["preview", "production"],
    requiredTargets: ["release"],
    description: "Token used by Convex to queue the Release Train workflow after dashboard publish.",
  },
  {
    name: "PUBLISH_GITHUB_REPOSITORY",
    provider: "github",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: [],
    description: "Optional owner/repo override for dashboard-triggered publish workflow dispatch.",
  },
  {
    name: "PUBLISH_GITHUB_WORKFLOW_ID",
    provider: "github",
    classification: "policy-value",
    exposure: "server-only",
    requiredIn: [],
    description: "Optional workflow file override for dashboard-triggered publish workflow dispatch.",
  },
  {
    name: "PUBLIC_CONTACT_EMAIL",
    provider: "core",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ["local", "preview", "production"],
    description: "Public contact email displayed in the site.",
  },
  {
    name: "PUBLIC_WHATSAPP_URL",
    provider: "core",
    classification: "public-build-value",
    exposure: "public-browser",
    requiredIn: ["local", "preview", "production"],
    description: "Public WhatsApp contact URL.",
  },
];

export function getEnvironmentVariableDefinitions(): EnvironmentVariableDefinition[] {
  return [...DEFINITIONS];
}

export function validateEnvironmentContract(
  environment: EnvironmentName,
  values: Record<string, string | undefined>,
  options: EnvironmentValidationOptions = {},
): EnvironmentValidationResult {
  const errors: string[] = [];
  const target = options.target ?? "release";

  if (!ENVIRONMENTS.includes(environment)) {
    errors.push(`${environment} is not a supported environment.`);
  }

  for (const definition of DEFINITIONS) {
    const requiredTargets = definition.requiredTargets ?? DEFAULT_REQUIRED_TARGETS;
    const isRequired = definition.requiredIn.includes(environment) && requiredTargets.includes(target);

    if (isRequired && !values[definition.name]) {
      const scope = definition.requiredTargets ? ` ${target}` : "";
      errors.push(`${definition.name} is required for ${environment}${scope}.`);
    }

    if (
      definition.classification === "server-secret" &&
      (definition.exposure !== "server-only" || definition.name.startsWith("PUBLIC_"))
    ) {
      errors.push(`${definition.name} is a server secret and must not be public.`);
    }
  }

  const publicSiteUrl = values.PUBLIC_SITE_URL;
  if (environment === "production" && publicSiteUrl && !publicSiteUrl.startsWith("https://aohys.com")) {
    errors.push("PUBLIC_SITE_URL must point to https://aohys.com in production.");
  }

  const betterAuthTrustedOrigins = parseCommaSeparatedOrigins(values.BETTER_AUTH_TRUSTED_ORIGINS);
  const betterAuthUrl = values.BETTER_AUTH_URL;
  if (betterAuthUrl && betterAuthTrustedOrigins.length > 0 && !betterAuthTrustedOrigins.includes(betterAuthUrl)) {
    errors.push("BETTER_AUTH_TRUSTED_ORIGINS must include BETTER_AUTH_URL.");
  }

  if (publicSiteUrl && betterAuthTrustedOrigins.length > 0 && !betterAuthTrustedOrigins.includes(publicSiteUrl)) {
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

  return { ok: errors.length === 0, errors };
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
