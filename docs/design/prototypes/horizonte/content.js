/*
  Horizonte prototype content.
  Facts come from packages/content-graph/src/locales/{es,en}.json and the
  approved candidate narrative. Wording is condensed; nothing here adds
  metrics, clients or claims that are not in those sources.
*/
window.HZ = window.HZ || {};

HZ.pastel = {
  honey: "#FCE3A6",
  olive: "#D6E2B4",
  apricot: "#FDD2B1",
};

/* focus: centre of the lens in texture UV (0..1) and zoom (fraction of the
   image height that spans the lens diameter). kinds drive the ghost drawings. */
HZ.projects = [
  {
    slug: "the-barber-central",
    name: "The Barber Central",
    tint: "#FDD2B1",
    texture: "assets/lens-barber.jpg",
    size: [1600, 809],
    focus: { x: 0.5, y: 0.44, zoom: 0.76 },
    alt: {
      es: "Página pública de Central Belleza, la marca pública de The Barber Central: «Tu talento, en tus clientes. Tu negocio, en orden.»",
      en: "Central Belleza public page, the public brand of The Barber Central: “Tu talento, en tus clientes. Tu negocio, en orden.”",
    },
    status: { es: "Acercándose a producción", en: "Approaching production" },
    purpose: {
      es: "Reservas, WhatsApp y la operación diaria de un negocio de belleza.",
      en: "Booking, WhatsApp and the daily operations of a beauty business.",
    },
    brand: {
      es: "Marca pública: Central Belleza",
      en: "Public brand: Central Belleza",
    },
    contribution: {
      es: "Construí los dos lados de la cita. El cliente consulta servicios, precios y duración y reserva según la disponibilidad del personal; el negocio administra horarios, historial de clientes y una fila para quienes llegan sin cita. WhatsApp, Mercado Pago, Resend y Stripe se conectan con la reserva o la cuenta que corresponde.",
      en: "I built both sides of the appointment. Customers browse services, prices and durations and book against staff availability; the business manages schedules, customer history and a queue for walk-ins. WhatsApp, Mercado Pago, Resend and Stripe connect to the right booking or business account.",
    },
    parts: [
      { kind: "calendar", es: "Reservas", en: "Booking" },
      { kind: "sidebar", es: "Operación", en: "Operations" },
      { kind: "chat", es: "WhatsApp", en: "WhatsApp" },
    ],
    live: null,
  },
  {
    slug: "nutri-plan",
    name: "NutriPlan",
    tint: "#D6E2B4",
    texture: "assets/lens-nutriplan.jpg",
    size: [1400, 1288],
    focus: { x: 0.5, y: 0.4, zoom: 0.78 },
    alt: {
      es: "Panel de NutriPlan con pacientes, citas y seguimiento; datos sanitizados.",
      en: "NutriPlan dashboard with patients, appointments and follow-up; sanitized data.",
    },
    status: {
      es: "Testing y preparación para producción",
      en: "Testing & production preparation",
    },
    purpose: {
      es: "La consulta de nutrición y el seguimiento del paciente entre citas.",
      en: "The nutrition consultation, and the patient’s follow-through between visits.",
    },
    brand: null,
    contribution: {
      es: "Construí citas, información clínica y planes de alimentación con comidas, porciones, alternativas y objetivos. El paciente abre su plan en el portal y pide sustituciones; el equipo trabaja con roles por organización y acceso controlado a la información clínica.",
      en: "I built appointments, clinical information and nutrition plans with meals, portions, alternatives and targets. Patients open their plan in the portal and request substitutions; the care team works with organization roles and controlled access to clinical information.",
    },
    parts: [
      { kind: "calendar", es: "Citas", en: "Appointments" },
      { kind: "plan", es: "Plan de alimentación", en: "Meal plan" },
      { kind: "chart", es: "Progreso", en: "Progress" },
    ],
    live: null,
  },
  {
    slug: "eteria",
    name: "ETERIA",
    tint: "#FCE3A6",
    texture: "assets/lens-eteria.jpg",
    size: [1200, 630],
    focus: { x: 0.52, y: 0.5, zoom: 1.0 },
    alt: {
      es: "Fotografía de la landing pública de ETERIA: mesa de celebración al aire libre con flores marfil. No es una captura de la interfaz de operación.",
      en: "Photograph from the ETERIA public landing: an outdoor celebration table with ivory flowers. Not a capture of the operations interface.",
    },
    status: {
      es: "Proyecto de cliente · En producción",
      en: "Client project · In production",
    },
    purpose: {
      es: "Propuestas y operación de eventos, de la primera consulta al cierre.",
      en: "Event proposals and operations, from the first inquiry to closeout.",
    },
    brand: null,
    contribution: {
      es: "Construí la captura de prospectos, las versiones de propuesta, precios e inventario, y el paso de esa información a la operación del evento. Trabajo en el producto web, el backend compartido en Convex y la aplicación para iPhone en Swift y SwiftUI.",
      en: "I built lead capture, proposal versions, pricing and inventory, and the handoff of that information into event operations. I work on the web product, the shared Convex backend and the Swift/SwiftUI iPhone app.",
    },
    parts: [
      { kind: "list", es: "Prospectos", en: "Leads" },
      { kind: "doc", es: "Propuestas", en: "Proposals" },
      { kind: "board", es: "Operación del evento", en: "Event operations" },
    ],
    live: {
      href: "https://momentos-eteria.com",
      es: "Landing en producción",
      en: "Live landing",
    },
  },
  {
    slug: "casa-roca",
    name: "Casa Roca",
    tint: "#E7E6B0",
    texture: "assets/lens-casaroca.jpg",
    size: [1432, 960],
    focus: { x: 0.5, y: 0.47, zoom: 0.94 },
    alt: {
      es: "Galerías del sitio Casa Roca en producción.",
      en: "Galleries page of the live Casa Roca website.",
    },
    status: { es: "En producción", en: "In production" },
    purpose: {
      es: "El sitio de una estancia y las reservaciones que maneja su equipo.",
      en: "A hospitality website and the reservations its staff manage.",
    },
    brand: null,
    contribution: {
      es: "Construí el sitio público y las herramientas del equipo: contenido, reservaciones y registro de entradas y salidas. Las reglas del backend evitan reservas encimadas y la interfaz las refleja.",
      en: "I built the public website and the staff tools: content, reservations, check-in and check-out. Backend rules prevent overlapping bookings, and the interface reflects them.",
    },
    parts: [
      { kind: "page", es: "Contenido", en: "Content" },
      { kind: "range", es: "Reservaciones", en: "Reservations" },
      { kind: "list", es: "Entradas y salidas", en: "Check-in / out" },
    ],
    live: {
      href: "https://casa-roca.mx",
      es: "Sitio en producción",
      en: "Live website",
    },
  },
  {
    slug: "aohys",
    name: "Sitio AOHYS",
    nameEn: "AOHYS website",
    tint: "#FDDDAA",
    texture: "assets/lens-aohys.jpg",
    size: [1600, 845],
    focus: { x: 0.5, y: 0.47, zoom: 0.84 },
    alt: {
      es: "Versión publicada actual del sitio AOHYS, antes de este rediseño.",
      en: "The currently published AOHYS website, before this redesign.",
    },
    status: { es: "Sitio público", en: "Public website" },
    purpose: {
      es: "Este sitio: publicación bilingüe con un CMS propio.",
      en: "This website: bilingual publishing with a custom CMS.",
    },
    brand: null,
    contribution: {
      es: "Construí el sitio con contenido bilingüe, un CMS propio y flujos para preparar casos, administrar medios y publicar. También resolví URLs canónicas, versiones por idioma, sitemaps y datos estructurados.",
      en: "I built the site with bilingual content, a custom CMS and workflows for preparing case studies, managing media and publishing. I also handled canonical URLs, language alternates, sitemaps and structured data.",
    },
    parts: [
      { kind: "split", es: "Bilingüe", en: "Bilingual" },
      { kind: "form", es: "CMS propio", en: "Custom CMS" },
      { kind: "list", es: "Publicación", en: "Publishing" },
    ],
    live: null,
  },
];

HZ.versions = {
  es: ["v1 · boceto", "v2 · prototipo", "entrega"],
  en: ["v1 · sketch", "v2 · prototype", "shipped"],
};

/* Case pages. The Barber Central is the fully authored case; the other
   products reuse the same template with their approved copy. */
HZ.cases = {
  "the-barber-central": {
    lede: {
      es: "The Barber Central conecta los dos lados de una cita: el cliente consulta servicios, precios y duración y reserva según la disponibilidad del personal; el negocio gestiona las citas y los clientes del día.",
      en: "The Barber Central brings the customer and business sides of an appointment together: customers browse services, prices and durations and book against staff availability; the business manages the day’s appointments and customers.",
    },
    purpose: {
      es: "Una cita depende de saber quién está disponible, qué necesita el cliente, qué servicio se dará y qué se ha pagado. Y el personal también atiende a quien llega sin reserva.",
      en: "An appointment depends on knowing who is available, what the customer needs, which service is being delivered and what has been paid. Staff also look after people who arrive without a booking.",
    },
    contribution: {
      es: [
        "Servicios, precios y duración que el cliente consulta antes de reservar.",
        "Horarios del personal, historial de clientes y las citas del día.",
        "Una fila para quienes llegan sin reserva.",
        "Reservas, cambios y cancelaciones por WhatsApp con la Cloud API de Meta, conectados con la cita correspondiente.",
        "Cobros con Mercado Pago, correo con Resend y suscripciones con Stripe para los negocios que usan la plataforma.",
      ],
      en: [
        "Services, prices and durations customers can browse before booking.",
        "Staff schedules, customer history and the day’s appointments.",
        "A queue for people who arrive without a booking.",
        "WhatsApp booking, rescheduling and cancellation through Meta’s Cloud API, connected to the right appointment.",
        "Mercado Pago checkout, Resend email and Stripe subscriptions for businesses using the platform.",
      ],
    },
    decisions: {
      es: [
        {
          t: "Todo conectado con la cita",
          b: "Los detalles del servicio, la disponibilidad del personal y la información del cliente viven junto a la cita, para que nadie tenga que reconstruir el contexto.",
        },
        {
          t: "Dos flujos de pago distintos",
          b: "El pago de una cita y la suscripción de un negocio son procesos diferentes. Cada uno se conecta con la reserva o la cuenta correcta, y cobros, suscripciones y notificaciones tienen responsabilidades separadas.",
        },
      ],
      en: [
        {
          t: "Everything connected to the appointment",
          b: "Service details, staff availability and customer information stay with the appointment, so nobody has to rebuild the context.",
        },
        {
          t: "Two different payment flows",
          b: "An appointment payment and a business subscription are different processes. Each connects to the right booking or account, and checkout, subscriptions and notifications keep separate responsibilities.",
        },
      ],
    },
    images: [
      {
        src: "assets/case-barber-ops.jpg",
        w: 1400,
        h: 788,
        es: "Resumen operativo del panel de administración de The Barber Central (entorno de desarrollo).",
        en: "Operations overview in The Barber Central admin dashboard (development environment).",
      },
      {
        src: "assets/case-barber-landing.jpg",
        w: 1440,
        h: 960,
        es: "Landing de desarrollo de The Barber Central.",
        en: "The Barber Central development landing.",
      },
    ],
    link: {
      href: "https://the-barber-central-landing.a-ortizcrr.workers.dev",
      es: "Abrir la landing de desarrollo",
      en: "Open the development landing",
    },
  },
  "nutri-plan": {
    lede: {
      es: "NutriPlan conecta el trabajo del nutriólogo durante la consulta con el seguimiento diario del paciente.",
      en: "NutriPlan connects the nutritionist’s work during a consultation with the patient’s day-to-day follow-through.",
    },
    purpose: {
      es: "Que el paciente tenga algo útil entre citas y el profesional tenga contexto para la siguiente visita.",
      en: "Give the patient something useful between appointments, and the professional context for the next visit.",
    },
    contribution: {
      es: [
        "Citas, información clínica y planes de alimentación personalizados.",
        "Comidas, porciones, alternativas y objetivos nutricionales.",
        "Portal del paciente con su plan y solicitudes de sustitución.",
        "Ejercicio programado, registro de actividad y fotos de progreso.",
        "Roles por organización, invitaciones a pacientes y acceso controlado, con backend en Convex.",
      ],
      en: [
        "Appointments, clinical information and personalized nutrition plans.",
        "Meals, portions, alternatives and nutritional targets.",
        "A patient portal with the plan and substitution requests.",
        "Scheduled exercise, activity logging and progress photos.",
        "Organization roles, patient invitations and controlled access, on a Convex backend.",
      ],
    },
    decisions: {
      es: [
        {
          t: "Un solo hilo por paciente",
          b: "Citas, planes, mediciones y seguimiento quedan conectados en el backend.",
        },
        {
          t: "Acceso por rol",
          b: "Los roles por organización y las invitaciones determinan quién ve cada información clínica. Uso NOM-004 y NOM-024 como referencias de diseño.",
        },
      ],
      en: [
        {
          t: "One thread per patient",
          b: "Appointments, plans, measurements and follow-up stay connected in the backend.",
        },
        {
          t: "Role-based access",
          b: "Organization roles and invitations decide who sees each piece of clinical information. I use NOM-004 and NOM-024 as design references.",
        },
      ],
    },
    images: [
      {
        src: "assets/lens-nutriplan.jpg",
        w: 1400,
        h: 1288,
        es: "Panel de NutriPlan con datos sanitizados.",
        en: "NutriPlan dashboard with sanitized data.",
      },
      {
        src: "assets/case-nutriplan-landing.jpg",
        w: 1400,
        h: 709,
        es: "Página pública de NutriPlan Digital.",
        en: "NutriPlan Digital public page.",
      },
    ],
    link: null,
  },
  eteria: {
    lede: {
      es: "ETERIA acompaña un evento desde la primera consulta hasta la planeación y el cierre.",
      en: "ETERIA follows an event from the first inquiry through planning and closeout.",
    },
    purpose: {
      es: "Mantener conectada la propuesta del cliente con la información de trabajo del equipo mientras el evento cambia.",
      en: "Keep the customer’s proposal and the team’s working information connected as the event changes.",
    },
    contribution: {
      es: [
        "Captura de prospectos.",
        "Preparación y envío de versiones de propuesta.",
        "Precios e inventario.",
        "El paso de esa información a la operación y el cierre del evento.",
        "Aplicación para iPhone en Swift y SwiftUI sobre el backend compartido en Convex.",
      ],
      en: [
        "Lead capture.",
        "Preparing and sharing proposal versions.",
        "Pricing and inventory.",
        "Carrying that information into event operations and closeout.",
        "A Swift/SwiftUI iPhone app on the shared Convex backend.",
      ],
    },
    decisions: {
      es: [
        {
          t: "Versiones con contexto",
          b: "Cada versión de propuesta conserva lo que se ha ofrecido conforme avanza la planeación.",
        },
        {
          t: "Dos audiencias",
          b: "Las propuestas públicas y la información operativa privada tienen límites de acceso distintos.",
        },
      ],
      en: [
        {
          t: "Versions with context",
          b: "Each proposal version keeps what has been offered as planning moves forward.",
        },
        {
          t: "Two audiences",
          b: "Public proposals and private operational information have different access boundaries.",
        },
      ],
    },
    images: [
      {
        src: "assets/lens-eteria.jpg",
        w: 1200,
        h: 630,
        es: "Fotografía de la landing pública de ETERIA. No hay captura pública de la interfaz de operación.",
        en: "Photograph from the ETERIA public landing. No public capture of the operations interface exists.",
      },
    ],
    link: {
      href: "https://momentos-eteria.com",
      es: "Abrir la landing en producción",
      en: "Open the live landing",
    },
  },
  "casa-roca": {
    lede: {
      es: "En Casa Roca trabajo tanto en el sitio público como en las herramientas para gestionar la operación del hospedaje.",
      en: "For Casa Roca, I work on both the public website and the tools used to manage hospitality operations.",
    },
    purpose: {
      es: "Conectar la información pública con las tareas de reservas que necesita realizar el personal.",
      en: "Connect public information with the reservation tasks staff need to do.",
    },
    contribution: {
      es: [
        "Gestión del contenido público.",
        "Creación de reservas.",
        "Registro de entradas y salidas.",
        "Validaciones para evitar reservas superpuestas.",
      ],
      en: [
        "Public content management.",
        "Creating reservations.",
        "Check-in and check-out.",
        "Checks that prevent overlapping bookings.",
      ],
    },
    decisions: {
      es: [
        {
          t: "Reglas en el backend",
          b: "Las reglas de reservas viven en el backend y la interfaz las refleja, incluyendo las validaciones de superposición.",
        },
        {
          t: "Un solo contenido",
          b: "Las actualizaciones del contenido público quedan conectadas con el sitio que administra el personal.",
        },
      ],
      en: [
        {
          t: "Rules in the backend",
          b: "Reservation rules live in the backend and the interface reflects them, including overlap checks.",
        },
        {
          t: "One source of content",
          b: "Public content updates stay connected to the site staff manage.",
        },
      ],
    },
    images: [
      {
        src: "assets/lens-casaroca.jpg",
        w: 1432,
        h: 960,
        es: "Galerías del sitio Casa Roca en producción.",
        en: "Galleries on the live Casa Roca website.",
      },
    ],
    link: {
      href: "https://casa-roca.mx",
      es: "Abrir el sitio en producción",
      en: "Open the live website",
    },
  },
  aohys: {
    lede: {
      es: "El sitio AOHYS es donde hago concreto mi trabajo: los productos, cómo los abordo y lo que resultó.",
      en: "The AOHYS website is where I make my work concrete: the products, how I approach them and the results.",
    },
    purpose: {
      es: "Mantener la presentación conectada con el trabajo que hay detrás, en dos idiomas.",
      en: "Keep the presentation connected to the work behind it, in two languages.",
    },
    contribution: {
      es: [
        "Contenido bilingüe y un CMS propio.",
        "Flujos para preparar casos, administrar medios y publicar.",
        "URLs canónicas, versiones por idioma, sitemaps y datos estructurados.",
      ],
      en: [
        "Bilingual content and a custom CMS.",
        "Workflows for preparing case studies, managing media and publishing.",
        "Canonical URLs, language alternates, sitemaps and structured data.",
      ],
    },
    decisions: {
      es: [
        {
          t: "Contenido en Convex, imágenes en Cloudflare",
          b: "Una interfaz pública apoyada en flujos de contenido en Convex, entrega de imágenes con Cloudflare y un proceso de desarrollo documentado.",
        },
      ],
      en: [
        {
          t: "Content in Convex, images on Cloudflare",
          b: "A public interface supported by Convex content workflows, Cloudflare image delivery and a documented development process.",
        },
      ],
    },
    images: [
      {
        src: "assets/lens-aohys.jpg",
        w: 1600,
        h: 845,
        es: "Versión publicada actual del sitio AOHYS.",
        en: "The currently published AOHYS website.",
      },
    ],
    link: {
      href: "https://aohys.com",
      es: "Abrir el sitio publicado",
      en: "Open the published site",
    },
  },
};

HZ.career = [
  {
    company: "Tala",
    title: "Senior Frontend Developer",
    period: { es: "2023 – presente", en: "2023 – present" },
    short: {
      es: "Herramientas de atención al cliente y cobranza",
      en: "Customer-support and collections tools",
    },
    bullets: {
      es: [
        "Desarrollo herramientas internas de atención al cliente y cobranza para una empresa de crédito, incluyendo flujos para pagos vencidos y clientes atendidos por socios.",
        "Construí el frontend y el flujo para solicitar correcciones de datos de préstamos, reemplazando hojas de cálculo por un proceso de solicitud, revisión y auditoría dentro de la aplicación.",
        "Construí el inicio de sesión y los controles por rol de un portal de socios, y una estructura común de componentes React y tema para las aplicaciones.",
      ],
      en: [
        "I build internal customer-support and collections tools for a lending business, including workflows for overdue repayments and partner-serviced borrowers.",
        "Built the frontend and flow for loan-data correction requests, replacing spreadsheet handoffs with an in-app request, review and audit process.",
        "Built login and role controls for a partner-facing portal, and a shared React component structure and theme across the applications.",
      ],
    },
  },
  {
    company: "Drift",
    title: "Senior Frontend Developer",
    period: { es: "2022 – 2023", en: "2022 – 2023" },
    short: {
      es: "Panel de actividad y extensión de Chrome",
      en: "Engagement dashboard and Chrome extension",
    },
    bullets: {
      es: [
        "Trabajé en un panel de actividad de sitios B2B: gráficas e interfaces para visitas, clics, prospectos e información de visitantes.",
        "Migré una extensión de Chrome para grabar videos de Manifest V2 a V3.",
      ],
      en: [
        "Worked on a B2B website engagement dashboard: charts and interfaces for visits, clicks, leads and visitor information.",
        "Migrated a Chrome video-recording extension from Manifest V2 to V3.",
      ],
    },
  },
  {
    company: "Prenuvo",
    title: "Software Engineer",
    period: { es: "2021 – 2022", en: "2021 – 2022" },
    short: {
      es: "Sitio de marketing y resultados para pacientes",
      en: "Marketing site and patient results",
    },
    bullets: {
      es: [
        "Construí el sitio de marketing y trabajé en el sitio de resultados para pacientes y sus APIs, para un servicio de resonancia magnética de cuerpo completo.",
        "Conecté interfaces en React con información de otros sistemas mediante Python y Flask.",
      ],
      en: [
        "Built the marketing website and worked on the patient-results website and its APIs for a whole-body MRI service.",
        "Connected React interfaces to information from other systems through Python and Flask.",
      ],
    },
  },
  {
    company: "Datazone / AutoZone",
    title: "Engineer Associate System IT-Development",
    period: { es: "2020 – 2021", en: "2020 – 2021" },
    short: {
      es: "Selector de vehículos, web y React Native",
      en: "Vehicle selector, web and React Native",
    },
    bullets: {
      es: [
        "Trabajé en el selector de vehículos que muestra piezas compatibles con el vehículo elegido, en web y en React Native.",
        "Ayudé a migrar la aplicación web de React a Next.js.",
      ],
      en: [
        "Worked on the vehicle selector that shows parts compatible with the chosen vehicle, on the web and in React Native.",
        "Helped migrate the web application from React to Next.js.",
      ],
    },
  },
  {
    company: "Accenture",
    title: "Application Development Senior Analyst",
    period: { es: "2018 – 2020", en: "2018 – 2020" },
    short: {
      es: "Sistema de respuesta rápida y reportes",
      en: "Rapid-response system and reporting",
    },
    bullets: {
      es: [
        "Conecté un teclado de despacho sin documentación a un sistema de respuesta rápida en React: identifiqué sus combinaciones de teclas y las asocié con acciones de Redux Saga.",
        "Construí partes de una aplicación de reportes con Node.js y React para un cliente de logística.",
      ],
      en: [
        "Connected an undocumented dispatch keyboard to a React rapid-response system, mapping its key combinations to Redux Saga actions.",
        "Built parts of a Node.js and React reporting application for a logistics client.",
      ],
    },
  },
  {
    company: "NEORIS / CEMEX",
    title: "Senior Software Engineer",
    period: { es: "2018", en: "2018" },
    short: {
      es: "Despacho y entrega de camiones de cemento",
      en: "Cement-truck dispatch and delivery",
    },
    bullets: {
      es: [
        "Trabajé en la interfaz de despacho y entrega para solicitar camiones de cemento, capturar direcciones y seguir su avance.",
      ],
      en: [
        "Worked on the dispatch and delivery interface for requesting cement trucks, entering addresses and following their progress.",
      ],
    },
  },
];

HZ.founder = {
  company: "AOHYS",
  title: "Founder",
  period: { es: "2015 – presente", en: "2015 – present" },
  short: {
    es: "Productos propios, del requisito a la entrega",
    en: "My own products, from requirements to delivery",
  },
  bullets: {
    es: [
      "Construyo productos alrededor de procesos operativos reales: frontend, backend, modelos de datos, permisos, pagos, notificaciones e integraciones.",
      "Uso agentes de programación como herramientas: defino el problema, la arquitectura y las restricciones, reviso el resultado y respondo por cómo encajan las piezas.",
    ],
    en: [
      "I build products around real operational work: frontend, backend, data models, permissions, payments, notifications and integrations.",
      "I use coding agents as tools: I define the problem, architecture and constraints, review the result and stay responsible for how the pieces fit together.",
    ],
  },
};
