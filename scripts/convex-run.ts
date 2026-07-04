import { spawnSync } from "node:child_process";

export function hasConvexDeploymentAccess(): boolean {
  return Boolean(process.env.CONVEX_DEPLOY_KEY?.trim() || process.env.CONVEX_DEPLOYMENT?.trim());
}

export function runConvexFunction<T>(
  functionName: string,
  args: object,
): T {
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
    ["--filter", "@aohys/backend", "exec", "convex", "run", functionName, JSON.stringify(args)],
    {
      env,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    },
  );

  if (result.error) {
    throw new Error(`convex run ${functionName} could not start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(
      `convex run ${functionName} failed with exit code ${result.status ?? "unknown"}${stderr ? `:\n${stderr}` : "."}`,
    );
  }

  return parseConvexRunOutput<T>(functionName, result.stdout ?? "");
}

function parseConvexRunOutput<T>(functionName: string, stdout: string): T {
  const trimmed = stdout.trim();

  if (!trimmed || trimmed === "null") {
    return null as T;
  }

  const start = trimmed.search(/[[{]/);

  if (start === -1) {
    throw new Error(`convex run ${functionName} returned unparseable output: ${trimmed}`);
  }

  try {
    return JSON.parse(trimmed.slice(start)) as T;
  } catch (error) {
    throw new Error(
      `convex run ${functionName} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
