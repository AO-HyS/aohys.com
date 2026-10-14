import { spawnSync } from "node:child_process";
import { getFunctionName, type FunctionReference } from "convex/server";
import { type OperatorCredential } from "@aohys/core/domain";

export function hasConvexDeploymentAccess(): boolean {
  return Boolean(
    process.env.CONVEX_DEPLOY_KEY?.trim() ||
    process.env.CONVEX_DEPLOYMENT?.trim(),
  );
}

// The credential class an operator call uses; the deploy key wins over a CLI
// session, as in runConvexFunction. Recorded in audit events, never the value.
export function operatorCredential(): OperatorCredential {
  if (process.env.CONVEX_DEPLOY_KEY?.trim()) return "deploy-key";
  if (process.env.CONVEX_DEPLOYMENT?.trim()) return "cli-session";
  throw new Error("CONVEX_DEPLOY_KEY or CONVEX_DEPLOYMENT is required.");
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
  const deployment = process.env.CONVEX_DEPLOYMENT?.trim();

  if (!deployKey && !deployment) {
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
