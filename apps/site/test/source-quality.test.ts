import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const siteRoot = process.cwd();

function read(relativePath: string) {
  const absolutePath = path.join(siteRoot, relativePath);
  expect(existsSync(absolutePath), `${relativePath} is missing`).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("public site source quality", () => {
  it("keeps design tokens, fonts, and graph-backed routing wired", () => {
    const globalCss = read("src/styles/global.css");
    const home = read("src/pages/index.astro");
    const routePage = read("src/pages/[...path].astro");
    const layout = read("src/layouts/BaseLayout.astro");
    const header = read("src/components/SiteHeader.astro");
    const footer = read("src/components/SiteFooter.astro");
    const securityHeaders = read("src/security-headers.ts");
    const staticHeaders = read("public/_headers");
    const posthogAnalytics = read("src/components/PostHogAnalytics.astro");
    const analytics = read("src/analytics.ts");
    const posthogClient = read("src/posthog-client.ts");
    const publicContentPage = read("src/components/PublicContentPage.astro");
    const dashboardFunction = read("../../functions/dashboard/[[path]].ts");
    const authFunction = read("../../functions/api/auth/[[path]].ts");
    const cspFunction = read("../../functions/observability/csp.ts");
    const enDictionary = read("src/i18n/en.json");
    const esDictionary = read("src/i18n/es.json");
    const source = [
      globalCss,
      home,
      routePage,
      layout,
      header,
      footer,
      posthogAnalytics,
      analytics,
      posthogClient,
      publicContentPage,
      enDictionary,
      esDictionary,
    ].join("\n");

    expect(globalCss).toContain("@fontsource-variable/mona-sans");
    expect(globalCss).toContain("@fontsource-variable/atkinson-hyperlegible-next");
    expect(globalCss).toContain("--color-primary: oklch(");
    expect(globalCss).toContain("--color-mint: oklch(");
    expect(globalCss).toContain("--color-focus: oklch(");
    expect(globalCss).toContain("--focus-outline:");
    expect(globalCss).toContain("--text-hero:");
    expect(globalCss).toContain("prefers-reduced-motion");
    expect(layout).toContain('data-site-shell="public"');
    expect(header).toContain("getLocalizedPath");
    expect(header).toContain("getUiCopy");
    expect(footer).toContain("getUiCopy");
    expect(publicContentPage).toContain("getUiCopy");
    expect(publicContentPage).toContain("/images/proof/casa-roca-production.png");
    expect(publicContentPage).toContain("/images/proof/barber-central-landing.png");
    expect(publicContentPage).toContain("/images/proof/barber-central-proof-thumb.png");
    expect(publicContentPage).toContain("/images/proof/nutri-plan-dashboard.png");
    expect(publicContentPage).toContain("/images/proof/nutri-plan-proof-thumb.png");
    expect(publicContentPage).toContain("/images/proof/enterprise-delivery-map.svg");
    expect(publicContentPage).toContain("/images/generated/aohys-architecture-proof-surface.png");
    expect(posthogAnalytics).toContain("buildAnalyticsBootstrapPayload");
    expect(posthogClient).toContain("capture_pageview");
    expect(posthogClient).toContain("captureException");
    expect(source).toContain("contact_form_submit_failed");
    expect(source).not.toContain("autocapture: true");
    expect(enDictionary).toContain("Client code, product code");
    expect(esDictionary).toContain("Los límites público/privado");
    expect(routePage).toContain("getPublicRouteMap");
    expect(layout).toContain('rel="alternate"');
    expect(source).not.toMatch(/background-clip:\s*text/i);
    expect(source).not.toMatch(/repeating-linear-gradient/i);
    expect(source).not.toMatch(/border-radius:\s*(3[2-9]|[4-9][0-9])px/i);
    expect(globalCss).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
    expect(globalCss).not.toMatch(/letter-spacing:\s*-/);
    expect(globalCss).not.toMatch(/font-size:\s*clamp\([^;]*vw/i);
    expect(globalCss).not.toMatch(/--text-[^:]+:\s*clamp\([^;]*vw/i);
    expect(source).not.toMatch(/lorem/i);
    expect(securityHeaders).toContain("script-src-elem");
    expect(securityHeaders).toContain("https://*.i.posthog.com");
    expect(securityHeaders).toContain("https://*.posthog.com");
    expect(securityHeaders).toContain("report-uri /observability/csp");
    expect(staticHeaders).toContain("script-src-elem");
    expect(staticHeaders).toContain("https://*.i.posthog.com");
    expect(staticHeaders).toContain("https://*.posthog.com");
    expect(staticHeaders).toContain("report-uri /observability/csp");
    expect(dashboardFunction).not.toMatch(/^import\s+\{[^}]+\}\s+from/m);
    expect(authFunction).not.toMatch(/^import\s+\{[^}]+\}\s+from/m);
    expect(cspFunction).not.toMatch(/^import\s+\{[^}]+\}\s+from/m);
    expect(dashboardFunction).toContain('await import("../../apps/site/src/dashboard-access.js")');
    expect(authFunction).toContain('await import("../../../apps/site/src/auth-proxy.js")');
    expect(cspFunction).toContain('await import("../../apps/site/src/csp-reporting.js")');
  });
});
