import { assertOneOf } from "@aohys/core";
import type { ContentId, Locale } from "@aohys/content-graph";

export const SELECTED_CONVERSION_EVENTS = [
  "contact_form_viewed",
  "contact_form_submit_attempted",
  "contact_form_submit_succeeded",
  "contact_form_submit_failed",
  "whatsapp_cta_clicked",
  "email_cta_clicked",
] as const;

export type SelectedConversionEvent =
  (typeof SELECTED_CONVERSION_EVENTS)[number];

export interface AnalyticsContext {
  contentId: ContentId | string;
  locale: Locale | string;
  path: string;
  canonicalUrl: string;
  environment: string;
}

export interface PostHogClientSettings {
  key: string | undefined;
  environment: string;
  canonicalUrl: string;
}

export interface PostHogClientConfig {
  key: string;
  host: string;
  ui_host: "https://us.posthog.com";
  autocapture: false;
  capture_pageview: false;
  capture_pageleave: false;
  capture_exceptions: false;
  capture_performance: {
    web_vitals: true;
    web_vitals_allowed_metrics: ["LCP", "INP", "CLS"];
  };
  persistence: "localStorage";
  disable_persistence: false;
  disable_session_recording: true;
  disable_surveys: true;
  disable_product_tours: true;
  capture_dead_clicks: false;
  advanced_disable_feature_flags: true;
  person_profiles: "never";
  respect_dnt: true;
  opt_out_useragent_filter: false;
}

export interface AnalyticsCapture {
  name: "$pageview" | SelectedConversionEvent;
  properties: Record<string, string | number | boolean>;
}

export interface AnalyticsBootstrapPayload {
  config?: PostHogClientConfig;
  context: AnalyticsContext;
  pageview: AnalyticsCapture;
  selectedConversionEvents: readonly SelectedConversionEvent[];
}

const SENSITIVE_ANALYTICS_KEYS = [
  "company",
  "contact",
  "email",
  "error_message",
  "form_data",
  "message",
  "name",
  "phone",
  "referrer",
  "website",
  "current_url",
] as const;
const SAFE_ERROR_TYPES = new Set([
  "AggregateError",
  "Error",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
  "UnhandledRejection",
  "UnknownError",
]);

export function normalizeAnalyticsErrorType(value: unknown): string {
  return typeof value === "string" && SAFE_ERROR_TYPES.has(value)
    ? value
    : "UnknownError";
}

function normalizePath(path: string): string {
  const normalized = path.trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function baseProperties(context: AnalyticsContext): Record<string, string> {
  const canonicalUrl = new URL(context.canonicalUrl);

  return {
    $current_url: `${canonicalUrl.origin}${canonicalUrl.pathname}`,
    $host: canonicalUrl.hostname,
    $pathname: canonicalUrl.pathname,
    content_id: String(context.contentId),
    locale: String(context.locale),
    path: normalizePath(context.path),
    canonical_url: context.canonicalUrl,
    environment: context.environment,
  };
}

function isSensitiveAnalyticsKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replaceAll("-", "_");
  if (normalizedKey === "canonical_url") return false;
  return SENSITIVE_ANALYTICS_KEYS.some((sensitiveKey) =>
    normalizedKey.includes(sensitiveKey),
  );
}

function sanitizeCurrentUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  try {
    const url = new URL(value);
    return url.hostname === "aohys.com"
      ? `${url.origin}${url.pathname}`
      : undefined;
  } catch {
    return undefined;
  }
}

function isAnalyticsEntry(
  entry: [string, unknown],
): entry is [string, string | number | boolean] {
  const value = entry[1];
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties)
      .map(([key, value]): [string, unknown] => [
        key,
        key.toLowerCase().replaceAll("-", "_") === "$current_url"
          ? sanitizeCurrentUrl(value)
          : value,
      ])
      .filter(
        ([key]) => !isSensitiveAnalyticsKey(key) || key === "$current_url",
      )
      .filter(isAnalyticsEntry)
      .map(([key, value]): [string, string | number | boolean] => [
        key,
        key.toLowerCase().replaceAll("-", "_") === "error_type"
          ? normalizeAnalyticsErrorType(value)
          : value,
      ]),
  ) as Record<string, string | number | boolean>;
}

export function buildPostHogClientConfig(
  settings: PostHogClientSettings,
): PostHogClientConfig | undefined {
  const key = settings.key?.trim();
  let hostname: string | undefined;

  try {
    hostname = new URL(settings.canonicalUrl).hostname;
  } catch {
    hostname = undefined;
  }

  if (
    !key ||
    settings.environment !== "production" ||
    hostname !== "aohys.com"
  ) {
    return undefined;
  }

  return {
    key,
    host: "/ingest",
    ui_host: "https://us.posthog.com",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_exceptions: false,
    capture_performance: {
      web_vitals: true,
      web_vitals_allowed_metrics: ["LCP", "INP", "CLS"],
    },
    persistence: "localStorage",
    disable_persistence: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    capture_dead_clicks: false,
    advanced_disable_feature_flags: true,
    person_profiles: "never",
    respect_dnt: true,
    opt_out_useragent_filter: false,
  };
}

export function buildExplicitPageviewEvent(
  context: AnalyticsContext,
): AnalyticsCapture {
  return {
    name: "$pageview",
    properties: baseProperties(context),
  };
}

export function buildExplicitConversionEvent(
  eventName: string,
  context: AnalyticsContext,
  properties: Record<string, unknown> = {},
): AnalyticsCapture {
  assertOneOf(eventName, SELECTED_CONVERSION_EVENTS, "analytics event");

  return {
    name: eventName,
    properties: {
      ...sanitizeAnalyticsProperties(properties),
      ...baseProperties(context),
    },
  };
}

export function buildManualExceptionProperties(
  context: AnalyticsContext,
  properties: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
  return {
    ...sanitizeAnalyticsProperties(properties),
    ...baseProperties(context),
  };
}

export function buildAnalyticsBootstrapPayload(
  settings: PostHogClientSettings,
  context: AnalyticsContext,
): AnalyticsBootstrapPayload {
  return {
    config: buildPostHogClientConfig(settings),
    context: {
      ...context,
      path: normalizePath(context.path),
    },
    pageview: buildExplicitPageviewEvent(context),
    selectedConversionEvents: SELECTED_CONVERSION_EVENTS,
  };
}
