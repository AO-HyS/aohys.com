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
    const engineeringPracticeDiagram = read("public/images/proof/engineering-practice-release-cycle.svg");
    const proofMedia = read("src/components/sunlit/proof-media.ts");
    const proofImage = read("src/components/sunlit/SunlitProofImage.astro");
    const stage = read("src/components/sunlit/SunlitProjectStage.astro");
    const webglScene = read("src/components/sunlit/SunlitWebGLScene.astro");
    const contentGraph = read("../../packages/content-graph/src/index.ts");
    const dashboardAccess = read("src/dashboard-access.ts");
    const dashboardApp = read("../../apps/dashboard/src/main.tsx");
    const dashboardStyles = read("../../apps/dashboard/src/styles.css");
    const dashboardClasses = read("../../apps/dashboard/src/lib/dashboard-classes.ts");
    const dashboardPackage = read("../../apps/dashboard/package.json");
    const dashboardAccessStates = read("src/dashboard-access-states.ts");
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
    expect(styleClasses).toContain("[--color-primary:oklch(0.8623_0.129_80)]");
    expect(styleClasses).toContain("[--color-secondary:oklch(0.7779_0.1104_121.8)]");
    expect(styleClasses).toContain("[--color-accent:oklch(0.8008_0.1283_55.5)]");
    expect(styleClasses).toContain("[--color-ink:oklch(0.3649_0.0215_61.4)]");
    expect(styleClasses).toContain("[--color-focus:oklch(");
    expect(styleClasses).toContain("[&_a:focus-visible]:[outline:3px_solid_var(--color-focus)]");
    expect(styleClasses.includes("focus-visible:" + "outline-" + "[3px_solid_var(--color-focus)]")).toBe(false);
    expect(styleClasses).toContain("[--text-hero:");
    expect(styleClasses).toContain("motion-reduce:");
    expect(layout).toContain('data-site-shell="public"');
    expect(header).toContain("getLocalizedPath");
    expect(header).toContain("getPublicNavigation");
    expect(header).not.toContain("const navItems = [");
    expect(header).not.toContain("const navDropdownItems = [");
    expect(header).toContain("getUiCopy");
    expect(footer).toContain("getUiCopy");
    expect(footer).not.toContain("min-height: 18rem");
    expect(enDictionary).toContain("Independent product engineering by Alejandro Ortiz Corro.");
    expect(esDictionary).toContain("Ingeniería de producto independiente por Alejandro Ortiz Corro.");
    expect(publicContentPage).toContain("getUiCopy");
    expect(publicContentPage).toContain("SunlitProofImage");
    expect(proofMedia).toContain("STATIC_EVIDENCE_IMAGE_BY_CONTENT_ID");
    expect(proofMedia).toContain("preferFull");
    expect(proofMedia).toContain("dashboardMedia?.thumbSrc");
    expect(proofMedia).toContain("staticMedia?.src");
    expect(proofMedia).toContain("evidenceSrc");
    expect(proofMedia).toContain("aohys-connections-mark-v3.svg");
    expect(proofMedia).toContain("dashboardMedia?.alt ?? evidenceAlt ?? staticMedia?.alt");
    expect(proofImage).toContain('candidate.addEventListener("error"');
    expect(stage).toContain("grid-area: 1 / 1");
    expect(stage).not.toContain(".sunlit-project-panel { position: absolute");
    expect(webglScene).toContain('canvas.getContext("webgl2"');
    expect(webglScene).toContain('canvas.getContext("webgl"');
    expect(webglScene).toContain("attribute");
    expect(webglScene).toContain("gl_FragColor");
    expect(webglScene).toContain("uniform vec2 u_pointer");
    expect(webglScene).toContain("uniform float u_transition");
    expect(webglScene).toContain("createShader");
    expect(webglScene).toContain("createProgram");
    expect(webglScene).toContain("drawArrays");
    expect(webglScene).toContain('data-scene-variant="contact"');
    expect(webglScene).not.toMatch(/three|BoxGeometry|TorusGeometry|WebGLRenderer|sampler2D/);
    expect(existsSync(path.join(siteRoot, "src/components/sunlit/sunlit-three-runtime.ts"))).toBe(false);
    expect(publicContentPage).not.toContain(".sunlit-button {");
    expect(publicContentPage).not.toContain('class="sunlit-case-links"');
    expect(publicContentPage).toContain("syncPreferredContactRequirements");
    expect(publicContentPage).toContain("phoneInput.required = whatsappSelected");
    expect(publicContentPage).toContain('data-service-pattern={["new", "team", "modernize"][index]}');
    expect(publicContentPage).toContain("sunlit-architecture-topology");
    expect(publicContentPage).toContain("sunlit-project-brief");
    expect(publicContentPage).not.toContain("border-left: 4px solid");
    expect(webglScene).toContain("IntersectionObserver");
    expect(webglScene).toContain("ResizeObserver");
    expect(webglScene).toContain("visibilitychange");
    expect(webglScene).toContain("webglcontextlost");
    expect(webglScene).toContain("webglcontextrestored");
    expect(webglScene).toContain('reducedMotion.addEventListener("change"');
    expect(webglScene).toContain("function restartLoop()");
    const reducedMotionHandler = webglScene.slice(
      webglScene.indexOf("function onReducedMotionChange()"),
      webglScene.indexOf("function onContextLost"),
    );
    expect(reducedMotionHandler).toContain("stopLoop()");
    expect(reducedMotionHandler).toContain("restartLoop()");
    expect(reducedMotionHandler).not.toContain("releaseProgram()");
    expect(webglScene).toContain("WEBGL_lose_context");
    expect(webglScene).toContain("Math.min(window.devicePixelRatio || 1, width < 720 ? 1 : 1.5)");
    expect(sitePackage).not.toMatch(/"(?:@types\/)?three"/);
    expect(publicContentPage).toContain(".sunlit-architecture-hero > div > p:last-of-type { color: var(--color-ink); }");
    expect(publicContentPage).toContain("SunlitProjectStage");
    expect(publicContentPage).toContain("getPracticePageContent");
    expect(publicContentPage).toContain("SunlitWebGLScene");
    expect(publicContentPage).toContain("SunlitCtaBand");
    expect(publicContentPage).toContain(".sunlit-related > div { display: grid;");
    expect(publicContentPage).not.toContain(".sunlit-related > div { display: flex; overflow-x: auto;");
    expect(contentGraph).toContain("/images/proof/casa-roca-gallery-v2.jpg");
    expect(contentGraph).toContain("/images/proof/casa-roca-value-v2.jpg");
    expect(contentGraph).toContain("/images/proof/barber-central-hero-v2.jpg");
    expect(contentGraph).toContain("/images/proof/nutri-plan-dashboard-v2.png");
    expect(contentGraph).toContain("/images/proof/enterprise-systems-map-v2.svg");
    expect(contentGraph).toContain("/images/proof/engineering-practice-release-cycle.svg");
    for (const asset of [
      "public/images/proof/casa-roca-gallery-v2.jpg",
      "public/images/proof/casa-roca-value-v2.jpg",
      "public/images/proof/barber-central-hero-v2.jpg",
      "public/images/proof/nutri-plan-dashboard-v2.png",
      "public/images/brand/aohys-connections-wordmark-v3.svg",
      "public/images/brand/aohys-connections-mark-v3.svg",
      "public/images/brand/aohys-connections-mono-v3.svg",
      "public/images/brand/aohys-connections-negative-v3.svg",
    ]) expect(existsSync(path.join(siteRoot, asset)), `${asset} is missing`).toBe(true);
    expect(engineeringPracticeDiagram).toContain("Reviewable release cycle");
    expect(
      [...new Set(engineeringPracticeDiagram.match(/#[0-9a-fA-F]{6}/g)?.map((color) => color.toUpperCase()))].sort(),
    ).toEqual(["#473C33", "#ABC270", "#FDA769", "#FEC868", "#FFFFFF"].sort());
    expect(contentGraph).not.toMatch(/aohys-pixel|pixel-product-landscape|pixel-hills|pixel-lake/);
    expect(posthogAnalytics).toContain("buildAnalyticsBootstrapPayload");
    expect(posthogClient).toContain("capture_pageview");
    expect(posthogClient).toContain("captureException");
    expect(source).toContain("contact_form_submit_failed");
    expect(source).not.toContain("autocapture: true");
    expect(enDictionary).toContain("Client work and operational data stay private");
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
    expect(dashboardStyles).not.toContain("packages/dashboard-ui/src");
    expect(dashboardStyles).toContain("@theme inline");
    expect(dashboardStyles).not.toMatch(/@layer\s+components|@apply|^\s*(body|:root|\.dark|[.][A-Za-z_-][\w-]*)\b/m);
    expect(dashboardClasses).toContain("[--background:oklch(");
    expect(dashboardClasses).toContain("dashboardClass");
    expect(dashboardAccessStates).toContain("/dashboard-app/assets/dashboard.css");
    expect(dashboardAccessStates).toContain('data-dashboard-surface="sign-in"');
    expect(dashboardAccessStates).not.toMatch(/<style|DASHBOARD_CSS|@media\s*\(|@apply|@layer\s+components/i);
    expect(dashboardPackage).toContain("vite build");
  });
});
