import { describe, expect, it } from "vitest";
import {
  renderDashboardShell,
  renderDashboardState,
  renderDashboardSignIn,
} from "../src/index.js";

describe("Dashboard UI Kit shell", () => {
  it("renders the authenticated dashboard shell with navigation and overview surfaces", () => {
    const html = renderDashboardShell({
      adminEmail: "alejandro.ortiz@aohys.com",
      activePath: "/dashboard",
      title: "Operations overview",
    });

    expect(html).toContain('data-dashboard-shell="authenticated"');
    expect(html).toContain('aria-label="Dashboard navigation"');
    expect(html).toContain("Operations overview");
    expect(html).toContain("Leads");
    expect(html).toContain("Case studies");
    expect(html).toContain("Media");
    expect(html).toContain("Settings");
    expect(html).toContain("alejandro.ortiz@aohys.com");
    expect(html).toContain('data-dashboard-surface="overview"');
    expect(html).toContain('min-height: 44px');
    expect(html).not.toMatch(/<script/i);
  });

  it("renders explicit private dashboard states without exposing private data", () => {
    expect(renderDashboardState("loading")).toContain("Checking access");
    expect(renderDashboardState("unauthorized")).toContain("Dashboard access is restricted");
    expect(renderDashboardState("configuration-error")).toContain("Dashboard configuration needs attention");
    expect(renderDashboardState("unavailable")).toContain("Dashboard is temporarily unavailable");
  });

  it("renders a noindex sign-in surface for anonymous visitors", () => {
    const html = renderDashboardSignIn({
      signInUrl: "/dashboard/sign-in/google?callbackURL=%2Fdashboard",
    });

    expect(html).toContain('data-dashboard-shell="sign-in"');
    expect(html).toContain('<meta name="robots" content="noindex,nofollow"');
    expect(html).toContain("Sign in to continue");
    expect(html).toContain("/dashboard/sign-in/google");
    expect(html).toContain("callbackURL=%2Fdashboard");
  });
});
