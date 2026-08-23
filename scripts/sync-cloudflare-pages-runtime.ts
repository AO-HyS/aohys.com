import { pathToFileURL } from "node:url";

export type PagesEnvironmentName = "preview" | "production";

export interface CloudflarePagesVariable {
  value?: string;
  type?: string;
}

interface CloudflarePagesDeploymentConfig {
  env_vars?: Record<string, CloudflarePagesVariable | string | null>;
  secrets?: Record<string, CloudflarePagesVariable | string | null>;
  wrangler_config_hash?: string;
}

export interface CloudflarePagesProject {
  deployment_configs?: Record<
    PagesEnvironmentName,
    CloudflarePagesDeploymentConfig
  >;
}

interface CloudflareApiResponse<T> {
  success: boolean;
  result?: T;
  errors?: Array<{ message?: string }>;
}

export const RUNTIME_BINDING_NAMES = [
  "ADMIN_EMAIL",
  "AOHYS_ENV",
  "BETTER_AUTH_TRUSTED_ORIGINS",
  "BETTER_AUTH_URL",
  "CONVEX_SITE_URL",
  "CONVEX_URL",
  "CLOUDFLARE_IMAGES_ACCOUNT_HASH",
  "PUBLIC_RELEASE_SHA",
  "PUBLIC_SITE_URL",
] as const;

type RuntimeBindingName = (typeof RUNTIME_BINDING_NAMES)[number];
type RuntimeValues = Record<string, string | undefined>;

export function parsePagesEnvironment(
  input: string | undefined,
): PagesEnvironmentName {
  if (input === "preview" || input === "production") return input;
  throw new Error(
    "Usage: tsx scripts/sync-cloudflare-pages-runtime.ts <preview|production>",
  );
}

function requiredValue(values: RuntimeValues, name: string): string {
  const value = values[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required to synchronize Cloudflare Pages runtime bindings.`,
    );
  }
  return value;
}

export function collectCanonicalRuntimeValues(
  environment: PagesEnvironmentName,
  values: RuntimeValues = process.env,
): Record<string, string> {
  const runtimeValues = Object.fromEntries(
    RUNTIME_BINDING_NAMES.map((name) => [name, requiredValue(values, name)]),
  ) as Record<RuntimeBindingName, string>;

  if (runtimeValues.AOHYS_ENV !== environment) {
    throw new Error(
      `AOHYS_ENV must equal the selected Cloudflare Pages target ${environment}.`,
    );
  }

  return environment === "production"
    ? {
        ...runtimeValues,
        PUBLIC_POSTHOG_KEY: requiredValue(values, "PUBLIC_POSTHOG_KEY"),
      }
    : runtimeValues;
}

function apiUrl(accountId: string, projectName: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`;
}

async function parseApiResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const payload = (await response.json()) as CloudflareApiResponse<T>;
  if (!response.ok || !payload.success || !payload.result) {
    const message = payload.errors
      ?.map((error) => error.message)
      .filter(Boolean)
      .join("; ");
    throw new Error(message || fallbackMessage);
  }
  return payload.result;
}

export async function readPagesProject({
  accountId,
  apiToken,
  projectName,
  fetchImplementation = fetch,
}: {
  accountId: string;
  apiToken: string;
  projectName: string;
  fetchImplementation?: typeof fetch;
}): Promise<CloudflarePagesProject> {
  const response = await fetchImplementation(apiUrl(accountId, projectName), {
    headers: { authorization: `Bearer ${apiToken}` },
  });
  return parseApiResponse(
    response,
    `Cloudflare Pages project ${projectName} could not be read.`,
  );
}

export function readPlainVariable(
  project: CloudflarePagesProject,
  environment: PagesEnvironmentName,
  name: string,
): string | undefined {
  const variable = project.deployment_configs?.[environment]?.env_vars?.[name];
  if (typeof variable === "string") return variable;
  if (!variable || variable.type === "secret_text") return undefined;
  return variable.value;
}

function runtimeMatches(
  project: CloudflarePagesProject,
  environment: PagesEnvironmentName,
  values: Record<string, string>,
): boolean {
  return Object.entries(values).every(
    ([name, expected]) =>
      readPlainVariable(project, environment, name) === expected,
  );
}

function plainVariables(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      { type: "plain_text", value },
    ]),
  );
}

export async function synchronizeCloudflarePagesRuntime({
  environment,
  accountId,
  apiToken,
  projectName,
  values,
  fetchImplementation = fetch,
}: {
  environment: PagesEnvironmentName;
  accountId: string;
  apiToken: string;
  projectName: string;
  values: Record<string, string>;
  fetchImplementation?: typeof fetch;
}): Promise<{ changed: boolean; bindingCount: number }> {
  const project = await readPagesProject({
    accountId,
    apiToken,
    projectName,
    fetchImplementation,
  });
  if (runtimeMatches(project, environment, values)) {
    return { changed: false, bindingCount: Object.keys(values).length };
  }

  const wranglerConfigHash =
    project.deployment_configs?.[environment]?.wrangler_config_hash;
  const response = await fetchImplementation(apiUrl(accountId, projectName), {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      deployment_configs: {
        [environment]: {
          env_vars: plainVariables(values),
          ...(wranglerConfigHash
            ? { wrangler_config_hash: wranglerConfigHash }
            : {}),
        },
      },
    }),
  });
  await parseApiResponse(
    response,
    `Cloudflare Pages ${environment} runtime bindings could not be updated.`,
  );

  const verifiedProject = await readPagesProject({
    accountId,
    apiToken,
    projectName,
    fetchImplementation,
  });
  if (!runtimeMatches(verifiedProject, environment, values)) {
    throw new Error(
      `Cloudflare Pages ${environment} runtime verification failed after update.`,
    );
  }
  return { changed: true, bindingCount: Object.keys(values).length };
}

async function main(): Promise<void> {
  const environment = parsePagesEnvironment(process.argv[2]);
  const accountId = requiredValue(process.env, "CLOUDFLARE_ACCOUNT_ID");
  const apiToken = requiredValue(process.env, "CLOUDFLARE_API_TOKEN");
  const projectName =
    process.env.CLOUDFLARE_PROJECT_NAME?.trim() || "aohys-com";
  const values = collectCanonicalRuntimeValues(environment);
  const result = await synchronizeCloudflarePagesRuntime({
    environment,
    accountId,
    apiToken,
    projectName,
    values,
  });
  console.log(
    result.changed
      ? `Synchronized ${result.bindingCount} Cloudflare Pages ${environment} runtime binding names.`
      : `Cloudflare Pages ${environment} runtime binding names are already synchronized.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
