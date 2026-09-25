import type { Locale } from "@aohys/content-graph";

/*
  Presentation data for the Horizonte lens. Facts (titles, outcomes, roles,
  statuses, case copy) stay in the Public Content Graph; this file only holds
  what the lens needs to draw each product: its pastel, the texture framing
  and the three short part labels that orbit the sphere.
*/

type Localized = Record<Locale, string>;

export type GhostKind =
  | "calendar"
  | "range"
  | "sidebar"
  | "chat"
  | "plan"
  | "chart"
  | "list"
  | "doc"
  | "board"
  | "page"
  | "split"
  | "form";

export interface HorizonteProject {
  contentId: string;
  tint: string;
  texture: string;
  size: [number, number];
  /* Lens centre in texture UV (0..1) and the fraction of the image height spanning the diameter. */
  focus: { x: number; y: number; zoom: number };
  short: Localized;
  parts: [GhostPart, GhostPart, GhostPart];
  alt: Localized;
}

export interface GhostPart {
  kind: GhostKind;
  label: Localized;
}

export const HORIZONTE_PASTELS = {
  honey: "#FCE3A6",
  olive: "#D6E2B4",
  apricot: "#FDD2B1",
} as const;

export const HORIZONTE_PROJECTS: HorizonteProject[] = [
  {
    contentId: "case-study:the-barber-central",
    tint: "#FDD2B1",
    texture: "/images/horizonte/lens-barber.jpg",
    size: [1600, 809],
    focus: { x: 0.5, y: 0.44, zoom: 0.62 },
    short: {
      es: "Reservas, WhatsApp y la operación diaria de un negocio de belleza.",
      en: "Booking, WhatsApp and the daily operations of a beauty business.",
    },
    alt: {
      es: "Página pública de Central Belleza, la marca pública de The Barber Central.",
      en: "Central Belleza public page, the public brand of The Barber Central.",
    },
    parts: [
      { kind: "calendar", label: { es: "Reservas", en: "Booking" } },
      { kind: "sidebar", label: { es: "Operación", en: "Operations" } },
      { kind: "chat", label: { es: "WhatsApp", en: "WhatsApp" } },
    ],
  },
  {
    contentId: "case-study:nutri-plan",
    tint: "#D6E2B4",
    texture: "/images/horizonte/lens-nutriplan.jpg",
    size: [1400, 1288],
    focus: { x: 0.5, y: 0.36, zoom: 0.62 },
    short: {
      es: "La consulta de nutrición y el seguimiento del paciente entre citas.",
      en: "The nutrition consultation, and the patient’s follow-through between visits.",
    },
    alt: {
      es: "Panel de NutriPlan con pacientes, citas y seguimiento; datos sanitizados.",
      en: "NutriPlan dashboard with patients, appointments and follow-up; sanitized data.",
    },
    parts: [
      { kind: "calendar", label: { es: "Citas", en: "Appointments" } },
      { kind: "plan", label: { es: "Plan de alimentación", en: "Meal plan" } },
      { kind: "chart", label: { es: "Progreso", en: "Progress" } },
    ],
  },
  {
    contentId: "case-study:eteria",
    tint: "#FCE3A6",
    texture: "/images/horizonte/lens-eteria.jpg",
    size: [1200, 630],
    focus: { x: 0.52, y: 0.5, zoom: 0.94 },
    short: {
      es: "Propuestas y operación de eventos, de la primera consulta al cierre.",
      en: "Event proposals and operations, from the first inquiry to closeout.",
    },
    alt: {
      es: "Fotografía de la landing pública de ETERIA: mesa de celebración al aire libre con flores marfil.",
      en: "Photograph from the ETERIA public landing: an outdoor celebration table with ivory flowers.",
    },
    parts: [
      { kind: "list", label: { es: "Prospectos", en: "Leads" } },
      { kind: "doc", label: { es: "Propuestas", en: "Proposals" } },
      {
        kind: "board",
        label: { es: "Operación del evento", en: "Event operations" },
      },
    ],
  },
  {
    contentId: "case-study:casa-roca",
    tint: "#E7E6B0",
    texture: "/images/horizonte/lens-casaroca.jpg",
    size: [1432, 960],
    focus: { x: 0.5, y: 0.47, zoom: 0.8 },
    short: {
      es: "El sitio de una estancia y las reservaciones que maneja su equipo.",
      en: "A hospitality website and the reservations its staff manage.",
    },
    alt: {
      es: "Galerías del sitio Casa Roca en producción.",
      en: "Galleries page of the live Casa Roca website.",
    },
    parts: [
      { kind: "page", label: { es: "Contenido", en: "Content" } },
      { kind: "range", label: { es: "Reservaciones", en: "Reservations" } },
      {
        kind: "list",
        label: { es: "Entradas y salidas", en: "Check-in / out" },
      },
    ],
  },
  {
    contentId: "architecture",
    tint: "#FDDDAA",
    texture: "/images/horizonte/lens-aohys.jpg",
    size: [1600, 845],
    focus: { x: 0.5, y: 0.47, zoom: 0.7 },
    short: {
      es: "Este sitio, su CMS y el sistema con el que desarrollo.",
      en: "This website, its CMS and the system I build with.",
    },
    alt: {
      es: "Versión anterior del sitio AOHYS publicada antes de este rediseño.",
      en: "The previous published AOHYS website, before this redesign.",
    },
    parts: [
      { kind: "split", label: { es: "Bilingüe", en: "Bilingual" } },
      { kind: "form", label: { es: "CMS propio", en: "Custom CMS" } },
      {
        kind: "board",
        label: { es: "Development System", en: "Development System" },
      },
    ],
  },
];

export function getHorizonteProject(contentId: string) {
  return HORIZONTE_PROJECTS.find((project) => project.contentId === contentId);
}

/* Position a texture inside a circle exactly like the lens shader maps it. */
export function fitStyle(project: Pick<HorizonteProject, "size" | "focus">) {
  const ratio = project.size[0] / project.size[1];
  const halfH = 0.5 * project.focus.zoom;
  const halfW = halfH / ratio;
  const w = 100 / (2 * halfW);
  const h = 100 / (2 * halfH);
  return `--w:${w.toFixed(3)}%;--h:${h.toFixed(3)}%;--l:${(50 - project.focus.x * w).toFixed(3)}%;--t:${(50 - project.focus.y * h).toFixed(3)}%;`;
}

export type LensPhoto = Pick<
  HorizonteProject,
  "texture" | "size" | "focus" | "tint" | "alt"
>;

/* Generated photographs for interior-page lenses (brief: .impeccable/mocks/lens-textures-20260925/). */
export const PAGE_LENS_PHOTOS: Record<
  "resume" | "practice" | "contact" | "privacy" | "architecture",
  LensPhoto
> = {
  resume: {
    texture: "/images/horizonte/lens-resume.jpg",
    size: [1024, 1024],
    focus: { x: 0.5, y: 0.54, zoom: 0.72 },
    tint: "#D6E2B4",
    alt: {
      es: "Escritorio de roble con un cuaderno de bocetos de interfaz, notas pastel y café.",
      en: "Oak desk with a notebook of interface sketches, pastel notes and coffee.",
    },
  },
  practice: {
    texture: "/images/horizonte/lens-practice.jpg",
    size: [1024, 1024],
    focus: { x: 0.5, y: 0.52, zoom: 0.74 },
    tint: "#E7E6B0",
    alt: {
      es: "Bloques pastel de cerámica y roble ensamblados en un sistema equilibrado.",
      en: "Pastel ceramic and oak blocks assembled into a balanced system.",
    },
  },
  contact: {
    texture: "/images/horizonte/lens-contact.jpg",
    size: [1024, 1024],
    focus: { x: 0.5, y: 0.53, zoom: 0.72 },
    tint: "#FCE3A6",
    alt: {
      es: "Dos tazas de café frente a frente en una mesa soleada, con un cuaderno y una pluma.",
      en: "Two coffee cups facing each other on a sunny table, with a notebook and pen.",
    },
  },
  privacy: {
    texture: "/images/horizonte/lens-privacy.jpg",
    size: [1024, 1024],
    focus: { x: 0.5, y: 0.53, zoom: 0.72 },
    tint: "#FDD2B1",
    alt: {
      es: "Un sobre detrás de vidrio esmerilado y una llave de latón sobre lino.",
      en: "An envelope behind frosted glass and a brass key on linen.",
    },
  },
  architecture: {
    texture: "/images/horizonte/lens-architecture.jpg",
    size: [1024, 1024],
    focus: { x: 0.5, y: 0.5, zoom: 0.76 },
    tint: "#FCE3A6",
    alt: {
      es: "Maqueta de cinco capas translúcidas en pastel unidas por pernos de latón.",
      en: "Model of five translucent pastel layers joined by brass pins.",
    },
  },
};
