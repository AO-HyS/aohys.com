import { describe, expect, it, vi } from "vitest";
import {
  handleDashboardRequest,
  safeHandleDashboardRequest,
  type DashboardAccessEnvironment,
} from "../src/dashboard-access.js";
import { CONTENT_SECURITY_POLICY } from "../src/security-headers.js";

const validEnvironment: DashboardAccessEnvironment = {
  AOHYS_ENV: "preview",
  PUBLIC_SITE_URL: "https://preview.aohys.com",
  CONVEX_URL: "https://effervescent-minnow-483.convex.cloud",
  CONVEX_SITE_URL: "https://effervescent-minnow-483.convex.site",
  BETTER_AUTH_URL: "https://preview.aohys.com",
  BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.aohys.com,http://localhost:4321",
  ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
  CLOUDFLARE_ACCOUNT_ID: "cloudflare-account-id",
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: "cloudflare-images-hash",
  CLOUDFLARE_IMAGES_API_TOKEN: "cloudflare-images-token",
  PUBLISH_GITHUB_TOKEN: "github-publish-token",
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
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
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
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("/dashboard-app/assets/dashboard.css");
    expect(html).toContain("/dashboard-app/assets/dashboard.js");
    expect(html).toContain("window.__AOHYS_DASHBOARD__");
    expect(html).toContain('"adminEmail":"alejandro.ortiz@aohys.com"');
    expect(html).toContain('"environment":"preview"');
    expect(html).toContain('"convexUrl":"https://effervescent-minnow-483.convex.cloud"');
    expect(html).toContain('"betterAuthUrl":"https://preview.aohys.com"');
    expect(html).toContain('"imagesAccountHash":"cloudflare-images-hash"');
  });

  it("omits the images account hash from the shell config when it is not configured", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard", {
        headers: {
          cookie: "better-auth.session_token=valid",
        },
      }),
      {
        ...validEnvironment,
        CLOUDFLARE_IMAGES_ACCOUNT_HASH: undefined,
      },
      vi.fn(async () => new Response(JSON.stringify({
        user: { email: "alejandro.ortiz@aohys.com" },
      }))),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('"convexUrl":"https://effervescent-minnow-483.convex.cloud"');
    expect(html).toContain('"betterAuthUrl":"https://preview.aohys.com"');
    expect(html).not.toContain("imagesAccountHash");
  });

  it("signs out by clearing Better Auth cookies and returning to sign-in", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/sign-out", {
        headers: {
          cookie: "better-auth.session_token=valid",
        },
      }),
      {},
      vi.fn(),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/dashboard/sign-in");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const setCookieHeaders = response.headers.getSetCookie().join("\n");
    expect(setCookieHeaders).toContain("better-auth.session_token=; Path=/; Max-Age=0");
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
    expect(html).toContain("/dashboard-app/assets/dashboard.js");
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
    expect(html).not.toContain("window.__AOHYS_DASHBOARD__");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("blocks non-admin users from dashboard routes with a single session check", async () => {
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

  it("renders a configuration error when CONVEX_URL is missing from the dashboard runtime", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard"),
      {
        ...validEnvironment,
        CONVEX_URL: undefined,
      },
      vi.fn(),
    );
    const html = await response.text();

    expect(response.status).toBe(503);
    expect(html).toContain("Dashboard configuration needs attention");
  });

  it("returns a private configuration state instead of throwing when Pages env bindings are absent", async () => {
    const response = await safeHandleDashboardRequest(
      new Request("https://develop.aohys-com.pages.dev/dashboard"),
      undefined,
      vi.fn(),
    );
    const html = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(html).toContain("Dashboard configuration needs attention");
  });

  it("redirects stale or unreadable session cookies back to sign-in", async () => {
    const response = await safeHandleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/leads", {
        headers: {
          cookie: "better-auth.session_token=stale",
        },
      }),
      validEnvironment,
      vi.fn(async () => {
        throw new Error("Convex session fetch failed with private details.");
      }),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/dashboard/sign-in?callbackURL=%2Fdashboard%2Fleads");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
  });

  it("returns a private unavailable state and reports unexpected dashboard runtime failures", async () => {
    const capture = vi.fn(async () => undefined);
    const fetchAuth = vi.fn(async () => {
      throw new Error("Private auth provider failed with private details.");
    });
    const response = await safeHandleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/sign-in/google?callbackURL=%2Fdashboard"),
      validEnvironment,
      fetchAuth,
      { capture },
    );
    const html = await response.text();

    expect(response.status).toBe(502);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(html).toContain("Dashboard is temporarily unavailable");
    expect(capture).toHaveBeenCalledWith({
      event: "dashboard_runtime_exception",
      distinctId: "dashboard:preview",
      properties: {
        environment: "preview",
        source: "cloudflare_pages_dashboard",
        path: "/dashboard/sign-in/google",
        errorType: "Error",
      },
    });
    expect(JSON.stringify(capture.mock.calls)).not.toContain("private details");
  });

  it("renders the sign-in page with noindex metadata", async () => {
    const response = await handleDashboardRequest(
      new Request("https://preview.aohys.com/dashboard/sign-in?callbackURL=%2Fdashboard"),
      validEnvironment,
      vi.fn(),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
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
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
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
          callbackURL: "https://preview.aohys.com/dashboard",
        }),
      }),
    );
  });

  it("keeps Google sign-in callbacks on the Cloudflare preview host that started the flow", async () => {
    const fetchAuth = vi.fn(async () => new Response(JSON.stringify({
      url: "https://accounts.google.com/o/oauth2/v2/auth?state=state_123&redirect_uri=https%3A%2F%2Fdevelop.aohys-com.pages.dev%2Fapi%2Fauth%2Fcallback%2Fgoogle",
    }), {
      headers: {
        location: "https://accounts.google.com/o/oauth2/v2/auth?state=state_123&redirect_uri=https%3A%2F%2Fdevelop.aohys-com.pages.dev%2Fapi%2Fauth%2Fcallback%2Fgoogle",
        "set-cookie": "__Secure-better-auth.state=state_123; Path=/; HttpOnly; Secure; SameSite=Lax",
      },
    }));

    const response = await handleDashboardRequest(
      new Request("https://develop.aohys-com.pages.dev/dashboard/sign-in/google?callbackURL=%2Fdashboard"),
      validEnvironment,
      fetchAuth,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain(
      "redirect_uri=https%3A%2F%2Fdevelop.aohys-com.pages.dev%2Fapi%2Fauth%2Fcallback%2Fgoogle",
    );
    expect(fetchAuth).toHaveBeenCalledWith(
      "https://effervescent-minnow-483.convex.site/api/auth/sign-in/social",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-forwarded-host": "develop.aohys-com.pages.dev",
          "x-forwarded-proto": "https",
        }),
        body: JSON.stringify({
          provider: "google",
          callbackURL: "https://develop.aohys-com.pages.dev/dashboard",
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
          callbackURL: "https://preview.aohys.com/dashboard",
        }),
      }),
    );
  });

  it("serves the React app shell for dashboard app routes without fetching workflow data", async () => {
    const fetchDashboard = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/api/auth/get-session")) {
        return new Response(JSON.stringify({
          user: { email: "alejandro.ortiz@aohys.com" },
        }));
      }

      throw new Error(`Unexpected private endpoint call: ${url}`);
    });

    for (const path of ["/dashboard/leads", "/dashboard/projects", "/dashboard/settings"]) {
      const response = await handleDashboardRequest(
        new Request(`https://preview.aohys.com${path}`, {
          headers: { cookie: "better-auth.session_token=valid" },
        }),
        validEnvironment,
        fetchDashboard,
      );
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain("/dashboard-app/assets/dashboard.js");
      expect(html).toContain('"convexUrl":"https://effervescent-minnow-483.convex.cloud"');
    }

    expect(fetchDashboard).toHaveBeenCalledTimes(3);
  });
});
