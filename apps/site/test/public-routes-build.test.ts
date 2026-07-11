import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getPublicRouteMap, getSeoMetadata, getSitemapEntries } from "@aohys/content-graph";
import { describe, expect, it } from "vitest";
import { CONTENT_SECURITY_POLICY, renderCloudflarePagesStaticHeaders } from "../src/security-headers.js";

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
    expect(routes.length).toBeGreaterThanOrEqual(24);

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
      expect(html).not.toMatch(/lorem ipsum/i);
      expect(html).not.toMatch(/\bTODO(?:\s|:|$)/);
    }
  });

  it("keeps localized home navigation and route smoke behavior intact", () => {
    const homeHtml = readDist("index.html");
    const spanishHomeHtml = readDist("es/index.html");

    expect(homeHtml).toContain("Start a conversation");
    expect(homeHtml).toContain('href="/dashboard"');
    expect(homeHtml).toContain("Open dashboard");
    expect(spanishHomeHtml).toContain("Iniciar conversación");
    expect(spanishHomeHtml).not.toContain('href="/case-studies"');
    expect(spanishHomeHtml).toContain('href="/es/casos"');
    expect(spanishHomeHtml).toContain('href="/dashboard"');
    expect(homeHtml).toContain('class="sunlit-mobile-language" href="/es/" hreflang="es"');
    expect(spanishHomeHtml).toContain('class="sunlit-mobile-language" href="/" hreflang="en"');
  });

  it("renders the graph-backed Sunlit Systems Studio home in both languages", () => {
    const homeHtml = readDist("index.html");
    const spanishHomeHtml = readDist("es/index.html");

    expect(homeHtml).toContain('data-home-content-id="home"');
    expect(homeHtml).toContain("Software for what you want to make real.");
    expect(homeHtml).toContain('class="sunlit-studio-hero"');
    expect(homeHtml).toContain("Services for the next thing your team wants to achieve.");
    expect(homeHtml).toContain("Craft across the whole product system.");
    expect(homeHtml).toContain("/images/proof/enterprise-systems-map-v2.svg");
    expect(homeHtml).toContain('data-project-stage');
    expect(homeHtml).toContain('data-stage-door="left"');
    expect(homeHtml).toContain('data-stage-door="right"');
    expect(homeHtml).toContain("Choose a project. The doors close, the system behind them changes");
    expect(homeHtml).toContain("What would you like your team to create next?");
    expect(homeHtml).toContain("Independent product engineering by Alejandro Ortiz Corro.");
    expect(homeHtml).not.toContain("Public code can be reviewed here");
    expect(homeHtml).not.toContain("Still deciding?");
    expect(homeHtml).toContain('href="/case-studies/casa-roca"');
    expect(homeHtml).toContain('href="/case-studies/the-barber-central"');
    expect(homeHtml).toContain('href="/case-studies/nutri-plan"');
    expect(homeHtml).toContain('href="/case-studies/enterprise-systems"');
    expect(homeHtml).toContain("/images/proof/casa-roca-value-v2.jpg");
    expect(homeHtml).toContain('alt="Casa Roca production website hero screenshot"');
    expect(homeHtml).toContain("/images/proof/barber-central-hero-v2.jpg");
    expect(homeHtml).toContain("WhatsApp");
    expect(homeHtml).not.toContain("Cloudflare · Convex · PostHog · Resend");
    expect(homeHtml).not.toContain("Download ATS PDF");

    expect(spanishHomeHtml).toContain('data-home-content-id="home"');
    expect(spanishHomeHtml).toContain("Software para hacer realidad lo que imaginas.");
    expect(spanishHomeHtml).toContain('class="sunlit-studio-hero"');
    expect(spanishHomeHtml).toContain("Servicios para lo siguiente que tu equipo quiere lograr.");
    expect(spanishHomeHtml).toContain("Cuidado en todo el sistema de producto.");
    expect(spanishHomeHtml).toContain("Elige un proyecto. Las puertas se cierran, cambia el sistema detrás");
    expect(spanishHomeHtml).toContain("¿Qué te gustaría que tu equipo creara después?");
    expect(spanishHomeHtml).toContain("Ingeniería de producto independiente por Alejandro Ortiz Corro.");
    expect(spanishHomeHtml).not.toContain("El código público se puede revisar aquí");
    expect(spanishHomeHtml).not.toContain("¿Todavía evaluando?");
    expect(spanishHomeHtml).toContain('href="/es/casos/casa-roca"');
    expect(spanishHomeHtml).toContain("/images/proof/casa-roca-value-v2.jpg");
    expect(spanishHomeHtml).toContain('alt="Hero del sitio Casa Roca en producción"');
    expect(spanishHomeHtml).not.toContain('alt="Casa Roca destination gallery and value story"');
    expect(spanishHomeHtml).toContain("WhatsApp");
  });

  it("renders the architecture system, tradeoffs, and source links in both languages", () => {
    const architectureHtml = readDist("architecture/index.html");
    const spanishArchitectureHtml = readDist("es/arquitectura/index.html");

    expect(architectureHtml).toContain('data-architecture-content-id="architecture"');
    expect(architectureHtml).toContain("Architecture that gives ideas room to grow.");
    expect(architectureHtml).toContain("One system, six responsibilities.");
    expect(architectureHtml).toContain("Front-end systems");
    expect(architectureHtml).toContain("PostgreSQL");
    expect(architectureHtml).toContain("AI engineering");
    expect(architectureHtml).toContain("Cloud operations");
    expect(architectureHtml).toContain("Architecture is a sequence of tradeoffs.");
    expect(architectureHtml.match(/<canvas/g)).toHaveLength(1);
    expect(architectureHtml).toContain("Release Train");
    expect(architectureHtml).toContain("Environment Contract");
    expect(architectureHtml).toContain("Public Content Graph");
    expect(architectureHtml).toContain('class="sunlit-system-layers"');
    expect(architectureHtml).toContain('class="sunlit-architecture-notes"');
    expect(architectureHtml).not.toContain("<details");
    expect(architectureHtml).toContain('href="https://github.com/AO-HyS/aohys.com"');
    expect(architectureHtml).toContain('href="https://github.com/AO-HyS/aohys.com/blob/develop/docs/release-train.md"');
    expect(architectureHtml).not.toMatch(/public proof|evidence|confidential/i);

    expect(spanishArchitectureHtml).toContain('data-architecture-content-id="architecture"');
    expect(spanishArchitectureHtml).toContain("Arquitectura que da espacio para crecer.");
    expect(spanishArchitectureHtml).toContain("Un sistema, seis responsabilidades.");
    expect(spanishArchitectureHtml).toContain("La arquitectura es una secuencia de tradeoffs.");
    expect(spanishArchitectureHtml).toContain("Release Train");
    expect(spanishArchitectureHtml).toContain("Environment Contract");
    expect(spanishArchitectureHtml).toContain("Public Content Graph");
    expect(spanishArchitectureHtml).toContain('href="https://github.com/AO-HyS/aohys.com"');
  });

  it("renders typed Services stories and deliverables in both languages", () => {
    const servicesHtml = readDist("practice/index.html");
    const spanishServicesHtml = readDist("es/practica/index.html");

    expect(servicesHtml).toContain('data-practice-content-id="practice"');
    expect(servicesHtml).toContain("Build a complete product from zero");
    expect(servicesHtml).toContain("Add a senior collaborator to your team");
    expect(servicesHtml).toContain("Modernize what is already in motion");
    expect(servicesHtml).toContain("When it fits");
    expect(servicesHtml).toContain("What changes");
    expect(servicesHtml).toContain("How we work");
    expect(servicesHtml).toContain("Clear from the first working session.");
    expect(servicesHtml).toContain("Work you can keep using after the engagement.");
    expect(servicesHtml).toContain('data-service-pattern="new"');
    expect(servicesHtml).toContain('data-service-pattern="team"');
    expect(servicesHtml).toContain('data-service-pattern="modernize"');

    expect(spanishServicesHtml).toContain('data-practice-content-id="practice"');
    expect(spanishServicesHtml).toContain("Construir un producto completo desde cero");
    expect(spanishServicesHtml).toContain("Sumar un colaborador senior a tu equipo");
    expect(spanishServicesHtml).toContain("Modernizar lo que ya está en movimiento");
    expect(spanishServicesHtml).toContain("Cuándo encaja");
    expect(spanishServicesHtml).toContain("Lo que cambia");
    expect(spanishServicesHtml).toContain("Cómo colaboramos");
  });

  it("renders the Casa Roca complete case-study structure in both languages", () => {
    const casaRocaHtml = readDist("case-studies/casa-roca/index.html");
    const spanishCasaRocaHtml = readDist("es/casos/casa-roca/index.html");

    expect(casaRocaHtml).toContain('data-case-study-content-id="case-study:casa-roca"');
    expect(casaRocaHtml).toContain("Casa Roca");
    expect(casaRocaHtml).toContain("Live hospitality site");
    expect(casaRocaHtml).toContain("Opportunity");
    expect(casaRocaHtml).toContain("Opportunity &amp; outcome");
    expect(casaRocaHtml).toContain("Role &amp; system");
    expect(casaRocaHtml).toContain("Decisions");
    expect(casaRocaHtml).toContain("Delivery");
    expect(casaRocaHtml.match(/data-case-beat=/g)).toHaveLength(4);
    expect(casaRocaHtml).toContain("Project links");
    expect(casaRocaHtml).not.toContain("Confidentiality note");
    expect(casaRocaHtml).toContain("/images/proof/casa-roca-gallery-v2.jpg");
    expect(casaRocaHtml).toContain('href="https://casa-roca.mx"');
    expect(casaRocaHtml).toContain('aria-label="Casa Roca production website"');
    expect(casaRocaHtml).toContain('class="sunlit-case-hero-links"');
    expect(casaRocaHtml).not.toContain('class="sunlit-case-links"');
    expect(casaRocaHtml.indexOf('class="sunlit-case-hero-links"')).toBeLessThan(casaRocaHtml.indexOf('class="sunlit-case-rail"'));

    expect(spanishCasaRocaHtml).toContain('data-case-study-content-id="case-study:casa-roca"');
    expect(spanishCasaRocaHtml).toContain("Sitio de hospitalidad en vivo");
    expect(spanishCasaRocaHtml).toContain("Oportunidad");
    expect(spanishCasaRocaHtml).toContain("Resultado");
    expect(spanishCasaRocaHtml).toContain("Rol y sistema");
    expect(spanishCasaRocaHtml).toContain("Decisiones");
    expect(spanishCasaRocaHtml).toContain("Entrega");
    expect(spanishCasaRocaHtml.match(/data-case-beat=/g)).toHaveLength(4);
    expect(spanishCasaRocaHtml).toContain("Enlaces del proyecto");
    expect(spanishCasaRocaHtml).not.toContain("Nota de confidencialidad");
    expect(spanishCasaRocaHtml).toContain('href="https://casa-roca.mx"');
    expect(spanishCasaRocaHtml).toContain('aria-label="Sitio Casa Roca en producción"');
    expect(spanishCasaRocaHtml).toContain('class="sunlit-case-hero-links"');
    expect(spanishCasaRocaHtml).not.toContain('class="sunlit-case-links"');
    expect(spanishCasaRocaHtml.indexOf('class="sunlit-case-hero-links"')).toBeLessThan(spanishCasaRocaHtml.indexOf('class="sunlit-case-rail"'));
  });

  it("renders the selected work index and remaining case-study statuses from the graph", () => {
    const indexHtml = readDist("case-studies/index.html");
    const spanishIndexHtml = readDist("es/casos/index.html");
    const barberHtml = readDist("case-studies/the-barber-central/index.html");
    const nutriPlanHtml = readDist("case-studies/nutri-plan/index.html");
    const enterpriseHtml = readDist("case-studies/enterprise-systems/index.html");
    const engineeringPracticeHtml = readDist("case-studies/engineering-practice/index.html");

    expect(indexHtml).toContain('data-case-study-index-content-id="case-studies"');
    expect(indexHtml).not.toContain('class="sunlit-work-program"');
    expect(indexHtml).not.toContain('class="sunlit-archive-ticket"');
    expect(indexHtml).toContain('href="/case-studies/casa-roca"');
    expect(indexHtml).toContain('href="/case-studies/the-barber-central"');
    expect(indexHtml).toContain('href="/case-studies/nutri-plan"');
    expect(indexHtml).toContain('href="/case-studies/enterprise-systems"');
    expect(indexHtml).toContain('href="/case-studies/engineering-practice"');
    expect(indexHtml).toContain("Live hospitality site");
    expect(indexHtml).toContain("Active build");
    expect(indexHtml).toContain("Product system");
    expect(indexHtml).toContain("Enterprise systems");
    expect(indexHtml).toContain("Engineering practice");

    expect(spanishIndexHtml).toContain('data-case-study-index-content-id="case-studies"');
    expect(spanishIndexHtml).toContain('href="/es/casos/casa-roca"');
    expect(spanishIndexHtml).toContain('href="/es/casos/the-barber-central"');
    expect(spanishIndexHtml).toContain('href="/es/casos/nutri-plan"');
    expect(spanishIndexHtml).toContain('href="/es/casos/sistemas-enterprise"');
    expect(spanishIndexHtml).toContain('href="/es/casos/practica-de-ingenieria"');
    expect(spanishIndexHtml).toContain("Sitio de hospitalidad en vivo");
    expect(spanishIndexHtml).toContain("Build activo");
    expect(spanishIndexHtml).toContain("Sistema de producto");
    expect(spanishIndexHtml).toContain("Sistemas enterprise");
    expect(spanishIndexHtml).toContain("Práctica de ingeniería");

    expect(barberHtml).toContain('data-case-study-content-id="case-study:the-barber-central"');
    expect(barberHtml).toContain("Active build");
    expect(barberHtml).toContain("Development preview");
    expect(nutriPlanHtml).toContain('data-case-study-content-id="case-study:nutri-plan"');
    expect(barberHtml).toContain("/images/proof/barber-central-hero-v2.jpg");
    expect(nutriPlanHtml).toContain("Product system");
    expect(nutriPlanHtml).toContain("/images/proof/nutri-plan-dashboard-v2.png");
    expect(enterpriseHtml).toContain('data-case-study-content-id="case-study:enterprise-systems"');
    expect(enterpriseHtml).toContain("Enterprise systems");
    expect(enterpriseHtml).toContain("Client details remain private.");
    expect(enterpriseHtml.match(/Client details remain private\./g)).toHaveLength(1);
    expect(enterpriseHtml).not.toMatch(/confidential/i);
    expect(engineeringPracticeHtml).toContain('data-case-study-content-id="case-study:engineering-practice"');
    expect(engineeringPracticeHtml).toContain("Engineering practice");
    expect(engineeringPracticeHtml).toContain("Source and process");
  });

  it("renders the graph-backed About page without fabricated pricing and keeps the resume PDF available", () => {
    const resumeHtml = readDist("resume/index.html");
    const spanishResumeHtml = readDist("es/curriculum/index.html");
    const pdfPath = path.join(distRoot, "downloads", "alejandro-ortiz-corro-resume.pdf");

    expect(resumeHtml).toContain('data-resume-content-id="resume"');
    expect(resumeHtml).toContain("About Alejandro");
    expect(resumeHtml).toContain("Senior Product Engineer / Frontend Systems");
    expect(resumeHtml).toContain("Delivery profile");
    expect(resumeHtml).toContain("Professional experience");
    expect(resumeHtml).toContain("Core technologies &amp; capabilities");
    expect(resumeHtml).toContain('href="/downloads/alejandro-ortiz-corro-resume.pdf"');
    expect(resumeHtml).toContain("Open resume PDF");
    expect(resumeHtml).not.toContain("Download ATS PDF");
    expect(resumeHtml).toContain('href="/case-studies"');
    expect(resumeHtml).toContain('href="/architecture"');

    expect(spanishResumeHtml).toContain('data-resume-content-id="resume"');
    expect(spanishResumeHtml).toContain("Sobre Alejandro");
    expect(spanishResumeHtml).toContain("Senior Product Engineer / Sistemas Frontend");
    expect(spanishResumeHtml).toContain("Perfil de entrega");
    expect(spanishResumeHtml).toContain("Experiencia profesional");
    expect(spanishResumeHtml).toContain("Tecnologías centrales y capacidades");
    expect(spanishResumeHtml).toContain('href="/downloads/alejandro-ortiz-corro-resume.pdf"');
    expect(spanishResumeHtml).toContain("Abrir CV en PDF");
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
    expect(contactHtml).toContain('class="sunlit-project-brief"');
    expect(contactHtml).toContain("What you want to make possible");
    expect(contactHtml).toContain("Who it should serve");
    expect(contactHtml).toContain("What matters now");
    expect(contactHtml).toContain('data-contact-form');
    expect(contactHtml).toContain('name="preferredContactPath"');
    expect(contactHtml).toContain('data-contact-phone');
    expect(contactHtml).toContain('aria-required="false"');
    expect(contactHtml).toContain("Optional unless WhatsApp is selected");
    expect(contactHtml).toContain("Email is required to confirm your request.");
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
    expect(contactHtml).toContain("Message saved. I can see it in the dashboard even if the email notification is delayed.");
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
    expect(spanishContactHtml).toContain('class="sunlit-project-brief"');
    expect(spanishContactHtml).toContain("Qué quieres hacer posible");
    expect(spanishContactHtml).toContain("A quién debe servir");
    expect(spanishContactHtml).toContain("Qué importa ahora");
    expect(spanishContactHtml).toContain('data-contact-form');
    expect(spanishContactHtml).toContain('name="preferredContactPath"');
    expect(spanishContactHtml).toContain("Opcional, excepto al elegir WhatsApp");
    expect(spanishContactHtml).toContain("El correo es necesario para confirmar tu solicitud.");
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
    expect(spanishContactHtml).toContain("Mensaje guardado. Puedo verlo en el dashboard aunque la notificación por correo se retrase.");
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
    expect(contactHtml).toContain('data-analytics-target="contact_direct_panel"');
    expect(contactHtml).toContain('data-analytics-target="contact_form_error_fallback"');
    expect(contactHtml.match(/data-analytics-event="whatsapp_cta_clicked"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(contactHtml.match(/data-analytics-event="email_cta_clicked"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(contactHtml).not.toContain("autocapture:true");
  });

  it("publishes only canonical public pages and redirects legacy aliases", () => {
    const redirects = readDist("_redirects");

    expect(redirects).toContain("/blog /case-studies 301");
    expect(redirects).toContain("/blog/* /case-studies/:splat 301");
    expect(redirects).toContain("/agents /practice 301");
    expect(redirects).toContain("/pricing /resume 301");
    expect(redirects).toContain("/es/blog /es/casos 301");
    expect(redirects).toContain("/es/agentes /es/practica 301");
    expect(redirects).toContain("/es/precios /es/curriculum 301");
    expect(existsSync(path.join(distRoot, "blog", "index.html"))).toBe(false);
    expect(existsSync(path.join(distRoot, "pricing", "index.html"))).toBe(false);
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

    expect(headers).toBe(renderCloudflarePagesStaticHeaders());
    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain("Referrer-Policy: strict-origin-when-cross-origin");
    expect(headers).toContain("X-Frame-Options: DENY");
    expect(headers).toContain("Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()");
    expect(headers).toContain(`Content-Security-Policy: ${CONTENT_SECURITY_POLICY}`);
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain("script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com");
    expect(headers).toContain("script-src-elem 'self' 'unsafe-inline' https://us-assets.i.posthog.com");
    expect(headers).toContain("connect-src 'self' https://*.convex.site https://*.convex.cloud wss://*.convex.cloud https://upload.imagedelivery.net https://us.i.posthog.com https://us.posthog.com https://us-assets.i.posthog.com");
    expect(headers).toContain("report-uri /observability/csp");
  });
});
