import {
  buildExplicitConversionEvent,
  buildManualExceptionProperties,
  sanitizeAnalyticsProperties,
  type AnalyticsBootstrapPayload,
} from "./analytics";

const PAYLOAD_ELEMENT_ID = "aohys-posthog-config";

interface AnalyticsDetail {
  event?: unknown;
  properties?: unknown;
}

type PostHogBrowserClient = typeof import("posthog-js").default & {
  captureException?: (error: Error, properties?: Record<string, unknown>) => void;
};

let hasBooted = false;

function readPayload(documentRef: Document): AnalyticsBootstrapPayload | undefined {
  const payloadElement = documentRef.getElementById(PAYLOAD_ELEMENT_ID);
  const payloadText = payloadElement?.textContent;

  if (!payloadText) {
    return undefined;
  }

  return JSON.parse(payloadText) as AnalyticsBootstrapPayload;
}

function getElementTarget(element: Element): string | undefined {
  return element.getAttribute("data-analytics-target") ?? undefined;
}

function getCustomEventDetail(event: Event): AnalyticsDetail | undefined {
  return event instanceof CustomEvent && typeof event.detail === "object" && event.detail
    ? event.detail as AnalyticsDetail
    : undefined;
}

function captureConversion(
  posthog: PostHogBrowserClient,
  payload: AnalyticsBootstrapPayload,
  eventName: unknown,
  properties: Record<string, unknown> = {},
): void {
  if (typeof eventName !== "string") {
    return;
  }

  try {
    const event = buildExplicitConversionEvent(eventName, payload.context, properties);
    posthog.capture(event.name, event.properties);
  } catch {
    // Unsupported analytics events are ignored in the browser instead of breaking UX.
  }
}

function captureException(
  posthog: PostHogBrowserClient,
  payload: AnalyticsBootstrapPayload,
  source: string,
  errorType: string,
): void {
  const properties = buildManualExceptionProperties(payload.context, {
    source,
    error_type: errorType,
  });

  if (typeof posthog.captureException === "function") {
    posthog.captureException(new Error(source), properties);
    return;
  }

  posthog.capture("$exception", properties);
}

function bindViewHooks(documentRef: Document, posthog: PostHogBrowserClient, payload: AnalyticsBootstrapPayload): void {
  for (const element of documentRef.querySelectorAll("[data-analytics-view]")) {
    captureConversion(posthog, payload, element.getAttribute("data-analytics-view"), {
      target: getElementTarget(element),
    });
  }
}

function bindInteractionHooks(windowRef: Window, documentRef: Document, posthog: PostHogBrowserClient, payload: AnalyticsBootstrapPayload): void {
  documentRef.addEventListener("click", (event) => {
    const target = event.target instanceof Element
      ? event.target.closest("[data-analytics-event]")
      : null;

    if (!target) {
      return;
    }

    captureConversion(posthog, payload, target.getAttribute("data-analytics-event"), {
      target: getElementTarget(target),
    });
  });

  documentRef.addEventListener("submit", (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;

    if (!form?.dataset.analyticsSubmit) {
      return;
    }

    captureConversion(posthog, payload, form.dataset.analyticsSubmit, {
      target: getElementTarget(form),
    });
  }, { capture: true });

  windowRef.addEventListener("aohys:analytics", (event) => {
    const detail = getCustomEventDetail(event);
    const properties = typeof detail?.properties === "object" && detail.properties
      ? detail.properties as Record<string, unknown>
      : {};

    captureConversion(posthog, payload, detail?.event, properties);
  });

  windowRef.addEventListener("error", (event) => {
    const errorType = event.error instanceof Error ? event.error.name : "Error";
    captureException(posthog, payload, "window_error", errorType);
  });

  windowRef.addEventListener("unhandledrejection", (event) => {
    const errorType = event.reason instanceof Error ? event.reason.name : "UnhandledRejection";
    captureException(posthog, payload, "unhandled_rejection", errorType);
  });
}

export function bootPostHogFromDocument(documentRef = document, windowRef = window): void {
  if (hasBooted) {
    return;
  }

  hasBooted = true;

  void (async () => {
    const payload = readPayload(documentRef);

    if (!payload?.config) {
      return;
    }

    const { default: posthog } = await import("posthog-js");
    const client = posthog as PostHogBrowserClient;

    client.init(payload.config.key, {
      api_host: payload.config.host,
      autocapture: payload.config.autocapture,
      capture_pageview: payload.config.capture_pageview,
      capture_pageleave: payload.config.capture_pageleave,
      person_profiles: payload.config.person_profiles,
      before_send: (event) => event
        ? { ...event, properties: sanitizeAnalyticsProperties(event.properties ?? {}) }
        : null,
    });

    client.capture(payload.pageview.name, payload.pageview.properties);
    bindViewHooks(documentRef, client, payload);
    bindInteractionHooks(windowRef, documentRef, client, payload);
  })();
}
