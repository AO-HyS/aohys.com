import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OPERATORS = new Set(["greater-than", "less-than-or-equal"]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readJsonPointer(document, pointer) {
  if (pointer === "") return document;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) return undefined;
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce(
      (value, part) => (isRecord(value) ? value[part] : undefined),
      document,
    );
}

export function validateAlertCatalog(catalog, baseline) {
  const errors = [];
  if (!isRecord(catalog)) return ["catalog must be an object"];
  if (catalog.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (catalog.mode !== "local-definition")
    errors.push("mode must be local-definition");
  if (
    !isRecord(catalog.provider) ||
    catalog.provider.activation !== "external-gate"
  ) {
    errors.push("provider activation must remain an external-gate");
  }
  if (catalog.provider?.canonicalProjectId !== "489978") {
    errors.push("canonical PostHog project must be 489978");
  }
  if (catalog.provider?.historicalConflictingProjectId !== "492205") {
    errors.push("historical PostHog project conflict must remain explicit");
  }
  if (
    !Array.isArray(catalog.externalEvidenceGates) ||
    catalog.externalEvidenceGates.length === 0
  ) {
    errors.push("externalEvidenceGates must be a non-empty array");
  }
  for (const [index, gate] of (catalog.externalEvidenceGates ?? []).entries()) {
    const at = `externalEvidenceGates[${index}]`;
    for (const field of ["id", "owner", "status", "requiredEvidence"]) {
      if (typeof gate?.[field] !== "string" || !gate[field].trim()) {
        errors.push(`${at}.${field} must be a non-empty string`);
      }
    }
    if (gate?.status !== "unproven")
      errors.push(`${at}.status must be unproven`);
  }

  if (!Array.isArray(catalog.alerts) || catalog.alerts.length === 0) {
    errors.push("alerts must be a non-empty array");
  }
  const ids = new Set();
  for (const [index, alert] of (catalog.alerts ?? []).entries()) {
    const at = `alerts[${index}]`;
    for (const field of ["id", "owner", "runbook"]) {
      if (typeof alert?.[field] !== "string" || !alert[field].trim()) {
        errors.push(`${at}.${field} must be a non-empty string`);
      }
    }
    if (ids.has(alert?.id)) errors.push(`${at}.id must be unique`);
    ids.add(alert?.id);
    if (alert?.status !== "locally-defined")
      errors.push(`${at}.status must be locally-defined`);
    if (!isRecord(alert?.signal) || !isRecord(alert.signal.correlation)) {
      errors.push(`${at}.signal must define correlation mappings`);
    } else {
      const observedBaseline = readJsonPointer(
        baseline,
        alert.signal.metricPath,
      );
      if (alert.signal.source !== "performance:measure") {
        errors.push(`${at}.signal source must be performance:measure`);
      }
      if (!Number.isFinite(observedBaseline)) {
        errors.push(`${at}.signal metricPath must resolve to a measured value`);
      }
      for (const requiredKey of ["release", "measurementRevision"]) {
        const pointer = alert.signal.correlation[requiredKey];
        if (typeof pointer !== "string") {
          errors.push(`${at}.signal correlation must map ${requiredKey}`);
        } else if (typeof readJsonPointer(baseline, pointer) !== "string") {
          errors.push(
            `${at}.signal correlation ${requiredKey} must resolve to a string`,
          );
        }
      }
    }
    if (
      !isRecord(alert?.threshold) ||
      !OPERATORS.has(alert.threshold.operator) ||
      !Number.isFinite(alert.threshold.value)
    ) {
      errors.push(
        `${at}.threshold must define a supported operator and numeric value`,
      );
    } else {
      const derivation = alert.threshold.derivation;
      if (!isRecord(derivation) || derivation.kind !== "measured-baseline") {
        errors.push(`${at}.threshold must derive from a measured baseline`);
      } else if (derivation.jsonPointer !== alert.signal?.metricPath) {
        errors.push(
          `${at}.threshold must derive directly from its signal metricPath`,
        );
      } else {
        const baselineValue = readJsonPointer(baseline, derivation.jsonPointer);
        if (!Number.isFinite(baselineValue)) {
          errors.push(
            `${at}.threshold baseline pointer must resolve to a number`,
          );
        } else if (baselineValue !== alert.threshold.value) {
          errors.push(`${at}.threshold must equal its measured baseline value`);
        }
      }
    }
    if (
      !isRecord(alert?.window) ||
      !Number.isInteger(alert.window.samples) ||
      alert.window.samples < 1
    ) {
      errors.push(`${at}.window must define one or more samples`);
    }
    if (
      !isRecord(alert?.deduplication) ||
      !Array.isArray(alert.deduplication.keys) ||
      alert.deduplication.keys.length === 0 ||
      !Number.isInteger(alert.deduplication.quietPeriodMinutes) ||
      alert.deduplication.quietPeriodMinutes < 1
    ) {
      errors.push(
        `${at}.deduplication must define keys and a positive quiet period`,
      );
    } else {
      const availableKeys = new Set([
        "alertId",
        ...Object.keys(alert.signal?.correlation ?? {}),
      ]);
      for (const key of alert.deduplication.keys) {
        if (!availableKeys.has(key)) {
          errors.push(`${at}.deduplication key ${key} must be materialized`);
        }
      }
    }
    if (
      !isRecord(alert?.verifiedFix) ||
      !OPERATORS.has(alert.verifiedFix.operator) ||
      !Number.isFinite(alert.verifiedFix.value) ||
      !Number.isInteger(alert.verifiedFix.consecutiveMeasurements) ||
      alert.verifiedFix.consecutiveMeasurements < 1 ||
      typeof alert.verifiedFix.criterion !== "string" ||
      !alert.verifiedFix.criterion.trim()
    ) {
      errors.push(
        `${at}.verifiedFix must define an operator, value, measurements, and criterion`,
      );
    } else if (alert.verifiedFix.value !== alert.threshold?.value) {
      errors.push(
        `${at}.verifiedFix value must match the baseline-derived threshold`,
      );
    }
  }

  if (
    !Array.isArray(catalog.reportOnlySignals) ||
    catalog.reportOnlySignals.length === 0
  ) {
    errors.push("reportOnlySignals must be a non-empty array");
  }
  for (const [index, signal] of (catalog.reportOnlySignals ?? []).entries()) {
    const at = `reportOnlySignals[${index}]`;
    if (signal?.status !== "unproven")
      errors.push(`${at}.status must be unproven`);
    if (signal?.numericThreshold !== null)
      errors.push(`${at}.numericThreshold must be null`);
    for (const field of ["id", "owner", "signal", "reason"]) {
      if (typeof signal?.[field] !== "string" || !signal[field].trim()) {
        errors.push(`${at}.${field} must be a non-empty string`);
      }
    }
  }
  return errors;
}

export async function readAndValidateAlertCatalog(
  catalogPath,
  repoRoot = process.cwd(),
) {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const baselinePath = resolve(
    repoRoot,
    "docs/research/im-12-performance-baseline.json",
  );
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const errors = validateAlertCatalog(catalog, baseline);
  for (const [index, alert] of (catalog.alerts ?? []).entries()) {
    try {
      await access(resolve(repoRoot, alert.runbook));
    } catch {
      errors.push(`alerts[${index}].runbook must resolve to a file`);
    }
    if (
      alert.threshold?.derivation?.baselineFile !==
      "docs/research/im-12-performance-baseline.json"
    ) {
      errors.push(
        `alerts[${index}].threshold baselineFile must reference the IM-12 baseline`,
      );
    }
  }
  return errors;
}

const isCli =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const path = process.argv[2] ?? "docs/observability/alert-catalog.v1.json";
  const errors = await readAndValidateAlertCatalog(path);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Alert catalog valid: ${path}`);
  }
}
