import { describe, expect, it, vi } from "vitest";
import { buildAnalyticsBootstrapPayload } from "../src/analytics";

const posthog = vi.hoisted(() => ({
  capture: vi.fn(),
  captureException: vi.fn(),
  init: vi.fn(),
  register: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthog }));

describe("PostHog browser runtime", () => {
  it("boots immediately on the canonical production host with durable identity and real Web Vitals", async () => {
    const payload = buildAnalyticsBootstrapPayload(
      {
        key: "phc_production",
        environment: "production",
        canonicalUrl: "https://aohys.com/contact/",
      },
      {
        contentId: "contact",
        locale: "en",
        path: "/contact/",
        canonicalUrl: "https://aohys.com/contact/",
        environment: "production",
      },
    );
    const documentListeners: string[] = [];
    const windowListeners: string[] = [];
    const windowCallbacks = new Map<string, EventListener>();
    const documentRef = {
      addEventListener: (name: string) => documentListeners.push(name),
      getElementById: () => ({ textContent: JSON.stringify(payload) }),
      querySelectorAll: () => [],
      visibilityState: "visible",
    } as unknown as Document;
    const windowRef = {
      addEventListener: (name: string, callback: EventListener) => {
        windowListeners.push(name);
        windowCallbacks.set(name, callback);
      },
      location: { hostname: "aohys.com" },
      navigator: { webdriver: false },
    } as unknown as Window;
    const { bootPostHogFromDocument } = await import("../src/posthog-client");

    bootPostHogFromDocument(documentRef, windowRef);

    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledOnce());
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_production",
      expect.objectContaining({
        api_host: "/ingest",
        capture_pageview: false,
        capture_performance: {
          web_vitals: true,
          web_vitals_allowed_metrics: ["LCP", "INP", "CLS"],
        },
        disable_persistence: false,
        persistence: "localStorage",
      }),
    );
    expect(posthog.register).toHaveBeenCalledWith(payload.pageview.properties);
    expect(posthog.capture).toHaveBeenCalledWith(
      "$pageview",
      payload.pageview.properties,
    );
    expect(documentListeners).toEqual(
      expect.arrayContaining(["click", "submit", "visibilitychange"]),
    );
    expect(windowListeners).toEqual(
      expect.arrayContaining([
        "aohys:analytics",
        "error",
        "unhandledrejection",
      ]),
    );

    const controlledError = new TypeError("private@example.com");
    windowCallbacks.get("error")?.({ error: controlledError } as ErrorEvent);
    expect(posthog.captureException).toHaveBeenCalledWith(
      controlledError,
      expect.objectContaining({
        source: "window_error",
        error_type: "TypeError",
        environment: "production",
      }),
    );
  });
});
