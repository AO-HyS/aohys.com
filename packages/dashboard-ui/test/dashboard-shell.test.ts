import { describe, expect, it } from "vitest";
import {
  renderDashboardContentWorkflow,
  renderDashboardLeadWorkflow,
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

  it("renders the lead workflow with list, detail, status states, and compact responsive rules", () => {
    const html = renderDashboardLeadWorkflow({
      adminEmail: "alejandro.ortiz@aohys.com",
      activePath: "/dashboard/leads",
      title: "Leads",
      workflowState: "save-success",
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
          status: "reviewing",
          createdAt: 1_720_000_000_000,
          updatedAt: 1_720_000_000_000,
        },
      ],
    });

    expect(html).toContain('data-dashboard-surface="lead-workflow"');
    expect(html).toContain('data-workflow-state="save-success"');
    expect(html).toContain("Casa Roca");
    expect(html).toContain("Save status");
    expect(html).toContain("Lead status saved.");
    expect(html).toContain("@media (max-width: 720px)");
    expect(html).toContain(".lead-status-controls");
    expect(html).not.toMatch(/background:\\s*#[0-9a-f]/i);
    expect(html).not.toMatch(/color:\\s*#[0-9a-f]/i);
    expect(html).not.toMatch(/<script/i);
  });

  it("renders an empty lead workflow state", () => {
    const html = renderDashboardLeadWorkflow({
      adminEmail: "alejandro.ortiz@aohys.com",
      activePath: "/dashboard/leads",
      title: "Leads",
      leads: [],
    });

    expect(html).toContain('data-workflow-state="empty"');
    expect(html).toContain("No leads yet");
  });

  it("renders the content and media workflow with graph-safe metadata controls", () => {
    const html = renderDashboardContentWorkflow({
      adminEmail: "alejandro.ortiz@aohys.com",
      activePath: "/dashboard/case-studies",
      title: "Content workflow",
      workflowState: "save-success",
      caseStudies: [
        {
          contentId: "case-study:casa-roca",
          title: "Casa Roca",
          englishPath: "/case-studies/casa-roca",
          spanishPath: "/es/casos/casa-roca",
          sitemapIncluded: true,
          status: "production-proof",
          evidenceStatus: "sanitized",
          updatedAt: 1_720_000_000_000,
        },
      ],
      media: [
        {
          id: "media_123",
          storageProvider: "external",
          storageKey: "screenshots/casa-roca-home",
          publicUrl: "https://aohys.com/case-studies/casa-roca",
          altText: "Casa Roca public landing page screenshot.",
          contentId: "case-study:casa-roca",
          usage: "case-study",
          status: "draft",
          locale: "en",
          updatedAt: 1_720_000_000_000,
        },
      ],
      settings: [
        {
          key: "PUBLIC_WHATSAPP_URL",
          environment: "preview",
          value: "https://wa.me/522299020825",
          classification: "public-build-value",
          updatedAt: 1_720_000_000_000,
        },
      ],
      resumeVersions: [
        {
          id: "resume_123",
          locale: "en",
          version: "2026.06",
          pdfPath: "/downloads/alejandro-ortiz-corro-resume.pdf",
          isPublished: true,
          createdAt: 1_720_000_000_000,
          publishedAt: 1_720_000_000_000,
        },
      ],
    });

    expect(html).toContain('data-dashboard-surface="content-workflow"');
    expect(html).toContain('data-workflow-state="save-success"');
    expect(html).toContain("Casa Roca");
    expect(html).toContain("/es/casos/casa-roca");
    expect(html).toContain("Casa Roca public landing page screenshot.");
    expect(html).toContain("PUBLIC_WHATSAPP_URL");
    expect(html).toContain("2026.06");
    expect(html).toContain("Content metadata saved.");
    expect(html).toContain("@media (max-width: 720px)");
    expect(html).toContain(".content-workflow");
    expect(html).not.toMatch(/<script/i);
  });

  it("renders the content workflow environment-unavailable state", () => {
    const html = renderDashboardContentWorkflow({
      adminEmail: "alejandro.ortiz@aohys.com",
      activePath: "/dashboard/settings",
      title: "Content workflow",
      workflowState: "environment-unavailable",
      caseStudies: [],
      media: [],
      settings: [],
      resumeVersions: [],
    });

    expect(html).toContain('data-workflow-state="environment-unavailable"');
    expect(html).toContain("Environment Contract is complete");
  });
});
