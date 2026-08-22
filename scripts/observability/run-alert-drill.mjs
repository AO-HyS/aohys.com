import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readJsonPointer,
  validateAlertCatalog,
} from "./validate-alert-catalog.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function evaluate(operator, observed, threshold) {
  if (operator === "greater-than") return observed > threshold;
  if (operator === "less-than-or-equal") return observed <= threshold;
  throw new Error(`Unsupported operator: ${operator}`);
}

export function materializeCorrelation(alert, measurement) {
  return Object.fromEntries(
    Object.entries(alert.signal.correlation).map(([key, pointer]) => {
      const value = readJsonPointer(measurement, pointer);
      assert.equal(typeof value, "string", `${key} must resolve to a string`);
      return [key, value];
    }),
  );
}

export function createAlertDrillEvidence({
  catalog,
  baseline,
  measurement,
  measurementMode,
  semanticCheck,
}) {
  const errors = validateAlertCatalog(catalog, baseline);
  assert.deepEqual(errors, [], errors.join("\n"));
  const alert = catalog.alerts.find(
    (candidate) => candidate.id === "work-archive-eager-image-regression",
  );
  assert.ok(alert, "drill alert must exist");
  const baselineValue = readJsonPointer(
    baseline,
    alert.threshold.derivation.jsonPointer,
  );
  const observed = readJsonPointer(measurement, alert.signal.metricPath);
  assert.ok(Number.isFinite(observed), "measurement must contain the signal");
  const correlation = materializeCorrelation(alert, measurement);
  const semanticViolation = (measurement.result?.violations ?? []).find(
    ({ metric }) => metric === "publicSite.workArchiveEagerImages",
  );
  const verified =
    semanticCheck.exitCode === 0 &&
    !semanticViolation &&
    evaluate(alert.verifiedFix.operator, observed, alert.verifiedFix.value);

  return {
    schemaVersion: 1,
    drill: "alert-to-runbook-to-fresh-local-verified-fix",
    alertId: alert.id,
    providerWrites: false,
    triggerExercise: {
      mode: "simulation",
      observed: baselineValue + 1,
      threshold: alert.threshold.value,
      alertWouldFire: evaluate(
        alert.threshold.operator,
        baselineValue + 1,
        alert.threshold.value,
      ),
    },
    verification: {
      mode: measurementMode,
      measurementRevision: measurement.source.revision,
      observed,
      threshold: alert.verifiedFix.value,
      semanticCheck,
      result: verified ? "passed" : "failed",
    },
    correlation,
    deduplication: Object.fromEntries(
      alert.deduplication.keys.map((key) => [
        key,
        key === "alertId" ? alert.id : correlation[key],
      ]),
    ),
    quietPeriodMinutes: alert.deduplication.quietPeriodMinutes,
    runbook: alert.runbook,
    runbookCriteria: {
      freshMeasurement: measurementMode === "fresh-local",
      semanticCheckPassed: semanticCheck.exitCode === 0,
      metricWithinThreshold: evaluate(
        alert.verifiedFix.operator,
        observed,
        alert.verifiedFix.value,
      ),
    },
    externalGatesRemain: catalog.externalEvidenceGates.map(
      ({ id, status }) => ({ id, status }),
    ),
    result: verified ? "passed" : "failed",
  };
}

export async function collectFreshLocalMeasurement() {
  const temporaryDirectory = mkdtempSync(
    path.join(tmpdir(), "aohys-alert-drill-"),
  );
  const measurementPath = path.join(temporaryDirectory, "measurement.json");
  try {
    execFileSync("pnpm", ["--filter", "@aohys/site", "build"], {
      cwd: repositoryRoot,
      stdio: "inherit",
    });
    execFileSync(
      "node",
      ["scripts/performance/measure.mjs", "--output", measurementPath],
      { cwd: repositoryRoot, stdio: "ignore" },
    );
    execFileSync("pnpm", ["performance:test"], {
      cwd: repositoryRoot,
      stdio: "inherit",
    });
    return {
      measurement: JSON.parse(await readFile(measurementPath, "utf8")),
      semanticCheck: { command: "pnpm performance:test", exitCode: 0 },
    };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

export function assertCommittedEvidence(evidence) {
  assert.equal(evidence.triggerExercise?.mode, "simulation");
  assert.equal(evidence.triggerExercise?.alertWouldFire, true);
  assert.equal(evidence.verification?.mode, "fresh-local");
  assert.equal(evidence.verification?.result, "passed");
  assert.equal(evidence.verification?.semanticCheck?.exitCode, 0);
  assert.equal(evidence.providerWrites, false);
  assert.equal(
    evidence.correlation?.release,
    evidence.verification?.measurementRevision,
  );
  assert.equal(
    evidence.correlation?.measurementRevision,
    evidence.verification?.measurementRevision,
  );
  assert.equal(evidence.deduplication?.alertId, evidence.alertId);
  assert.equal(evidence.deduplication?.release, evidence.correlation?.release);
  assert.equal(
    evidence.deduplication?.measurementRevision,
    evidence.correlation?.measurementRevision,
  );
  assert.equal(evidence.runbookCriteria?.freshMeasurement, true);
  assert.equal(evidence.runbookCriteria?.semanticCheckPassed, true);
  assert.equal(evidence.runbookCriteria?.metricWithinThreshold, true);
  assert.equal(evidence.result, "passed");
}

export async function runAlertDrill({
  catalogPath,
  baselinePath,
  evidencePath,
}) {
  const [catalog, baseline, committedEvidence] = await Promise.all(
    [catalogPath, baselinePath, evidencePath].map(async (filePath) =>
      JSON.parse(await readFile(filePath, "utf8")),
    ),
  );
  const { measurement, semanticCheck } = await collectFreshLocalMeasurement();
  const actualEvidence = createAlertDrillEvidence({
    catalog,
    baseline,
    measurement,
    measurementMode: "fresh-local",
    semanticCheck,
  });
  assertCommittedEvidence(committedEvidence);
  assert.equal(actualEvidence.result, "passed");
  assert.ok(Object.values(actualEvidence.runbookCriteria).every(Boolean));
  return actualEvidence;
}

const isCli =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const evidence = await runAlertDrill({
    catalogPath: "docs/observability/alert-catalog.v1.json",
    baselinePath: "docs/research/im-12-performance-baseline.json",
    evidencePath: "docs/observability/evidence/im-11-alert-drill.v1.json",
  });
  console.log(
    `Alert drill passed: ${evidence.alertId} (${evidence.verification.mode}, revision ${evidence.verification.measurementRevision})`,
  );
}
