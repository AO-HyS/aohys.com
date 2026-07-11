import {
  getCaseStudyPageContent,
  getLocalizedPath,
  getLocaleVariant,
  type ContentId,
  type Locale,
} from "../packages/content-graph/src/index.ts";
import { hasConvexDeploymentAccess, runConvexFunction } from "./convex-run.js";

type DashboardCaseStudyStatus =
  | "production-proof"
  | "active-build"
  | "private-build"
  | "enterprise-confidential"
  | "engineering-practice";

type DashboardEvidenceStatus = "missing" | "sanitized" | "published";

interface DashboardProjectDraftPayload {
  contentId: string;
  status: DashboardCaseStudyStatus;
  evidenceStatus: DashboardEvidenceStatus;
  locale: Locale;
  title: string;
  summary: string;
  seoDescription: string;
  projectUrl?: string;
  ctaLabel: string;
  ctaHref: string;
  achievements: string;
  structureNotes: string;
}

interface DashboardSiteSettingPayload {
  key: string;
  environment: "local" | "preview" | "production";
  value: string;
  classification: "public-build-value" | "provider-output" | "policy-value";
}

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
    summary?: string;
    achievements?: string;
    structureNotes?: string;
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
        summary: "Live hospitality site for Casa Roca: a clear place story, direct guest inquiry path, and dependable production delivery.",
        seoDescription: "Casa Roca is a live hospitality website for a boutique stay in Veracruz, with clear place storytelling, direct guest inquiry paths, search-ready pages, and production release discipline.",
        ctaLabel: "Open live site",
        ctaHref: "https://casa-roca.mx",
        achievements: [
          "Guests can understand the place, location context, and contact path from one live website.",
          "The business gets a stable destination for referrals, search traffic, and direct inquiries.",
          "The content and reservation path can evolve without disturbing the guest-facing experience.",
        ].join("\n"),
        structureNotes: [
          "Live system: website, production capture, and direct contact path.",
          "Product surface: localized routes, SEO metadata, case narrative, and CTA.",
          "Operating model: guest experience separated from booking, administration, and customer workflows.",
        ].join("\n"),
      },
      es: {
        summary: "Sitio de hospitalidad en vivo para Casa Roca: historia clara del lugar, contacto directo y entrega confiable en producción.",
        seoDescription: "Casa Roca es un sitio de hospitalidad en vivo para una estancia boutique en Veracruz, con historia clara del lugar, contacto directo, páginas listas para búsqueda y disciplina de release.",
        ctaLabel: "Abrir sitio en vivo",
        ctaHref: "https://casa-roca.mx",
        achievements: [
          "Los huéspedes pueden entender el lugar, el contexto y el camino de contacto desde un solo sitio en vivo.",
          "El negocio obtiene un destino estable para referencias, búsqueda y solicitudes directas.",
          "El contenido y el camino de reservación pueden evolucionar sin interrumpir la experiencia del huésped.",
        ].join("\n"),
        structureNotes: [
          "Sistema en vivo: sitio, captura de producción y camino de contacto directo.",
          "Superficie de producto: rutas localizadas, metadata SEO, narrativa del caso y CTA.",
          "Modelo operativo: experiencia del huésped separada de reservaciones, administración y workflows de clientes.",
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
          "Release checks keep provider integrations and client-facing flows dependable while product scope evolves.",
        ].join("\n"),
        structureNotes: [
          "Live preview: development landing page and current product direction.",
          "Core modules: booking, availability, staff/customer communication, payments, and dashboard operations.",
          "Release posture: active build with provider integrations isolated behind explicit boundaries.",
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
          "Los checks de release mantienen confiables las integraciones y los flujos para clientes mientras evoluciona el producto.",
        ].join("\n"),
        structureNotes: [
          "Preview en vivo: landing de desarrollo y dirección actual del producto.",
          "Módulos: booking, disponibilidad, comunicación, pagos y operaciones del dashboard.",
          "Postura de release: build activo con integraciones de proveedores aisladas detrás de límites explícitos.",
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
        summary: "Product system for client workflows, plans, dashboards, mobile access, educational content, and shared backend state.",
        seoDescription: "Nutri Plan shows product architecture around client workflows, structured plans, dashboards, mobile access, educational content, Convex-backed state, and release quality.",
        ctaLabel: "Read system summary",
        ctaHref: getLocalizedPath("case-study:nutri-plan", "en"),
        achievements: [
          "Organizes client work, admin work, and mobile access around one shared product model.",
          "Connects plans, dashboards, education, and operational workflows through explicit access roles and shared state.",
          "Uses preview validation, route checks, and backend state discipline for an active product build.",
        ].join("\n"),
        structureNotes: [
          "Product view: dashboard capture and architecture notes.",
          "Core modules: plans, client workflows, dashboard/admin surfaces, mobile access, and content delivery.",
          "Access model: health and client records remain behind authenticated product workflows.",
        ].join("\n"),
      },
      es: {
        summary: "Sistema de producto para flujos de clientes, planes, dashboards, acceso móvil, contenido educativo y estado backend compartido.",
        seoDescription: "Nutri Plan muestra arquitectura de producto alrededor de flujos de clientes, planes, dashboards, acceso móvil, contenido educativo, estado con Convex y calidad de release.",
        ctaLabel: "Leer resumen del sistema",
        ctaHref: getLocalizedPath("case-study:nutri-plan", "es"),
        achievements: [
          "Organiza trabajo con clientes, administración y acceso móvil alrededor de un modelo compartido.",
          "Conecta planes, dashboards, educación y workflows operativos con roles explícitos y estado compartido.",
          "Usa validación en preview, route checks y disciplina de estado backend para un producto activo.",
        ].join("\n"),
        structureNotes: [
          "Vista del producto: captura del dashboard y notas de arquitectura.",
          "Módulos: planes, workflows de clientes, dashboard/admin, acceso móvil y entrega de contenido.",
          "Modelo de acceso: los registros de salud y clientes permanecen detrás de workflows autenticados.",
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
        summary: "Enterprise delivery across backend work, escalations, payment plans, cashback, customs workflows, and release support.",
        seoDescription: "Enterprise Systems summarizes software delivery through backend implementation, escalation leadership, payment plans, cashback, customs workflows, release support, and operational reliability.",
        ctaLabel: "Read delivery summary",
        ctaHref: getLocalizedPath("case-study:enterprise-systems", "en"),
        achievements: [
          "Three years of complex product and backend delivery across high-pressure operational systems.",
          "Escalation ownership, payment-plan work, cashback implementation, customs workflows, and release support.",
          "The case focuses on responsibility, judgment, and operational outcomes under real constraints.",
        ].join("\n"),
        structureNotes: [
          "System view: delivery map and responsibility summary.",
          "Core areas: backend workflows, operational edge cases, integrations, escalations, and releases.",
          "Operating scope: cross-team coordination, production continuity, data sensitivity, and release readiness.",
        ].join("\n"),
      },
      es: {
        summary: "Entrega enterprise en backend, escalations, payment plans, cashback, customs workflows y soporte de releases.",
        seoDescription: "Sistemas enterprise resume entrega de software: backend, liderazgo en escalations, payment plans, cashback, customs workflows, releases y confiabilidad operativa.",
        ctaLabel: "Leer resumen de entrega",
        ctaHref: getLocalizedPath("case-study:enterprise-systems", "es"),
        achievements: [
          "Tres años de producto y backend complejo en sistemas operativos de alta presión.",
          "Ownership de escalations, payment plans, cashback, customs workflows y soporte de releases.",
          "El caso se centra en responsabilidad, criterio y resultados operativos bajo restricciones reales.",
        ].join("\n"),
        structureNotes: [
          "Vista del sistema: mapa de entrega y resumen de responsabilidades.",
          "Áreas: workflows backend, edge cases operativos, integraciones, escalations y releases.",
          "Alcance operativo: coordinación cross-team, continuidad de producción, sensibilidad de datos y release readiness.",
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
        summary: "Engineering operating system for delivery: content graph, dashboard, Convex, PostHog, release gates, QA, and documentation.",
        seoDescription: "Engineering Practice explains Alejandro Ortiz Corro's agent-assisted delivery process through planning, TDD, content architecture, dashboard workflows, Convex, PostHog observability, release gates, and QA.",
        ctaLabel: "Inspect the repository",
        ctaHref: "https://github.com/AO-HyS/aohys.com",
        achievements: [
          "The repository demonstrates how the site, dashboard, backend, observability, and release train fit together.",
          "Protected preview/production path, GitHub issues, PR checks, TDD notes, browser QA, and documentation are part of the sample.",
          "AI-assisted workflow is visible as engineering practice, not as vague marketing copy.",
        ].join("\n"),
        structureNotes: [
          "Source view: code, docs, PRs, issue plan, tests, and release workflow.",
          "Core modules: Astro site, React dashboard, Convex backend, PostHog events/errors, Resend, and Cloudflare Pages.",
          "System seam: marketing, dashboard, backend, providers, and delivery each retain explicit ownership.",
        ].join("\n"),
      },
      es: {
        summary: "Sistema operativo de ingeniería para delivery: content graph, dashboard, Convex, PostHog, release gates, QA y documentación.",
        seoDescription: "Práctica de ingeniería explica el proceso de Alejandro Ortiz Corro con agentes: planeación, TDD, arquitectura de contenido, workflows de dashboard, Convex, PostHog, release gates y QA.",
        ctaLabel: "Inspeccionar el repositorio",
        ctaHref: "https://github.com/AO-HyS/aohys.com",
        achievements: [
          "El repositorio muestra cómo se conectan sitio, dashboard, backend, observabilidad y release train.",
          "Preview/producción protegidos, issues, PR checks, notas TDD, browser QA y docs forman parte de la muestra.",
          "El trabajo con IA se presenta como práctica de ingeniería, no como copy vacío.",
        ].join("\n"),
        structureNotes: [
          "Vista del source: código, docs, PRs, plan de issues, tests y release workflow.",
          "Módulos: sitio Astro, dashboard React, backend Convex, PostHog, Resend y Cloudflare Pages.",
          "Seam del sistema: marketing, dashboard, backend, providers y delivery conservan ownership explícito.",
        ].join("\n"),
      },
    },
  },
};

function isDryRun(): boolean {
  return process.argv.includes(DRY_RUN_FLAG);
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

  if (!hasConvexDeploymentAccess()) {
    throw new Error("CONVEX_DEPLOY_KEY or CONVEX_DEPLOYMENT is required to seed the preview dashboard.");
  }

  const existingContent = runConvexFunction<DashboardSeedState>("content:listForDashboardInternal", {});
  const existingProjectsByKey = new Map(
    (existingContent.projectDrafts ?? []).map((project) => [`${project.contentId}:${project.locale}`, project]),
  );
  const existingSettingKeys = new Set(
    (existingContent.settings ?? []).map((setting) => `${setting.environment}:${setting.key}`),
  );
  const missingProjects = projects.filter((project) => {
    const existingProject = existingProjectsByKey.get(`${project.contentId}:${project.locale}`);

    return !existingProject || hasRetiredSeedCopy(existingProject);
  });
  const missingSettings = settings.filter((setting) =>
    !existingSettingKeys.has(`${setting.environment}:${setting.key}`),
  );

  for (const project of missingProjects) {
    runConvexFunction("content:upsertProjectDraftFromDashboard", project);
  }

  for (const setting of missingSettings) {
    runConvexFunction("content:upsertSiteSettingFromDashboard", setting);
  }

  console.log(`Seeded dashboard preview content: ${missingProjects.length} missing project drafts, ${missingSettings.length} missing settings. Preserved existing dashboard edits.`);
}

function hasRetiredSeedCopy(project: {
  summary?: string;
  achievements?: string;
  structureNotes?: string;
}): boolean {
  const haystack = [
    project.summary,
    project.achievements,
    project.structureNotes,
  ].filter(Boolean).join("\n").toLowerCase();

  return [
    "production site with a public url a client or recruiter can inspect",
    "public proof",
    "public evidence:",
    "evidencia pública",
    "proof assets",
    "private operations kept out of the public surface",
    "operación privada fuera de la superficie pública",
    "development evidence is public-safe",
    "la evidencia de desarrollo es pública y segura",
    "public link: sanitized screenshots",
    "enlace público: sólo screenshots sanitizados",
    "confidential enterprise delivery summarized",
    "entrega enterprise confidencial resumida",
    "public engineering sample showing",
    "muestra pública de ingeniería que enseña",
  ].some((phrase) => haystack.includes(phrase));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
