// Design mock only. Public copy distilled from the content graph and the
// candidate's corrected experience (2026-09-18). No production/adoption claims.
window.MOCK = {
  name: "Alejandro Ortiz Corro",
  role: "Ingeniero de software full-stack.",
  intro:
    "Desarrollo productos desde los requisitos hasta su entrega, con una base especialmente fuerte en frontend.",
  email: "alejandro.ortiz@aohys.com",
  projects: [
    {
      id: "barber",
      title: "The Barber Central",
      subtitle: "Producto para negocios de belleza",
      image: "barber.png",
      alt: "Landing de Central Belleza con agenda, reservas y WhatsApp",
      color: "#FEC868",
      summary: "La agenda es sólo el principio.",
      context:
        "Detrás de cada cita hay disponibilidad, clientes, pagos y comunicación. El producto reúne esas tareas alrededor del día de trabajo de un salón o una barbería.",
      contribution:
        "Trabajo en la arquitectura del producto, los flujos de reserva y la implementación full-stack. Conecto la experiencia pública con la operación del negocio.",
      decision:
        "La disponibilidad debe tener el mismo significado al reservar y al organizar al equipo. Ese criterio conecta la interfaz con las reglas del backend.",
      details: [
        "Reservas y disponibilidad del equipo",
        "Suscripciones y pagos",
        "Conversaciones de reserva por WhatsApp",
      ],
      next: "nutri",
    },
    {
      id: "nutri",
      title: "NutriPlan",
      subtitle: "Producto para equipos de nutrición",
      image: "nutri.png",
      alt: "Landing pública de NutriPlan",
      color: "#ABC270",
      summary: "Una consulta tiene continuidad.",
      context:
        "La agenda, los pacientes y el trabajo del equipo necesitan compartir información sin perder los límites de acceso de cada persona.",
      contribution:
        "Trabajo en los flujos profesionales, los dashboards y el modelo de estado compartido. Coordino frontend, backend y las superficies móviles del producto.",
      decision:
        "Los permisos pertenecen a la organización y al rol. Se comprueban en el backend; ocultar una opción en pantalla no es suficiente.",
      details: [
        "Agenda y flujos profesionales",
        "Roles por organización",
        "Estado compartido entre superficies",
      ],
      next: "eteria",
    },
    {
      id: "eteria",
      title: "ETERIA",
      subtitle: "De la primera idea al evento",
      image: "eteria.jpg",
      alt: "Montaje de mesa para un evento ETERIA",
      color: "#FDA769",
      summary: "La experiencia empieza antes del evento.",
      context:
        "Un negocio de eventos necesita pasar del primer contacto a una propuesta y, después, a la coordinación de su trabajo.",
      contribution:
        "Dirijo el producto e implemento la landing, la captación de contactos, las propuestas y la operación privada, con backend compartido y un cliente interno SwiftUI.",
      decision:
        "Las propuestas se pueden compartir; la operación conserva sus límites de acceso. Cada superficie muestra lo que necesita su audiencia.",
      details: [
        "Landing y contacto",
        "Propuestas compartibles",
        "Operación web y cliente SwiftUI",
      ],
      next: "casa",
    },
    {
      id: "casa",
      title: "Casa Roca",
      subtitle: "Una estancia en Roca Partida",
      image: "casa.jpg",
      alt: "Fotografía pública de Casa Roca en Veracruz",
      color: "#FEC868",
      summary: "Conocer el lugar antes de llegar.",
      context:
        "El sitio ayuda a entender la estancia, decidir si encaja con el viaje y contactar directamente al negocio.",
      contribution:
        "Trabajo en la dirección del producto, la experiencia bilingüe, el contenido, los metadatos de búsqueda y la entrega de la experiencia pública.",
      decision:
        "Las fotografías y el contenido de cada idioma necesitan cargar bien y orientar al contacto. El rendimiento también forma parte de la hospitalidad.",
      details: [
        "Experiencia bilingüe",
        "Imágenes y contenido del lugar",
        "Contacto directo",
      ],
      next: "enterprise",
    },
    {
      id: "enterprise",
      title: "Sistemas enterprise",
      subtitle: "Contribuciones dentro de equipos",
      image: "enterprise.svg",
      alt: "Diagrama público conceptual de responsabilidades de software empresarial",
      color: "#ABC270",
      summary: "Entender el trabajo antes de cambiar la pantalla.",
      context:
        "He trabajado en herramientas de atención a clientes, portales para socios y sistemas de despacho. Son productos donde importa entender el flujo que ya utiliza la gente.",
      contribution:
        "En Tala desarrollé el frontend y el flujo de solicitudes de corrección de datos de préstamos. En Accenture integré un teclado especializado con las acciones y pantallas de una aplicación de despacho.",
      decision:
        "La contribución cambia según el equipo: integrar una interacción, compartir componentes o ajustar una API. La experiencia completa siempre da contexto a esa pieza.",
      details: [
        "Frontend y flujos de trabajo",
        "Componentes compartidos",
        "Integración con sistemas existentes",
      ],
      next: "aohys",
    },
    {
      id: "aohys",
      title: "AOHYS",
      subtitle: "Mi sitio y mi práctica de ingeniería",
      image: "aohys.svg",
      alt: "Mapa público de la arquitectura de AOHYS",
      color: "#FDA769",
      summary: "El sitio también es un producto.",
      context:
        "El portfolio conecta páginas públicas, contenido bilingüe y un espacio privado para editar y publicar.",
      contribution:
        "Defino el producto, la arquitectura y los límites del trabajo. Uso agentes para tareas acotadas y reviso las decisiones, el código y el comportamiento antes de publicar.",
      decision:
        "Un grafo de contenido conecta rutas, idiomas y metadatos. El sitio público, el editor privado y la publicación tienen responsabilidades distintas.",
      details: [
        "Sitio público en Astro",
        "Editor privado en React",
        "Contenido y publicación con Convex",
      ],
      next: "barber",
    },
  ],
  experience: [
    {
      company: "Tala",
      role: "Senior Frontend Developer",
      dates: "2023 — presente",
      text: "Desarrollé el frontend y el flujo de solicitudes de corrección de datos de préstamos: solicitud, revisión e historial dentro de la aplicación. También trabajo en componentes compartidos y en acceso e integración de información para un portal de socios.",
    },
    {
      company: "Drift",
      role: "Senior Frontend Developer",
      dates: "2022 — 2023",
      text: "Trabajé en gráficas e información de clientes y visitantes para un dashboard B2B. Una parte importante de mi trabajo fue migrar la extensión de grabación de videos de Manifest V2 a Manifest V3.",
    },
    {
      company: "Prenuvo",
      role: "Software Engineer",
      dates: "2021 — 2022",
      text: "Construí el sitio de marketing y trabajé en interfaces React para consultar resultados, además de APIs en Python y Flask que entregaban información al frontend.",
    },
    {
      company: "Datazone / AutoZone",
      role: "Engineer Associate System IT-Development",
      dates: "2020 — 2021",
      text: "Trabajé en el selector de vehículo del e-commerce y llevé esa funcionalidad a React Native. También colaboré en la migración de la aplicación web de React a Next.js.",
    },
    {
      company: "Accenture",
      role: "Application Development Senior Analyst",
      dates: "2018 — 2020",
      text: "Integré un teclado especializado con los flujos de una aplicación de despacho en React y Redux-Saga. En otro proyecto desarrollé funciones de Node.js y React para solicitar datos y descargar reportes en Excel.",
    },
    {
      company: "NEORIS / CEMEX",
      role: "Senior Software Engineer",
      dates: "2018",
      text: "Contribuí a la interfaz para solicitar entregas de cemento: tablas de camiones despachados, captura de direcciones y correcciones a lo largo del flujo.",
    },
    {
      company: "AOHYS",
      role: "Founder",
      dates: "2015 — presente",
      text: "Desarrollo productos completos: requisitos, interfaces, backend, integraciones y entrega. Defino la arquitectura, divido el trabajo en tareas acotadas e integro y reviso el resultado.",
    },
  ],
  architecture: [
    {
      title: "Sitio público",
      tech: "Astro",
      text: "Páginas rápidas para presentar proyectos, trayectoria y criterio. Rutas y metadatos coherentes en cada idioma.",
    },
    {
      title: "Edición privada",
      tech: "React",
      text: "Un espacio autenticado para gestionar el contenido. Las acciones administrativas requieren autorización.",
    },
    {
      title: "Contenido y publicación",
      tech: "Convex",
      text: "Borradores, contenido y publicación detrás de límites de acceso. El grafo relaciona páginas, idiomas y evidencia.",
    },
  ],
};
