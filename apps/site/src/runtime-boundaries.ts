import {
  SELECTED_CONVERSION_EVENTS,
  type AnalyticsBootstrapPayload,
} from "./analytics.js";
import { isRecord } from "@aohys/core/unknown-guards";

type JsonRecord = Record<string, unknown>;
const selectedConversionEventNames = new Set<string>(
  SELECTED_CONVERSION_EVENTS,
);

function hasStringFields(
  value: JsonRecord,
  fields: readonly string[],
): boolean {
  return fields.every((field) => typeof value[field] === "string");
}

function hasPrimitiveProperties(
  value: unknown,
): value is Record<string, string | number | boolean> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (property) =>
        typeof property === "string" ||
        typeof property === "number" ||
        typeof property === "boolean",
    )
  );
}

function hasValidAnalyticsConfig(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasStringFields(value, [
      "key",
      "host",
      "ui_host",
      "persistence",
      "person_profiles",
    ])
  ) {
    return false;
  }
  const booleanFields = [
    "autocapture",
    "capture_pageview",
    "capture_pageleave",
    "capture_exceptions",
    "disable_persistence",
    "disable_session_recording",
    "disable_surveys",
    "disable_product_tours",
    "capture_dead_clicks",
    "advanced_disable_feature_flags",
    "respect_dnt",
    "opt_out_useragent_filter",
  ];
  const performance = value.capture_performance;
  return (
    booleanFields.every((field) => typeof value[field] === "boolean") &&
    value.host === "/ingest" &&
    value.ui_host === "https://us.posthog.com" &&
    value.persistence === "localStorage" &&
    value.person_profiles === "never" &&
    value.autocapture === false &&
    value.capture_pageview === false &&
    value.capture_pageleave === false &&
    value.capture_exceptions === false &&
    value.disable_session_recording === true &&
    value.respect_dnt === true &&
    isRecord(performance) &&
    performance.web_vitals === true &&
    Array.isArray(performance.web_vitals_allowed_metrics) &&
    performance.web_vitals_allowed_metrics.join(",") === "LCP,INP,CLS"
  );
}

export function parseAnalyticsBootstrapPayload(
  serialized: string,
): AnalyticsBootstrapPayload {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new Error("Analytics bootstrap payload must contain valid JSON.");
  }
  assertAnalyticsBootstrapPayload(value);
  return value;
}

function assertAnalyticsBootstrapPayload(
  value: unknown,
): asserts value is AnalyticsBootstrapPayload {
  if (
    !isRecord(value) ||
    !isRecord(value.context) ||
    !hasStringFields(value.context, [
      "contentId",
      "locale",
      "path",
      "canonicalUrl",
      "environment",
    ]) ||
    !isRecord(value.pageview) ||
    value.pageview.name !== "$pageview" ||
    !hasPrimitiveProperties(value.pageview.properties) ||
    !Array.isArray(value.selectedConversionEvents) ||
    !value.selectedConversionEvents.every(
      (event) =>
        typeof event === "string" && selectedConversionEventNames.has(event),
    ) ||
    (value.config !== undefined && !hasValidAnalyticsConfig(value.config))
  ) {
    throw new Error(
      "Analytics bootstrap payload has an invalid runtime shape.",
    );
  }
}

export function parseAnalyticsEventDetail(value: unknown):
  | {
      event?: string;
      properties?: Record<string, unknown>;
    }
  | undefined {
  if (!isRecord(value)) return undefined;
  return {
    ...(typeof value.event === "string" ? { event: value.event } : {}),
    ...(isRecord(value.properties) ? { properties: value.properties } : {}),
  };
}

export function parseCspReportPayload(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const nested = value["csp-report"];
  if (nested !== undefined && !isRecord(nested)) return {};
  return value;
}

export function parseBetterAuthRedirect(value: unknown): string | null {
  return isRecord(value) ? parseBetterAuthRedirectLocation(value.url) : null;
}

export function parseBetterAuthRedirectLocation(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.username === "" &&
      url.password === ""
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function parseBetterAuthSession(
  value: unknown,
): { user: { email: string } } | null {
  if (
    !isRecord(value) ||
    !isRecord(value.user) ||
    typeof value.user.email !== "string" ||
    !value.user.email.trim()
  ) {
    return null;
  }
  return { user: { email: value.user.email } };
}
