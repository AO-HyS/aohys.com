import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertCommittedEvidence,
  createAlertDrillEvidence,
  evaluate,
  materializeCorrelation,
} from "./run-alert-drill.mjs";

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));

test("an explicit unit fixture traverses the alert and verified-fix criteria", async () => {
  const catalog = await readJson(
    "../../docs/observability/alert-catalog.v1.json",
  );
  const baseline = await readJson(
    "../../docs/research/im-12-performance-baseline.json",
  );
  const evidence = createAlertDrillEvidence({
    catalog,
    baseline,
    measurement: baseline,
    measurementMode: "unit-test-fixture",
    semanticCheck: { command: "unit-test-fixture", exitCode: 0 },
  });
  assert.equal(evidence.triggerExercise.mode, "simulation");
  assert.equal(evidence.triggerExercise.alertWouldFire, true);
  assert.equal(evidence.verification.mode, "unit-test-fixture");
  assert.equal(evidence.verification.result, "passed");
  assert.equal(evidence.providerWrites, false);
});

test("source revision is materialized into the real correlation and dedup fields", async () => {
  const catalog = await readJson(
    "../../docs/observability/alert-catalog.v1.json",
  );
  const baseline = await readJson(
    "../../docs/research/im-12-performance-baseline.json",
  );
  const correlation = materializeCorrelation(catalog.alerts[0], baseline);
  assert.deepEqual(correlation, {
    release: baseline.source.revision,
    measurementRevision: baseline.source.revision,
  });
});

test("committed evidence cannot claim success with mismatched correlation", async () => {
  const evidence = await readJson(
    "../../docs/observability/evidence/im-11-alert-drill.v1.json",
  );
  assert.doesNotThrow(() => assertCommittedEvidence(evidence));
  evidence.correlation.release = "different-revision";
  assert.throws(() => assertCommittedEvidence(evidence));
});

test("a semantic violation cannot be reported as a verified fix", async () => {
  const catalog = await readJson(
    "../../docs/observability/alert-catalog.v1.json",
  );
  const baseline = await readJson(
    "../../docs/research/im-12-performance-baseline.json",
  );
  const measurement = structuredClone(baseline);
  measurement.observations.publicSite.workArchiveEagerImages = 2;
  measurement.result.violations = [
    { metric: "publicSite.workArchiveEagerImages", expected: 1, actual: 2 },
  ];
  const evidence = createAlertDrillEvidence({
    catalog,
    baseline,
    measurement,
    measurementMode: "unit-test-fixture",
    semanticCheck: { command: "unit-test-fixture", exitCode: 0 },
  });
  assert.equal(evidence.verification.result, "failed");
  assert.equal(evidence.result, "failed");
});

test("the threshold evaluator distinguishes alert and verified-fix conditions", () => {
  assert.equal(evaluate("greater-than", 2, 1), true);
  assert.equal(evaluate("greater-than", 1, 1), false);
  assert.equal(evaluate("less-than-or-equal", 1, 1), true);
  assert.equal(evaluate("less-than-or-equal", 2, 1), false);
});
