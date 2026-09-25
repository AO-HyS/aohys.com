# AOHYS landing — sesión de diseño, septiembre 2026

Estado: `direction-selected` el 23 de septiembre: **Horizonte pastel** (ronda 6)
para el inicio; lenguaje **Ma** para páginas interiores. Prototipo con movimiento
en `docs/design/prototypes/horizonte/`; migrado a `apps/site` el 24 de
septiembre con la ronda 7 aplicada (ver «Migración al sitio»).
Contrato de dirección en `apps/site/.impeccable/surfaces/apps-site-src-pages-index-astro.md`.

Selección literal: «Horizonte pastel y Ma y Activos son los que más me han
gustado, sobre todo Horizonte pastel. Creo que habría que pulirlo mucho más.
Creo que tendría que tener movimiento y que podríamos cambiar el proyecto y
tener una animación padre que cambie el círculo cuando se cambia el proyecto.
El copy también sería mejor, pero el camino está perfecto. También habría que
ver, en esa lógica, cómo movemos el resto de las páginas. […] El resto de las
páginas podrían llevar lo que Ma tiene o una combinación de eso, pero está muy
padre. Necesita movimiento, necesita vida.» Aprobación de dirección y
composición; copy, logo y movimiento siguen abiertos.

### Prototipo Horizonte — verificación del 23 de septiembre

Inicio (lente WebGL2 con cambio de proyecto en cuatro fases), caso y trayectoria
en lenguaje Ma. Servido en `http://127.0.0.1:8130/`; detalles en el README del
prototipo. Revisión en navegador headless aislado, 1440×900, 1100×760 y 390×844:

- Teclado: flechas, Home y End mueven foco y selección con tabindex rotativo; el
  cambio se anuncia. Tres pulsaciones rápidas terminan en el último destino.
- Movimiento reducido: lente CSS, sin cuadros de animación, cambio inmediato.
- Corregido en una tanda: disco miel accidental en el ciclo «Cómo trabajo» (miel
  pleno queda sólo para el CTA); etiquetas del ciclo ilegibles en móvil; 20 px de
  desbordamiento horizontal en móvil; etiquetas de órbita encima de la lente y de
  las tarjetas; la línea Ma tachaba títulos y párrafos (ahora baja por el margen y
  cruza sólo en el espacio vacío entre bloques); se quitaron las etiquetas pequeñas
  sobre los títulos de caso y trayectoria, que repetían el título.
- `impeccable detect`: sólo avisos intencionales (recorte del hero y de la raíz,
  y tracking amplio en la línea de rol y los estados, como en el comp).
- Abierto: ETERIA sin captura de su interfaz de operación; logo provisional;
  tipografías desde Google Fonts sólo en el prototipo; sin revisión independiente.

### Reacción al prototipo — ronda 7 (23 de septiembre)

Literal (dictado): «Me encantó. Primera cosa que cambiaría es que creo que el
círculo debería ser más grande. Está muy padre, pero siento que el círculo
debería ser más grande y creo que se pierde el texto dentro del círculo. La
animación, los cambios está increíble. Este, mi nombre debería estar en resumen
o sea en grande en resumen aquí recuerda que es AOHS y abajo puedes poner mi
nombre y full stack development y todo lo que quieras este me gusta cómo se
presentan los proyectos no soy fan para nada me gusta cómo se ve pero no soy fan
para nada de file fast learn build again O sea, está bien, pero no es lo ideal
para para tanto. Ahora career resume es lo mismo. Este contacto no lo cambiaste.
Había uno de arquitectura que hablaba acerca de la página y del sistema de
dashboard que controla la página, este cómo se diseñó y todo eso. es mi
development estoy hablando de cómo desarrollo en mi development system y cómo
hago funcionalidades y cosas así entonces eso no me gustaría perderlo ahora
cuando entro a case by case o sea está bien fíjate que en chiquito me gusta más
pero en pantalla muy grande se pierde esta lógica que no se entiende que todavía
hay que que que todavía hay más cosas. No soy tan fan de este de de font y
tampoco soy tan fan este del logo que hiciste. Ahora estoy viendo que yo lo
estaba viendo en mi navegador y en mi navegador se ve distinto al navegador de
prueba que tiene Factory, este hay que tomar eso en cuenta, pero va en un muy
buen camino, va en muy muy buen camino esto.»

Interpretación (pendiente de confirmar donde se indica):

- Conservar: dirección, animación de cambio de proyecto y presentación de proyectos.
- `hero.lens-size`: la lente debe ser más grande; el contenido dentro se pierde.
- `hero.title`: el título grande es AOHYS; debajo, nombre, «full stack
  development» y descripción. (Dictado «AOHS» = AOHYS.)
- `section.how-i-work`: el ciclo «fallar rápido…» no convence; está bien pero no
  merece tanto peso. Reemplazo por decidir.
- `nav.career-resume`: Trayectoria y CV son lo mismo; unificar.
- `page.contact`: falta rediseñar Contacto en el nuevo lenguaje.
- `page.architecture`: conservar la página de arquitectura (el sitio y el
  dashboard que lo controla, cómo se diseñó) y extenderla a cómo desarrolla con
  su Development System y cómo construye funcionalidades.
- `case.large-screen`: en pantalla pequeña el caso le gusta más; en pantalla
  grande no se entiende que hay más contenido abajo.
- `type.family`: no le convence la tipografía (Spectral + Jost). Rechazada.
- `identity.logo`: no le convence el logo provisional. Rechazado.
- `qa.browser`: su navegador muestra el prototipo distinto que el navegador de
  prueba; la verificación debe cubrir su navegador.

### Migración al sitio — 24 de septiembre

Horizonte (inicio) y Ma (interiores) migrados a `apps/site` en la rama
`claude/landing-horizonte`, con la ronda 7 aplicada:

- `hero.lens-size`: lente `clamp(280px, min(56svh, 44vw), 620px)` (antes
  ~380 px) y refracción central más plana (`k` 0.42 → 0.30) para que el texto
  dentro del círculo se lea.
- `hero.title`: «AOHYS» grande; debajo nombre y «full stack development». El
  deck del Content Graph pasa a una banda propia bajo el hero.
- `section.how-i-work`: el ciclo «fallar rápido…» se retiró. Lo reemplaza
  «Cómo construyo» (etapas `architectureStages` del Content Graph) con enlaces
  a Arquitectura (Development System) y al caso de trabajo con agentes.
- `nav.career-resume`: Trayectoria y CV unificados en la página de CV
  (línea de tiempo Ma + descarga PDF).
- `page.contact` y `page.architecture`: rediseñadas en Ma; arquitectura se
  conserva completa y enlaza al Development System.
- `case.large-screen`: el hero del caso ya no ocupa toda la pantalla, deja ver
  el siguiente bloque y añade «Sigue el recorrido».
- `type.family`: Spectral + Jost retiradas. Provisional: Mona Sans variable con
  eje de anchura (ya self-hosted); títulos ligeros y anchos. Pendiente de
  confirmación del usuario.
- `identity.logo`: logo provisional retirado. Provisional: wordmark tipográfico
  «AOHYS» en Mona Sans ancha. Pendiente de confirmación.
- Contenido aprobado (casos, CV) sin cambios; sólo copy de UI nuevo en
  `apps/site/src/i18n/*.json` (`horizonte`). Sitio AOHYS en la lente enlaza a
  Arquitectura; su textura sigue siendo la captura del sitio anterior.
- Verificación: `astro check` 0 errores, `astro build` 27 páginas,
  `impeccable detect` sin hallazgos; capturas con agent-browser (Chromium) a
  1440×900 y 390×844 sin desbordamiento horizontal; WebGL2 activo; cambio de
  proyecto verificado. Pendiente: revisión en el navegador del usuario y tests
  acoplados al diseño Sunlit anterior.

Historia: ronda 5 abierta el 23 de septiembre (ver abajo).
Sesión iniciada el 16 de septiembre de 2026.
La corrección del 17 de septiembre reemplaza la selección anterior: ninguna
dirección visual está aprobada. Se conserva la reacción positiva a la transición.
`DESIGN.md` describe la implementación anterior; este documento gobierna el
diseño propuesto para reemplazarla. Las rondas anteriores son historia supersedida.

## Ronda 5 — 23 de septiembre, reapertura por «genérica y aburrida»

Literal: «La página de landing de aohys se ve muy genérica. Ya no me gusta cómo
se ve: es aburrida. Quiero cambiar cómo se ve y cómo se demuestra.» Grill mixto
(visual + demostración del trabajo). Las propuestas r4 siguen sin elección; las
tres comparten el esqueleto nombre grande + captura grande (observación del
agente, pendiente de confirmar en `r4.reaction`).

Verificación de contenido tras el merge de PR #185 (`78f2be2`), contra el bundle
`opportunity-os/convex/candidateProfile.generated.json` (hash coincide con
`df43b3ff…`). Correcto: CV web y PDF con los siete empleos (Tala, AOHYS, Drift,
Prenuvo, Datazone/AutoZone, Accenture, NEORIS/CEMEX), fechas y cargos canónicos;
propósitos de los cuatro productos; paridad EN/ES; sin frase rechazada ni
Opportunity OS. Pendiente: la selección pública sigue siendo la de seis casos
(`enterprise-systems` y `engineering-practice` publicados, en sitemap, seed y
tests; no existe caso del sitio AOHYS); copy «Seis ejemplos»; la trayectoria no
existe fuera del CV; arquitectura y práctica sin sincronizar; bloque de código
ficticio en el menú. Conflicto de fuentes: la narrativa exige «full stack
development»; el brief pide Senior Software Engineer + fortaleza frontend +
requisitos a entrega (`voice.hero-tagline`).

Cuestionario: `aohys-landing-design-r5-20260923`, entrada
`/Users/corrortiz/.development-system/private/design/aohys-landing-2026-09-16/round-5.json`,
respuestas en
`/Users/corrortiz/.development-system/private/questionnaires/aohys-landing-design-r5-20260923/responses.json`.
Claves: `r4.reaction`, `boredom.cause`, `proof.mode`, `first-impression`,
`identity.portrait`, `voice.hero-tagline`, `expression.level`, `references.new`.

### Respuestas literales de la ronda 5

Recibo `20260923T180107-7d34e0cf8b7c`, revisión 1.

| Clave                | Elección | Nota literal                                                                                                                                                             | Estado                                                                                   |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `r4.reaction`        | A        | «La única que me parece padre, más o menos, es la escena de producto, pero no tampoco.»                                                                                  | Confirmada: r4 rechazada como patrón; Escena no queda seleccionada                       |
| `boredom.cause`      | —        | «Todo, A, B, C, D, todo se siente así y, aparte, siento que no hay geometría.»                                                                                           | Confirmada: estructura, estatismo, personalidad y copy; falta geometría                  |
| `proof.mode`         | D        | «No me agrada tener video en las páginas. Prefiero movimiento mira este - https://substack.com/inbox/post/213056760 Blog post y tomarlo en consideración»                | Confirmada: mezcla; sin video; movimiento construido, según el artículo de Anshu Chimala |
| `first-impression`   | —        | «No tengo idea. Yo creo que va a depender del camino visual que tomemos. Prefiero no tener fotos mías. Prefiero que no sea personal. Creo que se enfoque en mis logros.» | Abierta a la dirección; confirmado: no personal, enfoque en logros                       |
| `identity.portrait`  | C        | —                                                                                                                                                                        | Confirmada: sin fotos; ilustración o dirección de arte                                   |
| `voice.hero-tagline` | C        | —                                                                                                                                                                        | Confirmada: «full stack development» como rol + frase del brief como descripción         |
| `expression.level`   | B        | «Claramente distinto, pero no me quejo si hay 3D, WebGL o scroll. No me quejo, o sea, estoy abierto a varias opciones.»                                                  | Confirmada: B, con 3D/WebGL/scroll permitidos                                            |
| `references.new`     | —        | «No, no quiero que sea algo que venga de mi trabajo, de mi forma de hacer, de que me guste a mí.»                                                                        | Aclarada abajo                                                                           |

Aclaraciones en chat, mismo día:

- `references.new`: «No tengo links: quiero que el diseño salga de mi trabajo
  y de mi forma de hacer las cosas». Los candidatos se derivan de los cinco
  productos y del método de trabajo, no de sitios externos.
- `boredom.cause` (geometría): «En sí, lo que quería decir no es Geometria, es
  que no había simetría. Todo se siente mal acomodado, todo se siente
  desproporcionado.» Requisito: proporción, equilibrio y alineación rigurosos;
  «geometría» no implica formas geométricas decorativas.
- `conversion.priority` (actualización): «Nombre y rol claros, pero lo
  protagonista son los logros y productos». Perfil primero significa
  identificación clara, no protagonismo personal.

### Candidatos r5, derivados antes del re-roll 4 de `90569fd1`

Mecanismo: Alejandro convierte cómo opera un negocio (reservas, consulta,
eventos, estancias, publicación) en software completo, desde el requisito
hasta la entrega. Escena: un evaluador revisa en minutos qué construyó y qué
logró. Patrones excluidos: nombre grande + captura (r3/r4, rechazado) y su
opuesto, revista beige. Todas las direcciones previas mostradas quedan fuera.
Restricciones comunes: paleta fija; nombre y rol claros pero logros y productos
protagonistas; sin fotos ni video; movimiento construido en código; simetría,
proporción y alineación rigurosas; «full stack development» como rol + frase
del brief; cinco productos y trayectoria de siete empleos; WebGL/3D/scroll
permitidos sin sacrificar lectura profesional.

1. **Espejo requisito / producto.** Eje central simétrico: a un lado la
   necesidad del negocio escrita como requisito, al otro la interfaz construida;
   el eje es la contribución de Alejandro. El movimiento pliega el requisito en
   la interfaz. Familia: documentación de proceso. Riesgo: que parezca
   diagrama; la interfaz debe dominar en escala.
2. **Demostración viva centrada.** Un escenario central con una interacción
   real reconstruida en HTML (reservar una cita, ver un plan), guionizada y
   controlable; logros flanquean el escenario en simetría. Familia: interfaz.
   Riesgo: costo de construir cinco demos; empezar con una o dos.
3. **Plano ortográfico.** Cada producto dibujado como juego de vistas:
   alzado (interfaz), sección (flujo y datos), planta (roles). Lámina simétrica
   con cajetín de logros. Familia: dibujo técnico. Riesgo: frialdad o cliché de
   plano azul; tinta marrón y miel, no azul.
4. **Espécimen de sistema.** La página como espécimen de un sistema de diseño:
   componentes reales de cada producto en módulos proporcionales, con estados.
   Familia: programa de identidad. Riesgo: parecer biblioteca de componentes.
5. **Serie de carteles axiales.** Tipografía internacional con simetría axial;
   cada producto es un cartel de una serie y el logro es el titular. Familia:
   gráfica impresa. Riesgo: prometer métricas; los logros son cualitativos.
6. **Maqueta a escala.** Modelo isométrico simétrico en WebGL con cinco
   módulos; girar la maqueta enfoca cada producto y abre su evidencia.
   Familia: espacio 3D. Riesgo: rendimiento y lectura infantil.
7. **Geometría de flujo.** Patrón generativo caleidoscópico calculado a partir
   de los flujos reales de cada producto; cambia al cambiar de proyecto.
   Familia: arte generativo con datos. Riesgo: abstracción sin significado; el
   flujo debe poder leerse en texto.

Seed `90569fd1`, re-roll 4, índice asignado 4: **Espécimen de sistema**.
Pick: **Espejo requisito / producto**. Challenger competitivo: gabinete en
perspectiva invertida (chaekgeori). Rechazados con aportación: cuarto oscuro
(revelación continua), HyperCard (proporción fija y enlace propio), quiz juvenil
(cierre que se gana), mar bioluminiscente (huella del recorrido), forja (cambio
de estado decisivo). Página de decisión `http://127.0.0.1:51977/`, clave
`e7143970`; payload y comps en `.impeccable/mocks/decision/aohys-20260923-r5/`,
todas `approved: false`. Se corrigieron por edición cifras inventadas en el
gabinete y tecnologías inventadas en el control convencional. Los datos dentro
de los componentes (precios, nombres, fechas) son sintéticos. Sin elección.

Corrección literal tras cerrar la página (vía pregunta en chat): «Ninguna me
gusta. ¿Qué herramienta estás utilizando para generar las imágenes? Porque está
horrible. […] ¿Por qué no corres a Codex y le pides que te genere las imágenes?
[…] Realmente, algo que tampoco me gusta es el logo: está aburridísimo, y todo
está aburridísimo. No sé si tiene que ver con las imágenes que se están
generando o con el modelo que está generándolas, pero para esto pidele a Codex
que te las genere. Dame las instrucciones específicas […]. Generame nuevas.»
Las cuatro comps r5 quedan rechazadas; se hicieron con la herramienta de imagen
de Factory, no con la generación nativa de Codex usada en r1–r4. Siguiente paso:
paquete de instrucciones para Codex (`image_generation`), con capturas reales
como referencia y el logo tratado como pieza diseñada dentro de cada comp.

Ronda 5b: `.impeccable/mocks/decision/aohys-20260923-r5b/`. Instrucciones en
`codex-brief.md` y `codex-correction.md`; registros `codex-run.log` y
`codex-correction.log`. Codex CLI 0.156.1, `image_generation`, referencias:
capturas reales de Central Belleza, operación Barber Central, NutriPlan
(landing y dashboard), Casa Roca y ETERIA. Resultado vigente: `logo-study.png`
(fondo transparente; vista en `logo-study-white.png`), `especimen-v2.png`,
`espejo-v2.png`, `gabinete-v2.png`, todas `approved: false`. Defectos conocidos
sin corregir: logo aohys insertado dentro de la captura de Central Belleza en
Espejo; el gabinete no logra perspectiva invertida real. Página de decisión
`http://127.0.0.1:56909/`, clave `fb3eef65`. Sin elección.

Corrección literal sobre 5b: «No me gustó nada, ninguna de las tres propuestas.
Se ven genéricas y aburridas y no tienen nada que ver conmigo.» Las tres quedan
rechazadas junto con el logo presentado. Fallo compartido de r3–r5b: todas
reducen la página a nombre + capturas/objetos de producto en una composición;
cambia el acomodo, no la identidad. Ninguna ronda ha calibrado el gusto del
usuario con referencias visuales amplias fuera de sus propios productos.
Segundo rechazo consecutivo: antes de otra mano, preguntar qué falta.

Respuesta (chat, `identity.missing`): falta «My way of thinking and working: how
I solve problems, my judgment» y «My energy: how I talk and behave, which the
pages don't convey». Método elegido (`method.next`): «See 12–16 very different
visual worlds (not portfolios) and say quickly which ones I like and which I
don't». Objeto propio (`identity.object`): «I don't know; I'd rather react to
examples». Siguiente paso: tablero de calibración de gusto con mundos visuales
diversos (no portfolios), sin comps ni dirección nueva hasta leer sus reacciones.

Ronda 6 de calibración: `aohys-landing-calibration-r6-20260923`, 16 mundos del
catálogo de Impeccable (imágenes descargadas en
`/Users/corrortiz/.development-system/private/design/aohys-landing-2026-09-16/calibration/`)
más dos preguntas abiertas: `energy-match` y `thinking-match`. Entrada
`round-6-calibration.json`; respuestas en
`/Users/corrortiz/.development-system/private/questionnaires/aohys-landing-calibration-r6-20260923/responses.json`.
Las imágenes son referencias de energía y organización, no direcciones.

### Respuestas de calibración r6

Recibo `20260923T190708-b273903b8bb5`, revisión 1.

- Me gusta: prospecto cívico (limpio, blanco, objeto 3D suave), horizonte de
  agujero negro (profundidad, tipografía fina espaciada), detector de partículas
  (evidencia, análisis), capa transformable (un gesto transforma la forma).
- Me da igual: Rietveld, bazar lunar, título de anime jazz.
- No me gusta: azulejo, teletexto, vitrales, conservas, gabinete, zine,
  escritorio de un bit, cartel underground, contador Nixie.
- `energy-match`, literal: «Soy alegre, me gusta construir cosas, me apasiona
  hablar de productos y transformarlos en sistemas. Me gustan las cosas claras y
  limpias. Esto me parece hermoso. https://pin.it/5NfmeJ2Hw». El pin es un
  interior escandinavo luminoso: paredes blancas, madera clara, luz natural,
  una puerta de vidrio abierta hacia una habitación, acentos mostaza y un textil
  gráfico. Copia local: `references/user-pin-5NfmeJ2Hw.png`.
- `thinking-match`, literal: «- Follar rápido / - Moverme rápido / - Follar /
  - Aprender / - Volver a hacer». Interpretación del agente, pendiente de
    confirmar: dictado de «Fallar rápido … Fallar, aprender, volver a hacer».
- Notas generales, literal: «Cosas limpias, cosas limpias, hermosas. Me gusta
  el blanco con el café, claro. Me gustan los colores pasteles.»

Lectura del agente (propuesta, no confirmada): luminoso y limpio; un solo
elemento protagonista con profundidad y todo lo demás en calma; tipografía fina
y precisa; nada de ornamento, retro, collage, dibujo a mano, píxel ni retículas
densas; umbral o profundidad (puerta abierta, horizonte, detector); método como
ciclo de iteración y transformación por un gesto.

Confirmaciones en chat, mismo día:

- `identity.reading`: «Yes, that's it». La lectura anterior queda confirmada
  como base de la siguiente mano.
- `thinking-match`: «Yes, "fallar" (fail)». Método: fallar rápido, moverse
  rápido, fallar, aprender, volver a hacer.
- `identity.palette` (actualiza la preservación de colores): «Soften it into
  pastel versions of the same colors, with brown and white as the base».
  Miel, oliva y albaricoque pasan a versiones pastel; blanco y café son la base.

### Candidatos r6, derivados antes del re-roll 5 de `90569fd1`

Base confirmada: luminoso y limpio, blanco y café con pasteles; un protagonista
con profundidad y el resto en calma; tipografía fina; umbral hacia el trabajo;
fallar rápido, aprender, volver a hacer; transformación con un gesto; energía
alegre de constructor. Rut excluido: nombre + capturas en composición (r3–r5b).

1. **Iteración visible.** Un objeto suave en 3D muestra sus versiones: boceto,
   prototipo, producto; las versiones previas quedan como estelas. El movimiento
   es fallar → aprender → rehacer. Familia: diseño industrial. Riesgo: que el
   objeto no se lea como software.
2. **Umbral luminoso.** Un espacio blanco con luz natural y una abertura; al
   cruzarla, aparece el producto en profundidad. El scroll atraviesa umbrales.
   Familia: arquitectura interior. Riesgo: parecer inmobiliaria o decoración.
3. **Un gesto, forma total.** Una lámina pastel se pliega con un solo gesto y
   se convierte en la interfaz del producto. Familia: textil y papel. Riesgo:
   efecto sin contenido si la interfaz final no domina.
4. **Cámara de evidencia.** Una cámara clara donde cada intento deja un trazo;
   los trazos convergen en la decisión y el producto. Familia: visualización
   científica. Riesgo: frialdad técnica; mantener luz y pasteles.
5. **Maqueta de luz.** Maqueta blanca del sistema de cada producto bajo luz
   solar que se mueve con el scroll. Familia: maqueta arquitectónica. Riesgo:
   parecer arquitectura de edificios, ya confundida en r2.
6. **Horizonte pastel.** Una esfera suave con lente gravitacional en el centro;
   cada producto aparece a través de la lente. Familia: óptica y astronomía.
   Riesgo: metáfora ajena al trabajo.
7. **Construcción alegre.** Piezas pastel se ensamblan en el producto; cada
   iteración reordena piezas. Familia: construcción modular. Riesgo: infantil.

Seed `90569fd1`, re-roll 5, índice asignado 6: **Horizonte pastel**. Pick:
**Iteración visible**. Competitivos: borde iridiscente y ma (ikebana).
Rechazados con aportación: j-card (desplegar por etapas), mook (etiquetas que
nombran partes), letrero de destino (paso con error visible), siete segmentos
(versiones previas como fantasmas). Pastel propuesto: miel `#FCE3A6`, oliva
`#D6E2B4`, albaricoque `#FDD2B1`; base blanco y café `#473C33`. Comps con Codex
según `.impeccable/mocks/decision/aohys-20260923-r6/codex-brief.md`. Página de
decisión `http://127.0.0.1:62076/`, clave `f6fafb05`. Sin elección.
Comps entregadas: `horizonte.png`, `iteracion.png`, `borde.png`, `ma.png`
(`approved: false`). Defectos conocidos: textos pequeños alterados dentro de las
capturas (y un dígito del teléfono de Casa Roca); `ma.png` muestra la imagen de
lino de ETERIA porque no hay captura de su interfaz; tres comps comparten la
misma estructura de texto a la izquierda y la sombra de hojas se repite.

## Corrección vigente — mocks rechazados y nueva autoridad de contenido

El usuario rechaza ambos mocks ejecutables por la pérdida de calidad respecto
a las imágenes generadas. Firma en movimiento es su favorita como dirección,
pero su implementación también está rechazada. Solicita exactamente tres
propuestas: Firma corregida y otras dos opciones. La conformidad parcial de
la revisión anterior no estableció fidelidad compositiva ni aceptación.

Fallo concreto a corregir: sustituir el gesto material por una curva SVG fina,
reducir/cambiar la escala y proporción de la evidencia y extender el sistema a
páginas interiores mediante bloques genéricos. La referencia visual tiene que
gobernar el resultado; conservar colores no basta. Los mocks `r3-experience`
quedan como historia rechazada, no como base aprobada.

Autoridad factual actual: Opportunity OS, `candidateProfileVersions`, lectura
real de producción de la revisión 1, SHA-256
`df43b3ffede38adaa040b13d5d5808770068f9778ed3d739900172fe74a7feb4`.
Cuatro fuentes recuperadas coinciden con sus canónicas; narrativa maestra de
14 bloques aprobada tras recibo `20260918T205050-a2d65f93db04` y confirmación
«Me encanta». Thread de origen `7d29d1ef-b665-410f-b6aa-2a95c363a1c0`,
publicación confirmada el 18 de septiembre. Este checkout AOHYS y sus seis
casos antiguos no contienen esa actualización y no rigen el nuevo copy.

Selección pública: cinco productos — The Barber Central, NutriPlan, ETERIA,
Casa Roca y el sitio AOHYS. Los siete empleos se presentan como trayectoria
con contribuciones concretas; no como un producto llamado Enterprise Systems.
Development System informa el método, no es un caso comercial. Opportunity OS
no aparece ni se disfraza como otro producto. Las herramientas personales sólo
pueden ser ejemplos breves del método, sin fichas profesionales.

El contenido nuevo explica propósito y contribución: reservas y operación;
consulta y seguimiento entre citas; propuestas y operación de eventos; estancia
y reservaciones; publicación y presentación del trabajo. La arquitectura
explica decisiones reales (conflictos de reservas, acceso por rol, publicación)
y responsabilidades humanas, no sólo tres tarjetas con tecnologías.

Antes del nuevo seed, candidatos: (1) Firma en movimiento, dirección fijada por
el usuario, con trazo material y composición asimétrica; (2) Escena de producto,
presentación de exposición con una gran imagen del trabajo sobre un plano
continuo y vistas de caso que abren el encuadre; (3) Corte editorial, identidad
de publicación cultural con tipografía precisa, dos escalas de lectura y una
imagen de proyecto recortada a sangre; (4) Secuencia de uso, continuidad de
títulos cinematográficos entre situación, interfaz y decisión; (5) Índice vivo,
catálogo de exposición con entradas que se expanden en una muestra completa;
(6) Luz de trabajo, sistema de proyección donde el caso ilumina una región y
el perfil conserva una superficie estable; (7) Encuentro, composición de
correspondencia gráfica entre la persona, la necesidad y la respuesta de producto.
No son siete propuestas al usuario. Firma permanece; las dos alternativas
deben cambiar la estructura y el movimiento, no únicamente el color.

Ronda vigente: `.impeccable/mocks/decision/aohys-20260918-r4/`.
Seed `90569fd1`, reroll 3, candidato asignado 3 (Corte editorial); la preferencia
explícita conserva Firma y la tercera propuesta es Escena de producto. Se
mantiene el límite literal de tres opciones. Los challengers de habitación,
osciloscopio, autómata, tormenta tipográfica y terminal espacial comprometen la
claridad profesional; el challenger de publicación cultural queda representado
por la gramática de Corte. No se añade una cuarta dirección.

Entrega: tres inicios y tres láminas con Trabajo, NutriPlan, Cómo lo hago y
Trayectoria, más descripciones de movimiento. Comparación nativa de Impeccable
y recorridos individuales accesibles por túnel. Revisión independiente y
verificación de acceso registradas en `.impeccable/review/r4-remote/receipt.md`.
Son propuestas visuales estáticas: no prueban comportamiento ni adaptación de
una implementación. No hay dirección aprobada. La futura construcción deberá
medir la referencia y conservar el material del trazo o la escena como imagen,
con texto y controles semánticos; no sustituir su calidad por aproximaciones CSS.

## Historia — 18 de septiembre, dos recorridos solicitados

El usuario señala **Sobreimpresión** y **Firma en movimiento** como sus favoritas
y pide un mock pequeño de cada una para ver inicio, otras páginas, animaciones
y transiciones antes de decidir. Es una preselección de dos, no una aprobación
de implementación pública. No hace falta otra ronda de candidatos o renders.

Se desarrollan dos experiencias desechables en
`docs/design/prototypes/r3-experience/`: inicio, seis casos, arquitectura de AOHYS,
CV y contacto. Usan el mismo contenido y los últimos datos de trayectoria de
Opportunity OS (correcciones del 18 de septiembre). La navegación y el movimiento
funcionan; formularios, publicación y persistencia quedan fuera del mock pedido.

Sobreimpresión extiende los planos de color y su alineación a casos y páginas
interiores. Firma usa un trazo continuo que acompaña la imagen, el mapa de
arquitectura y la trayectoria. Ambas mantienen perfil primero, una sola imagen
protagonista, acceso progresivo a los seis casos y las dos vías de colaboración.
Los controles explícitos cambian proyectos; no hay reproducción automática ni
intercepción del scroll. El movimiento reducido conserva la navegación.

La presentación nativa de Impeccable conserva la elección de dirección. Estos
dos mocks son los recorridos ejecutables pedidos por el usuario, no una nueva
matriz de candidatos. Se entregan por túnel con revisión de escritorio y móvil.
Las verificaciones y enlaces vigentes se registran junto al prototipo.

## Prioridad de conversión confirmada

Clave: `conversion.priority`. Respuesta literal del usuario:
«Ambos: presentar primero mi perfil y después ofrecer las dos vías».

La página presenta primero a Alejandro. Después ofrece dos formas de trabajar
con él: incorporarse a un equipo como ingeniero o desarrollar un producto.
No se prioriza una vía sobre la otra ni se convierte el inicio en una agencia.
Esta decisión confirma el objetivo y la secuencia; no aprueba las composiciones
rechazadas. El posterior «Perfecto» confirma la formulación full-stack corregida.

Corrección posterior del usuario: «sí sé más frontend pero igual ya soy un
full stack». El posicionamiento vigente es **ingeniero de software full-stack,
con mayor fortaleza en frontend**. Full-stack describe su trabajo actual;
frontend identifica dónde tiene más experiencia. No presentarlo sólo como
frontend con capacidad complementaria para otras capas. Esta corrección
reemplaza la formulación anterior de la premisa, sin renombrar cargos históricos.

### Jerarquía de la siguiente ronda

1. **Perfil y premisa.** Nombre, Senior Software Engineer, posicionamiento full-stack
   con mayor fortaleza en frontend y trabajo desde requisitos hasta entrega. Una imagen protagonista
   y una acción principal para conocer el trabajo. Sin seis miniaturas, diagramas
   técnicos ni dos argumentos de venta compitiendo en la primera pantalla.
2. **Trabajo como evidencia.** Recorrido gradual por los seis casos públicos;
   contribución concreta junto a cada proyecto. Mantener la transición valorada.
3. **Criterio y arquitectura.** Decisiones y ejemplos accesibles desde los casos
   y desde su sección. La profundidad técnica apoya la presentación profesional.
4. **Dos vías de contacto, con igual relevancia.** «Sumarme a tu equipo» y
   «Construir tu producto». El CV apoya la primera; los casos y la explicación
   de cómo trabajo apoyan ambas. No crear disponibilidad, plazos ni promesas.

Base de copy confirmada por el usuario con «Perfecto» después de la corrección full-stack; su composición visual continúa abierta:

> Soy Alejandro Ortiz Corro, ingeniero de software full-stack.
> Mi mayor fortaleza está en frontend. Desarrollo productos desde los requisitos
> hasta su entrega.

## Ronda 3 — candidatos antes del segundo re-roll

La premisa está resuelta: Alejandro, ingeniero full-stack con especial fortaleza
en frontend; perfil primero, evidencia después y dos vías de colaboración.
El visitante debe identificar a la persona y su trabajo sin interpretar una
metáfora. La imagen aporta carácter; la frase hace explícito el significado.
Familias de origen: títulos cinéticos, instalaciones de luz, encuadre cinematográfico,
ingeniería de papel, impresión, óptica y tejido. Se excluyen las composiciones
ya presentadas y el hero genérico con retícula de tarjetas. Mismos hechos y
misma calidad de acabado en todas las propuestas. Ninguna seleccionada.

1. **Firma en movimiento.** Identidad de títulos cinéticos: nombre y perfil
   forman la entrada; un solo trazo de color prolonga su composición hasta
   enmarcar la primera muestra de trabajo, que comienza debajo. El trazo cambia
   con el proyecto, sin mover el texto. Oportunidad: identidad personal propia
   con una transición continua. Riesgo: que el gesto eclipse la frase; su área
   queda subordinada al nombre, sin inventar una firma manuscrita del usuario.
2. **Enlace continuo.** Instalación de luz material: una única cinta plegada
   atraviesa una abertura y conduce del perfil a una superficie de software.
   Fondo blanco, color localizado, sans humanista; ninguna red de nodos.
   Oportunidad: profundidad y continuidad como hilo de todo el sitio.
   Riesgo: abstracción gratuita; el perfil y el primer caso conservan texto claro.
3. **Encuadre abierto.** Gramática de visor cinematográfico: una gran abertura
   asimétrica recorta una imagen de producto bajo el perfil; sus bordes se
   desplazan para introducir el siguiente caso. Un único encuadre, sin tiras de
   miniaturas. Oportunidad: transición espacial con reposo muy simple.
   Riesgo: demasiado espacio ocupado por el marco; el trabajo debe dominarlo.
4. **Pliegue de color.** Ingeniería de una hoja desplegable: una superficie
   de color ocupa una esquina y su pliegue conduce a la evidencia inferior.
   El perfil se lee completo sobre blanco, con un solo CTA. Oportunidad:
   una apertura memorable que se prolonga como separador entre secciones.
   Riesgo: convertirse en papelería decorativa; no simular un CV impreso.
5. **Sobreimpresión.** Registro de impresión a dos tintas: identidad precisa
   y una imagen protagonista donde dos planos coinciden en una sola interfaz.
   La alineación termina al entrar al proyecto. Oportunidad: pasar de intención
   a claridad sin diagramas. Riesgo: pérdida de legibilidad; nunca duplicar texto.
6. **Lente de producto.** Superficie lenticular: un campo óptico grande revela
   un proyecto al cambiar el ángulo, mientras el perfil queda siempre inmóvil.
   El estado inicial muestra una única vista nítida. Oportunidad: movimiento
   ligado a descubrir el trabajo. Riesgo: depender del hover; habrá control
   explícito por toque y una imagen estable con movimiento reducido.
7. **Composición tejida.** Dos bandas anchas entrelazadas organizan entrada
   personal y evidencia en una sola abertura; el resto permanece blanco.
   Oportunidad: textura y ritmo cálido en una estructura muy contenida.
   Riesgo: que el material se asocie a otro oficio; evitar objetos o iconos textiles.

Contrato de esta ronda: raíz `/Users/corrortiz/Documents/AO/aohys`, base
`552a7941cf78924abc98975be90f3f82396bc421`; sólo artefactos de diseño y entrega
remota. Un escritor por archivo; preservar todos los cambios previos. Secuencia:
candidatos → seed → página nativa → comps → crítica independiente → corrección
acotada → túnel comprobado. Fin autorizado: propuestas revisables, sin cambiar
el producto, aprobar una dirección en nombre del usuario ni publicar producción.
Verificar premisa, densidad y un foco; procedencia de imágenes; acceso remoto y
presentación móvil. Las capturas estáticas no prueban la animación propuesta.

Resultado del seed, posterior a la lista: `90569fd1`, re-roll `2`, índice `5`
(**Sobreimpresión**). Se presenta junto a **Firma en movimiento**, primera
candidata, y la salida convencional subordinada de Impeccable. Los seis
challengers y sus razones se conservan en
`.impeccable/mocks/decision/aohys-20260917-r3/decision.json`.

Presentación actual: <https://melbourne-worked-cheque-dining.trycloudflare.com/>.
Pregunta nativa `e72df2b7`, origen local `51368`, proxy acotado `61846`.
El servidor de la ronda anterior había expirado; `--update` devolvió salida `2`
con indicación de crear una pregunta nueva. No se inició una comparación paralela.
El túnel muestra composiciones estáticas para decidir, no el sitio implementado.
No hay dirección seleccionada. La elección del usuario es el siguiente paso.

Acción principal propuesta: «Conoce mi trabajo». El CV permanece accesible
en la navegación; las dos vías de colaboración aparecen después de presentar
el perfil y la evidencia. La identidad visual sigue abierta y debe conservar
carácter y movimiento sin volver a la saturación de la ronda 2.

## Corrección más reciente — ronda 2 rechazada

El usuario rechaza ambas propuestas: «están muy llenas de información al mismo
tiempo» y «no se entiende la meta de esta página de forma sencilla». Matiza:
«Anatomía del producto se ve mejor, pero Atlas de decisiones se entiende más
de qué va, pero ninguna de las dos da una premisa adecuada».

Ninguna propuesta queda seleccionada. Mejor aspecto de Anatomía y mayor claridad
del tema de Atlas son reacciones parciales, no autorización para combinar ambas
ni conservar su composición. La crítica independiente anterior cerró defectos
de regiones; no estableció el cumplimiento de la premisa ni aceptación del usuario.

Error del agente: convertir «hay muchos proyectos y arquitectura» en «mostrar
los seis casos y arquitectura simultáneamente en el primer viewport». Se revoca
esa regla propuesta. El contenido completo sigue en el sitio; su exposición debe
ser progresiva y comprensible. La imagen se subordina a la premisa y a la acción.

Corrección propuesta de jerarquía, todavía no selección visual: identidad y
especialidad; qué trabajo puedo asumir; una acción principal; una imagen con
una sola función. Después, trabajo completo; luego decisiones/arquitectura;
trayectoria y contacto. Conservar la transición como recurso ya valorado.

La prioridad de conversión se resolvió: perfil primero y después ambas vías,
contratación profesional y encargo de producto. Las preferencias generales
de voz, paleta y elegancia ya están resueltas y no se vuelven a preguntar.
La voz de Opportunity OS se revalidó: su guía contiene correcciones del 17 de
septiembre que reemplazan partes del CV v03. No reutilizar la frase rechazada
que vincula Java/Cassandra/MySQL con Partner Portal. El posicionamiento público
posteriormente confirmado es full-stack, con mayor fortaleza en frontend.

La entrega visual debe usar la página nativa de Impeccable. Los PNG directos
sirven como archivos auxiliares, no reemplazan esa presentación. El usuario
autoriza explícitamente un túnel para `docs/design/aohys-diseno-r2.html` y la
revisión remota; el HTML se entrega como estudio anterior, no como propuesta nueva.

Entrega recuperada: HTML completo y presentación nativa accesibles en
`https://combined-implied-far-embassy.trycloudflare.com` (temporal; detalles y
comprobaciones en `.impeccable/review/tunnel-20260917.md`). Se comprobó la
presentación y el informe a 390px mediante Browser. La elección sigue abierta.

Premisa actualizada antes del próximo render: un ingeniero senior full-stack
con mayor fortaleza en frontend que entrega productos completos. La primera
pantalla debe identificar a Alejandro, explicar esa contribución en lenguaje
directo y ofrecer una acción principal. Como base de copy, no aprobada:
«Soy Alejandro, ingeniero de software full-stack. Trabajo desde
los requisitos hasta la entrega del producto». La voz y el inventario respaldan
esa descripción. La respuesta posterior confirma perfil primero y las dos vías
con igual relevancia; el copy y la composición permanecen como propuestas.

## Corrección vigente — 17 de septiembre

«No estoy completamente convencido de esta dirección. Me gusta la transición,
pero no estoy convencido.» «Sigo pensando que se ve muy aburrido y que se ve
como cualquier otra página. Necesito que sea más vibrante.» El usuario pide
aplicar la sección 4 y el artículo completo y señala que faltan muchos proyectos
y arquitectura. Esto revoca la selección visual anterior, no los colores ni la voz.

El fallo compartido fue reducir la personalidad a espacios en blanco, serif y
capturas de dos productos. La nueva hipótesis usa imágenes originales de AOHYS
con una función narrativa: revelar la relación entre experiencia, producto y
arquitectura. El artículo se releyó completo en la sesión autorizada de Substack;
la técnica 4 orienta el uso de imágenes creadas para el sitio. Los renders son
arte conceptual, nunca pruebas de interfaces, resultados o infraestructura real.

Inventario revalidado: seis casos públicos — ETERIA, The Barber Central, NutriPlan,
Casa Roca, Enterprise Product Systems y AI-Native Development Practice/AOHYS.
El home actual sí carga los seis; el prototipo de esta sesión recortó la muestra
a dos y no representa el alcance. CMS y sitio AOHYS se explican dentro de su caso;
Development System y Opportunity OS son privados y no se convierten en demos
públicas. Tala, Drift, Prenuvo, AutoZone, Accenture y NEORIS/CEMEX pertenecen a la
trayectoria y a contribuciones acotadas, sin inventar capturas o autoría exclusiva.

Arquitectura será un destino visible y una sección sustancial del inicio. Distinguir
arquitectura del producto (sitio Astro, dashboard React autenticado, Convex,
contenido y publicación) del proceso (intención, dominio, especificaciones,
implementación, verificación y promoción). Ningún render acredita el sistema real.

### Nuevos candidatos, derivados antes del re-roll

Mecanismo: mostrar cómo Alejandro conecta interfaces con decisiones de producto
y entrega técnica. Escena del visitante: evaluar trabajo, contribución y criterio.
Quedan fuera tanto la landing SaaS de tarjetas como la revista beige y el catálogo
ya mostrado. Todos los candidatos incluyen seis casos, arquitectura y CV.

1. **Anatomía del producto.** Despiece de diseño industrial: una imagen propia
   muestra capas de un producto separadas en profundidad, junto a un índice de
   seis trabajos siempre visible. Abrir un caso conecta su superficie con su
   estructura; arquitectura amplía esas capas. Oportunidad: escultura funcional
   de pantallas, planos y conexiones. Riesgo: debe leerse como software y no como
   un objeto decorativo. Tipografía sans precisa y color con volumen.
2. **Montaje vivo.** Montaje cinematográfico: franjas de imágenes de proyectos
   cruzan una composición asimétrica con identificación personal estable.
   El índice completo enlaza cada secuencia; una franja abre la arquitectura.
   Oportunidad: recortes, escalas y continuidad de la transición preferida.
   Riesgo: exceso de movimiento o competencia visual; reposo por defecto.
3. **Paisaje de sistemas.** Ilustración axonométrica de un campus de productos,
   con seis lugares relacionados, nombres legibles e índice textual paralelo.
   Oportunidad: imagen propietaria navegable, con acercamientos a cada trabajo.
   Riesgo: parecer infantil o prometer relaciones técnicas que no existen;
   la imagen es una metáfora del portfolio, nunca un diagrama de infraestructura.
4. **Partitura de entrega.** Notación temporal: bandas de diferentes densidades
   muestran experiencia, decisiones y entrega; seis productos son voces del
   mismo recorrido. Oportunidad: ritmo visual y cambios de vista coordinados.
   Riesgo: exceso de abstracción; cada banda incluye evidencia de producto.
5. **Exposición en gran formato.** Sistema de identidad de una exposición:
   tipografía contundente sin pesadez, fotografía recortada y una secuencia
   espacial de seis obras con números discretos. Oportunidad: imágenes propias
   y pausas a escala de página. Riesgo: que la ingeniería quede subordinada al arte.
6. **Atlas de decisiones.** Cartografía editorial: un plano plegado con varias
   escalas sitúa los seis casos alrededor de decisiones legibles; la arquitectura
   se abre por secciones. Oportunidad: detalle que se descubre con intención.
   Riesgo: parecer un dashboard o exigir aprender controles para leer el portfolio.
7. **Objetos de trabajo.** Fotografía de estudio: seis objetos escultóricos
   específicos representan coordinación, cuidado, hospitalidad, eventos,
   confiabilidad y entrega. Sus cortes muestran interfaces y decisiones.
   Oportunidad: una familia visual propia, con sombras suaves y materiales ricos.
   Riesgo: sustituir proyectos reales por metáforas; siempre acompañar con nombres,
   rol y acceso directo a evidencia real.

Esta lista pertenece a la nueva exploración. No se aplica la aprobación histórica
del catálogo a ninguna de estas propuestas.

## Encargo y correcciones literales

- «tanto el copy como el diseño se siente como AI SLOP».
- «Se siente muy brutish».
- «podría utilizar mejores imágenes y mejores conversaciones».
- «profesional, que se vea limpio, que se vea elegante y que no se sienta
  aburrido, utilizando y aprovechando efectos visuales más padres».
- Referencias pedidas: las landings actuales de Barber Central y NutriPlan;
  currículum, voz y logros actualizados en Opportunity OS.
- Webflow y GHL son posibilidades mencionadas por el usuario, no una decisión
  de migración. La respuesta posterior remite al artículo sobre posibilidades
  visuales; no corresponde repetir esta pregunta para explorar la composición.

## Alcance de esta sesión

Dirección visual y narrativa de la landing pública. Preparar preguntas,
referencias y propuestas revisables. El encargo actual es una sesión de diseño;
todavía no define implementación, cambio de plataforma o publicación.

Se conservan los hechos profesionales, la veracidad de los casos, las rutas y
los límites públicos/privados. El contexto vigente identifica a hiring managers,
líderes técnicos y founders como audiencia, con oportunidades de contratación,
colaboración y proyectos. No se reinicia ese contrato funcional para explorar
el diseño. Inglés y español continúan como idiomas existentes.

## Base observada

- Checkout inicial limpio: `552a7941cf78924abc98975be90f3f82396bc421`.
- Landing observada en navegador: <https://aohys.com/>, 2026-09-16.
- Contrato anterior: `PRODUCT.md`, `DESIGN.md`; modo principal `Persuade`, con
  exposición de proyectos. La experiencia del portfolio se decidirá durante el grill.
- Código de entrada: `apps/site/src/pages/index.astro` y
  `apps/site/src/components/PublicContentPage.astro`.
- Contenido: `packages/content-graph/src/`; medios de proyecto publicados y
  fallbacks en `apps/site/public/images/proof/`.
- Implementación actual: título profesional muy pesado y partido en seis líneas
  en el viewport observado; imagen del proyecto pequeña dentro de un escenario
  con marcos; servicios en tres bloques; varios textos reiteran capacidades y
  procesos. Son observaciones del agente, no preferencias adicionales del usuario.
- Identidad anterior: miel, oliva, albaricoque, tinta marrón; Mona Sans y Atkinson
  Hyperlegible Next; sombras duras, tickets y escenario con puertas. La corrección
  actual abre la composición; la ronda 1 conserva sólo los colores y abre también el logo.

## Registro de entrevista

Una sola entrevista, con claves estables. Las recomendaciones son propuestas;
las respuestas vacías, diferidas o tentativas no seleccionan una dirección.

| Clave                   | Decisión                                                                                   | Estado                                          |
| ----------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `voice.positioning`     | Directa y personal; opción A de la primera ronda                                           | Confirmada                                      |
| `identity.preservation` | Conservar únicamente los colores; replantear también el logo                               | Confirmada por corrección literal               |
| `references.transfer`   | Pulido, elegancia, juego con colores, tranquilidad, belleza y confianza de Central Belleza | Confirmada                                      |
| `motion.role`           | Demostraciones y transiciones que muestran los proyectos; opción A                         | Confirmada                                      |
| `tools.intent`          | Artículo de Anshu Chimala como referencia de posibilidades visuales                        | Referencia recibida; sin elección de plataforma |

### Respuestas literales de la ronda 1

Recibo verificado: `20260916T091910-ef6fa4d5fd5f`, revisión 1.

- Identidad: «Quisiera conservar los colores solamente. Ni siquiera me gusta el
  logo. Creo que podríamos hacer algo mejor. »
- Referencias: «Me gusta lo pulido que se ve de Barber Central. Me gusta cómo se
  siente elegante, cómo juega con los colores y cómo no es tan serio, pero a la
  vez se siente tranquilo y bello. Ese sentimiento quiero llevarlo hacia la
  elegancia y la confianza que desarrolla, que es algo padre. »
- Herramientas: «En este artículo se habla muy bien de cómo podemos darle chispa
  y cómo le podemos dar animaciones increíbles y cosas así.
  https://substack.com/inbox/post/213056760 »
- Voz y movimiento: elección A, sin comentarios y sin diferir.

Esta corrección reemplaza la propuesta de conservar el logo. Permanecen miel
`#FEC868`, oliva `#ABC270`, albaricoque `#FDA769` y tinta marrón `#473C33`;
la tipografía, composición, logo y lenguaje de interacción están abiertos.
No se heredan automáticamente las sombras duras, los tickets ni las puertas.

### Artículo de referencia

[How to turn your AI into a world-class designer](https://www.lennysnewsletter.com/p/how-to-turn-your-ai-into-a-world),
Anshu Chimala, 1 de septiembre de 2026. Leído mediante la sesión autorizada de
navegador el 16 de septiembre. Aplicación propuesta: explorar estructuras
distintas, preparar imágenes con intención, demostrar transiciones en navegador,
revisar con un crítico independiente y reducir elementos que distraen. Una
imagen fija sólo permite evaluar composición; el movimiento se comprobará con
un prototipo de la dirección elegida. El artículo no decide la plataforma.

## Derivación de candidatos — anterior a concept-seed

Mecanismo propio: Alejandro conecta la conversación de negocio con un producto
de software completo y asume la dirección técnica de su entrega. El visitante
evalúa su criterio mediante proyectos reales en pocos minutos. Contexto cultural:
revisiones de producto, estudios de diseño y presentaciones de trabajo profesional.

Patrones que no resolverían el encargo por sí solos: portfolio de título enorme
y pequeño mockup; su opuesto automático, revista beige con adornos editoriales.

1. **Catálogo de producto en movimiento.** Una introducción personal breve abre
   una secuencia de grandes vistas de proyectos, inspirada en catálogos de diseño
   industrial. La interfaz cambia de estado bajo control del visitante.
   Riesgo: parece una agencia si la contribución de Alejandro queda relegada.
2. **Díptico de exposición.** Dos proyectos ocupan superficies de escalas distintas,
   con una nota personal y navegación discreta. Inspiración: montaje de una
   exposición de diseño contemporáneo. Riesgo: divide la atención inicial.
3. **Sesión de visionado.** Un único plano ancho presenta un proyecto; un índice
   permite recorrer tres estados de su experiencia. Inspiración: revisión de
   montaje audiovisual, sin maquinaria ni controles de editor. Riesgo: cargar
   demasiado video o retrasar la lectura del perfil.
4. **Correspondencia de estudio.** La presentación personal se compone como una
   carta breve de un profesional, con tipografía expresiva y muestras de trabajo
   que interrumpen la columna con naturalidad. Riesgo: exceso de texto o apariencia
   de blog si el trabajo no aparece de inmediato.
5. **Atlas de recorridos.** Bandas horizontales enlazan un contexto real, una vista
   de producto y una decisión personal; cada banda se explora en el lugar.
   Inspiración: atlas y mapas de servicio. Riesgo: convertir el portfolio en un
   diagrama demasiado técnico.
6. **Muestra tipográfica y archivo visual.** El nuevo nombre/marca organiza una
   retícula precisa con un índice legible y fotografías de proyectos a distintas
   escalas. Inspiración: programas de identidad gráfica de estudios profesionales.
   Riesgo: que la marca compita con la evidencia del trabajo.
7. **Mesa de revisión de producto.** Un marco amplio contiene tres vistas del
   mismo proyecto y comentarios cortos sobre decisiones, con cambios de foco
   suaves. Inspiración: revisión colaborativa de prototipos, sin recrear una mesa
   física ni tarjetas apiladas. Riesgo: densidad y captura poco legible en móvil.

Todos conservan la paleta, voz en primera persona, acción de contacto, medios
reales de Central Belleza/NutriPlan/ETERIA y los mismos hechos profesionales.
Familias de origen: diseño industrial, curaduría, audiovisual, correspondencia,
cartografía, identidad gráfica y revisión de producto. No son direcciones aprobadas.

Las capturas de referencia de esta ronda son material de calibración, no comps
aprobados. La comparación y selección de direcciones se hará en la página de
decisión de Impeccable después de resolver las preferencias que la condicionan.

## Referencias verificadas para la primera ronda

- Central Belleza: <https://the-barber-central-landing.a-ortizcrr.workers.dev/>.
  Captura `barber-current-hero.png`. Ilustración humana grande, serif de contraste,
  tinta y rosa; mensaje situado en la actividad del negocio. Referencia exploratoria
  de imagen, composición y voz, no paleta aprobada para AOHYS.
- NutriPlan: <https://nutriplan-landing.a-ortizcrr.workers.dev/>.
  Captura `nutriplan-current-hero.png`. Conversación ilustrada, verde contenido,
  tipografía y recorrido más tranquilos; relato centrado en el contexto de la
  consulta. Referencia exploratoria de imagen, jerarquía y tono.
- Ambas landings se abrieron y observaron el 16 de septiembre de 2026. Sus
  checkouts principales locales contienen versiones anteriores; no usarlos para
  reconstruir la apariencia actual de estas referencias.
- Voz actual: `/Users/corrortiz/Documents/AO/opportunity-os/docs/candidate-voice.md`.
  Perfil: senior con especialidad frontend y entrega de productos completos;
  primera persona, verbos simples, ejemplos y responsabilidad personal.
- CV general más reciente localizado:
  `/Users/corrortiz/Documents/AO/opportunity-os/artifacts/resume/frontend-fullstack-v03/alejandro-ortiz-corro-cv.md`,
  9 de septiembre de 2026, artefacto local no rastreado. `qa.json` registra
  `reviewed_base_cv_not_submitted`. Referencia de voz y claims documentados, no
  nueva auditoría de métricas o proveedores.
- Contexto profesional adicional: `docs/candidate-experience.md` y
  `docs/candidate-product-evidence.md` en Opportunity OS, checkout
  `c85d77030ad5696f271ace4b00946fd85a87e6e4`. Preservar matices de contribución en
  equipo, especialidad y alcance. No convertir alcance implementado en adopción,
  resultados clínicos o impacto comercial no demostrado.

## Recuperación y siguiente paso

Directorio privado de referencias de la sesión:
`/Users/corrortiz/.development-system/private/design/aohys-landing-2026-09-16/references/`.

Primera ronda: `aohys-landing-design-r1-20260916`.

- JSON de entrada:
  `/Users/corrortiz/.development-system/private/design/aohys-landing-2026-09-16/round-1.json`.
- Preguntas canónicas con referencias incorporadas:
  `/Users/corrortiz/.development-system/private/questionnaires/aohys-landing-design-r1-20260916/questions.json`.
- Ruta exacta de respuestas a leer cuando el usuario avise:
  `/Users/corrortiz/.development-system/private/questionnaires/aohys-landing-design-r1-20260916/responses.json`.
- HTML y datos de ejecución en ese mismo directorio: `index.html`, `runtime.json`.
- Claves del HTML: `voice-positioning`, `identity-preservation`,
  `references-transfer`, `motion-role`, `tools-intent`, correspondientes en orden
  a las claves del registro anterior.
- Servidor local de la ronda: `http://127.0.0.1:62840/s/5rwIp_hu93FbydBma_JXBjDl48dhvAsc/`.
  Disponible en esta computadora mientras siga activo; no se abrió un túnel público.

Tras la respuesta, conservar el texto literal y actualizar únicamente las
decisiones resueltas. No repetir preguntas equivalentes en otras herramientas.

## Exploración visual — ronda de dirección 1

Secuencia: siete candidatos registrados → concept-seed → página de decisión
→ imágenes → revisión independiente → elección del usuario.

- Seed: `90569fd1`, modo `persuade`, alcance `direction`; índice 7, «Mesa de
  revisión de producto», presentado como «El trabajo, de cerca».
- Alternativa del primer candidato: «Catálogo en movimiento».
- Composición convencional disponible como opción secundaria.
- Seis referencias de catálogo traducidas a los colores confirmados, evaluadas
  por identificación profesional y claridad: vidriera, azulejo, cartel doble,
  fotograma de jazz, plano de cátodos y contador de laboratorio. Se descartan en
  esta ronda por sus respectivos marcos, ornamentos, competición de titulares,
  cortes bruscos o énfasis instrumental. El JSON conserva motivos y aprendizajes.
- Página canónica: `http://127.0.0.1:49232/`, clave `d927de29`.
- Payload, imágenes y prompts exactos:
  `.impeccable/mocks/decision/aohys-20260916-r1/`.
- Maquetas de escritorio: 1536 × 1024, mismo contenido y acabado para comparar
  composición. Son imágenes generadas, no capturas de una implementación.
- Crítica independiente: las tres estructuras son suficientemente diferentes;
  falta el nombre visible de Alejandro en todas. En «El trabajo, de cerca» sobra
  la duplicación de arte y frases de marca ajenas a la autoría. En «Catálogo» el
  título y rol del proyecto deben aparecer antes y la interfaz ganar escala.
  Corregir acentos demasiado saturados en «Catálogo» y «Convencional».
- Corrección adicional del autor: logo tipográfico provisional propio, sin
  hojas transferidas de los proyectos; retirar adornos y copy no solicitado.
- Segunda revisión independiente sobre los PNG corregidos: identificación
  personal, limpieza de adornos y jerarquía del trabajo resueltas. «El trabajo,
  de cerca» y «Convencional» están listas para comparar. «Catálogo» ya muestra
  título, rol e interfaz con suficiente presencia; resta neutralizar únicamente
  el naranja de la palabra «products», usando la tinta marrón conservada.
- Imágenes revisadas: `work-close-v2.png`, `living-catalogue-v2.png` y
  `conventional-v2.png`. Prompts exactos y procedencia en archivos hermanos;
  todas mantienen `approved: false`. La marca tipográfica es una exploración,
  no un logo final. Los proyectos dentro de estas maquetas están reconstruidos
  por generación de imagen y no deben reutilizarse como prueba de producto.
- Última corrección acotada: `living-catalogue-v3.png` cambia «products» a
  tinta marrón, conservando cursiva y composición; comprobación visual del
  autor. El payload final usa `work-close-v2.png`, `living-catalogue-v3.png`
  y `conventional-v2.png`. La generación no prueba precisión hexadecimal.
- Esta ronda quedó resuelta por la elección literal del usuario en el chat.
  La imagen seleccionada es `living-catalogue-v3.png`; su sidecar registra
  aprobación sólo de dirección/composición. El logo sigue abierto.

Recuperar la decisión con `impeccable serve-question --wait --key d927de29`.
No reiniciar la página ante una corrección o re-roll; actualizar la misma clave.

## Selección y extensión del catálogo

Corrección literal: «El catálogo en movimiento es lo que más me ha gustado.
Siento que, aun así, el loco está aburrido, y me gustaría ver qué tienes planeado
dentro de esa lógica para el resto de las páginas.» Se interpreta «loco» como
«logo», por contexto; no se le atribuye aprobación a la marca provisional.
Preguntas recibidas: cambio de animación entre proyectos, presentación del trabajo
de AOHYS, CV y resto del sitio. Son una continuación del grill de diseño.

Se registró la selección de tipo `pick` sobre seed `90569fd1`. Un comando de
consulta `concept-seed --help` produjo incidentalmente el seed `0a77939d`; no
corresponde a una nueva ronda, no tiene candidatos ni reemplaza la elección.
El estado local de build está abierto sobre la comp seleccionada en fase spec;
no se ha implementado ni certificado el rediseño del sitio. Los artefactos de
esta extensión son estudios visuales y una demostración aislada de movimiento.

### Direction contract

**THESIS.** La voz de Alejandro abre un catálogo de productos amplios, con su
contribución junto a cada imagen. La página prioriza trabajo concreto y lectura.

**OWN-WORLD.** Blanco neutral, tinta marrón, miel en acciones, oliva en campos
de apoyo y albaricoque puntual; contraste serif/sans y superficies de proyecto
amplias. Sin sombras duras ni puertas. La marca tiene diseño pendiente.

**STORY.** Entender quién construye el producto, qué problema resuelve el trabajo,
qué hizo Alejandro y cómo iniciar una conversación o revisar su trayectoria.

**FIRST VIEWPORT.** Cabecera compacta; presentación breve de lado a lado;
contacto a la derecha. Debajo, título y rol anteceden un bloque ancho de imagen
de contexto e interfaz de tamaño comparable. El siguiente proyecto asoma abajo.

**FORM.** Catálogo de diseño industrial, candidato propio 1, selección `pick`
del seed `90569fd1`. Comp de autoridad: `living-catalogue-v3.png` en el directorio
de la ronda 1. Las imágenes de proyectos se reemplazan por medios reales al construir.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

### Recorrido propuesto para el sitio

Las decisiones siguientes son propuestas del agente dentro de la dirección
seleccionada. Conservan rutas y verdad funcional verificadas en el código.

| Superficie                                                                             | Composición y propósito propuestos                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio                                                                                 | Presentación corta; Central Belleza y NutriPlan lideran la selección de trabajo, seguidos de ETERIA; imágenes grandes, rol y acceso al caso. Cierre breve que lleva a trayectoria y contacto.                                                                    |
| Trabajo: `/case-studies/`, `/es/casos/`                                                | Catálogo completo de seis casos, con tamaños y ritmos según el contenido. Cada entrada identifica problema, contribución y tipo de evidencia. Los casos enterprise usan material autorizado y diagramas.                                                         |
| Detalle de caso                                                                        | Nombre, problema y rol al inicio; imagen amplia; recorrido por contexto, decisiones y ejemplos reales de interfaz. Resultados sólo cuando haya evidencia. Cierre con siguiente proyecto y contacto.                                                              |
| Práctica: `/practice/`, `/es/practica/`                                                | AOHYS como práctica independiente de Alejandro. Productos propios, formas concretas de colaborar y responsabilidades desde la conversación hasta la entrega. Primera persona; uso de agentes bajo su dirección técnica, sin presentar una agencia ficticia.      |
| Caso AOHYS: `/case-studies/engineering-practice/`, `/es/casos/practica-de-ingenieria/` | El propio sitio como muestra pública de ingeniería: contenido bilingüe, borradores/publicación, medios, límites públicos/privados, SEO y entrega. Mostrar decisiones y flujo de trabajo; código público de AOHYS sin implicar que otros productos sean públicos. |
| Arquitectura: `/architecture/`, `/es/arquitectura/`                                    | Diagramas funcionales con texto y decisiones legibles. Profundidad opcional desde los casos. No convertir la entrada del portfolio en documentación técnica.                                                                                                     |
| CV: `/resume/`, `/es/curriculum/`                                                      | Nombre, rol y especialidad frontend; trayectoria escaneable con contribuciones y enlaces a casos; experiencia técnica, formación e idiomas. Descarga PDF visible arriba. No se necesita crear otro About: el CV ya cumple ese papel.                             |
| Contacto: `/contact/`, `/es/contacto/`                                                 | Invitación concreta a conversar, correo/WhatsApp y formulario existente con estados claros. Composición breve y abierta.                                                                                                                                         |
| Privacidad: `/privacy/`, `/es/privacidad/`                                             | Tipografía de lectura, índice sencillo si la extensión lo requiere, misma cabecera; movimiento sólo en controles.                                                                                                                                                |

Navegación propuesta: Trabajo / Práctica / CV / Contacto, más cambio de idioma.
Arquitectura se descubre desde los casos y el pie. Los enlaces EN/ES conservan
las rutas actuales. No hay decisión de migrar a Webflow o GHL.

### Animación propuesta y demostración

Una imagen entrante revela el siguiente proyecto sobre la anterior; título y
rol cambian sincronizados. Duración inicial 650 ms, final suave, recorrido
saliente del 2%. Conserva marco, contexto y control del visitante. Evitar
avance automático, bloquear scroll o navegación obligada por la animación.

En el catálogo completo, explorar el enlace de esta transición al avance
natural entre proyectos, con índice navegable. La demostración aislada se
activa con botones para evaluar el efecto; aún no prueba una integración al
scroll ni apertura de casos mediante transición compartida. Esas integraciones
siguen propuestas. Movimiento reducido cambia el proyecto inmediatamente.

Artefacto: `docs/design/prototypes/catalogue-motion/index.html`.
URL local: `http://127.0.0.1:8765/`. Se sirve sólo esa carpeta en loopback.
Las capturas originales de las landings conservan sus hashes; no son interfaces
interactivas del producto. Procedencia en `PROVENANCE.md` dentro del prototipo.

Comprobaciones en Browser: cambio Central Belleza → NutriPlan con estado
intermedio visible y estado final correcto; activación por teclado con movimiento
reducido; selección rápida termina en NutriPlan; controles y etiquetas sin
desborde a 390 px. La captura de producto de escritorio escalada no representa
el diseño móvil definitivo. Sintaxis JS correcta y detector sin hallazgos.
Capturas diagnósticas en `.impeccable/review/catalogue-motion/`.

### CV: contenido único y formatos distintos

Fuente actual de voz y hechos: CV v03 de Opportunity OS del 9 de septiembre,
ya referido arriba. Mantener el título verificado **Senior Software Engineer**
y explicitar de inmediato la especialidad frontend. Conservar experiencia de
equipo y fechas; no convertir trabajo implementado en métricas comerciales.

Hoy la página lee `resume.resumeContent` de los JSON de idiomas en
`packages/content-graph/src/locales/`; el generador
`apps/site/scripts/build-resume-pdf.py` lee el contenido inglés y produce
`/downloads/alejandro-ortiz-corro-resume.pdf`. Ambos idiomas enlazan al mismo PDF.
La implementación deberá sincronizar el CV general aprobado con el contenido
público y las traducciones, de modo que web/PDF partan de los mismos hechos.
No publicar variantes por vacante ni documentos privados de Opportunity OS.

Web: lectura visual, enlaces y adaptación móvil. PDF: columna única, texto
seleccionable, títulos estándar, experiencia completa, sin diagramas ni barras
de habilidades; conservar facilidad de lectura y extracción. Una descarga ES
requiere generar ese documento: el selector de idioma no debe fingir que ya existe.

### Estudios visuales de extensión y marca

Directorio: `.impeccable/mocks/catalogue-expansion-r1/`.
Imágenes actuales: `resume-web-v2.png`, `aohys-practice-v2.png`,
`brand-study-v2.png`. Prompts exactos embebidos y sidecars con procedencia
nativa; son propuestas `approved: false`. Las primeras versiones quedan
supersedidas. Las imágenes no prueban UI, medidas exactas ni comportamiento.

La marca explora la unión de a-o y un corte albaricoque; la versión compacta
se deriva de las mismas letras. Falta elección del usuario y dibujo vectorial
definitivo. Los encabezados de las maquetas aún no reproducen exactamente el
estudio de marca. No convertir esta inconsistencia en un sistema final.

Primera crítica independiente: corregir la legibilidad del estudio de marca,
eliminar ilustraciones motivacionales del CV y frases genéricas, hacer visible
frontend y unificar primera persona en Práctica. Aplicada una corrección por
imagen. Se conserva Senior Software Engineer por autoridad del CV original.
El detalle de casos, contacto y arquitectura está planteado en el recorrido,
todavía no tiene una maqueta propia en esta extensión.

Veredicto acotado de segunda revisión: CV y Práctica resuelven las correcciones
nombradas; marca legible, con tratamiento plano parcial por variaciones tonales
en el raster. Integración de marca pendiente. Estudios listos para discutir,
sin aprobación de diseño adicional inferida. El crítico no detecta bloqueos
visibles de controles, etiquetas o distribución en las capturas del estudio
de movimiento en escritorio y móvil; esa revisión de stills no certifica
animación ni funcionamiento. La comprobación de interacción está registrada
por separado arriba. No se ejecutó implementación del sitio público, PR,
merge ni publicación.

## Ronda vigente 2 — septiembre 17

Secuencia: siete candidatos nuevos registrados → re-roll 1 de `90569fd1`
(`direction`, `persuade`) → índice 6, Atlas de decisiones → página de decisión
→ imágenes nativas → crítica independiente. Pick: Anatomía del producto.
Los seis challengers y sus disciplinas conservadas están en el payload
`.impeccable/mocks/decision/aohys-20260917-r2/decision.json`.

El servidor anterior no respondía. `serve-question --update --key d927de29`
devolvió exit 2 y confirmó que la página ya no existía; indicó recuperar la
ronda con `--start`. La página vigente es `http://127.0.0.1:59552/`, clave
`b34f1604`. No hay dos servidores activos ni una segunda comparación artesanal.

Alcance exacto de los productores: PNG, prompt y sidecar propios, una comp por
superficie; root integra, revisa y entrega. Los renders no demuestran interfaces
reales, arquitectura desplegada, accesibilidad, responsive o movimiento. Ningún
sidecar de esta ronda registra aprobación. La crítica independiente recibe las
imágenes, corrección literal y referencias de nivel, sin prompts ni justificación.

Recorrido de páginas e inventario completo en `propuesta-visual-r2.md`.
El HTML anterior se mantiene con aviso de propuesta reemplazada.

### Revisión y entrega de la ronda 2

Crítico independiente, stills 1536×1024: Atlas v1 confundía arquitectura de
software con edificios y dominaba beige; Anatomía v1 usaba miniaturas genéricas,
incluido un concierto incorrecto para ETERIA, y un flujo técnico ambiguo. Una
tanda corrigió las regiones nombradas. El control convencional corrigió un stack
inventado y cifras ilustrativas. Atlas v2 cierra sus tres hallazgos: software,
variedad y jerarquía. Anatomía v2 cierra sus dos hallazgos; v3 elimina una leyenda
truncada aparecida en el borde. El crítico confirma ese microajuste sin regresión
visible importante. Resultado: ambas listas para comparación conceptual, sin
implicar elección del usuario ni aceptación de implementación o animación.

Referencias vigentes: `decision-atlas-v2.png`, `product-anatomy-v3.png` y control
`conventional-v2.png` dentro del directorio r2. Payload actualizado en la misma
clave `b34f1604`. Los PNG anteriores se conservan como historia sin aprobación.
El estudio autocontenido `docs/design/aohys-diseno-r2.html` muestra únicamente
Anatomía y el recorrido completo; no añade otro selector/comparador. Template
reproducible: `docs/design/prototypes/revision-r2/report-template.html`.

Comprobaciones: siete rasters, cero prompts ausentes; imagen incrustada idéntica
al PNG revisado; ningún placeholder restante; `git diff --check` sin errores.
La página de decisión se observó cargada en Browser antes de la actualización
final. La apertura del HTML file:// agotó tiempo y reinició el kernel; después
el inventario no devolvió browsers y Computer Use Chrome también agotó tiempo.
No se afirma comprobación visual final del HTML ni de la página actualizada.
No se ejecutan quality:changed/certify: la entrega sólo modifica estudios de
diseño y documentos, sin código del producto ni build. No commit, PR o publicación.
