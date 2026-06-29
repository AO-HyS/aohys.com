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
  DASHBOARD_API_TOKEN: "dashboard-api-token",
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

  it("blocks non-admin users from lead data before calling the private leads endpoint", async () => {
    const fetchDashboard = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/api/auth/get-session")) {
        return new Response(JSON.stringify({
          user: {
            email: "someone@example.com",
          },
        }));
      }

      throw new Error(`Unexpected private endpoint call: ${url}`);
    });

    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/leads", {
        headers: {
          cookie: "better-auth.session_token=valid",
        },
      }),
      validEnvironment,
      fetchDashboard,
    );
    const html = await response.text();

    expect(response.status).toBe(403);
    expect(html).toContain("Dashboard access is restricted");
    expect(fetchDashboard).toHaveBeenCalledTimes(1);
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

  it("renders dashboard leads after admin session verification using the private Convex token", async () => {
    const fetchDashboard = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/api/auth/get-session")) {
        return new Response(JSON.stringify({
          user: { email: "alejandro.ortiz@aohys.com" },
        }));
      }

      return new Response(JSON.stringify({
        leads: [
          {
            id: "lead_123",
            name: "Casa Roca",
            email: "ops@casaroca.mx",
            company: "Casa Roca",
            phone: "+52 229 000 0000",
            preferredContactPath: "whatsapp",
            consentToContact: true,
            intent: "website",
            message: "We need a booking workflow.",
            sourcePath: "/contact",
            locale: "en",
            status: "new",
            createdAt: 1_720_000_000_000,
            updatedAt: 1_720_000_000_000,
          },
        ],
      }));
    });

    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/leads", {
        headers: { cookie: "better-auth.session_token=valid" },
      }),
      validEnvironment,
      fetchDashboard,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('data-dashboard-surface="lead-workflow"');
    expect(html).toContain("Casa Roca");
    expect(html).toContain("We need a booking workflow.");
    expect(fetchDashboard).toHaveBeenCalledWith(
      "https://effervescent-minnow-483.convex.site/dashboard/leads",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer dashboard-api-token",
        }),
      }),
    );
  });

  it("updates a lead status through the private Convex endpoint and redirects back to the selected lead", async () => {
    const fetchDashboard = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/api/auth/get-session")) {
        return new Response(JSON.stringify({
          user: { email: "alejandro.ortiz@aohys.com" },
        }));
      }

      if (url.endsWith("/dashboard/leads/status")) {
        expect(init).toMatchObject({
          method: "POST",
          headers: expect.objectContaining({
            authorization: "Bearer dashboard-api-token",
            "content-type": "application/json",
          }),
          body: JSON.stringify({
            leadId: "lead_123",
            status: "reviewing",
          }),
        });

        return new Response(JSON.stringify({
          ok: true,
          leadId: "lead_123",
          status: "reviewing",
          updatedAt: 1_720_000_010_000,
        }));
      }

      return new Response(JSON.stringify({ leads: [] }));
    });

    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/leads/status", {
        method: "POST",
        headers: {
          cookie: "better-auth.session_token=valid",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          leadId: "lead_123",
          status: "reviewing",
        }),
      }),
      validEnvironment,
      fetchDashboard,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/dashboard/leads?lead=lead_123&saved=1");
  });

  it("rejects non-POST lead status routes", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/leads/status", {
        headers: {
          cookie: "better-auth.session_token=valid",
        },
      }),
      validEnvironment,
      vi.fn(async () => new Response(JSON.stringify({
        user: { email: "alejandro.ortiz@aohys.com" },
      }))),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("renders a validation error without calling the status endpoint for unsupported status values", async () => {
    const fetchDashboard = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/api/auth/get-session")) {
        return new Response(JSON.stringify({
          user: { email: "alejandro.ortiz@aohys.com" },
        }));
      }

      return new Response(JSON.stringify({ leads: [] }));
    });

    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/leads/status", {
        method: "POST",
        headers: {
          cookie: "better-auth.session_token=valid",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          leadId: "lead_123",
          status: "done",
        }),
      }),
      validEnvironment,
      fetchDashboard,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('data-workflow-state="validation-error"');
    expect(html).toContain("Choose a valid lead status before saving.");
    expect(fetchDashboard).not.toHaveBeenCalledWith(
      "https://effervescent-minnow-483.convex.site/dashboard/leads/status",
      expect.anything(),
    );
  });
});
