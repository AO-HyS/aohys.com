import { describe, expect, it, vi } from "vitest";
import {
  buildDashboardPostHogConfig,
  captureDashboardEvent,
  createDashboardPathObserver,
  dashboardSurfaceFromPath,
  initializeDashboardAnalytics,
  normalizeDashboardReleaseSha,
  registerDashboardWebVitals,
  sanitizeDashboardAnalyticsProperties,
  sanitizeDashboardPostHogEnvelopeProperties,
} from "./analytics";

describe("dashboard analytics contract", () => {
  it("uses an anonymous, explicit, persistence-free PostHog configuration", () => {
    expect(
      buildDashboardPostHogConfig({
        adminEmail: "private@example.com",
        environment: "production",
        convexUrl: "https://example.convex.cloud",
        betterAuthUrl: "https://preview.aohys.com",
        posthogKey: "phc_production",
      }),
    ).toEqual({
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
    });
  });

  it("does not configure local or preview dashboard analytics", () => {
    expect(
      buildDashboardPostHogConfig({
        adminEmail: "private@example.com",
        environment: "preview",
        convexUrl: "https://example.convex.cloud",
        betterAuthUrl: "https://preview.aohys.com",
      }),
    ).toBeUndefined();
  });

  it("maps aliases to stable dashboard surfaces", () => {
    expect(dashboardSurfaceFromPath("/dashboard")).toBe("overview");
    expect(dashboardSurfaceFromPath("/dashboard/case-studies")).toBe(
      "projects",
    );
    expect(dashboardSurfaceFromPath("/dashboard/media?locale=en")).toBe(
      "projects",
    );
    expect(dashboardSurfaceFromPath("/dashboard/leads")).toBe("leads");
    expect(dashboardSurfaceFromPath("/projects")).toBe("projects");
    expect(dashboardSurfaceFromPath("/leads")).toBe("leads");
    expect(dashboardSurfaceFromPath("/dashboard/not-real")).toBe("unknown");
  });

  it("observes each dashboard pathname once", () => {
    const capture = vi.fn();
    const observePath = createDashboardPathObserver(
      "/dashboard/settings",
      capture,
    );

    observePath("/dashboard/settings");
    observePath("/dashboard/projects");
    observePath("/dashboard/projects");
    observePath("/dashboard/leads");

    expect(capture.mock.calls).toEqual([
      ["/dashboard/settings"],
      ["/dashboard/projects"],
      ["/dashboard/leads"],
    ]);
  });

  it("removes identity, secrets, and private operational identifiers", () => {
    expect(
      sanitizeDashboardAnalyticsProperties({
        environment: "production",
        surface: "leads",
        action: "update_lead_status",
        lead_id: "lead_private",
        admin_email: "private@example.com",
        message: "private details",
        token: "secret",
        error_type: "PrivateCustomerError",
        to_status: "reviewing",
      }),
    ).toEqual({
      environment: "production",
      surface: "leads",
      action: "update_lead_status",
      to_status: "reviewing",
      error_type: "UnknownError",
    });
  });

  it("preserves only the SDK transport token in the PostHog envelope", () => {
    expect(
      sanitizeDashboardPostHogEnvelopeProperties({
        token: "phc_public_ingestion_key",
        auth_token: "private_application_token",
        environment: "production",
        surface: "overview",
      }),
    ).toEqual({
      token: "phc_public_ingestion_key",
      environment: "production",
      surface: "overview",
    });
  });

  it("captures only the fixed event shape after initialization", async () => {
    const capture = vi.fn();
    const captureException = vi.fn();
    const init = vi.fn();

    initializeDashboardAnalytics(
      {
        adminEmail: "private@example.com",
        environment: "production",
        convexUrl: "https://example.convex.cloud",
        betterAuthUrl: "https://preview.aohys.com",
        posthogKey: "phc_production",
      },
      async () => ({ default: { capture, captureException, init } }),
    );

    captureDashboardEvent("dashboard_surface_viewed", {
      environment: "production",
      surface: "overview",
      path: "/dashboard",
    });

    await vi.waitFor(() => {
      expect(init).toHaveBeenCalledWith(
        "phc_production",
        expect.objectContaining({
          autocapture: false,
          disable_persistence: true,
          person_profiles: "never",
        }),
      );
      expect(capture).toHaveBeenCalledWith("dashboard_surface_viewed", {
        $geoip_disable: true,
        environment: "production",
        surface: "overview",
        path: "/dashboard",
      });
    });
  });

  it("registers only true LCP, INP, and CLS metrics", async () => {
    const capture = vi.fn();
    await registerDashboardWebVitals(
      capture,
      async () =>
        ({
          onLCP: (callback) => callback({ name: "LCP", value: 1200 } as never),
          onINP: (callback) => callback({ name: "INP", value: 180 } as never),
          onCLS: (callback) => callback({ name: "CLS", value: 0.04 } as never),
        }) as typeof import("web-vitals"),
    );

    expect(capture.mock.calls).toEqual([
      ["LCP", 1200],
      ["INP", 180],
      ["CLS", 0.04],
    ]);
  });

  it("validates complete git release identities", () => {
    expect(
      normalizeDashboardReleaseSha("0123456789ABCDEF0123456789ABCDEF01234567"),
    ).toBe("0123456789abcdef0123456789abcdef01234567");
    expect(normalizeDashboardReleaseSha("develop")).toBeUndefined();
  });

  it("preserves sanitized structured exception frames in before_send", () => {
    expect(
      sanitizeDashboardPostHogEnvelopeProperties({
        token: "phc_public",
        message: "private@example.com",
        $exception_list: [
          {
            type: "TypeError",
            value: "private@example.com",
            stacktrace: {
              frames: [
                {
                  filename: "/Users/private/app.ts?email=private@example.com",
                  function: "load-private@example.com",
                  lineno: 8,
                  colno: 2,
                  vars: { email: "private@example.com" },
                },
              ],
            },
          },
        ],
      }),
    ).toEqual({
      token: "phc_public",
      $exception_list: [
        {
          type: "TypeError",
          stacktrace: {
            frames: [
              {
                filename: "/Users/[redacted]/app.ts",
                function: "[redacted-email]",
                lineno: 8,
                colno: 2,
              },
            ],
          },
        },
      ],
    });
  });
});
