import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SENSITIVE_PROPERTY_PARTS = [
  "admin",
  "company_name",
  "email",
  "form_data",
  "lead_id",
  "message",
  "phone_number",
  "query",
  "referrer",
  "secret",
  "token",
];
const SAFE_EXCEPTION_PROPERTY = "$exception_list";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateSignalCatalog(catalog) {
  const errors = [];
  if (!isRecord(catalog)) return ["catalog must be an object"];
  if (catalog.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!isRecord(catalog.provider)) errors.push("provider must be an object");
  if (!Array.isArray(catalog.journeys) || catalog.journeys.length === 0) {
    errors.push("journeys must be a non-empty array");
    return errors;
  }

  const journeyIds = new Set();
  for (const [journeyIndex, journey] of catalog.journeys.entries()) {
    const at = `journeys[${journeyIndex}]`;
    if (!isRecord(journey)) {
      errors.push(`${at} must be an object`);
      continue;
    }
    for (const field of ["id", "owner", "purpose", "privacy"]) {
      if (typeof journey[field] !== "string" || !journey[field].trim()) {
        errors.push(`${at}.${field} must be a non-empty string`);
      }
    }
    if (journeyIds.has(journey.id)) errors.push(`${at}.id must be unique`);
    journeyIds.add(journey.id);
    if (
      !isRecord(journey.retention) ||
      !Number.isInteger(journey.retention.days) ||
      journey.retention.days <= 0 ||
      typeof journey.retention.rationale !== "string" ||
      !journey.retention.rationale.trim()
    ) {
      errors.push(`${at}.retention must define positive days and a rationale`);
    }
    if (!Array.isArray(journey.signals) || journey.signals.length === 0) {
      errors.push(`${at}.signals must be a non-empty array`);
      continue;
    }
    for (const [signalIndex, signal] of journey.signals.entries()) {
      const signalAt = `${at}.signals[${signalIndex}]`;
      if (
        !isRecord(signal) ||
        typeof signal.event !== "string" ||
        !signal.event
      ) {
        errors.push(`${signalAt}.event must be a non-empty string`);
        continue;
      }
      if (
        !Array.isArray(signal.properties) ||
        signal.properties.length === 0 ||
        !signal.properties.every((property) => typeof property === "string")
      ) {
        errors.push(`${signalAt}.properties must be a non-empty string array`);
        continue;
      }
      if (new Set(signal.properties).size !== signal.properties.length) {
        errors.push(`${signalAt}.properties must not contain duplicates`);
      }
      for (const property of signal.properties) {
        const normalized = property.toLowerCase().replaceAll("-", "_");
        if (
          property !== SAFE_EXCEPTION_PROPERTY &&
          SENSITIVE_PROPERTY_PARTS.some((part) => normalized.includes(part))
        ) {
          errors.push(
            `${signalAt}.properties contains sensitive property ${property}`,
          );
        }
      }
    }
  }
  return errors;
}

export async function readAndValidateSignalCatalog(path) {
  const catalog = JSON.parse(await readFile(path, "utf8"));
  return validateSignalCatalog(catalog);
}

const isCli =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  const path = process.argv[2] ?? "docs/observability/signal-catalog.v1.json";
  const errors = await readAndValidateSignalCatalog(path);
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Signal catalog valid: ${path}`);
  }
}
