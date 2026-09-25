"""Static supplements to the native Impeccable decision; no selection UI."""
from pathlib import Path
from html import escape

ROOT = Path(__file__).parent
COPY = {
    'firma': ('Firma en movimiento', 'Tu nombre, un gesto propio y el trabajo en primer plano.', [
        ('Entre proyectos', 'El nombre y tu perfil permanecen. La imagen y su descripción cambian con un fundido de 320 ms; el trazo oliva se revela sobre su textura original. Las flechas recorren los cinco productos, a tu ritmo.'),
        ('Del inicio al caso', 'La imagen crece hasta el ancho del caso en unos 480 ms. El trazo conserva su posición junto al borde y después acompaña discretamente la lectura. El contenido sigue el orden: contexto, contribución y decisiones.'),
        ('Arquitectura y CV', 'Al entrar, el trazo aparece una sola vez. El diagrama se lee por pasos; la trayectoria abre una experiencia a la vez. Los bloques de texto permanecen quietos mientras lees.')]),
    'corte': ('Corte editorial', 'Una composición precisa, con tu nombre como apertura y el proyecto a gran escala.', [
        ('Entre proyectos', 'Un corte horizontal descubre la siguiente imagen en 360 ms. El índice 01 / 05 cambia junto al título; tu presentación permanece estable. No hay avance automático.'),
        ('Del inicio al caso', 'El encuadre del proyecto se amplía y la columna de presentación deja espacio al contexto. La línea editorial continúa entre imagen, contribución y decisiones; la transición dura unos 420 ms.'),
        ('Arquitectura y CV', 'Las fechas y los títulos ordenan la lectura. Una experiencia se despliega con un movimiento breve de 180 ms. Las imágenes tienen protagonismo en los casos; el CV conserva una lectura directa.')]),
    'escena': ('Escena de producto', 'Cada producto ocupa una escena de color; tu perfil abre la página.', [
        ('Entre proyectos', 'La superficie del producto se desplaza lateralmente y el fondo cambia suavemente hacia su color en 450 ms. Un solo proyecto ocupa la escena; las flechas permiten recorrer los cinco.'),
        ('Del inicio al caso', 'La imagen pierde la perspectiva y se asienta como una superficie plana de lectura, en unos 500 ms. El campo de color se concentra en la cabecera. Después aparecen propósito, contribución y decisiones.'),
        ('Arquitectura y CV', 'El color identifica el capítulo, con el texto sobre blanco. Las experiencias se abren de forma breve y las decisiones se leen por pasos. La profundidad queda reservada a las imágenes del producto.')])
}
PAGES = ['Trabajo', 'Caso: NutriPlan', 'Cómo lo hago', 'Trayectoria']
DESCRIPTIONS = [
    'Catálogo de cinco productos: The Barber Central, NutriPlan, ETERIA, Casa Roca y AOHYS.',
    'NutriPlan: consulta clínica, planes de alimentación, portal del paciente, mediciones, ejercicio y acceso por organización y rol.',
    'Ejemplo de una reserva: mostrar disponibilidad, validar y confirmar. Defino las reglas y la arquitectura, divido el trabajo, integro y reviso. Los agentes ayudan a ejecutar; la responsabilidad es mía.',
    'Trayectoria: Tala desde 2023; Drift 2022–2023; Prenuvo 2021–2022; Datazone / AutoZone 2020–2021; Accenture 2018–2020; NEORIS / CEMEX 2018; AOHYS desde 2015.'
]
CONTENT = '''<details><summary>El contenido actualizado que sostiene las tres propuestas</summary>
<div class="readable"><h3>Cinco productos, con su alcance real</h3>
<p><strong>The Barber Central.</strong> Servicios, disponibilidad, reservas, horarios del equipo, historial y fila de atención sin cita. WhatsApp para reservar, reprogramar y cancelar. Mercado Pago para cobros y Stripe para la suscripción del negocio.</p>
<p><strong>NutriPlan.</strong> Información clínica y planes de alimentación con comidas, porciones, alternativas y objetivos. Mediciones, progreso, portal del paciente, ejercicio, fotografías de seguimiento y coordinación del equipo, con acceso por organización y rol.</p>
<p><strong>ETERIA.</strong> Del primer contacto a la operación y cierre del evento: propuestas versionadas, precios, inventario y coordinación. La aplicación actual para iPhone usa Swift y SwiftUI.</p>
<p><strong>Casa Roca.</strong> Sitio de hospitalidad, gestión de contenido y operación de reservaciones, entradas y salidas. Las reglas del backend verifican los conflictos entre reservas.</p>
<p><strong>AOHYS.</strong> El sitio también es un caso: publicación bilingüe, CMS propio, casos, medios y actualizaciones. La arquitectura muestra cómo se publica y distribuye ese contenido.</p>
<h3>La trayectoria explica tu contribución</h3>
<p><strong>Tala · 2023–presente.</strong> Senior Frontend Developer. Flujos para soporte y cobranza, corrección de préstamos antes manejada en hojas de cálculo, acceso por roles y componentes compartidos. Trabajo colaborativo en la migración de React a Next.js.</p>
<p><strong>Drift · 2022–2023.</strong> Senior Frontend Developer. Interfaces y gráficas para entender visitas, clics y leads; migración de la extensión de video para Chrome de Manifest V2 a V3.</p>
<p><strong>Prenuvo · 2021–2022.</strong> Software Engineer. Sitio de marketing y acceso del paciente a resultados preparados por el equipo clínico, con React y APIs en Python/Flask.</p>
<p><strong>Datazone / AutoZone · 2020–2021.</strong> Engineer Associate System IT-Development. Selector de vehículo para encontrar piezas compatibles, adaptación a React Native y colaboración en React a Next.js.</p>
<p><strong>Accenture · 2018–2020.</strong> Application Development Senior Analyst. Controles en React para un sistema de despacho y reportes de logística descargables en Excel.</p>
<p><strong>NEORIS / CEMEX · 2018.</strong> Senior Software Engineer. Interfaces de despacho y entrega de camiones: tablas, destinos y correcciones de funcionamiento.</p>
<p><strong>AOHYS · 2015–presente.</strong> Founder. Entender al usuario y convertir su trabajo en interfaces, modelos de datos y reglas de backend; integrar permisos, pagos, notificaciones y reservas según el producto.</p>
<h3>La arquitectura se explica desde decisiones</h3>
<p>El esquema de las láminas introduce una decisión, no pretende ser el mapa técnico completo: el backend debe comprobar disponibilidad y conflictos al confirmar una reserva. Otros casos explican acceso por rol, coordinación entre personas y publicación de contenido.</p>
<p>Tu método aparece dentro de los casos: definir el problema y la lógica, escribir reglas, dividir tareas revisables, integrar y verificar. Los agentes apoyan la ejecución; tú conservas la responsabilidad del resultado.</p>
<h3>Después del perfil, dos vías claras</h3>
<p>La conversación final ofrece incorporarte a un equipo como ingeniero o trabajar en un producto. Se presenta después de conocer tu trabajo, sin llenar el inicio de servicios.</p></div></details>'''

for direction, (title, intro, motions) in COPY.items():
    sheets = ''.join(f'''<figure><figcaption>{escape(page)}</figcaption><div class="sheet" style="--i:{i}"><img src="/assets/{direction}-interiores.png" alt="{escape(DESCRIPTIONS[i])}" width="1536" height="1024" loading="lazy"></div></figure>''' for i,page in enumerate(PAGES))
    motion = ''.join(f'<li><h3>{escape(label)}</h3><p>{escape(text)}</p></li>' for label,text in motions)
    html = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>{title} · Recorrido visual AOHYS</title><link rel="stylesheet" href="/review.css"></head>
<body><header><a href="/">← Comparar en Impeccable</a><span>AOHYS · Propuesta visual</span></header><main>
<div class="intro"><p class="eyebrow">Recorrido de la propuesta</p><h1>{title}</h1><p>{intro}</p><p class="notice">Son láminas de diseño. Las animaciones se describen más abajo; los botones dibujados dentro de las imágenes no son controles activos.</p></div>
<figure class="home"><a href="/assets/{direction}-inicio.png" aria-label="Abrir inicio a tamaño completo"><img src="/assets/{direction}-inicio.png" alt="Inicio de {title}: Alejandro Ortiz Corro, ingeniero de software full-stack, presentación personal y The Barber Central como proyecto destacado." width="1536" height="1024"></a><figcaption>Inicio en escritorio · toca la imagen para ampliarla</figcaption></figure>
<section aria-labelledby="interiors"><h2 id="interiors">La dirección en las otras páginas</h2><p class="hint">En el teléfono, desliza las láminas hacia los lados. Cada una representa una página distinta.</p><div class="sheets" tabindex="0" role="region" aria-label="Cuatro páginas interiores">{sheets}</div><a class="fullboard" href="/assets/{direction}-interiores.png">Abrir la lámina completa ↗</a></section>
<section class="readable" aria-labelledby="motion"><h2 id="motion">Así se movería</h2><p>Propuesta de movimiento; todavía no es una animación implementada.</p><ol>{motion}</ol><p class="notice">El desplazamiento lo controla la persona. Con movimiento reducido, las transiciones se sustituyen por cambios directos o fundidos breves.</p></section>
<section>{CONTENT}</section><footer><a href="/">Volver a la comparación de Impeccable →</a><p>Láminas basadas en tu perfil aprobado el 18 de septiembre. Las imágenes de producto son representaciones de diseño; los textos comerciales que contienen no son una validación de precios o promociones actuales.</p></footer>
</main></body></html>'''
    (ROOT/(direction+'.html')).write_text(html)
