import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

import { createReleasePlan } from "./release-plan-lib.mjs";

function changedFiles(baseSha, headSha) {
  if (!baseSha || /^0+$/.test(baseSha)) return [];
  try {
    return execFileSync(
      "git",
      ["diff", "--name-only", "--diff-filter=ACMRD", `${baseSha}...${headSha}`],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

const plan = createReleasePlan({
  eventName: process.env.RELEASE_EVENT_NAME,
  changedFiles: changedFiles(
    process.env.RELEASE_BASE_SHA,
    process.env.RELEASE_HEAD_SHA ?? "HEAD",
  ),
});

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `deploy_runtime=${plan.deployRuntime}\n`,
  );
}
console.log(JSON.stringify(plan, null, 2));
