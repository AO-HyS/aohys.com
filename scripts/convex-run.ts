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

// Whether a variable is set for the Convex CLI, which reads the process
// environment and then apps/backend/.env.local and .env. Values never leave.
function convexCliHas(name: string): boolean {
  if (process.env[name]?.trim()) return true;
  return [".env.local", ".env"].some((file) => {
    const filePath = path.join(BACKEND_DIRECTORY, file);
    return (
      existsSync(filePath) &&
      new RegExp(`^\\s*${name}\\s*=\\s*\\S`, "mu").test(
        readFileSync(filePath, "utf8"),
      )
    );
  });
}

// The credential the Convex CLI will use: a deploy key wins over a
// deployment selected by a CLI session, wherever either is defined.
function convexCredential(): OperatorCredential | undefined {
  if (convexCliHas("CONVEX_DEPLOY_KEY")) return "deploy-key";
  if (convexCliHas("CONVEX_DEPLOYMENT")) return "cli-session";
  return undefined;
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
  const deployKey = process.env.CONVEX_DEPLOY_KEY?.trim();

  if (!convexCredential()) {
    throw new Error(
      `CONVEX_DEPLOY_KEY or CONVEX_DEPLOYMENT is required to run ${functionName}.`,
    );
  }

  const env = { ...process.env };

  if (deployKey) {
    delete env.CONVEX_DEPLOYMENT;
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
