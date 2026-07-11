import { describe, expect, it, vi } from "vitest";
import {
  buildDashboardPostHogConfig,
  captureDashboardEvent,
  dashboardSurfaceFromPath,
  initializeDashboardAnalytics,
  sanitizeDashboardAnalyticsProperties,
} from "./analytics";

describe("dashboard analytics contract", () => {
  it("uses an anonymous, explicit, persistence-free PostHog configuration", () => {
    expect(buildDashboardPostHogConfig({
      adminEmail: "private@example.com",
      environment: "preview",
      convexUrl: "https://example.convex.cloud",
      betterAuthUrl: "https://preview.aohys.com",
      posthogKey: "phc_preview",
      posthogHost: "https://us.i.posthog.com/",
    })).toEqual({
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_pageleave: false,
      capture_pageview: false,
      disable_persistence: true,
      disable_session_recording: true,
      person_profiles: "never",
      respect_dnt: true,
    });
  });

  it("maps aliases to stable dashboard surfaces", () => {
    expect(dashboardSurfaceFromPath("/dashboard")).toBe("overview");
    expect(dashboardSurfaceFromPath("/dashboard/case-studies")).toBe("projects");
    expect(dashboardSurfaceFromPath("/dashboard/media?locale=en")).toBe("projects");
    expect(dashboardSurfaceFromPath("/dashboard/leads")).toBe("leads");
  });

  it("removes identity, secrets, and private operational identifiers", () => {
    expect(sanitizeDashboardAnalyticsProperties({
      environment: "preview",
      surface: "leads",
      action: "update_lead_status",
      lead_id: "lead_private",
      admin_email: "private@example.com",
      message: "private details",
      token: "secret",
      to_status: "reviewing",
    })).toEqual({
      environment: "preview",
      surface: "leads",
      action: "update_lead_status",
      to_status: "reviewing",
    });
  });

  it("captures only the fixed event shape after initialization", async () => {
    const capture = vi.fn();
    const init = vi.fn();

    initializeDashboardAnalytics({
      adminEmail: "private@example.com",
      environment: "preview",
      convexUrl: "https://example.convex.cloud",
      betterAuthUrl: "https://preview.aohys.com",
      posthogKey: "phc_preview",
    }, async () => ({ default: { capture, init } }));

    captureDashboardEvent("dashboard_surface_viewed", {
      environment: "preview",
      surface: "overview",
      path: "/dashboard",
    });

    await vi.waitFor(() => {
      expect(init).toHaveBeenCalledWith("phc_preview", expect.objectContaining({
        autocapture: false,
        disable_persistence: true,
        person_profiles: "never",
      }));
      expect(capture).toHaveBeenCalledWith("dashboard_surface_viewed", {
        environment: "preview",
        surface: "overview",
        path: "/dashboard",
      });
    });
  });
});
