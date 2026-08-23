import { pathToFileURL } from "node:url";

import {
  collectCanonicalRuntimeValues,
  parsePagesEnvironment,
  readPagesProject,
  readPlainVariable,
  RUNTIME_BINDING_NAMES,
  type CloudflarePagesProject,
  type CloudflarePagesVariable,
  type PagesEnvironmentName,
} from "./sync-cloudflare-pages-runtime.ts";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required to audit Cloudflare Pages runtime bindings.`,
    );
  }
  return value;
}

function bindingNames(
  project: CloudflarePagesProject,
  environment: PagesEnvironmentName,
): Set<string> {
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
): CloudflarePagesVariable | string | null | undefined {
  return (
    project.deployment_configs?.[environment]?.env_vars?.[name] ??
    project.deployment_configs?.[environment]?.secrets?.[name]
  );
}

export function auditRuntimeBindings(
  project: CloudflarePagesProject,
  activeEnvironment: PagesEnvironmentName,
  expectedActiveValues: Record<string, string>,
): string[] {
  const errors: string[] = [];

  for (const environment of ["preview", "production"] as const) {
    const names = bindingNames(project, environment);
    for (const binding of RUNTIME_BINDING_NAMES) {
      // Release identity is target-scoped and changes on every deployment.
      // The exact active-target comparison below owns its presence and value.
      if (binding === "PUBLIC_RELEASE_SHA") continue;

      if (!names.has(binding)) {
        errors.push(
          `Cloudflare Pages ${environment} runtime is missing ${binding}.`,
        );
        continue;
      }

      const variable = readVariable(project, environment, binding);
      const value = typeof variable === "string" ? variable : variable?.value;
      const isSecret =
        typeof variable !== "string" && variable?.type === "secret_text";
      if (!isSecret && !value?.trim()) {
        errors.push(
          `Cloudflare Pages ${environment} runtime has an empty ${binding}.`,
        );
      }
    }

    const environmentValue = readPlainVariable(
      project,
      environment,
      "AOHYS_ENV",
    );
    if (environmentValue && environmentValue !== environment) {
      errors.push(
        `Cloudflare Pages ${environment} runtime has an incorrect AOHYS_ENV.`,
      );
    }
  }

  for (const [name, expectedValue] of Object.entries(expectedActiveValues)) {
    if (readPlainVariable(project, activeEnvironment, name) !== expectedValue) {
      errors.push(
        `Cloudflare Pages ${activeEnvironment} runtime ${name} does not match the active Environment Contract.`,
      );
    }
  }

  const productionPostHogKey = readPlainVariable(
    project,
    "production",
    "PUBLIC_POSTHOG_KEY",
  );
  if (readPlainVariable(project, "preview", "PUBLIC_POSTHOG_KEY")) {
    errors.push("Cloudflare Pages preview must not define PUBLIC_POSTHOG_KEY.");
  }
  if (!productionPostHogKey) {
    errors.push(
      "Cloudflare Pages production PUBLIC_POSTHOG_KEY must be a non-empty plain env var.",
    );
  }

  return errors;
}

async function main(): Promise<void> {
  const activeEnvironment = parsePagesEnvironment(process.env.AOHYS_ENV);
  const accountId = requiredEnv("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = requiredEnv("CLOUDFLARE_API_TOKEN");
  const projectName =
    process.env.CLOUDFLARE_PROJECT_NAME?.trim() || "aohys-com";
  const project = await readPagesProject({ accountId, apiToken, projectName });
  const expectedActiveValues = collectCanonicalRuntimeValues(activeEnvironment);
  const errors = auditRuntimeBindings(
    project,
    activeEnvironment,
    expectedActiveValues,
  );

  if (errors.length > 0) {
    throw new Error(
      `Cloudflare Pages runtime is not valid:\n- ${errors.join("\n- ")}`,
    );
  }
  console.log(
    `Cloudflare Pages runtime bindings are valid for ${activeEnvironment}; cross-environment boundaries are intact.`,
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
