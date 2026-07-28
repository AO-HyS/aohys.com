import process from "node:process";

import {
  buildChangedValidationPlan,
  resolveChangedFiles,
  runChangedValidationPlan,
} from "./changed-validation-lib.mjs";

const baseRef = process.env.QUALITY_BASE_REF ?? "origin/develop";
const plan = buildChangedValidationPlan({
  changedFiles: resolveChangedFiles({ baseRef }),
  baseRef,
  baseCommands: [["node", ["scripts/verify-foundation.mjs"]]],
  fullCommands: [
    ["pnpm", ["run", "lint"]],
    ["pnpm", ["run", "typecheck"]],
    ["pnpm", ["run", "test"]],
    ["pnpm", ["run", "build"]],
  ],
  // Every affected package currently aliases `lint` to its TypeScript check.
  // Running `typecheck` as well repeated the same compiler invocation.
  affectedScripts: ["lint", "test"],
  affectedPackageSelectors: [
    { prefix: "apps/dashboard", selector: "@aohys/dashboard" },
    { prefix: "apps/site", selector: "@aohys/site" },
    { prefix: "apps/backend", selector: "@aohys/backend" },
    { prefix: "packages/core", selector: "...@aohys/core" },
    { prefix: "packages/content-graph", selector: "...@aohys/content-graph" },
    { prefix: "packages/environment", selector: "...@aohys/environment" },
    { prefix: "packages/release-train", selector: "@aohys/release-train" },
  ],
  uiPrefixes: ["apps/dashboard/src", "apps/site/src"],
  uiCommandPrefix: [
    "node",
    [
      ".agents/skills/impeccable/scripts/detect.mjs",
      "--quiet",
      "--no-advisory",
    ],
  ],
});

console.log(JSON.stringify({ mode: "changed-validation", ...plan }, null, 2));
process.exit(runChangedValidationPlan(plan));
