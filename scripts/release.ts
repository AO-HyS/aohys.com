import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  RELEASE_ENVIRONMENTS,
  type ReleaseEnvironment,
} from "@aohys/core/domain";
import { buildReleasePlan, formatReleaseStep } from "@aohys/release-train";

// pnpm release <preview|production> [--plan]: runs the release steps in order
// and stops at the first failure with its exit code. --plan prints them.

const args = process.argv.slice(2);
const environment = args.find((arg) => !arg.startsWith("--"));
const planOnly = args.includes("--plan");

if (
  !environment ||
  !(RELEASE_ENVIRONMENTS as readonly string[]).includes(environment)
) {
  console.error(
    `Usage: pnpm release <${RELEASE_ENVIRONMENTS.join("|")}> [--plan]`,
  );
  process.exit(1);
}

const steps = buildReleasePlan(environment as ReleaseEnvironment);

if (planOnly) {
  for (const step of steps) console.log(formatReleaseStep(step));
  process.exit(0);
}

for (const [index, step] of steps.entries()) {
  console.log(`\n[release ${index + 1}/${steps.length}] ${step.name}`);
  const env: NodeJS.ProcessEnv = { ...process.env, ...step.env };
  for (const name of step.unsetEnv ?? []) delete env[name];
  const [command, ...rest] = step.command;
  const result = spawnSync(command ?? "", rest, { stdio: "inherit", env });
  if (result.status !== 0) {
    console.error(
      `[release] ${step.name} failed${result.error ? `: ${result.error.message}` : ` with exit code ${result.status ?? "unknown"}`}.`,
    );
    process.exit(result.status || 1);
  }
}
