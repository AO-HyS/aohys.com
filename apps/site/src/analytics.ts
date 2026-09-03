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
  release?: string;
}

export interface PostHogClientSettings {
  key: string | undefined;
  environment: string;
  canonicalUrl: string;
  releaseSha?: string;
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

const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/;

export function normalizeAnalyticsErrorType(value: unknown): string {
  return typeof value === "string" && SAFE_ERROR_TYPES.has(value)
    ? value
    : "UnknownError";
}

export function normalizeAnalyticsReleaseSha(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return RELEASE_SHA_PATTERN.test(normalized) ? normalized : undefined;
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
    ...(context.release ? { release: context.release } : {}),
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

function sanitizeStackLocation(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;

  const withoutQuery = value.trim().split(/[?#]/, 1)[0] ?? "";
  return withoutQuery
    .replace(/\/Users\/[^/]+\//g, "/Users/[redacted]/")
    .replace(/\/home\/[^/]+\//g, "/home/[redacted]/")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .slice(0, 500);
}

function sanitizeExceptionList(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const exceptions = value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const exception = candidate as Record<string, unknown>;
    const stacktrace =
      exception.stacktrace && typeof exception.stacktrace === "object"
        ? (exception.stacktrace as Record<string, unknown>)
        : undefined;
    const frames = Array.isArray(stacktrace?.frames)
      ? stacktrace.frames.flatMap((frameCandidate) => {
          if (!frameCandidate || typeof frameCandidate !== "object") return [];
          const frame = frameCandidate as Record<string, unknown>;
          const filename = sanitizeStackLocation(frame.filename);
          const functionName = sanitizeStackLocation(frame.function);
          const sanitizedFrame = {
            ...(filename ? { filename } : {}),
            ...(functionName ? { function: functionName } : {}),
            ...(typeof frame.lineno === "number"
              ? { lineno: frame.lineno }
              : {}),
            ...(typeof frame.colno === "number" ? { colno: frame.colno } : {}),
            ...(typeof frame.in_app === "boolean"
              ? { in_app: frame.in_app }
              : {}),
          };
          return Object.keys(sanitizedFrame).length > 0 ? [sanitizedFrame] : [];
        })
      : [];
    const errorType = normalizeAnalyticsErrorType(exception.type);

    return [
      {
        type: errorType,
        ...(frames.length > 0 ? { stacktrace: { frames } } : {}),
      },
    ];
  });

  return exceptions.length > 0 ? exceptions : undefined;
}

export function sanitizePostHogEnvelopeProperties(
  properties: Record<string, unknown> = {},
): Record<string, unknown> {
  const sanitized: Record<string, unknown> =
    sanitizeAnalyticsProperties(properties);
  const exceptionList = sanitizeExceptionList(properties.$exception_list);

  if (exceptionList) sanitized.$exception_list = exceptionList;
  if (typeof properties.token === "string" && properties.token.length > 0) {
    sanitized.token = properties.token;
  }

  return sanitized;
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
  const config = buildPostHogClientConfig(settings);
  const release = normalizeAnalyticsReleaseSha(
    settings.releaseSha ?? context.release,
  );
  const releaseContext: AnalyticsContext = {
    contentId: context.contentId,
    locale: context.locale,
    path: context.path,
    canonicalUrl: context.canonicalUrl,
    environment: context.environment,
    ...(release ? { release } : {}),
  };
  return {
    ...(config ? { config } : {}),
    context: {
      ...releaseContext,
      path: normalizePath(releaseContext.path),
    },
    pageview: buildExplicitPageviewEvent(releaseContext),
    selectedConversionEvents: SELECTED_CONVERSION_EVENTS,
  };
}
