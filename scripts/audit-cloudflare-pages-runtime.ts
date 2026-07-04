type PagesEnvironmentName = "preview" | "production";

interface CloudflarePagesVariable {
  value?: string;
  type?: string;
}

interface CloudflarePagesProject {
  deployment_configs?: Record<
    PagesEnvironmentName,
    {
      env_vars?: Record<string, CloudflarePagesVariable | string>;
      secrets?: Record<string, CloudflarePagesVariable | string>;
    }
  >;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  result?: T;
  errors?: Array<{ message?: string }>;
}

const REQUIRED_RUNTIME_BINDINGS = [
  "ADMIN_EMAIL",
  "AOHYS_ENV",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "BETTER_AUTH_URL",
  "CONVEX_SITE_URL",
  "CONVEX_URL",
  "PUBLIC_POSTHOG_HOST",
  "PUBLIC_POSTHOG_KEY",
  "PUBLIC_SITE_URL",
] as const;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to audit Cloudflare Pages runtime bindings.`);
  }

  return value;
}

async function readPagesProject(): Promise<CloudflarePagesProject> {
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = requiredEnv("CLOUDFLARE_API_TOKEN");
  const projectName = process.env.CLOUDFLARE_PROJECT_NAME?.trim() || "aohys-com";
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
    {
      headers: {
        authorization: `Bearer ${apiToken}`,
      },
    },
  );
  const payload = await response.json() as CloudflareApiResponse<CloudflarePagesProject>;

  if (!response.ok || !payload.success || !payload.result) {
    const message = payload.errors?.map((error) => error.message).filter(Boolean).join("; ");
    throw new Error(message || `Cloudflare Pages project ${projectName} could not be read.`);
  }

  return payload.result;
}

function bindingNames(project: CloudflarePagesProject, environment: PagesEnvironmentName): Set<string> {
  const config = project.deployment_configs?.[environment];

  return new Set([
    ...Object.keys(config?.env_vars ?? {}),
    ...Object.keys(config?.secrets ?? {}),
  ]);
}

function readVariable(
  project: CloudflarePagesProject,
  environment: PagesEnvironmentName,
  name: string,
): CloudflarePagesVariable | string | undefined {
  return project.deployment_configs?.[environment]?.env_vars?.[name]
    ?? project.deployment_configs?.[environment]?.secrets?.[name];
}

function readPlainVariable(
  project: CloudflarePagesProject,
  environment: PagesEnvironmentName,
  name: string,
): string | undefined {
  const variable = project.deployment_configs?.[environment]?.env_vars?.[name];

  if (typeof variable === "string") {
    return variable;
  }

  if (variable?.type === "secret_text") {
    return undefined;
  }

  return variable?.value;
}

function assertRuntimeBindings(project: CloudflarePagesProject): void {
  const errors: string[] = [];

  for (const environment of ["preview", "production"] as const) {
    const names = bindingNames(project, environment);

    for (const binding of REQUIRED_RUNTIME_BINDINGS) {
      if (!names.has(binding)) {
        errors.push(`Cloudflare Pages ${environment} runtime is missing ${binding}.`);
        continue;
      }

      const variable = readVariable(project, environment, binding);
      const value = typeof variable === "string" ? variable : variable?.value;
      const isSecret = typeof variable !== "string" && variable?.type === "secret_text";

      if (!isSecret && !value?.trim()) {
        errors.push(`Cloudflare Pages ${environment} runtime has an empty ${binding}.`);
      }
    }

    const environmentValue = readPlainVariable(project, environment, "AOHYS_ENV");
    if (environmentValue && environmentValue !== environment) {
      errors.push(`Cloudflare Pages ${environment} runtime has AOHYS_ENV=${environmentValue}.`);
    }
  }

  const previewPostHogKey = readPlainVariable(project, "preview", "PUBLIC_POSTHOG_KEY");
  const productionPostHogKey = readPlainVariable(project, "production", "PUBLIC_POSTHOG_KEY");

  if (!previewPostHogKey) {
    errors.push("Cloudflare Pages preview PUBLIC_POSTHOG_KEY must be a non-empty plain env var.");
  }

  if (!productionPostHogKey) {
    errors.push("Cloudflare Pages production PUBLIC_POSTHOG_KEY must be a non-empty plain env var.");
  }

  if (previewPostHogKey && productionPostHogKey && previewPostHogKey === productionPostHogKey) {
    errors.push("Cloudflare Pages preview and production use the same PUBLIC_POSTHOG_KEY.");
  }

  if (errors.length > 0) {
    throw new Error(`Cloudflare Pages runtime is not valid:\n- ${errors.join("\n- ")}`);
  }
}

try {
  const project = await readPagesProject();
  assertRuntimeBindings(project);
  console.log("Cloudflare Pages runtime bindings are valid for preview and production.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
