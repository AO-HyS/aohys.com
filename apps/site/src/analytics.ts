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

export type SelectedConversionEvent = (typeof SELECTED_CONVERSION_EVENTS)[number];

export interface AnalyticsContext {
  contentId: ContentId | string;
  locale: Locale | string;
  path: string;
  canonicalUrl: string;
  environment: string;
}

export interface PostHogClientSettings {
  key: string | undefined;
  host: string | undefined;
  autocapturePolicy: string | undefined;
}

export interface PostHogClientConfig {
  key: string;
  host: string;
  autocapture: false;
  capture_pageview: false;
  capture_pageleave: false;
  disable_persistence: true;
  disable_session_recording: true;
  person_profiles: "never";
  respect_dnt: true;
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
] as const;

function normalizePostHogHost(host: string | undefined): string {
  const normalized = host?.trim().replace(/\/+$/, "");
  return normalized || "https://us.i.posthog.com";
}

function normalizePath(path: string): string {
  const normalized = path.trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function baseProperties(context: AnalyticsContext): Record<string, string> {
  return {
    content_id: String(context.contentId),
    locale: String(context.locale),
    path: normalizePath(context.path),
    canonical_url: context.canonicalUrl,
    environment: context.environment,
  };
}

function isSensitiveAnalyticsKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replaceAll("-", "_");
  return SENSITIVE_ANALYTICS_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => !isSensitiveAnalyticsKey(key))
      .filter(([, value]) => (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      )),
  ) as Record<string, string | number | boolean>;
}

export function buildPostHogClientConfig(
  settings: PostHogClientSettings,
): PostHogClientConfig | undefined {
  const key = settings.key?.trim();

  if (!key) {
    return undefined;
  }

  return {
    key,
    host: normalizePostHogHost(settings.host),
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_persistence: true,
    disable_session_recording: true,
    person_profiles: "never",
    respect_dnt: true,
  };
}

export function buildExplicitPageviewEvent(context: AnalyticsContext): AnalyticsCapture {
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
      ...baseProperties(context),
      ...sanitizeAnalyticsProperties(properties),
    },
  };
}

export function buildManualExceptionProperties(
  context: AnalyticsContext,
  properties: Record<string, unknown> = {},
): Record<string, string | number | boolean> {
  return {
    ...baseProperties(context),
    ...sanitizeAnalyticsProperties(properties),
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
