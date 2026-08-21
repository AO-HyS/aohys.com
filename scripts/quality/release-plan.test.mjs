import assert from "node:assert/strict";
import test from "node:test";

import { createReleasePlan } from "./release-plan-lib.mjs";

test("managed Development System metadata does not deploy runtime", () => {
  const plan = createReleasePlan({
    changedFiles: [
      ".development-system/repository.json",
      ".codex/development-system/repository.md",
      ".factory/development-system/repository.md",
    ],
  });
  assert.equal(plan.deployRuntime, false);
  assert.equal(plan.fallback, false);
});

test("documentation and tests do not deploy runtime", () => {
  assert.equal(
    createReleasePlan({
      changedFiles: ["docs/release.md", "tests/release.test.ts"],
    }).deployRuntime,
    false,
  );
});

test("runtime changes deploy", () => {
  assert.equal(
    createReleasePlan({ changedFiles: ["apps/site/src/pages/index.astro"] })
      .deployRuntime,
    true,
  );
});

test("unknown and missing diffs fail safe to deployment", () => {
  assert.equal(
    createReleasePlan({ changedFiles: ["unknown/runtime.ts"] }).fallback,
    true,
  );
  assert.equal(createReleasePlan({ changedFiles: [] }).deployRuntime, true);
});

test("manual dispatch always deploys", () => {
  assert.equal(
    createReleasePlan({ eventName: "workflow_dispatch", changedFiles: [] })
      .deployRuntime,
    true,
  );
});
