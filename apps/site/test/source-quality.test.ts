import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderCloudflarePagesStaticHeaders } from "../src/security-headers.js";

const siteRoot = process.cwd();

function read(relativePath: string) {
  const absolutePath = path.join(siteRoot, relativePath);
  expect(existsSync(absolutePath), `${relativePath} is missing`).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

describe("public site source quality", () => {
  it("keeps design tokens, fonts, and graph-backed routing wired", () => {
    const globalCss = read("src/styles/global.css");
    const styleClasses = read("src/styles/classes.ts");
    const home = read("src/pages/index.astro");
    const routePage = read("src/pages/[...path].astro");
    const layout = read("src/layouts/BaseLayout.astro");
    const astroConfig = read("astro.config.mjs");
    const sitePackage = read("package.json");
    const header = read("src/components/SiteHeader.astro");
    const footer = read("src/components/SiteFooter.astro");
    const securityHeaders = read("src/security-headers.ts");
    const staticHeaders = read("public/_headers");
    const posthogAnalytics = read("src/components/PostHogAnalytics.astro");
    const analytics = read("src/analytics.ts");
    const posthogClient = read("src/posthog-client.ts");
    const publicContentPage = read("src/components/PublicContentPage.astro");
    const contentGraph = read("../../packages/content-graph/src/index.ts");
    const dashboardAccess = read("src/dashboard-access.ts");
    const dashboardApp = read("../../apps/dashboard/src/main.tsx");
    const dashboardStyles = read("../../apps/dashboard/src/styles.css");
    const dashboardClasses = read("../../apps/dashboard/src/lib/dashboard-classes.ts");
    const dashboardPackage = read("../../apps/dashboard/package.json");
    const dashboardUiPackage = read("../../packages/dashboard-ui/src/index.ts");
    const dashboardFunction = read("../../functions/dashboard/[[path]].ts");
    const authFunction = read("../../functions/api/auth/[[path]].ts");
    const cspFunction = read("../../functions/observability/csp.ts");
    const enDictionary = read("src/i18n/en.json");
    const esDictionary = read("src/i18n/es.json");
    const source = [
      globalCss,
      styleClasses,
      home,
      routePage,
      layout,
      astroConfig,
      header,
      footer,
      posthogAnalytics,
      analytics,
      posthogClient,
      publicContentPage,
      enDictionary,
      esDictionary,
    ].join("\n");

    expect(globalCss.trim()).toBe('@import "tailwindcss";');
    expect(layout).toContain("@fontsource-variable/mona-sans/index.css");
    expect(layout).toContain("@fontsource-variable/atkinson-hyperlegible-next/index.css");
    expect(astroConfig).toContain("@tailwindcss/vite");
    expect(astroConfig).toContain("tailwindcss()");
    expect(sitePackage).toContain('"tailwindcss"');
    expect(sitePackage).toContain('"@tailwindcss/vite"');
    expect(styleClasses).toContain("[--color-primary:oklch(");
    expect(styleClasses).toContain("[--color-mint:oklch(");
    expect(styleClasses).toContain("[--color-focus:oklch(");
    expect(styleClasses).toContain("focus-visible:[outline:3px_solid_var(--color-focus)]");
    expect(styleClasses.includes("focus-visible:" + "outline-" + "[3px_solid_var(--color-focus)]")).toBe(false);
    expect(styleClasses).toContain("[--text-hero:");
    expect(styleClasses).toContain("motion-reduce:");
    expect(publicContentPage).not.toMatch(/class="[^"]*(site-|hero-|proof-|signal-line|button |outcome-|architecture-|practice-|contact-|source-|case-|selected-|resume-|route-|field-|ledger-|privacy-)/);
    expect(layout).toContain('data-site-shell="public"');
    expect(header).toContain("getLocalizedPath");
    expect(header).toContain("getUiCopy");
    expect(footer).toContain("getUiCopy");
    expect(publicContentPage).toContain("getUiCopy");
    expect(publicContentPage).toContain("STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID");
    expect(publicContentPage).toContain("evidenceImage?.thumbSrc ?? evidenceImage?.src ?? outcome.evidence.src");
    expect(publicContentPage).toContain("const imageAlt = imageSrc === outcome.evidence.src");
    expect(contentGraph).toContain("/images/proof/casa-roca-production.png");
    expect(contentGraph).toContain("/images/proof/barber-central-landing.png");
    expect(contentGraph).toContain("/images/proof/barber-central-proof-thumb.png");
    expect(contentGraph).toContain("/images/proof/nutri-plan-dashboard.png");
    expect(contentGraph).toContain("/images/proof/nutri-plan-proof-thumb.png");
    expect(contentGraph).toContain("/images/proof/enterprise-delivery-map.svg");
    expect(contentGraph).toContain("/images/generated/aohys-architecture-proof-surface.png");
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
    expect(styleClasses).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
    expect(styleClasses).not.toMatch(/letter-spacing:\s*-/);
    expect(styleClasses).not.toMatch(/font-size:\s*clamp\([^;]*vw/i);
    expect(styleClasses).not.toMatch(/--text-[^:]+:\s*clamp\([^;]*vw/i);
    expect(source).not.toMatch(/lorem/i);
    expect(securityHeaders).toContain("script-src-elem");
    expect(securityHeaders).toContain("https://*.i.posthog.com");
    expect(securityHeaders).toContain("https://*.posthog.com");
    expect(securityHeaders).toContain("report-uri /observability/csp");
    expect(staticHeaders).toContain("script-src-elem");
    expect(staticHeaders).toContain("https://*.i.posthog.com");
    expect(staticHeaders).toContain("https://*.posthog.com");
    expect(staticHeaders).toContain("report-uri /observability/csp");
    expect(staticHeaders).toBe(renderCloudflarePagesStaticHeaders());
    expect(dashboardFunction).not.toMatch(/^import\s+\{[^}]+\}\s+from/m);
    expect(authFunction).not.toMatch(/^import\s+\{[^}]+\}\s+from/m);
    expect(cspFunction).not.toMatch(/^import\s+\{[^}]+\}\s+from/m);
    expect(dashboardFunction).toContain('await import("../../apps/site/src/dashboard-access.js")');
    expect(authFunction).toContain('await import("../../../apps/site/src/auth-proxy.js")');
    expect(cspFunction).toContain('await import("../../apps/site/src/csp-reporting.js")');
    expect(dashboardAccess).toContain("/dashboard-app/assets/dashboard.js");
    expect(dashboardAccess).toContain("window.__AOHYS_DASHBOARD__");
    expect(dashboardAccess).toContain("convexUrl");
    expect(dashboardAccess).not.toContain("DASHBOARD_API_TOKEN");
    expect(dashboardApp).toContain("@tanstack/react-router");
    expect(dashboardApp).toContain("RouterProvider");
    expect(dashboardStyles).toContain('@import "tailwindcss";');
    expect(dashboardStyles).toContain('@source "../../../packages/dashboard-ui/src";');
    expect(dashboardStyles).toContain("@theme inline");
    expect(dashboardStyles).not.toMatch(/@layer\s+components|@apply|^\s*(body|:root|\.dark|[.][A-Za-z_-][\w-]*)\b/m);
    expect(dashboardClasses).toContain("[--background:oklch(");
    expect(dashboardClasses).toContain("dashboardClass");
    expect(dashboardUiPackage).toContain("/dashboard-app/assets/dashboard.css");
    expect(dashboardUiPackage).not.toMatch(/<style|DASHBOARD_CSS|@media\s*\(|@apply|@layer\s+components/i);
    expect(dashboardPackage).toContain("vite build");
  });
});
