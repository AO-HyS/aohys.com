import {
  buildExplicitConversionEvent,
  buildManualExceptionProperties,
  sanitizePostHogEnvelopeProperties,
  type AnalyticsBootstrapPayload,
} from "./analytics";
import {
  isJsonRecord,
  parseAnalyticsBootstrapPayload,
  parseAnalyticsEventDetail,
} from "./runtime-boundaries";

const PAYLOAD_ELEMENT_ID = "aohys-posthog-config";

type PostHogBrowserClient = typeof import("posthog-js").default;

const PRODUCTION_HOSTNAME = "aohys.com";

let hasBooted = false;

function readPayload(
  documentRef: Document,
): AnalyticsBootstrapPayload | undefined {
  const payloadElement = documentRef.getElementById(PAYLOAD_ELEMENT_ID);
  const payloadText = payloadElement?.textContent;

  if (!payloadText) {
    return undefined;
  }

  try {
    return parseAnalyticsBootstrapPayload(payloadText);
  } catch {
    return undefined;
  }
}

function getElementTarget(element: Element): string | undefined {
  return element.getAttribute("data-analytics-target") ?? undefined;
}

function getCustomEventDetail(event: Event) {
  return event instanceof CustomEvent
    ? parseAnalyticsEventDetail(event.detail)
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
    const event = buildExplicitConversionEvent(
      eventName,
      payload.context,
      properties,
    );
    posthog.capture(event.name, event.properties);
  } catch {
    // Unsupported analytics events are ignored in the browser instead of breaking UX.
  }
}

function captureException(
  posthog: PostHogBrowserClient,
  payload: AnalyticsBootstrapPayload,
  source: string,
  error: unknown,
  fallbackType: string,
): void {
  const structuredError =
    error instanceof Error
      ? error
      : Object.assign(new Error(fallbackType), { name: fallbackType });
  const properties = buildManualExceptionProperties(payload.context, {
    source,
    error_type: structuredError.name,
  });

  posthog.captureException(structuredError, properties);
}

function bindViewHooks(
  documentRef: Document,
  posthog: PostHogBrowserClient,
  payload: AnalyticsBootstrapPayload,
): void {
  for (const element of documentRef.querySelectorAll("[data-analytics-view]")) {
    captureConversion(
      posthog,
      payload,
      element.getAttribute("data-analytics-view"),
      {
        target: getElementTarget(element),
      },
    );
  }
}

function bindInteractionHooks(
  windowRef: Window,
  documentRef: Document,
  posthog: PostHogBrowserClient,
  payload: AnalyticsBootstrapPayload,
): void {
  documentRef.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element
        ? event.target.closest("[data-analytics-event]")
        : null;

    if (!target) {
      return;
    }

    captureConversion(
      posthog,
      payload,
      target.getAttribute("data-analytics-event"),
      {
        target: getElementTarget(target),
      },
    );
  });

  documentRef.addEventListener(
    "submit",
    (event) => {
      const form =
        event.target instanceof HTMLFormElement ? event.target : null;

      if (!form?.dataset.analyticsSubmit) {
        return;
      }

      captureConversion(posthog, payload, form.dataset.analyticsSubmit, {
        target: getElementTarget(form),
      });
    },
    { capture: true },
  );

  windowRef.addEventListener("aohys:analytics", (event) => {
    const detail = getCustomEventDetail(event);
    const properties = isJsonRecord(detail?.properties)
      ? detail.properties
      : {};

    captureConversion(posthog, payload, detail?.event, properties);
  });

  windowRef.addEventListener("error", (event) => {
    captureException(posthog, payload, "window_error", event.error, "Error");
  });

  windowRef.addEventListener("unhandledrejection", (event) => {
    captureException(
      posthog,
      payload,
      "unhandled_rejection",
      event.reason,
      "UnhandledRejection",
    );
  });
}

function bindPageleaveSignal(
  documentRef: Document,
  posthog: PostHogBrowserClient,
  payload: AnalyticsBootstrapPayload,
): void {
  let hasCapturedPageleave = false;
  documentRef.addEventListener("visibilitychange", () => {
    if (documentRef.visibilityState !== "hidden" || hasCapturedPageleave)
      return;
    hasCapturedPageleave = true;
    posthog.capture("$pageleave", payload.pageview.properties, {
      transport: "sendBeacon",
    });
  });
}

export function bootPostHogFromDocument(
  documentRef: Document = document,
  windowRef: Window = window,
): void {
  if (hasBooted) {
    return;
  }

  hasBooted = true;

  void (async () => {
    const payload = readPayload(documentRef);

    if (
      !payload?.config ||
      windowRef.location.hostname !== PRODUCTION_HOSTNAME ||
      windowRef.navigator.webdriver
    ) {
      return;
    }

    const { default: posthog } = await import("posthog-js");
    const client = posthog as PostHogBrowserClient;

    client.init(payload.config.key, {
      api_host: payload.config.host,
      ui_host: payload.config.ui_host,
      autocapture: payload.config.autocapture,
      capture_pageview: payload.config.capture_pageview,
      capture_pageleave: payload.config.capture_pageleave,
      capture_exceptions: payload.config.capture_exceptions,
      capture_performance: payload.config.capture_performance,
      persistence: payload.config.persistence,
      disable_persistence: payload.config.disable_persistence,
      disable_session_recording: payload.config.disable_session_recording,
      disable_surveys: payload.config.disable_surveys,
      disable_product_tours: payload.config.disable_product_tours,
      capture_dead_clicks: payload.config.capture_dead_clicks,
      advanced_disable_feature_flags:
        payload.config.advanced_disable_feature_flags,
      person_profiles: payload.config.person_profiles,
      respect_dnt: payload.config.respect_dnt,
      opt_out_useragent_filter: payload.config.opt_out_useragent_filter,
      before_send: (event) =>
        event
          ? {
              ...event,
              properties: sanitizePostHogEnvelopeProperties(
                event.properties ?? {},
              ),
            }
          : null,
    });

    client.register(payload.pageview.properties);
    client.capture(payload.pageview.name, payload.pageview.properties);
    bindViewHooks(documentRef, client, payload);
    bindInteractionHooks(windowRef, documentRef, client, payload);
    bindPageleaveSignal(documentRef, client, payload);
  })();
}
