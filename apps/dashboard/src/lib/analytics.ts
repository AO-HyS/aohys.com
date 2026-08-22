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
  release?: string;
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
  captureException: (
    error: unknown,
    properties?: Record<string, string | number | boolean>,
  ) => unknown;
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
type WebVitalsImporter = () => Promise<typeof import("web-vitals")>;

function isPostHogClient(value: unknown): value is PostHogClient {
  return (
    typeof value === "object" &&
    value !== null &&
    "capture" in value &&
    typeof value.capture === "function" &&
    "captureException" in value &&
    typeof value.captureException === "function" &&
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
const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/;

let analyticsClientPromise: Promise<PostHogClient | undefined> | undefined;
let activeRuntimeConfig: DashboardRuntimeConfig | undefined;
let activeReleaseSha: string | undefined;
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
): Record<string, unknown> {
  const sanitized: Record<string, unknown> =
    sanitizeDashboardAnalyticsProperties(properties);
  const token = (properties as Record<string, unknown>).token;
  const exceptionList = sanitizeDashboardExceptionList(
    (properties as Record<string, unknown>).$exception_list,
  );

  if (typeof token === "string" && token.length > 0) {
    sanitized.token = token;
  }
  if (exceptionList) sanitized.$exception_list = exceptionList;

  return sanitized;
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

function sanitizeDashboardExceptionList(value: unknown): unknown[] | undefined {
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
    const type =
      typeof exception.type === "string" && SAFE_ERROR_TYPES.has(exception.type)
        ? exception.type
        : "UnknownError";
    return [{ type, ...(frames.length > 0 ? { stacktrace: { frames } } : {}) }];
  });
  return exceptions.length > 0 ? exceptions : undefined;
}

export function normalizeDashboardReleaseSha(
  value: unknown,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return RELEASE_SHA_PATTERN.test(normalized) ? normalized : undefined;
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
  importWebVitals: WebVitalsImporter = () => import("web-vitals"),
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
  activeReleaseSha = normalizeDashboardReleaseSha(
    import.meta.env.VITE_RELEASE_SHA,
  );
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
  bindDashboardLifecycleSignals(importWebVitals);
}

export function captureDashboardEvent(
  event: DashboardAnalyticsEvent,
  properties: DashboardAnalyticsProperties,
): void {
  void analyticsClientPromise?.then((client) => {
    client?.capture(event, {
      $geoip_disable: true,
      ...(activeReleaseSha ? { release: activeReleaseSha } : {}),
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
    captureDashboardClientException("window_error", event.error, "Error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureDashboardClientException(
      "unhandled_rejection",
      event.reason,
      "UnhandledRejection",
    );
  });
}

function bindDashboardLifecycleSignals(
  importWebVitals: WebVitalsImporter,
): void {
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
          ...(activeReleaseSha ? { release: activeReleaseSha } : {}),
        },
        { transport: "sendBeacon" },
      ),
    );
  });

  void registerDashboardWebVitals((name, value) => {
    if (!activeRuntimeConfig) return;
    captureDashboardEvent("$web_vitals", {
      environment: activeRuntimeConfig.environment,
      surface: dashboardSurfaceFromPath(window.location.pathname),
      path: window.location.pathname,
      metric_name: name,
      metric_value: Number(value.toFixed(3)),
    });
  }, importWebVitals);
}

export async function registerDashboardWebVitals(
  capture: (name: "LCP" | "INP" | "CLS", value: number) => void,
  importer: WebVitalsImporter = () => import("web-vitals"),
): Promise<void> {
  try {
    const { onCLS, onINP, onLCP } = await importer();
    onLCP((metric) => capture("LCP", metric.value));
    onINP((metric) => capture("INP", metric.value));
    onCLS((metric) => capture("CLS", metric.value));
  } catch {
    // Observability must never break dashboard interactions.
  }
}

function captureDashboardClientException(
  source: string,
  error: unknown,
  fallbackType: string,
): void {
  if (!activeRuntimeConfig || typeof window === "undefined") {
    return;
  }

  void analyticsClientPromise?.then((client) => {
    if (!client || !activeRuntimeConfig) return;
    const candidateType = error instanceof Error ? error.name : fallbackType;
    const normalizedType = SAFE_ERROR_TYPES.has(candidateType)
      ? candidateType
      : "UnknownError";
    const structuredError =
      error instanceof Error
        ? error
        : Object.assign(new Error(normalizedType), { name: normalizedType });
    client.captureException(structuredError, {
      $geoip_disable: true,
      environment: activeRuntimeConfig.environment,
      surface: dashboardSurfaceFromPath(window.location.pathname),
      source,
      error_type: normalizedType,
      ...(activeReleaseSha ? { release: activeReleaseSha } : {}),
    });
  });
}
