import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getPublicRouteMap, getSeoMetadata, getSitemapEntries } from "@aohys/content-graph";
import { describe, expect, it } from "vitest";

const siteRoot = process.cwd();
const distRoot = path.join(siteRoot, "dist");

function readDist(relativePath: string) {
  const absolutePath = path.join(distRoot, relativePath);
  expect(existsSync(absolutePath), `${relativePath} must exist in dist`).toBe(true);
  return readFileSync(absolutePath, "utf8");
}

function routeHtmlPath(routePath: string) {
  if (routePath === "/") {
    return "index.html";
  }

  return path.join(routePath.replace(/^\/|\/$/g, ""), "index.html");
}

function includesAlternate(html: string, hreflang: string, href: string) {
  return html.includes(`rel="alternate" hreflang="${hreflang}" href="${href}"`);
}

describe("built public routes", () => {
  it("renders every graph route with canonical SEO and language alternates", () => {
    const routes = getPublicRouteMap();
    expect(routes).toHaveLength(24);

    for (const route of routes) {
      const html = readDist(routeHtmlPath(route.path));
      const seo = getSeoMetadata(route.id, route.locale);

      expect(html).toContain(`<html lang="${route.locale}"`);
      expect(html).toContain(`name="description" content="${seo.description}"`);
      expect(html).toContain(`rel="canonical" href="${seo.canonicalUrl}"`);
      expect(includesAlternate(html, "en", seo.alternates.en)).toBe(true);
      expect(includesAlternate(html, "es", seo.alternates.es)).toBe(true);
      expect(includesAlternate(html, "x-default", seo.alternates["x-default"])).toBe(true);
      expect(html).toContain(`<title>${seo.title}</title>`);
      expect(html).not.toMatch(/lorem|todo|placeholder/i);
    }
  });

  it("keeps localized home navigation and route smoke behavior intact", () => {
    const homeHtml = readDist("index.html");
    const spanishHomeHtml = readDist("es/index.html");

    expect(homeHtml).toContain("Start a conversation");
    expect(homeHtml).toContain('href="/dashboard"');
    expect(homeHtml).toContain("Dashboard");
    expect(spanishHomeHtml).toContain("Hablemos");
    expect(spanishHomeHtml).not.toContain('href="/case-studies"');
    expect(spanishHomeHtml).toContain('href="/es/casos"');
    expect(spanishHomeHtml).toContain('href="/dashboard"');
  });

  it("renders the graph-backed home proof narrative in both languages", () => {
    const homeHtml = readDist("index.html");
    const spanishHomeHtml = readDist("es/index.html");

    expect(homeHtml).toContain('data-home-content-id="home"');
    expect(homeHtml).toContain("Senior engineering.");
    expect(homeHtml).toContain("Proof ledger");
    expect(homeHtml).toContain("Workflow first.");
    expect(homeHtml).toContain('href="/case-studies/casa-roca"');
    expect(homeHtml).toContain('href="/case-studies/the-barber-central"');
    expect(homeHtml).toContain('href="/case-studies/nutri-plan"');
    expect(homeHtml).toContain('href="/case-studies/enterprise-systems"');
    expect(homeHtml).toContain('aria-label="Public-safe evidence for Casa Roca"');
    expect(homeHtml).toContain("/images/proof/casa-roca-production.png");
    expect(homeHtml).toContain("/images/proof/barber-central-ops.png");
    expect(homeHtml).toContain("/images/proof/nutri-plan-proof.png");
    expect(homeHtml).toContain("/images/generated/aohys-delivery-artifact.png");
    expect(homeHtml).toContain("/images/brand/aohys-logo.png");
    expect(homeHtml).toContain("WhatsApp");
    expect(homeHtml).not.toContain("Cloudflare · Convex · PostHog · Resend");
    expect(homeHtml).not.toContain("Download ATS PDF");

    expect(spanishHomeHtml).toContain('data-home-content-id="home"');
    expect(spanishHomeHtml).toContain("Ingeniería senior.");
    expect(spanishHomeHtml).toContain("Ledger de prueba");
    expect(spanishHomeHtml).toContain("Workflow primero.");
    expect(spanishHomeHtml).toContain('href="/es/casos/casa-roca"');
    expect(spanishHomeHtml).toContain('aria-label="Evidencia pública segura de Casa Roca"');
    expect(spanishHomeHtml).toContain("WhatsApp");
  });

  it("renders the architecture public source framing in both languages", () => {
    const architectureHtml = readDist("architecture/index.html");
    const spanishArchitectureHtml = readDist("es/arquitectura/index.html");

    expect(architectureHtml).toContain('data-architecture-content-id="architecture"');
    expect(architectureHtml).toContain("Public source sample, private client work.");
    expect(architectureHtml).toContain("client and product code stays private");
    expect(architectureHtml).toContain("Release Train");
    expect(architectureHtml).toContain("Environment Contract");
    expect(architectureHtml).toContain("Public Content Graph");
    expect(architectureHtml).toContain('href="https://github.com/AO-HyS/aohys.com"');
    expect(architectureHtml).toContain('href="https://github.com/AO-HyS/aohys.com/blob/develop/docs/release-train.md"');
    expect(architectureHtml).not.toMatch(/client (or|and) product code is public/i);

    expect(spanishArchitectureHtml).toContain('data-architecture-content-id="architecture"');
    expect(spanishArchitectureHtml).toContain("Muestra pública, trabajo privado.");
    expect(spanishArchitectureHtml.toLowerCase()).toContain("el código de clientes y productos permanece privado");
    expect(spanishArchitectureHtml).toContain("Release Train");
    expect(spanishArchitectureHtml).toContain("Environment Contract");
    expect(spanishArchitectureHtml).toContain("Public Content Graph");
    expect(spanishArchitectureHtml).toContain('href="https://github.com/AO-HyS/aohys.com"');
  });

  it("renders the Casa Roca complete case-study structure in both languages", () => {
    const casaRocaHtml = readDist("case-studies/casa-roca/index.html");
    const spanishCasaRocaHtml = readDist("es/casos/casa-roca/index.html");

    expect(casaRocaHtml).toContain('data-case-study-content-id="case-study:casa-roca"');
    expect(casaRocaHtml).toContain("Casa Roca");
    expect(casaRocaHtml).toContain("Production proof");
    expect(casaRocaHtml).toContain("Problem");
    expect(casaRocaHtml).toContain("Business outcome");
    expect(casaRocaHtml).toContain("Role");
    expect(casaRocaHtml).toContain("Constraints");
    expect(casaRocaHtml).toContain("Architecture decisions");
    expect(casaRocaHtml).toContain("Execution highlights");
    expect(casaRocaHtml).toContain("Quality, security, and performance");
    expect(casaRocaHtml).toContain("Public evidence");
    expect(casaRocaHtml).toContain("Confidentiality note");
    expect(casaRocaHtml).toContain('href="https://casa-roca.mx"');
    expect(casaRocaHtml).toContain('aria-label="Public-safe evidence for the Casa Roca production website"');

    expect(spanishCasaRocaHtml).toContain('data-case-study-content-id="case-study:casa-roca"');
    expect(spanishCasaRocaHtml).toContain("Prueba en producción");
    expect(spanishCasaRocaHtml).toContain("Problema");
    expect(spanishCasaRocaHtml).toContain("Resultado de negocio");
    expect(spanishCasaRocaHtml).toContain("Rol");
    expect(spanishCasaRocaHtml).toContain("Restricciones");
    expect(spanishCasaRocaHtml).toContain("Decisiones de arquitectura");
    expect(spanishCasaRocaHtml).toContain("Ejecución");
    expect(spanishCasaRocaHtml).toContain("Calidad, seguridad y rendimiento");
    expect(spanishCasaRocaHtml).toContain("Evidencia pública");
    expect(spanishCasaRocaHtml).toContain("Nota de confidencialidad");
    expect(spanishCasaRocaHtml).toContain('href="https://casa-roca.mx"');
    expect(spanishCasaRocaHtml).toContain('aria-label="Evidencia pública segura del sitio en producción de Casa Roca"');
  });

  it("renders the selected work index and remaining case-study statuses from the graph", () => {
    const indexHtml = readDist("case-studies/index.html");
    const spanishIndexHtml = readDist("es/casos/index.html");
    const barberHtml = readDist("case-studies/the-barber-central/index.html");
    const nutriPlanHtml = readDist("case-studies/nutri-plan/index.html");
    const enterpriseHtml = readDist("case-studies/enterprise-systems/index.html");
    const engineeringPracticeHtml = readDist("case-studies/engineering-practice/index.html");

    expect(indexHtml).toContain('data-case-study-index-content-id="case-studies"');
    expect(indexHtml).toContain('href="/case-studies/casa-roca"');
    expect(indexHtml).toContain('href="/case-studies/the-barber-central"');
    expect(indexHtml).toContain('href="/case-studies/nutri-plan"');
    expect(indexHtml).toContain('href="/case-studies/enterprise-systems"');
    expect(indexHtml).toContain('href="/case-studies/engineering-practice"');
    expect(indexHtml).toContain("Production proof");
    expect(indexHtml).toContain("Active build");
    expect(indexHtml).toContain("Private build");
    expect(indexHtml).toContain("Enterprise/confidential");
    expect(indexHtml).toContain("Engineering practice");

    expect(spanishIndexHtml).toContain('data-case-study-index-content-id="case-studies"');
    expect(spanishIndexHtml).toContain('href="/es/casos/casa-roca"');
    expect(spanishIndexHtml).toContain('href="/es/casos/the-barber-central"');
    expect(spanishIndexHtml).toContain('href="/es/casos/nutri-plan"');
    expect(spanishIndexHtml).toContain('href="/es/casos/sistemas-enterprise"');
    expect(spanishIndexHtml).toContain('href="/es/casos/practica-de-ingenieria"');
    expect(spanishIndexHtml).toContain("Prueba en producción");
    expect(spanishIndexHtml).toContain("Build activo");
    expect(spanishIndexHtml).toContain("Build privado");
    expect(spanishIndexHtml).toContain("Enterprise/confidencial");
    expect(spanishIndexHtml).toContain("Práctica de ingeniería");

    expect(barberHtml).toContain('data-case-study-content-id="case-study:the-barber-central"');
    expect(barberHtml).toContain("Active build");
    expect(barberHtml).toContain("Development preview");
    expect(nutriPlanHtml).toContain('data-case-study-content-id="case-study:nutri-plan"');
    expect(nutriPlanHtml).toContain("Private build");
    expect(nutriPlanHtml).toContain("Sanitized preview");
    expect(enterpriseHtml).toContain('data-case-study-content-id="case-study:enterprise-systems"');
    expect(enterpriseHtml).toContain("Enterprise/confidential");
    expect(enterpriseHtml).toContain("Confidential summary");
    expect(engineeringPracticeHtml).toContain('data-case-study-content-id="case-study:engineering-practice"');
    expect(engineeringPracticeHtml).toContain("Engineering practice");
    expect(engineeringPracticeHtml).toContain("Process evidence");
  });

  it("renders the graph-backed resume page and links to a text-based PDF artifact", () => {
    const resumeHtml = readDist("resume/index.html");
    const spanishResumeHtml = readDist("es/cv/index.html");
    const pdfPath = path.join(distRoot, "downloads", "alejandro-ortiz-corro-resume.pdf");

    expect(resumeHtml).toContain('data-resume-content-id="resume"');
    expect(resumeHtml).toContain("Alejandro Ortiz Corro");
    expect(resumeHtml).toContain("Senior Frontend Developer");
    expect(resumeHtml).toContain("Professional summary");
    expect(resumeHtml).toContain("Professional experience");
    expect(resumeHtml).toContain("Technical skills");
    expect(resumeHtml).toContain("Dynamic resume context");
    expect(resumeHtml).toContain('href="/downloads/alejandro-ortiz-corro-resume.pdf"');
    expect(resumeHtml).toContain("Download PDF");
    expect(resumeHtml).not.toContain("Download ATS PDF");
    expect(resumeHtml).toContain('href="/case-studies"');
    expect(resumeHtml).toContain('href="/architecture"');

    expect(spanishResumeHtml).toContain('data-resume-content-id="resume"');
    expect(spanishResumeHtml).toContain("Alejandro Ortiz Corro");
    expect(spanishResumeHtml).toContain("Desarrollador Frontend Senior");
    expect(spanishResumeHtml).toContain("Resumen profesional");
    expect(spanishResumeHtml).toContain("Experiencia profesional");
    expect(spanishResumeHtml).toContain("Habilidades técnicas");
    expect(spanishResumeHtml).toContain("Contexto dinámico del CV");
    expect(spanishResumeHtml).toContain('href="/downloads/alejandro-ortiz-corro-resume.pdf"');
    expect(spanishResumeHtml).toContain("Descargar PDF");
    expect(spanishResumeHtml).not.toContain("Descargar PDF ATS");
    expect(spanishResumeHtml).toContain('href="/es/casos"');
    expect(spanishResumeHtml).toContain('href="/es/arquitectura"');

    expect(existsSync(pdfPath), "resume PDF must be copied into dist").toBe(true);
    expect(readFileSync(pdfPath).subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  it("renders the contact form with consent, preferred contact path, and WhatsApp fallback", () => {
    const contactHtml = readDist("contact/index.html");
    const spanishContactHtml = readDist("es/contacto/index.html");

    expect(contactHtml).toContain('data-contact-content-id="contact"');
    expect(contactHtml).toContain('data-contact-form');
    expect(contactHtml).toContain('name="preferredContactPath"');
    expect(contactHtml).toContain('name="consentToContact"');
    expect(contactHtml).toContain('name="website"');
    expect(contactHtml).toContain('name="formStartedAt"');
    expect(contactHtml).toContain('name="message"');
    expect(contactHtml).toContain('data-validation-message=');
    expect(contactHtml).toContain('data-email-error-message=');
    expect(contactHtml).toContain('data-backend-error-message=');
    expect(contactHtml).toContain('data-degraded-success-message=');
    expect(contactHtml).toContain('data-retry-label=');
    expect(contactHtml).toContain("Please review the highlighted fields before retrying.");
    expect(contactHtml).toContain("The notification email could not be sent.");
    expect(contactHtml).toContain("Request received. If the email notification is delayed, I can still see it in the dashboard.");
    expect(contactHtml).toContain("Try again, or use WhatsApp or email directly.");
    expect(contactHtml).toContain("WhatsApp");
    expect(contactHtml).toContain("I understand AOHYS will use this information to respond to my request.");
    expect(contactHtml).toMatch(/failure_reason:[`"]validation_failed/);
    expect(contactHtml).toMatch(/failure_reason:\w/);
    expect(contactHtml).toContain("contact_form_submit_succeeded");
    expect(contactHtml).toContain("notification_status");
    expect(contactHtml).toContain("analytics_status");
    expect(contactHtml).toContain("email_delivery_failed");
    expect(contactHtml).toMatch(/failure_reason:[`"]backend_unavailable/);

    expect(spanishContactHtml).toContain('data-contact-content-id="contact"');
    expect(spanishContactHtml).toContain('data-contact-form');
    expect(spanishContactHtml).toContain('name="preferredContactPath"');
    expect(spanishContactHtml).toContain('name="consentToContact"');
    expect(spanishContactHtml).toContain('name="website"');
    expect(spanishContactHtml).toContain('name="formStartedAt"');
    expect(spanishContactHtml).toContain('data-validation-message=');
    expect(spanishContactHtml).toContain('data-email-error-message=');
    expect(spanishContactHtml).toContain('data-backend-error-message=');
    expect(spanishContactHtml).toContain('data-degraded-success-message=');
    expect(spanishContactHtml).toContain('data-retry-label=');
    expect(spanishContactHtml).toContain("Revisa los campos marcados antes de intentar de nuevo.");
    expect(spanishContactHtml).toContain("No se pudo enviar el correo de notificación.");
    expect(spanishContactHtml).toContain("Solicitud recibida. Si la notificación por correo se retrasa, todavía puedo verla en el dashboard.");
    expect(spanishContactHtml).toContain("Intenta de nuevo o usa WhatsApp/correo directo.");
    expect(spanishContactHtml).toContain("WhatsApp");
    expect(spanishContactHtml).toContain("Entiendo que AOHYS usará esta información para responder mi solicitud.");
  });

  it("renders explicit analytics hooks without relying on autocapture", () => {
    const contactHtml = readDist("contact/index.html");

    expect(contactHtml).toContain('id="aohys-posthog-config"');
    expect(contactHtml).toContain('"name":"$pageview"');
    expect(contactHtml).toContain('"content_id":"contact"');
    expect(contactHtml).toContain('"environment":"local"');
    expect(contactHtml).toContain('data-analytics-view="contact_form_viewed"');
    expect(contactHtml).toContain('data-analytics-submit="contact_form_submit_attempted"');
    expect(contactHtml).toContain("contact_form_submit_succeeded");
    expect(contactHtml).toContain('data-analytics-event="whatsapp_cta_clicked"');
    expect(contactHtml).toContain('data-analytics-event="email_cta_clicked"');
    expect(contactHtml).not.toContain("autocapture:true");
  });

  it("renders accurate bilingual privacy copy without private-source claims", () => {
    const privacyHtml = readDist("privacy/index.html");
    const spanishPrivacyHtml = readDist("es/privacidad/index.html");

    expect(privacyHtml).toContain('data-privacy-content-id="privacy"');
    expect(privacyHtml).toContain("Contact requests");
    expect(privacyHtml).toContain("PostHog");
    expect(privacyHtml).toContain("contact message text is not sent to analytics");
    expect(privacyHtml).toMatch(/private client code, credentials, operational records, and dashboard data are not public/i);
    expect(privacyHtml).not.toMatch(/private client code is public|open source lab/i);

    expect(spanishPrivacyHtml).toContain('data-privacy-content-id="privacy"');
    expect(spanishPrivacyHtml).toContain("Solicitudes de contacto");
    expect(spanishPrivacyHtml).toContain("PostHog");
    expect(spanishPrivacyHtml).toContain("el texto del mensaje no se envía a analíticas");
    expect(spanishPrivacyHtml).toContain("código privado de clientes, credenciales, registros operativos y datos del dashboard no son públicos");
    expect(spanishPrivacyHtml).not.toMatch(/código privado.*es público|open source lab/i);
  });

  it("emits sitemap and robots behavior from the public graph", () => {
    const sitemap = readDist("sitemap.xml");
    const robots = readDist("robots.txt");

    for (const entry of getSitemapEntries()) {
      expect(sitemap).toContain(`<loc>${entry.url}</loc>`);
    }

    expect(sitemap).not.toContain("/dashboard");
    expect(sitemap).toContain('hreflang="es" href="https://aohys.com/es/"');
    expect(robots).toContain("Disallow: /dashboard");
    expect(robots).toContain("Sitemap: https://aohys.com/sitemap.xml");
  });

  it("publishes Cloudflare Pages security headers for public and private surfaces", () => {
    const headers = readDist("_headers");

    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain("Referrer-Policy: strict-origin-when-cross-origin");
    expect(headers).toContain("X-Frame-Options: DENY");
    expect(headers).toContain("Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()");
    expect(headers).toContain("Content-Security-Policy:");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain("script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com");
    expect(headers).toContain("script-src-elem 'self' 'unsafe-inline' https://us-assets.i.posthog.com");
    expect(headers).toContain("connect-src 'self' https://*.convex.site https://us.i.posthog.com https://us.posthog.com https://us-assets.i.posthog.com");
  });
});
