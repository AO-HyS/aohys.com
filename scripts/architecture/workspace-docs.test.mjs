import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  checkWorkspaceGuide,
  validateWorkspaceGuide,
  workspaceGuidePath,
} from "./workspace-docs.mjs";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const guide = readFileSync(resolve(repositoryRoot, workspaceGuidePath), "utf8");

test("World Tree keeps durable navigation links fresh", () => {
  assert.deepEqual(checkWorkspaceGuide(repositoryRoot), []);
});

test("World Tree check rejects a stale local reference", () => {
  const staleGuide = guide.replace(
    "(environment-contract.md)",
    "(retired-contract.md)",
  );
  const issues = validateWorkspaceGuide(staleGuide, repositoryRoot);

  assert.ok(issues.includes("stale or broken local link: retired-contract.md"));
  assert.ok(
    issues.includes("missing durable reference: environment-contract.md"),
  );
});

test("World Tree check validates local heading fragments", () => {
  const badFragmentGuide = `${guide}\n[Bad anchor](agents/domain.md#definitely-not-a-real-heading)\n`;

  assert.ok(
    validateWorkspaceGuide(badFragmentGuide, repositoryRoot).includes(
      "stale or broken local link fragment: agents/domain.md#definitely-not-a-real-heading",
    ),
  );
});

test("World Tree check accepts CommonMark angle-bracket destinations", () => {
  const angleGuide = `${guide}\n[Domain policy](<agents/domain.md>)\n`;

  assert.deepEqual(validateWorkspaceGuide(angleGuide, repositoryRoot), []);
});

test("World Tree check reports malformed percent encoding without throwing", () => {
  const malformedGuide = `${guide}\n[Bad encoding](agents/domain%ZZ.md)\n`;

  assert.ok(
    validateWorkspaceGuide(malformedGuide, repositoryRoot).includes(
      "malformed local link encoding: agents/domain%ZZ.md",
    ),
  );
});

test("World Tree check rejects synchronized inventory and date freshness claims", () => {
  const snapshotGuide = `${guide}\n## Workspace Layout\n\n| Path | Role |\n| --- | --- |\n| apps/example | Current module |\n\nLast updated: 2026-08-22\n`;
  const issues = validateWorkspaceGuide(snapshotGuide, repositoryRoot);

  assert.ok(
    issues.includes("remove the synchronized workspace-layout inventory"),
  );
  assert.ok(
    issues.includes(
      "replace the path/role inventory with directional guidance",
    ),
  );
  assert.ok(
    issues.includes(
      "remove date-based freshness claims; source is current-state truth",
    ),
  );
});

test("World Tree check requires the example to remain illustrative and non-exhaustive", () => {
  const unlabeledGuide = guide.replace(
    "## Illustrative, Non-Exhaustive Example",
    "## Organizational Example",
  );

  assert.ok(
    validateWorkspaceGuide(unlabeledGuide, repositoryRoot).includes(
      "the organizational example must be explicitly illustrative and non-exhaustive",
    ),
  );
});
