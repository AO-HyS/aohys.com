import process from "node:process";
import { internal } from "@aohys/backend/convex/_generated/api";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import {
  RELEASE_ENVIRONMENTS,
  type ReleaseEnvironment,
} from "@aohys/core/domain";
import { operatorCredential, runConvexFunction } from "./convex-run.js";

// pnpm publication <status|reconcile|retry> --target <preview|production> ...
// Wraps the internal publication mutations for operators. Every call binds to
// --target: the deployment it reaches must run that AOHYS_ENV and the request
// must target it, checked here first and again in the mutation before any
// write. Nothing here retries on a timer.

const USAGE = `Usage:
  pnpm publication status --target <env> (--request-key <key> | --attempt <publicationAttemptId>)
  pnpm publication reconcile --target <env> --attempt <id> --provider-status <not-found|unknown> --checked-at <ISO time> [--operator-label <label>]
  pnpm publication retry --target <env> --attempt <id> --provider-status not-found --checked-at <ISO time> --authorization-ref <owner authorization> [--operator-label <label>]`;

type Status = FunctionReturnType<typeof internal.publication.status>;

function fail(message: string): never {
  console.error(`[publication] ${message}\n\n${USAGE}`);
  process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
const options = new Map<string, string>();
for (let index = 0; index < rest.length; index += 2) {
  const name = rest[index];
  const value = rest[index + 1];
  if (!name?.startsWith("--") || value === undefined || value.startsWith("--"))
    fail(`Invalid argument near ${name ?? "end"}.`);
  options.set(name.slice(2), value);
}
const option = (name: string) => options.get(name)?.trim() || undefined;
const requiredOption = (name: string) =>
  option(name) ?? fail(`--${name} is required.`);

const target = requiredOption("target");
if (!(RELEASE_ENVIRONMENTS as readonly string[]).includes(target))
  fail(`--target must be ${RELEASE_ENVIRONMENTS.join(" or ")}.`);
const expectedTarget = target as ReleaseEnvironment;

function readStatus(args: FunctionArgs<typeof internal.publication.status>) {
  return runConvexFunction<Status>(
    internal.publication.status,
    args,
    (value) => value as Status,
  );
}

// The deployment and the request must both match --target before any write.
function boundStatus(publicationAttemptId: string) {
  const status = readStatus({ publicationAttemptId });
  if (status.deploymentEnvironment !== expectedTarget)
    fail(
      `Target mismatch: --target ${expectedTarget}, but the deployment reached runs AOHYS_ENV=${status.deploymentEnvironment ?? "unset"}. Nothing was written.`,
    );
  if (!status.request) fail(`No request has attempt ${publicationAttemptId}.`);
  if (status.request.targetEnvironment !== expectedTarget)
    fail(
      `Target mismatch: the request targets ${status.request.targetEnvironment}. Nothing was written.`,
    );
  const attempt = status.attempts.find(
    (item) => item.publicationAttemptId === publicationAttemptId,
  );
  if (!attempt) fail(`Attempt ${publicationAttemptId} is not in its request.`);
  return { status, attempt };
}

function checkedAt(): number {
  const value = requiredOption("checked-at");
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time > Date.now())
    fail("--checked-at must be a past ISO time of the provider status check.");
  return time;
}

function operator() {
  const authorizationRef = option("authorization-ref");
  const operatorLabel = option("operator-label");
  return {
    credential: operatorCredential(),
    ...(authorizationRef ? { authorizationRef } : {}),
    ...(operatorLabel ? { operatorLabel } : {}),
  };
}

switch (command) {
  case "status": {
    const requestKey = option("request-key");
    const publicationAttemptId = option("attempt");
    if (!requestKey === !publicationAttemptId)
      fail("Pass exactly one of --request-key or --attempt.");
    const status = readStatus(
      requestKey
        ? { requestKey }
        : { publicationAttemptId: requiredOption("attempt") },
    );
    if (status.deploymentEnvironment !== expectedTarget)
      fail(
        `Target mismatch: --target ${expectedTarget}, but the deployment reached runs AOHYS_ENV=${status.deploymentEnvironment ?? "unset"}.`,
      );
    console.log(JSON.stringify(status, null, 2));
    break;
  }
  case "reconcile": {
    const providerStatus = requiredOption("provider-status");
    if (providerStatus !== "not-found" && providerStatus !== "unknown")
      fail("--provider-status must be not-found or unknown.");
    const statusCheckedAt = checkedAt();
    const { attempt } = boundStatus(requiredOption("attempt"));
    const result = runConvexFunction(
      internal.publication.reconcileDispatchingAfterStatusCheck,
      {
        attemptId: attempt.attemptId,
        providerStatus,
        statusCheckedAt,
        expectedTarget,
        operator: operator(),
      },
      (value) => value,
    );
    console.log(JSON.stringify(result, null, 2));
    break;
  }
  case "retry": {
    // Only a confirmed not-found may dispatch again; unknown never does.
    if (requiredOption("provider-status") !== "not-found")
      fail(
        "retry needs --provider-status not-found; unknown is reconciled, never retried.",
      );
    requiredOption("authorization-ref");
    const statusCheckedAt = checkedAt();
    const { attempt } = boundStatus(requiredOption("attempt"));
    const jobId = runConvexFunction(
      internal.publication.retryScheduledAfterStatusCheck,
      {
        attemptId: attempt.attemptId,
        providerStatus: "not-found",
        statusCheckedAt,
        expectedTarget,
        operator: operator(),
      },
      (value) => value,
    );
    console.log(JSON.stringify({ rescheduled: jobId }, null, 2));
    break;
  }
  default:
    fail(`Unknown command ${command ?? "(none)"}.`);
}
