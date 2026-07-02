import {
  getCaseStudyPageContent,
  getLocalizedPath,
  getLocaleVariant,
  type ContentId,
  type Locale,
} from "../packages/content-graph/src/index.ts";
import type {
  DashboardCaseStudyStatus,
  DashboardEvidenceStatus,
  DashboardProjectDraftPayload,
  DashboardSiteSettingPayload,
} from "../apps/backend/src/dashboard-content.ts";

const PROJECT_IDS = [
  "case-study:casa-roca",
  "case-study:the-barber-central",
  "case-study:nutri-plan",
  "case-study:enterprise-systems",
  "case-study:engineering-practice",
] as const satisfies readonly ContentId[];

const LOCALES = ["en", "es"] as const satisfies readonly Locale[];
const DEFAULT_WHATSAPP_URL = "https://wa.me/522299020825";
const DRY_RUN_FLAG = "--dry-run";

type ProjectId = (typeof PROJECT_IDS)[number];

interface DashboardSeedState {
  projectDrafts?: Array<{
    contentId: string;
    locale: Locale;
  }>;
  settings?: Array<{
    key: string;
    environment: string;
  }>;
}

interface ProjectSeedCopy {
  summary: string;
  seoDescription: string;
  ctaLabel: string;
  ctaHref: string;
  achievements: string;
  structureNotes: string;
}

interface ProjectSeedDefinition {
  status: DashboardCaseStudyStatus;
  evidenceStatus: DashboardEvidenceStatus;
  projectUrl?: string;
  copy: Record<Locale, ProjectSeedCopy>;
}

const projectSeedDefinitions: Record<ProjectId, ProjectSeedDefinition> = {
  "case-study:casa-roca": {
    status: "production-proof",
    evidenceStatus: "published",
    projectUrl: "https://casa-roca.mx",
    copy: {
      en: {
        summary: "Live hospitality site for Casa Roca: place story, guest inquiry path, and private operations kept out of the public surface.",
        seoDescription: "Casa Roca is a live hospitality website for a boutique stay in Veracruz, with clear place storytelling, direct guest inquiry paths, search-ready pages, and production release discipline.",
        ctaLabel: "Open live site",
        ctaHref: "https://casa-roca.mx",
        achievements: [
          "Guests can understand the place, location context, and contact path from one public website.",
          "The business gets a stable public destination for referrals, search traffic, and direct inquiries.",
          "Reservations, credentials, analytics, and admin workflows stay outside the public case study.",
        ].join("\n"),
        structureNotes: [
          "Public link: live website and production screenshot.",
          "Public content: localized route, SEO metadata, case-study narrative, and CTA.",
          "Private boundary: booking/admin/customer data stays outside the public case study.",
        ].join("\n"),
      },
      es: {
        summary: "Sitio de hospitalidad en vivo para Casa Roca: historia del lugar, contacto directo y operación privada fuera de la superficie pública.",
        seoDescription: "Casa Roca es un sitio de hospitalidad en vivo para una estancia boutique en Veracruz, con historia clara del lugar, contacto directo, páginas listas para búsqueda y disciplina de release.",
        ctaLabel: "Abrir sitio en vivo",
        ctaHref: "https://casa-roca.mx",
        achievements: [
          "Los huéspedes pueden entender el lugar, el contexto y el camino de contacto desde un sitio público.",
          "El negocio obtiene un destino estable para referencias, búsqueda y solicitudes directas.",
          "Reservaciones, credenciales, analíticas y workflows administrativos quedan fuera del caso público.",
        ].join("\n"),
        structureNotes: [
          "Enlace público: sitio en vivo y screenshot de producción.",
          "Contenido público: ruta localizada, metadata SEO, caso de estudio y CTA.",
          "Límite privado: datos de booking, administración y clientes quedan fuera del caso público.",
        ].join("\n"),
      },
    },
  },
  "case-study:the-barber-central": {
    status: "active-build",
    evidenceStatus: "sanitized",
    projectUrl: "https://the-barber-central-landing.a-ortizcrr.workers.dev",
    copy: {
      en: {
        summary: "Active service-business product shaped around bookings, availability, client communication, payment readiness, and daily operations.",
        seoDescription: "The Barber Central shows active product work for service businesses: booking workflows, operations structure, payment readiness, customer communication, and release discipline.",
        ctaLabel: "Review the build",
        ctaHref: "https://the-barber-central-landing.a-ortizcrr.workers.dev",
        achievements: [
          "Product workflow centered on real service-business operations instead of a generic landing page.",
          "Booking, availability, payment readiness, and communication treated as one operating system.",
          "Development evidence is public-safe while provider data and customer records stay private.",
        ].join("\n"),
        structureNotes: [
          "Public link: development landing page and sanitized product direction.",
          "Core modules: booking, availability, staff/customer communication, payments, and dashboard operations.",
          "Boundary: active build; do not publish provider dashboards, secrets, customer data, or unfinished internals.",
        ].join("\n"),
      },
      es: {
        summary: "Producto activo para negocios de servicios, diseñado alrededor de reservas, disponibilidad, comunicación con clientes, pagos y operación diaria.",
        seoDescription: "The Barber Central muestra trabajo de producto activo para negocios de servicios: booking, estructura operativa, preparación de pagos, comunicación con clientes y disciplina de release.",
        ctaLabel: "Revisar el build",
        ctaHref: "https://the-barber-central-landing.a-ortizcrr.workers.dev",
        achievements: [
          "Workflow de producto centrado en la operación real de un negocio de servicios.",
          "Reservas, disponibilidad, pagos y comunicación tratados como un solo sistema operativo.",
          "La evidencia de desarrollo es pública y segura; datos de proveedores y clientes permanecen privados.",
        ].join("\n"),
        structureNotes: [
          "Enlace público: landing de desarrollo y dirección de producto sanitizada.",
          "Módulos: booking, disponibilidad, comunicación, pagos y operaciones del dashboard.",
          "Límite: build activo; no publicar dashboards de proveedores, secretos, datos de clientes ni internals sin terminar.",
        ].join("\n"),
      },
    },
  },
  "case-study:nutri-plan": {
    status: "private-build",
    evidenceStatus: "sanitized",
    projectUrl: "https://aohys.com/case-studies/nutri-plan",
    copy: {
      en: {
        summary: "Private product system for client workflows, plans, dashboards, mobile access, educational content, and shared backend state.",
        seoDescription: "Nutri Plan shows private product architecture around client workflows, structured plans, dashboards, mobile access, educational content, Convex-backed state, and release quality.",
        ctaLabel: "Read safe summary",
        ctaHref: getLocalizedPath("case-study:nutri-plan", "en"),
        achievements: [
          "Organizes client work, admin work, and mobile access around one shared product model.",
          "Connects plans, dashboards, education, and operational workflows without exposing private records.",
          "Uses preview validation, route checks, and backend state discipline for a private active build.",
        ].join("\n"),
        structureNotes: [
          "Public link: sanitized screenshots and architecture notes only.",
          "Core modules: plans, client workflows, dashboard/admin surfaces, mobile access, and content delivery.",
          "Boundary: no health records, client data, private code, credentials, or provider details in public content.",
        ].join("\n"),
      },
      es: {
        summary: "Sistema privado de producto para flujos de clientes, planes, dashboards, acceso móvil, contenido educativo y estado backend compartido.",
        seoDescription: "Nutri Plan muestra arquitectura de producto privado alrededor de flujos de clientes, planes, dashboards, acceso móvil, contenido educativo, estado con Convex y calidad de release.",
        ctaLabel: "Leer resumen seguro",
        ctaHref: getLocalizedPath("case-study:nutri-plan", "es"),
        achievements: [
          "Organiza trabajo con clientes, administración y acceso móvil alrededor de un modelo compartido.",
          "Conecta planes, dashboards, educación y workflows operativos sin exponer registros privados.",
          "Usa validación en preview, route checks y disciplina de estado backend para un build activo privado.",
        ].join("\n"),
        structureNotes: [
          "Enlace público: sólo screenshots sanitizados y notas de arquitectura.",
          "Módulos: planes, workflows de clientes, dashboard/admin, acceso móvil y entrega de contenido.",
          "Límite: nada de datos de salud/clientes, código privado, credenciales ni detalles de proveedores.",
        ].join("\n"),
      },
    },
  },
  "case-study:enterprise-systems": {
    status: "enterprise-confidential",
    evidenceStatus: "sanitized",
    projectUrl: "https://aohys.com/case-studies/enterprise-systems",
    copy: {
      en: {
        summary: "Confidential enterprise delivery summarized through backend work, escalations, payment plans, cashback, customs workflows, and release support.",
        seoDescription: "Enterprise Systems summarizes confidential software delivery through backend implementation, escalation leadership, payment plans, cashback, customs workflows, release support, and operational reliability.",
        ctaLabel: "Read delivery summary",
        ctaHref: getLocalizedPath("case-study:enterprise-systems", "en"),
        achievements: [
          "Three years of complex product and backend delivery without exposing employer or client systems.",
          "Escalation ownership, payment-plan work, cashback implementation, customs workflows, and release support.",
          "Public case study explains responsibility and judgment while protecting private source, incidents, and metrics.",
        ].join("\n"),
        structureNotes: [
          "Public link: confidential delivery map and responsibility summary.",
          "Core areas: backend workflows, operational edge cases, integrations, escalations, and releases.",
          "Boundary: no employer code, customer data, internal metrics, incidents, credentials, or proprietary architecture.",
        ].join("\n"),
      },
      es: {
        summary: "Entrega enterprise confidencial resumida por backend, escalations, payment plans, cashback, customs workflows y soporte de releases.",
        seoDescription: "Sistemas enterprise resume entrega confidencial de software: backend, liderazgo en escalations, payment plans, cashback, customs workflows, releases y confiabilidad operativa.",
        ctaLabel: "Leer resumen de entrega",
        ctaHref: getLocalizedPath("case-study:enterprise-systems", "es"),
        achievements: [
          "Tres años de producto y backend complejo sin exponer sistemas de empleador o clientes.",
          "Ownership de escalations, payment plans, cashback, customs workflows y soporte de releases.",
          "El caso público explica responsabilidad y criterio protegiendo source, incidentes y métricas privadas.",
        ].join("\n"),
        structureNotes: [
          "Enlace público: mapa confidencial de entrega y resumen de responsabilidades.",
          "Áreas: workflows backend, edge cases operativos, integraciones, escalations y releases.",
          "Límite: nada de código de empleador, datos de clientes, métricas internas, incidentes, credenciales ni arquitectura propietaria.",
        ].join("\n"),
      },
    },
  },
  "case-study:engineering-practice": {
    status: "engineering-practice",
    evidenceStatus: "published",
    projectUrl: "https://github.com/AO-HyS/aohys.com",
    copy: {
      en: {
        summary: "Public engineering sample showing the process around delivery: content graph, private dashboard, Convex, PostHog, release gates, QA, and docs.",
        seoDescription: "Engineering Practice explains Alejandro Ortiz Corro's agent-assisted delivery process through planning, TDD, content architecture, private dashboard boundaries, Convex workflows, PostHog observability, release gates, and QA.",
        ctaLabel: "Inspect the repository",
        ctaHref: "https://github.com/AO-HyS/aohys.com",
        achievements: [
          "Open repository demonstrates how the public site, dashboard boundary, backend, observability, and release train fit together.",
          "Protected preview/production path, GitHub issues, PR checks, TDD notes, browser QA, and documentation are part of the sample.",
          "AI-assisted workflow is visible as engineering practice, not as vague marketing copy.",
        ].join("\n"),
        structureNotes: [
          "Public link: source, docs, PRs, issue plan, tests, and release workflow.",
          "Core modules: Astro public site, React dashboard, Convex backend, PostHog events/errors, Resend, Cloudflare Pages.",
          "Boundary: public sample code is inspectable; private project code, customer data, credentials, and operational screenshots stay private.",
        ].join("\n"),
      },
      es: {
        summary: "Muestra pública de ingeniería que enseña el proceso de entrega: content graph, dashboard privado, Convex, PostHog, release gates, QA y documentación.",
        seoDescription: "Práctica de ingeniería explica el proceso de Alejandro Ortiz Corro con agentes: planeación, TDD, arquitectura de contenido, límites del dashboard, Convex, PostHog, release gates y QA.",
        ctaLabel: "Inspeccionar el repositorio",
        ctaHref: "https://github.com/AO-HyS/aohys.com",
        achievements: [
          "El repo público muestra cómo se conectan sitio, dashboard, backend, observabilidad y release train.",
          "Preview/producción protegidos, issues, PR checks, notas TDD, browser QA y docs forman parte de la muestra.",
          "El trabajo con IA se presenta como práctica de ingeniería, no como copy vacío.",
        ].join("\n"),
        structureNotes: [
          "Enlace público: source, docs, PRs, plan de issues, tests y release workflow.",
          "Módulos: sitio Astro, dashboard React, backend Convex, PostHog, Resend y Cloudflare Pages.",
          "Límite: el código público se puede inspeccionar; código privado, datos de clientes, credenciales y screenshots operativos quedan fuera.",
        ].join("\n"),
      },
    },
  },
};

function isDryRun(): boolean {
  return process.argv.includes(DRY_RUN_FLAG);
}

function requireEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required to seed the preview dashboard.`);
  }

  return value;
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function endpointFor(baseUrl: string, pathname: string): string {
  return `${normalizeBaseUrl(baseUrl)}${pathname}`;
}

async function postJson(
  url: string,
  token: string,
  payload: DashboardProjectDraftPayload | DashboardSiteSettingPayload,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return;
  }

  let message = response.statusText;

  try {
    const responsePayload = await response.json() as { error?: string };
    message = responsePayload.error ?? message;
  } catch {
    // Keep the HTTP status text when the endpoint does not return JSON.
  }

  throw new Error(`Dashboard preview seed failed for ${url}: ${response.status} ${message}`);
}

async function getDashboardSeedState(url: string, token: string): Promise<DashboardSeedState> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Dashboard preview seed failed to read existing content: ${response.status} ${response.statusText}`);
  }

  return await response.json() as DashboardSeedState;
}

function projectPayloads(): DashboardProjectDraftPayload[] {
  return PROJECT_IDS.flatMap((contentId) => {
    const definition = projectSeedDefinitions[contentId];

    return LOCALES.map((locale) => {
      const variant = getLocaleVariant(contentId, locale);
      const caseStudy = getCaseStudyPageContent(contentId, locale);
      const copy = definition.copy[locale];

      return {
        contentId,
        status: definition.status,
        evidenceStatus: definition.evidenceStatus,
        locale,
        title: variant.title,
        summary: copy.summary,
        seoDescription: copy.seoDescription,
        projectUrl: definition.projectUrl,
        ctaLabel: copy.ctaLabel,
        ctaHref: copy.ctaHref,
        achievements: copy.achievements,
        structureNotes: [
          copy.structureNotes,
          caseStudy ? `Case-study route: ${variant.path}` : undefined,
        ].filter(Boolean).join("\n"),
      };
    });
  });
}

function siteSettingPayloads(): DashboardSiteSettingPayload[] {
  return [
    {
      key: "PUBLIC_WHATSAPP_URL",
      environment: "preview",
      value: process.env.PUBLIC_WHATSAPP_URL?.trim() || DEFAULT_WHATSAPP_URL,
      classification: "public-build-value",
    },
  ];
}

async function main(): Promise<void> {
  const dryRun = isDryRun();

  if (!dryRun && process.env.AOHYS_ENV !== "preview") {
    throw new Error("Dashboard preview seed only runs when AOHYS_ENV=preview.");
  }

  const projects = projectPayloads();
  const settings = siteSettingPayloads();

  if (dryRun) {
    console.log(`Dashboard preview seed dry run passed: ${projects.length} project drafts, ${settings.length} settings.`);
    return;
  }

  const convexSiteUrl = requireEnvironmentValue("CONVEX_SITE_URL");
  const dashboardApiToken = requireEnvironmentValue("DASHBOARD_API_TOKEN");
  const contentEndpoint = endpointFor(convexSiteUrl, "/dashboard/content");
  const projectEndpoint = endpointFor(convexSiteUrl, "/dashboard/content/project");
  const settingEndpoint = endpointFor(convexSiteUrl, "/dashboard/content/setting");
  const existingContent = await getDashboardSeedState(contentEndpoint, dashboardApiToken);
  const existingProjectKeys = new Set(
    (existingContent.projectDrafts ?? []).map((project) => `${project.contentId}:${project.locale}`),
  );
  const existingSettingKeys = new Set(
    (existingContent.settings ?? []).map((setting) => `${setting.environment}:${setting.key}`),
  );
  const missingProjects = projects.filter((project) =>
    !existingProjectKeys.has(`${project.contentId}:${project.locale}`),
  );
  const missingSettings = settings.filter((setting) =>
    !existingSettingKeys.has(`${setting.environment}:${setting.key}`),
  );

  for (const project of missingProjects) {
    await postJson(projectEndpoint, dashboardApiToken, project);
  }

  for (const setting of missingSettings) {
    await postJson(settingEndpoint, dashboardApiToken, setting);
  }

  console.log(`Seeded dashboard preview content: ${missingProjects.length} missing project drafts, ${missingSettings.length} missing settings. Preserved existing dashboard edits.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
