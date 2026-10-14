import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFunctionName, type FunctionReference } from "convex/server";
import { parse as parseDotenv } from "dotenv";
import { type OperatorCredential } from "@aohys/core/domain";

const BACKEND_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../apps/backend",
);

function dotenvFile(filePath: string): Record<string, string> {
  return existsSync(filePath) ? parseDotenv(readFileSync(filePath)) : {};
}

// What the Convex CLI resolves for a variable. dotenv never overrides a key
// that is already present, so the first source that has the key wins, even
// with an empty value: the process environment, then apps/backend/.env.local,
// then .env. Empty values count as unset.
function convexCliValue(name: string): string | undefined {
  const sources = [
    process.env,
    dotenvFile(path.join(BACKEND_DIRECTORY, ".env.local")),
    dotenvFile(path.join(BACKEND_DIRECTORY, ".env")),
  ];
  const source = sources.find((values) => Object.hasOwn(values, name));
  const value = source?.[name]?.trim();
  return value ? value : undefined;
}

// The credential the Convex CLI will use; a deploy key wins over a deployment
// selected by a CLI session. Invocation and classification both use this.
function resolveConvexCredential():
  | { credential: "deploy-key"; deployKey: string }
  | { credential: "cli-session"; deployment: string }
  | undefined {
  // The Convex CLI reads CONVEX_DEPLOYMENT_TOKEN as a deploy key too.
  const deployKey =
    convexCliValue("CONVEX_DEPLOY_KEY") ??
    convexCliValue("CONVEX_DEPLOYMENT_TOKEN");
  if (deployKey) return { credential: "deploy-key", deployKey };
  const deployment = convexCliValue("CONVEX_DEPLOYMENT");
  if (deployment) return { credential: "cli-session", deployment };
  return undefined;
}

function convexCredential(): OperatorCredential | undefined {
  return resolveConvexCredential()?.credential;
}

export function hasConvexDeploymentAccess(): boolean {
  return convexCredential() !== undefined;
}

// The credential class an operator call uses; the deploy key wins over a CLI
// session, as in runConvexFunction. Recorded in audit events, never the value.
export function operatorCredential(): OperatorCredential {
  const credential = convexCredential();
  if (!credential)
    throw new Error("CONVEX_DEPLOY_KEY or CONVEX_DEPLOYMENT is required.");
  return credential;
}

export function runConvexFunction<T>(
  functionReference:
    | string
    | FunctionReference<"query" | "mutation" | "action", "public" | "internal">,
  args: object,
  parseResult: (value: unknown) => T,
): T {
  const functionName =
    typeof functionReference === "string"
      ? functionReference
      : getFunctionName(functionReference);
  const resolved = resolveConvexCredential();

  if (!resolved) {
    throw new Error(
      `CONVEX_DEPLOY_KEY or CONVEX_DEPLOYMENT is required to run ${functionName}.`,
    );
  }

  // Pass the resolved credential explicitly so the CLI uses exactly what was
  // classified. The others are set empty, not deleted: the CLI loads .env
  // files without overriding, so a missing key could be refilled from a file,
  // and it treats an empty key as unset.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CONVEX_DEPLOYMENT_TOKEN: "",
  };
  if (resolved.credential === "deploy-key") {
    env.CONVEX_DEPLOY_KEY = resolved.deployKey;
    env.CONVEX_DEPLOYMENT = "";
  } else {
    env.CONVEX_DEPLOY_KEY = "";
    env.CONVEX_DEPLOYMENT = resolved.deployment;
  }

  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@aohys/backend",
      "exec",
      "convex",
      "run",
      functionName,
      JSON.stringify(args),
    ],
    {
      env,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    },
  );

  if (result.error) {
    throw new Error(
      `convex run ${functionName} could not start: ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(
      `convex run ${functionName} failed with exit code ${result.status ?? "unknown"}${stderr ? `:\n${stderr}` : "."}`,
    );
  }

  return parseResult(parseConvexRunOutput(functionName, result.stdout ?? ""));
}

export function parseConvexRunOutput(
  functionName: string,
  stdout: string,
): unknown {
  const trimmed = stdout.trim();

  if (!trimmed || trimmed === "null") {
    return null;
  }

  // Scalars (a scheduled function id, a number) are whole JSON values.
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall back to the first object or array after any CLI preamble.
  }

  const start = trimmed.search(/[[{]/);

  if (start === -1) {
    throw new Error(
      `convex run ${functionName} returned unparseable output: ${trimmed}`,
    );
  }

  try {
    return JSON.parse(trimmed.slice(start));
  } catch (error) {
    throw new Error(
      `convex run ${functionName} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Release callbacks declare operator provenance. A backend that predates the
// field rejects it in argument validation, before its handler runs, so
// nothing was written and the same call is made once without it.
export function runWithOperator<T>(
  functionReference: string,
  args: object,
  operator: object,
  parseResult: (value: unknown) => T,
): T {
  try {
    return runConvexFunction(
      functionReference,
      { ...args, operator },
      parseResult,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      !/ArgumentValidationError/u.test(message) ||
      !/extra field `?operator`?/u.test(message)
    )
      throw error;
    console.warn(
      `[convex-run] ${functionReference} predates operator provenance; recorded without it.`,
    );
    return runConvexFunction(functionReference, args, parseResult);
  }
}
