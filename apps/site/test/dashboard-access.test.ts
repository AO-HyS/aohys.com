import { describe, expect, it, vi } from "vitest";
import {
  handleDashboardRequest,
  type DashboardAccessEnvironment,
} from "../src/dashboard-access.js";

const validEnvironment: DashboardAccessEnvironment = {
  AOHYS_ENV: "preview",
  PUBLIC_SITE_URL: "https://preview.aohys.com",
  CONVEX_SITE_URL: "https://effervescent-minnow-483.convex.site",
  BETTER_AUTH_URL: "https://preview.aohys.com",
  BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.aohys.com,http://localhost:4321",
  ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
};

describe("dashboard access guard", () => {
  it("redirects anonymous dashboard visitors to the private sign-in route", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard"),
      validEnvironment,
      vi.fn(),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/dashboard/sign-in?callbackURL=%2Fdashboard");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("renders the allowlisted admin dashboard shell after Better Auth session verification", async () => {
    const fetchSession = vi.fn(async () => new Response(JSON.stringify({
      user: {
        email: "alejandro.ortiz@aohys.com",
        name: "Alejandro Ortiz",
      },
      session: {
        id: "session_123",
      },
    })));

    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard", {
        headers: {
          cookie: "better-auth.session_token=valid",
        },
      }),
      validEnvironment,
      fetchSession,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(fetchSession).toHaveBeenCalledWith(
      "https://effervescent-minnow-483.convex.site/api/auth/get-session",
      expect.objectContaining({
        headers: expect.objectContaining({
          cookie: "better-auth.session_token=valid",
        }),
      }),
    );
    expect(html).toContain('data-dashboard-shell="authenticated"');
    expect(html).toContain("Operations overview");
    expect(html).toContain("alejandro.ortiz@aohys.com");
  });

  it("supports multiple admin allowlist emails for Google account and institutional email", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard", {
        headers: {
          cookie: "better-auth.session_token=valid",
        },
      }),
      {
        ...validEnvironment,
        ADMIN_EMAIL: "a.ortizcrr@gmail.com,alejandro.ortiz@aohys.com",
      },
      vi.fn(async () => new Response(JSON.stringify({
        user: {
          email: "a.ortizcrr@gmail.com",
        },
      }))),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("a.ortizcrr@gmail.com");
  });

  it("blocks signed-in users who are not on the admin allowlist", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard", {
        headers: {
          cookie: "better-auth.session_token=valid",
        },
      }),
      validEnvironment,
      vi.fn(async () => new Response(JSON.stringify({
        user: {
          email: "someone@example.com",
        },
      }))),
    );
    const html = await response.text();

    expect(response.status).toBe(403);
    expect(html).toContain("Dashboard access is restricted");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("renders a configuration error when auth environment values drift", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard"),
      {
        ...validEnvironment,
        BETTER_AUTH_TRUSTED_ORIGINS: "https://not-aohys.example",
      },
      vi.fn(),
    );
    const html = await response.text();

    expect(response.status).toBe(503);
    expect(html).toContain("Dashboard configuration needs attention");
    expect(html).not.toContain("https://effervescent-minnow-483.convex.site");
  });

  it("renders the sign-in page with noindex metadata", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/sign-in?callbackURL=%2Fdashboard"),
      validEnvironment,
      vi.fn(),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('data-dashboard-shell="sign-in"');
    expect(html).toContain('<meta name="robots" content="noindex,nofollow"');
    expect(html).toContain("/dashboard/sign-in/google?callbackURL=%2Fdashboard");
  });

  it("starts Google sign-in server-side and redirects with the Better Auth state cookie", async () => {
    const fetchAuth = vi.fn(async () => new Response(JSON.stringify({
      url: "https://accounts.google.com/o/oauth2/v2/auth?state=state_123",
    }), {
      headers: {
        location: "https://accounts.google.com/o/oauth2/v2/auth?state=state_123",
        "set-cookie": "better-auth.state=state_123; Path=/; HttpOnly; SameSite=Lax",
      },
    }));

    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/sign-in/google?callbackURL=%2Fdashboard"),
      validEnvironment,
      fetchAuth,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://accounts.google.com/o/oauth2/v2/auth?state=state_123");
    expect(response.headers.get("set-cookie")).toContain("better-auth.state=state_123");
    expect(fetchAuth).toHaveBeenCalledWith(
      "https://effervescent-minnow-483.convex.site/api/auth/sign-in/social",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-forwarded-host": "preview.aohys.com",
          "x-forwarded-proto": "https",
        }),
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/dashboard",
        }),
      }),
    );
  });

  it("falls back to the dashboard root for unsafe sign-in callback paths", async () => {
    const fetchAuth = vi.fn(async () => new Response(JSON.stringify({
      url: "https://accounts.google.com/o/oauth2/v2/auth?state=state_123",
    }), {
      headers: {
        location: "https://accounts.google.com/o/oauth2/v2/auth?state=state_123",
      },
    }));

    await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/sign-in/google?callbackURL=https%3A%2F%2Fevil.example"),
      validEnvironment,
      fetchAuth,
    );

    expect(fetchAuth).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/dashboard",
        }),
      }),
    );
  });
});
