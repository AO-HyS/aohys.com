import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  readJsonPointer,
  validateAlertCatalog,
} from "./validate-alert-catalog.mjs";

export function evaluate(operator, observed, threshold) {
  if (operator === "greater-than") return observed > threshold;
  if (operator === "less-than-or-equal") return observed <= threshold;
  throw new Error(`Unsupported operator: ${operator}`);
}

export function createAlertDrillEvidence(catalog, baseline) {
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
  const regressedValue = baselineValue + 1;
  return {
    schemaVersion: 1,
    drill: "alert-to-runbook-to-simulated-fix-to-verified-fix",
    alertId: alert.id,
    providerWrites: false,
    source: {
      baselineRevision: baseline.source.revision,
      baselineMetricPath: alert.threshold.derivation.jsonPointer,
      runbook: alert.runbook,
    },
    transitions: [
      {
        state: "alerted",
        observed: regressedValue,
        threshold: alert.threshold.value,
        passed: evaluate(
          alert.threshold.operator,
          regressedValue,
          alert.threshold.value,
        ),
      },
      {
        state: "runbook-selected",
        owner: alert.owner,
        correlationKeys: alert.signal.correlationKeys,
        deduplicationKeys: alert.deduplication.keys,
        quietPeriodMinutes: alert.deduplication.quietPeriodMinutes,
        passed: true,
      },
      {
        state: "simulated-fix",
        change:
          "Restore lazy loading for every work-archive image after the first card.",
        observed: baselineValue,
        passed: true,
      },
      {
        state: "verified-fix",
        observed: baselineValue,
        threshold: alert.verifiedFix.value,
        consecutiveMeasurements: alert.verifiedFix.consecutiveMeasurements,
        passed: evaluate(
          alert.verifiedFix.operator,
          baselineValue,
          alert.verifiedFix.value,
        ),
      },
    ],
    externalGatesRemain: catalog.externalEvidenceGates.map(
      ({ id, status }) => ({ id, status }),
    ),
    result: "passed",
  };
}

export async function runAlertDrill({
  catalogPath,
  baselinePath,
  evidencePath,
}) {
  const [catalog, baseline, expectedEvidence] = await Promise.all(
    [catalogPath, baselinePath, evidencePath].map(async (path) =>
      JSON.parse(await readFile(path, "utf8")),
    ),
  );
  const actualEvidence = createAlertDrillEvidence(catalog, baseline);
  assert.deepEqual(
    actualEvidence,
    expectedEvidence,
    "committed drill evidence must match a fresh simulation",
  );
  assert.ok(
    actualEvidence.transitions.every((transition) => transition.passed),
  );
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
    `Alert drill passed: ${evidence.alertId} (${evidence.providerWrites ? "provider writes" : "local only"})`,
  );
}
