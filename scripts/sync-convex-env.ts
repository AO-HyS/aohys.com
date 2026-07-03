import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { getEnvironmentVariableDefinitions } from "@aohys/environment";
import type { ReleaseDeploymentEnvironment } from "@aohys/release-train";

const RELEASE_ENVIRONMENTS = ["preview", "production"] as const;
const DEPLOY_ONLY_VARIABLES = new Set([
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_PROJECT_NAME",
  "CONVEX_DEPLOY_KEY",
]);

function parseEnvironment(input: string | undefined): ReleaseDeploymentEnvironment {
  if (RELEASE_ENVIRONMENTS.includes(input as ReleaseDeploymentEnvironment)) {
    return input as ReleaseDeploymentEnvironment;
  }

  throw new Error("Usage: tsx scripts/sync-convex-env.ts <preview|production>");
}

function convexRuntimeVariableNames(environment: ReleaseDeploymentEnvironment): string[] {
  return getEnvironmentVariableDefinitions()
    .filter((definition) => !DEPLOY_ONLY_VARIABLES.has(definition.name))
    .filter((definition) => {
      if (definition.requiredIn.includes(environment)) {
        return true;
      }

      return definition.requiredTargets?.includes("dashboard-runtime") && Boolean(process.env[definition.name]?.trim());
    })
    .map((definition) => definition.name);
}

function dotenvLine(name: string, value: string): string {
  return `${name}=${JSON.stringify(value)}`;
}

function collectConvexValues(
  names: readonly string[],
): { values: Record<string, string>; missing: string[] } {
  const values: Record<string, string> = {};
  const missing: string[] = [];

  for (const name of names) {
    const value = process.env[name]?.trim();

    if (!value) {
      missing.push(name);
      continue;
    }

    values[name] = value;
  }

  return { values, missing };
}

try {
  const environment = parseEnvironment(process.argv[2]);
  const deployment = process.env.CONVEX_DEPLOYMENT?.trim();
  const deployKey = process.env.CONVEX_DEPLOY_KEY?.trim();

  if (!deployment && !deployKey) {
    throw new Error("CONVEX_DEPLOYMENT is required before syncing Convex environment variables.");
  }

  const variableNames = convexRuntimeVariableNames(environment);
  const { values, missing } = collectConvexValues(variableNames);

  if (missing.length > 0) {
    throw new Error(`Cannot sync Convex ${environment} environment. Missing: ${missing.join(", ")}`);
  }

  const tmpDir = mkdtempSync(path.join(tmpdir(), "aohys-convex-env-"));
  const envPath = path.join(tmpDir, ".env.convex");

  try {
    writeFileSync(
      envPath,
      `${Object.entries(values).map(([name, value]) => dotenvLine(name, value)).join("\n")}\n`,
      { encoding: "utf8", mode: 0o600 },
    );

    const convexArgs = [
      "--filter",
      "@aohys/backend",
      "exec",
      "convex",
      "env",
      "set",
      "--from-file",
      envPath,
      "--force",
    ];

    if (!deployKey && deployment) {
      convexArgs.splice(6, 0, "--deployment", deployment);
    }

    const result = spawnSync(
      "pnpm",
      convexArgs,
      {
        stdio: "inherit",
      },
    );

    if (result.status !== 0) {
      throw new Error(`Convex environment sync failed with exit code ${result.status ?? "unknown"}.`);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(`Synced ${variableNames.length} Convex ${environment} environment variable names.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
