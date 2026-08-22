import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createAlertDrillEvidence, evaluate } from "./run-alert-drill.mjs";

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));

test("the drill traverses alert, runbook, simulated fix, and verified fix", async () => {
  const catalog = await readJson(
    "../../docs/observability/alert-catalog.v1.json",
  );
  const baseline = await readJson(
    "../../docs/research/im-12-performance-baseline.json",
  );
  const evidence = createAlertDrillEvidence(catalog, baseline);
  assert.deepEqual(
    evidence.transitions.map(({ state }) => state),
    ["alerted", "runbook-selected", "simulated-fix", "verified-fix"],
  );
  assert.ok(evidence.transitions.every(({ passed }) => passed));
  assert.equal(evidence.providerWrites, false);
  assert.ok(
    evidence.externalGatesRemain.every(({ status }) => status === "unproven"),
  );
});

test("the threshold evaluator distinguishes alert and verified-fix conditions", () => {
  assert.equal(evaluate("greater-than", 2, 1), true);
  assert.equal(evaluate("greater-than", 1, 1), false);
  assert.equal(evaluate("less-than-or-equal", 1, 1), true);
  assert.equal(evaluate("less-than-or-equal", 2, 1), false);
});
