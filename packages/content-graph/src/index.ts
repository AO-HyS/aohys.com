export const SITE_URL = "https://aohys.com";
export const DEFAULT_LOCALE = "en";
export const LOCALES = ["en", "es"] as const;
export const PRIVATE_ROUTE_PREFIXES = ["/dashboard"] as const;

export type Locale = (typeof LOCALES)[number];
export type ContentStatus = "published" | "draft";
export type ContentType =
  | "landing"
  | "case-study-index"
  | "case-study"
  | "page"
  | "resume"
  | "contact"
  | "privacy";

export type ContentId =
  | "home"
  | "case-studies"
  | "case-study:casa-roca"
  | "case-study:the-barber-central"
  | "case-study:nutri-plan"
  | "case-study:enterprise-systems"
  | "practice"
  | "architecture"
  | "resume"
  | "contact"
  | "privacy";

export interface LocaleVariant {
  locale: Locale;
  path: string;
  title: string;
  summary: string;
  seoTitle: string;
  seoDescription: string;
  primaryActionLabel?: string;
  primaryActionContentId?: ContentId;
  secondaryActionLabel?: string;
  secondaryActionContentId?: ContentId;
}

export interface SitemapRule {
  include: boolean;
  changefreq?: "weekly" | "monthly";
  priority?: number;
}

export interface PublicContentNode {
  id: ContentId | string;
  type: ContentType;
  status: ContentStatus;
  sitemap: SitemapRule;
  variants: Partial<Record<Locale, LocaleVariant>>;
}

export interface PublicRoute {
  id: ContentId | string;
  locale: Locale;
  node: PublicContentNode;
  variant: LocaleVariant;
  path: string;
  canonicalUrl: string;
}

export interface SeoMetadata {
  lang: Locale;
  title: string;
  description: string;
  canonicalUrl: string;
  alternates: Record<Locale | "x-default", string>;
  robots: "index,follow" | "noindex,nofollow";
}

export interface SitemapEntry {
  url: string;
  alternates: Record<Locale | "x-default", string>;
  changefreq?: SitemapRule["changefreq"];
  priority?: number;
}

export class MissingLocaleVariantError extends Error {
  constructor(contentId: string, locale: Locale) {
    super(`Content node "${contentId}" is missing the "${locale}" locale variant.`);
    this.name = "MissingLocaleVariantError";
  }
}

function variant(
  locale: Locale,
  path: string,
  title: string,
  summary: string,
  seoDescription: string,
  actions: Partial<
    Pick<
      LocaleVariant,
      | "primaryActionLabel"
      | "primaryActionContentId"
      | "secondaryActionLabel"
      | "secondaryActionContentId"
    >
  > = {},
): LocaleVariant {
  return {
    locale,
    path,
    title,
    summary,
    seoTitle: `${title} | AOHYS`,
    seoDescription,
    ...actions,
  };
}

const nodes = [
  {
    id: "home",
    type: "landing",
    status: "published",
    sitemap: { include: true, changefreq: "weekly", priority: 1 },
    variants: {
      en: variant(
        "en",
        "/",
        "Alejandro Ortiz Corro",
        "Business goals turned into reliable product systems.",
        "Alejandro Ortiz Corro builds business outcomes through software architecture, product systems, quality, security, and modern engineering practice.",
        {
          primaryActionLabel: "Start a conversation",
          primaryActionContentId: "contact",
          secondaryActionLabel: "View selected work",
          secondaryActionContentId: "case-studies",
        },
      ),
      es: variant(
        "es",
        "/es/",
        "Alejandro Ortiz Corro",
        "Objetivos de negocio convertidos en sistemas de producto confiables.",
        "Alejandro Ortiz Corro construye resultados de negocio con arquitectura de software, sistemas de producto, calidad, seguridad y prácticas modernas de ingeniería.",
        {
          primaryActionLabel: "Hablemos",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Ver trabajo seleccionado",
          secondaryActionContentId: "case-studies",
        },
      ),
    },
  },
  {
    id: "case-studies",
    type: "case-study-index",
    status: "published",
    sitemap: { include: true, changefreq: "weekly", priority: 0.9 },
    variants: {
      en: variant(
        "en",
        "/case-studies",
        "Selected work",
        "Case-study routes for production proof, active product builds, and enterprise systems.",
        "Review selected AOHYS work across production websites, active product builds, business systems, and enterprise software delivery.",
        {
          primaryActionLabel: "Discuss a project",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Read architecture notes",
          secondaryActionContentId: "architecture",
        },
      ),
      es: variant(
        "es",
        "/es/casos",
        "Trabajo seleccionado",
        "Rutas de casos para proyectos en producción, productos activos y sistemas enterprise.",
        "Revisa trabajo seleccionado de AOHYS en sitios en producción, productos activos, sistemas de negocio y entrega de software enterprise.",
        {
          primaryActionLabel: "Platicar un proyecto",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Leer arquitectura",
          secondaryActionContentId: "architecture",
        },
      ),
    },
  },
  {
    id: "case-study:casa-roca",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.8 },
    variants: {
      en: variant(
        "en",
        "/case-studies/casa-roca",
        "Casa Roca",
        "Production proof for a public business site with careful SEO, performance, and deployment discipline.",
        "Casa Roca is production evidence for public business site delivery, SEO readiness, performance care, and release discipline.",
        {
          primaryActionLabel: "Start a similar build",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Back to selected work",
          secondaryActionContentId: "case-studies",
        },
      ),
      es: variant(
        "es",
        "/es/casos/casa-roca",
        "Casa Roca",
        "Prueba en producción de un sitio público de negocio con SEO, rendimiento y disciplina de deploy.",
        "Casa Roca es evidencia en producción de entrega para un sitio público de negocio, SEO, rendimiento y disciplina de release.",
        {
          primaryActionLabel: "Crear algo similar",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Volver a casos",
          secondaryActionContentId: "case-studies",
        },
      ),
    },
  },
  {
    id: "case-study:the-barber-central",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.78 },
    variants: {
      en: variant(
        "en",
        "/case-studies/the-barber-central",
        "The Barber Central",
        "An active booking and operations product shaped around local business workflows.",
        "The Barber Central shows active product architecture for booking, operations, payments, and customer communication workflows.",
        {
          primaryActionLabel: "Discuss operations software",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Back to selected work",
          secondaryActionContentId: "case-studies",
        },
      ),
      es: variant(
        "es",
        "/es/casos/the-barber-central",
        "The Barber Central",
        "Producto activo de reservaciones y operaciones diseñado alrededor de flujos reales de negocio local.",
        "The Barber Central muestra arquitectura de producto activo para reservaciones, operaciones, pagos y comunicación con clientes.",
        {
          primaryActionLabel: "Hablar de software operativo",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Volver a casos",
          secondaryActionContentId: "case-studies",
        },
      ),
    },
  },
  {
    id: "case-study:nutri-plan",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.78 },
    variants: {
      en: variant(
        "en",
        "/case-studies/nutri-plan",
        "Nutri Plan",
        "An active product system for client workflows, plans, and operational clarity.",
        "Nutri Plan shows active product work around client workflows, structured plans, operational tools, and delivery quality.",
        {
          primaryActionLabel: "Plan a product workflow",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Back to selected work",
          secondaryActionContentId: "case-studies",
        },
      ),
      es: variant(
        "es",
        "/es/casos/nutri-plan",
        "Nutri Plan",
        "Sistema de producto activo para flujos de clientes, planes y claridad operativa.",
        "Nutri Plan muestra trabajo de producto activo alrededor de flujos de clientes, planes estructurados, herramientas operativas y calidad de entrega.",
        {
          primaryActionLabel: "Planear un flujo de producto",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Volver a casos",
          secondaryActionContentId: "case-studies",
        },
      ),
    },
  },
  {
    id: "case-study:enterprise-systems",
    type: "case-study",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.76 },
    variants: {
      en: variant(
        "en",
        "/case-studies/enterprise-systems",
        "Enterprise systems",
        "Confidential work framed through outcomes, architecture decisions, escalation ownership, and delivery practice.",
        "Enterprise systems summarizes confidential software work through business outcomes, architecture judgment, escalation ownership, and delivery practice.",
        {
          primaryActionLabel: "Talk about complex systems",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Read architecture notes",
          secondaryActionContentId: "architecture",
        },
      ),
      es: variant(
        "es",
        "/es/casos/sistemas-enterprise",
        "Sistemas enterprise",
        "Trabajo confidencial explicado por resultados, decisiones de arquitectura, escalations y práctica de entrega.",
        "Sistemas enterprise resume trabajo confidencial de software por resultados de negocio, criterio de arquitectura, liderazgo en escalations y práctica de entrega.",
        {
          primaryActionLabel: "Hablar de sistemas complejos",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Leer arquitectura",
          secondaryActionContentId: "architecture",
        },
      ),
    },
  },
  {
    id: "practice",
    type: "page",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.72 },
    variants: {
      en: variant(
        "en",
        "/practice",
        "Practice",
        "How modern AI-assisted engineering, quality checks, and release discipline shape the work.",
        "AOHYS practice explains modern AI-assisted engineering, test discipline, review loops, quality gates, and release habits.",
        {
          primaryActionLabel: "See the public source",
          primaryActionContentId: "architecture",
          secondaryActionLabel: "Start a conversation",
          secondaryActionContentId: "contact",
        },
      ),
      es: variant(
        "es",
        "/es/practica",
        "Práctica",
        "Cómo la ingeniería moderna con IA, calidad y disciplina de release dan forma al trabajo.",
        "La práctica AOHYS explica ingeniería moderna asistida por IA, pruebas, ciclos de revisión, gates de calidad y hábitos de release.",
        {
          primaryActionLabel: "Ver la muestra pública",
          primaryActionContentId: "architecture",
          secondaryActionLabel: "Hablemos",
          secondaryActionContentId: "contact",
        },
      ),
    },
  },
  {
    id: "architecture",
    type: "page",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.86 },
    variants: {
      en: variant(
        "en",
        "/architecture",
        "Architecture",
        "The public source sample behind AOHYS: Astro SEO, private dashboard boundaries, Cloudflare deploys, Convex workflows, and PostHog observability.",
        "Architecture notes for the AOHYS public source sample: Astro SEO pages, private dashboard boundaries, Cloudflare deploys, Convex workflows, and PostHog observability.",
        {
          primaryActionLabel: "Review selected work",
          primaryActionContentId: "case-studies",
          secondaryActionLabel: "Contact Alejandro",
          secondaryActionContentId: "contact",
        },
      ),
      es: variant(
        "es",
        "/es/arquitectura",
        "Arquitectura",
        "La muestra pública de AOHYS: SEO con Astro, límites privados, deploys en Cloudflare, workflows con Convex y observabilidad con PostHog.",
        "Notas de arquitectura para la muestra pública de AOHYS: páginas SEO con Astro, límites privados del dashboard, deploys en Cloudflare, workflows con Convex y observabilidad con PostHog.",
        {
          primaryActionLabel: "Revisar trabajo",
          primaryActionContentId: "case-studies",
          secondaryActionLabel: "Contactar a Alejandro",
          secondaryActionContentId: "contact",
        },
      ),
    },
  },
  {
    id: "resume",
    type: "resume",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.84 },
    variants: {
      en: variant(
        "en",
        "/resume",
        "Resume",
        "A human-readable and ATS-friendly path into Alejandro Ortiz Corro's software engineering experience.",
        "Alejandro Ortiz Corro resume path for hiring managers, technical leads, and ATS systems reviewing software engineering experience.",
        {
          primaryActionLabel: "Contact Alejandro",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Read architecture notes",
          secondaryActionContentId: "architecture",
        },
      ),
      es: variant(
        "es",
        "/es/cv",
        "CV",
        "Ruta clara para personas y ATS sobre la experiencia de Alejandro Ortiz Corro en ingeniería de software.",
        "CV de Alejandro Ortiz Corro para hiring managers, líderes técnicos y ATS que revisan experiencia en ingeniería de software.",
        {
          primaryActionLabel: "Contactar a Alejandro",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Leer arquitectura",
          secondaryActionContentId: "architecture",
        },
      ),
    },
  },
  {
    id: "contact",
    type: "contact",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.82 },
    variants: {
      en: variant(
        "en",
        "/contact",
        "Contact",
        "Start a focused conversation by email or WhatsApp about a role, project, architecture review, or product build.",
        "Contact Alejandro Ortiz Corro and AOHYS by email or WhatsApp for software projects, architecture review, product systems, or hiring conversations.",
        {
          primaryActionLabel: "Email Alejandro",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Review selected work",
          secondaryActionContentId: "case-studies",
        },
      ),
      es: variant(
        "es",
        "/es/contacto",
        "Contacto",
        "Inicia una conversación concreta por correo o WhatsApp sobre un rol, proyecto, revisión de arquitectura o producto.",
        "Contacta a Alejandro Ortiz Corro y AOHYS por correo o WhatsApp para proyectos de software, revisión de arquitectura, sistemas de producto o conversaciones laborales.",
        {
          primaryActionLabel: "Enviar correo",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Revisar trabajo",
          secondaryActionContentId: "case-studies",
        },
      ),
    },
  },
  {
    id: "privacy",
    type: "privacy",
    status: "published",
    sitemap: { include: true, changefreq: "monthly", priority: 0.5 },
    variants: {
      en: variant(
        "en",
        "/privacy",
        "Privacy",
        "How AOHYS treats contact data, analytics, errors, and private project information.",
        "AOHYS privacy route explaining contact data, analytics, error reporting, private project boundaries, and public source limits.",
        {
          primaryActionLabel: "Contact Alejandro",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Back home",
          secondaryActionContentId: "home",
        },
      ),
      es: variant(
        "es",
        "/es/privacidad",
        "Privacidad",
        "Cómo AOHYS maneja datos de contacto, analíticas, errores e información privada de proyectos.",
        "Ruta de privacidad de AOHYS sobre datos de contacto, analíticas, errores, límites de proyectos privados y alcance de la muestra pública.",
        {
          primaryActionLabel: "Contactar a Alejandro",
          primaryActionContentId: "contact",
          secondaryActionLabel: "Volver al inicio",
          secondaryActionContentId: "home",
        },
      ),
    },
  },
] as const satisfies readonly PublicContentNode[];

export const PUBLIC_CONTENT_NODES: readonly PublicContentNode[] = nodes;

const contentById = new Map(PUBLIC_CONTENT_NODES.map((node) => [node.id, node]));

function assertLocale(locale: string): asserts locale is Locale {
  if (!LOCALES.includes(locale as Locale)) {
    throw new Error(`Unsupported locale "${locale}".`);
  }
}

function normalizePath(pathname: string): string {
  let path = pathname;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    path = new URL(path).pathname;
  }

  path = path.split("#")[0]?.split("?")[0] ?? "/";

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (path === "/es") {
    return "/es/";
  }

  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

function toAbsoluteUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export function isPrivateRoute(pathname: string): boolean {
  const path = normalizePath(pathname);
  return PRIVATE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function getContentNode(contentId: ContentId | string): PublicContentNode {
  const node = contentById.get(contentId);

  if (!node) {
    throw new Error(`Unknown content node "${contentId}".`);
  }

  return node;
}

export function getLocaleVariant(
  nodeOrId: PublicContentNode | ContentId | string,
  locale: Locale,
): LocaleVariant {
  assertLocale(locale);
  const node = typeof nodeOrId === "string" ? getContentNode(nodeOrId) : nodeOrId;
  const variantForLocale = node.variants[locale];

  if (!variantForLocale) {
    throw new MissingLocaleVariantError(node.id, locale);
  }

  return variantForLocale;
}

export function getLocalizedPath(contentId: ContentId | string, locale: Locale): string {
  return getLocaleVariant(contentId, locale).path;
}

export function getLanguageAlternates(contentId: ContentId | string): Record<Locale | "x-default", string> {
  const alternates = Object.fromEntries(
    LOCALES.map((locale) => [locale, toAbsoluteUrl(getLocalizedPath(contentId, locale))]),
  ) as Record<Locale, string>;

  return {
    ...alternates,
    "x-default": alternates[DEFAULT_LOCALE],
  };
}

export function getPublicRouteMap(): PublicRoute[] {
  return PUBLIC_CONTENT_NODES.flatMap((node) =>
    LOCALES.map((locale) => {
      const localizedVariant = getLocaleVariant(node, locale);

      return {
        id: node.id,
        locale,
        node,
        variant: localizedVariant,
        path: localizedVariant.path,
        canonicalUrl: toAbsoluteUrl(localizedVariant.path),
      };
    }),
  );
}

export function resolvePublicPath(pathname: string): PublicRoute | null {
  const path = normalizePath(pathname);

  if (isPrivateRoute(path)) {
    return null;
  }

  return getPublicRouteMap().find((route) => normalizePath(route.path) === path) ?? null;
}

export function getSeoMetadata(contentId: ContentId | string, locale: Locale): SeoMetadata {
  const node = getContentNode(contentId);
  const localizedVariant = getLocaleVariant(node, locale);

  return {
    lang: locale,
    title: localizedVariant.seoTitle,
    description: localizedVariant.seoDescription,
    canonicalUrl: toAbsoluteUrl(localizedVariant.path),
    alternates: getLanguageAlternates(contentId),
    robots: node.status === "published" && node.sitemap.include ? "index,follow" : "noindex,nofollow",
  };
}

export function getSitemapEntries(): SitemapEntry[] {
  return getPublicRouteMap()
    .filter((route) => route.node.status === "published" && route.node.sitemap.include)
    .map((route) => ({
      url: route.canonicalUrl,
      alternates: getLanguageAlternates(route.id),
      changefreq: route.node.sitemap.changefreq,
      priority: route.node.sitemap.priority,
    }));
}
