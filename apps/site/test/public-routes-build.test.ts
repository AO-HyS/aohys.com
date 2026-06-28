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
    expect(spanishHomeHtml).toContain("Hablemos");
    expect(spanishHomeHtml).not.toContain('href="/case-studies"');
    expect(spanishHomeHtml).toContain('href="/es/casos"');
  });

  it("renders the graph-backed home proof narrative in both languages", () => {
    const homeHtml = readDist("index.html");
    const spanishHomeHtml = readDist("es/index.html");

    expect(homeHtml).toContain('data-home-content-id="home"');
    expect(homeHtml).toContain("Alejandro Ortiz Corro turns business goals into product systems people can trust.");
    expect(homeHtml).toContain("Selected outcomes");
    expect(homeHtml).toContain('href="/case-studies/casa-roca"');
    expect(homeHtml).toContain('href="/case-studies/the-barber-central"');
    expect(homeHtml).toContain('href="/case-studies/nutri-plan"');
    expect(homeHtml).toContain('href="/case-studies/enterprise-systems"');
    expect(homeHtml).toContain('aria-label="Public-safe evidence for Casa Roca"');
    expect(homeHtml).toContain("WhatsApp");
    expect(homeHtml).not.toContain("Cloudflare · Convex · PostHog · Resend");

    expect(spanishHomeHtml).toContain('data-home-content-id="home"');
    expect(spanishHomeHtml).toContain("Alejandro Ortiz Corro convierte objetivos de negocio en sistemas confiables.");
    expect(spanishHomeHtml).toContain("Resultados seleccionados");
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
    expect(spanishArchitectureHtml).toContain("el código de clientes y productos permanece privado");
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
});
