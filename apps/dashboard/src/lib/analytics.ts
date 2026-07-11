import type { DashboardRuntimeConfig } from "@/types";

export const DASHBOARD_ANALYTICS_EVENTS = [
  "dashboard_surface_viewed",
  "dashboard_action_succeeded",
  "dashboard_action_failed",
  "dashboard_client_exception",
] as const;

export const DASHBOARD_ANALYTICS_ACTIONS = [
  "archive_media",
  "create_project",
  "delete_media",
  "publish_project",
  "publish_resume",
  "save_external_media",
  "save_project",
  "save_resume",
  "save_resume_artifact",
  "save_setting",
  "select_media",
  "update_lead_status",
  "upload_media",
] as const;

export type DashboardAnalyticsEvent = (typeof DASHBOARD_ANALYTICS_EVENTS)[number];
export type DashboardAnalyticsAction = (typeof DASHBOARD_ANALYTICS_ACTIONS)[number];
export type DashboardAnalyticsSurface = "overview" | "projects" | "leads" | "resume" | "settings" | "unknown";

export interface DashboardAnalyticsProperties {
  environment: DashboardRuntimeConfig["environment"];
  surface: DashboardAnalyticsSurface;
  action?: DashboardAnalyticsAction;
  error_type?: string;
  from_status?: string;
  locale?: string;
  path?: string;
  source?: string;
  to_status?: string;
  workflow_status?: string;
}

export interface DashboardPostHogConfig {
  api_host: string;
  autocapture: false;
  capture_pageleave: false;
  capture_pageview: false;
  disable_persistence: true;
  disable_session_recording: true;
  person_profiles: "never";
  respect_dnt: true;
}

interface PostHogClient {
  capture: (event: string, properties: Record<string, string | number | boolean>) => void;
  init: (key: string, config: DashboardPostHogConfig & {
    before_send: (event: { properties?: Record<string, unknown> } | null) => { properties?: Record<string, unknown> } | null;
  }) => void;
}

type PostHogImporter = () => Promise<{ default: PostHogClient }>;

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const SENSITIVE_PROPERTY_PARTS = [
  "admin",
  "company",
  "email",
  "lead_id",
  "message",
  "name",
  "phone",
  "secret",
  "token",
  "url",
] as const;

let analyticsClientPromise: Promise<PostHogClient | undefined> | undefined;
let activeRuntimeConfig: DashboardRuntimeConfig | undefined;
let hasBoundErrorSignals = false;

function normalizeHost(value: string | undefined): string {
  return (value?.trim() || DEFAULT_POSTHOG_HOST).replace(/\/+$/, "");
}

function isSensitiveProperty(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll("-", "_");
  return SENSITIVE_PROPERTY_PARTS.some((part) => normalized.includes(part));
}

export function sanitizeDashboardAnalyticsProperties(
  properties: object,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => !isSensitiveProperty(key))
      .filter(([, value]) => (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      )),
  ) as Record<string, string | number | boolean>;
}

export function buildDashboardPostHogConfig(
  runtimeConfig: DashboardRuntimeConfig,
): DashboardPostHogConfig | undefined {
  if (!runtimeConfig.posthogKey?.trim()) {
    return undefined;
  }

  return {
    api_host: normalizeHost(runtimeConfig.posthogHost),
    autocapture: false,
    capture_pageleave: false,
    capture_pageview: false,
    disable_persistence: true,
    disable_session_recording: true,
    person_profiles: "never",
    respect_dnt: true,
  };
}

export function dashboardSurfaceFromPath(path: string): DashboardAnalyticsSurface {
  const normalized = path.replace(/^\/dashboard\/?/, "").split(/[?#]/, 1)[0];
  const segment = normalized.split("/", 1)[0];

  if (!segment) return "overview";
  if (segment === "case-studies" || segment === "media" || segment === "projects") return "projects";
  if (segment === "leads" || segment === "resume" || segment === "settings") return segment;
  return "unknown";
}

export function initializeDashboardAnalytics(
  runtimeConfig: DashboardRuntimeConfig,
  importPostHog: PostHogImporter = async () => {
    const module = await import("posthog-js");
    return { default: module.default as unknown as PostHogClient };
  },
): void {
  if (analyticsClientPromise) {
    return;
  }

  activeRuntimeConfig = runtimeConfig;
  const posthogConfig = buildDashboardPostHogConfig(runtimeConfig);

  analyticsClientPromise = posthogConfig
    ? importPostHog().then(({ default: client }) => {
      client.init(runtimeConfig.posthogKey!.trim(), {
        ...posthogConfig,
        before_send: (event) => event
          ? { ...event, properties: sanitizeDashboardAnalyticsProperties(event.properties ?? {}) }
          : null,
      });
      return client;
    }).catch(() => undefined)
    : Promise.resolve(undefined);

  bindDashboardErrorSignals();
}

export function captureDashboardEvent(
  event: DashboardAnalyticsEvent,
  properties: DashboardAnalyticsProperties,
): void {
  void analyticsClientPromise?.then((client) => {
    client?.capture(event, sanitizeDashboardAnalyticsProperties(properties));
  });
}

export function captureDashboardAction(
  outcome: "succeeded" | "failed",
  surface: DashboardAnalyticsSurface,
  action: DashboardAnalyticsAction,
  properties: Omit<DashboardAnalyticsProperties, "action" | "environment" | "surface"> = {},
): void {
  if (!activeRuntimeConfig) {
    return;
  }

  captureDashboardEvent(`dashboard_action_${outcome}`, {
    environment: activeRuntimeConfig.environment,
    surface,
    action,
    ...properties,
  });
}

function bindDashboardErrorSignals(): void {
  if (hasBoundErrorSignals || typeof window === "undefined") {
    return;
  }

  hasBoundErrorSignals = true;

  window.addEventListener("error", (event) => {
    captureDashboardClientException(
      "window_error",
      event.error instanceof Error ? event.error.name : "Error",
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureDashboardClientException(
      "unhandled_rejection",
      event.reason instanceof Error ? event.reason.name : "UnhandledRejection",
    );
  });
}

function captureDashboardClientException(source: string, errorType: string): void {
  if (!activeRuntimeConfig || typeof window === "undefined") {
    return;
  }

  captureDashboardEvent("dashboard_client_exception", {
    environment: activeRuntimeConfig.environment,
    surface: dashboardSurfaceFromPath(window.location.pathname),
    source,
    error_type: errorType,
  });
}
