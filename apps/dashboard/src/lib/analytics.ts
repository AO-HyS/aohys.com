import type { DashboardRuntimeConfig } from "@/runtime-config";
import { matchDashboardNavigationItem } from "@/navigation";

export const DASHBOARD_ANALYTICS_EVENTS = [
  "$pageview",
  "$pageleave",
  "$web_vitals",
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

export type DashboardAnalyticsEvent =
  (typeof DASHBOARD_ANALYTICS_EVENTS)[number];
export type DashboardAnalyticsAction =
  (typeof DASHBOARD_ANALYTICS_ACTIONS)[number];
export type DashboardAnalyticsSurface =
  | "overview"
  | "projects"
  | "leads"
  | "resume"
  | "settings"
  | "unknown";

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
  metric_name?: string;
  metric_value?: number;
}

export interface DashboardPostHogConfig {
  api_host: string;
  ui_host: "https://us.posthog.com";
  autocapture: false;
  capture_pageleave: false;
  capture_pageview: false;
  capture_exceptions: false;
  capture_performance: false;
  disable_persistence: true;
  disable_session_recording: true;
  person_profiles: "never";
  respect_dnt: true;
}

interface PostHogClient {
  capture: (
    event: string,
    properties: Record<string, string | number | boolean>,
    options?: { transport: "sendBeacon" },
  ) => void;
  init: (
    key: string,
    config: DashboardPostHogConfig & {
      before_send: (
        event: { properties?: Record<string, unknown> } | null,
      ) => { properties?: Record<string, unknown> } | null;
    },
  ) => void;
}

type PostHogImporter = () => Promise<{ default: PostHogClient }>;

function isPostHogClient(value: unknown): value is PostHogClient {
  return (
    typeof value === "object" &&
    value !== null &&
    "capture" in value &&
    typeof value.capture === "function" &&
    "init" in value &&
    typeof value.init === "function"
  );
}

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

let analyticsClientPromise: Promise<PostHogClient | undefined> | undefined;
let activeRuntimeConfig: DashboardRuntimeConfig | undefined;
let hasBoundErrorSignals = false;

function isSensitiveProperty(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll("-", "_");
  return SENSITIVE_PROPERTY_PARTS.some((part) => normalized.includes(part));
}

export function sanitizeDashboardAnalyticsProperties(
  properties: object,
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (
      isSensitiveProperty(key) ||
      !["string", "number", "boolean"].includes(typeof value)
    )
      continue;
    sanitized[key] =
      key.toLowerCase().replaceAll("-", "_") === "error_type" &&
      typeof value === "string" &&
      !SAFE_ERROR_TYPES.has(value)
        ? "UnknownError"
        : (value as string | number | boolean);
  }

  return sanitized;
}

export function sanitizeDashboardPostHogEnvelopeProperties(
  properties: object,
): Record<string, string | number | boolean> {
  const sanitized = sanitizeDashboardAnalyticsProperties(properties);
  const token = (properties as Record<string, unknown>).token;

  if (typeof token === "string" && token.length > 0) {
    sanitized.token = token;
  }

  return sanitized;
}

export function buildDashboardPostHogConfig(
  runtimeConfig: DashboardRuntimeConfig,
): DashboardPostHogConfig | undefined {
  if (
    runtimeConfig.environment !== "production" ||
    !runtimeConfig.posthogKey?.trim()
  ) {
    return undefined;
  }

  return {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    autocapture: false,
    capture_pageleave: false,
    capture_pageview: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_persistence: true,
    disable_session_recording: true,
    person_profiles: "never",
    respect_dnt: true,
  };
}

export function dashboardSurfaceFromPath(
  path: string,
): DashboardAnalyticsSurface {
  return matchDashboardNavigationItem(path)?.id ?? "unknown";
}

export function createDashboardPathObserver(
  initialPath: string,
  capture: (path: string) => void,
): (path: string) => void {
  let lastCapturedPath: string | undefined;
  const observePath = (path: string) => {
    if (path === lastCapturedPath) {
      return;
    }

    lastCapturedPath = path;
    capture(path);
  };

  observePath(initialPath);
  return observePath;
}

export function initializeDashboardAnalytics(
  runtimeConfig: DashboardRuntimeConfig,
  importPostHog: PostHogImporter = async () => {
    const module = await import("posthog-js");
    const client: unknown = module.default;
    if (!isPostHogClient(client)) {
      throw new Error("PostHog client module has an invalid runtime shape.");
    }
    return { default: client };
  },
): void {
  if (analyticsClientPromise) {
    return;
  }

  if (
    runtimeConfig.environment !== "production" ||
    (typeof window !== "undefined" && window.location.hostname !== "aohys.com")
  ) {
    return;
  }

  activeRuntimeConfig = runtimeConfig;
  const posthogConfig = buildDashboardPostHogConfig(runtimeConfig);

  analyticsClientPromise = posthogConfig
    ? importPostHog()
        .then(({ default: client }) => {
          client.init(runtimeConfig.posthogKey!.trim(), {
            ...posthogConfig,
            before_send: (event) =>
              event
                ? {
                    ...event,
                    properties: sanitizeDashboardPostHogEnvelopeProperties(
                      event.properties ?? {},
                    ),
                  }
                : null,
          });
          return client;
        })
        .catch(() => undefined)
    : Promise.resolve(undefined);

  bindDashboardErrorSignals();
  bindDashboardLifecycleSignals();
}

export function captureDashboardEvent(
  event: DashboardAnalyticsEvent,
  properties: DashboardAnalyticsProperties,
): void {
  void analyticsClientPromise?.then((client) => {
    client?.capture(event, {
      $geoip_disable: true,
      ...sanitizeDashboardAnalyticsProperties(properties),
    });
  });
}

export function captureDashboardAction(
  outcome: "succeeded" | "failed",
  surface: DashboardAnalyticsSurface,
  action: DashboardAnalyticsAction,
  properties: Omit<
    DashboardAnalyticsProperties,
    "action" | "environment" | "surface"
  > = {},
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

function bindDashboardLifecycleSignals(): void {
  if (typeof window === "undefined" || !activeRuntimeConfig) return;
  let hasCapturedPageleave = false;
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState !== "hidden" ||
      hasCapturedPageleave ||
      !activeRuntimeConfig
    )
      return;
    hasCapturedPageleave = true;
    void analyticsClientPromise?.then((client) =>
      client?.capture(
        "$pageleave",
        {
          $geoip_disable: true,
          environment: activeRuntimeConfig!.environment,
          surface: dashboardSurfaceFromPath(window.location.pathname),
          path: window.location.pathname,
        },
        { transport: "sendBeacon" },
      ),
    );
  });

  if (typeof PerformanceObserver === "undefined") return;
  for (const entryType of [
    "largest-contentful-paint",
    "layout-shift",
    "first-input",
  ] as const) {
    if (!(PerformanceObserver.supportedEntryTypes ?? []).includes(entryType))
      continue;
    try {
      const observer = new PerformanceObserver((list) => {
        const entry = list.getEntries().at(-1);
        if (!entry || !activeRuntimeConfig) return;
        const metricEntry = entry as PerformanceEntry & {
          value?: number;
          processingStart?: number;
        };
        const metricValue =
          entry.entryType === "layout-shift"
            ? (metricEntry.value ?? 0)
            : entry.entryType === "first-input"
              ? Math.max(
                  0,
                  (metricEntry.processingStart ?? entry.startTime) -
                    entry.startTime,
                )
              : entry.startTime;
        captureDashboardEvent("$web_vitals", {
          environment: activeRuntimeConfig.environment,
          surface: dashboardSurfaceFromPath(window.location.pathname),
          path: window.location.pathname,
          metric_name: entry.entryType,
          metric_value: Number(metricValue.toFixed(3)),
        });
        observer.disconnect();
      });
      observer.observe({ type: entryType, buffered: true });
    } catch {
      // Unsupported performance entry types are ignored.
    }
  }
}

function captureDashboardClientException(
  source: string,
  errorType: string,
): void {
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
