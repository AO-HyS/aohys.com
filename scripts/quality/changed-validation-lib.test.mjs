import assert from "node:assert/strict";
import test from "node:test";

import { buildChangedValidationPlan } from "./changed-validation-lib.mjs";

const baseCommands = [["node", ["scripts/verify-foundation.mjs"]]];
const fullCommands = [["pnpm", ["run", "lint"]]];

test("documentation changes keep the fast foundation check and skip product suites", () => {
  const plan = buildChangedValidationPlan({
    changedFiles: ["docs/quality.md"],
    baseCommands,
    fullCommands,
  });

  assert.equal(plan.documentationOnly, true);
  assert.deepEqual(plan.commands, baseCommands);
});

test("workspace source changes select affected package scripts and visual checks", () => {
  const plan = buildChangedValidationPlan({
    changedFiles: ["apps/dashboard/src/screen.tsx"],
    baseCommands,
    fullCommands,
    affectedPackageSelectors: [
      { prefix: "apps/dashboard", selector: "@aohys/dashboard" },
    ],
    uiPrefixes: ["apps/dashboard/src"],
    uiCommandPrefix: ["node", ["impeccable.mjs"]],
  });

  assert.equal(plan.globalQualityChange, false);
  assert.ok(
    plan.commands.some(
      ([command, args]) =>
        command === "pnpm" &&
        args.includes("@aohys/dashboard") &&
        args.includes("test"),
    ),
  );
  assert.equal(
    plan.commands.some(([, args]) => args.includes("...[origin/develop]")),
    false,
  );
  assert.deepEqual(plan.commands.at(-1), [
    "node",
    ["impeccable.mjs", "apps/dashboard/src/screen.tsx"],
  ]);
});

test("root dependency and quality-tooling changes use the repository-wide adapter", () => {
  const plan = buildChangedValidationPlan({
    changedFiles: ["package.json"],
    baseCommands,
    fullCommands,
  });

  assert.equal(plan.globalQualityChange, true);
  assert.deepEqual(plan.commands, [...baseCommands, ...fullCommands]);
});
