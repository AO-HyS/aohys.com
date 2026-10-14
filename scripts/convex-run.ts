import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getFunctionName, type FunctionReference } from "convex/server";
import { type OperatorCredential } from "@aohys/core/domain";

const BACKEND_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../apps/backend",
);

// The value one dotenv file gives a variable: `NAME=value` or
// `export NAME=value`, optionally quoted; empty values count as unset.
function dotenvValue(filePath: string, name: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  let value: string | undefined;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const match =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u.exec(line);
    if (!match || match[1] !== name) continue;
    let raw = (match[2] ?? "").trim();
    const quoted = /^(["'`])(.*)\1$/u.exec(raw);
    raw = quoted ? (quoted[2] ?? "") : raw.replace(/\s+#.*$/u, "").trim();
    value = raw;
  }
  return value?.trim() ? value.trim() : undefined;
}

// What the Convex CLI resolves for a variable: the process environment wins,
// then apps/backend/.env.local, then .env (dotenv never overrides).
function convexCliValue(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  return (
    dotenvValue(path.join(BACKEND_DIRECTORY, ".env.local"), name) ??
    dotenvValue(path.join(BACKEND_DIRECTORY, ".env"), name)
  );
}

// The credential the Convex CLI will use; a deploy key wins over a deployment
// selected by a CLI session. Invocation and classification both use this.
function resolveConvexCredential():
  | { credential: "deploy-key"; deployKey: string }
  | { credential: "cli-session"; deployment: string }
  | undefined {
  const deployKey = convexCliValue("CONVEX_DEPLOY_KEY");
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
  // classified.
  const env = { ...process.env };
  if (resolved.credential === "deploy-key") {
    env.CONVEX_DEPLOY_KEY = resolved.deployKey;
    delete env.CONVEX_DEPLOYMENT;
  } else {
    delete env.CONVEX_DEPLOY_KEY;
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
