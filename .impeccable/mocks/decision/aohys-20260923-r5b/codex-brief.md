# Codex image brief: AOHYS landing, round 5b

You are generating design comps with your native image generation tool
(`image_generation`). Do not write code, do not edit any file outside
`.impeccable/mocks/decision/aohys-20260923-r5b/`, and do not commit.

## Why this round exists

The owner rejected the previous four comps as ugly, generic and boring,
including the logo. They looked like flat, low-effort UI kits: thin generic sans,
evenly weighted boxes, no art direction, no material, no memorable moment.
Your job is to produce comps that look like the work of an award-winning
studio (think the finish level of top Awwwards / Site of the Day portfolios),
not a component library screenshot.

## Product truth (do not invent beyond this)

- Site: aohys.com, the professional site of Alejandro Ortiz Corro.
- Role line (exact): "full stack development".
- Description (exact Spanish): "Desarrollo productos desde los requisitos hasta la entrega. Mi mayor fortaleza está en frontend."
- The protagonists are his products and achievements, not his face. No photos of people, no portraits. Illustration and art direction are welcome.
- Five products and their real purpose:
  1. The Barber Central (public brand: Central Belleza): reservas, atención por WhatsApp y operación del negocio.
  2. NutriPlan: consulta y seguimiento entre citas.
  3. ETERIA: propuestas y operación de eventos.
  4. Casa Roca: estancia y reservaciones.
  5. aohys: publicación y presentación del trabajo.
- Career: seven employers (Tala, AOHYS, Drift, Prenuvo, Datazone/AutoZone, Accenture, NEORIS/CEMEX). Can appear as a quiet trajectory strip; never as a product.
- Never invent metrics, customer counts, revenue, percentages, logos of clients, or technology badges. Any sample data inside product UI (names, prices, dates) is illustrative only.
- Primary action: "Conoce mi trabajo". Nav: Trabajo · Cómo trabajo · Trayectoria · CV · Contacto · EN/ES.

## Fixed identity

- Palette, exact and only: honey #FEC868, olive #ABC270, apricot #FDA769, brown ink #473C33, plus neutral white. No blue, navy, cyan, purple, violet, mint, no black, no gradients-as-decoration, no glassmorphism, no neon glow, no cream/beige page.
- Colors should own whole regions at page scale, not appear as tiny accents.

## Owner's literal requirements for this round

- "Claramente distinto": unexpected composition and notable motion implied, but a recruiter must read "professional software engineer" at first glance. 3D, WebGL depth or scroll-driven scenes are welcome.
- Symmetry and proportion: the owner said the current site "no tiene simetría, todo se siente mal acomodado, desproporcionado". Every comp must feel rigorously balanced, aligned to a clear axis or modular proportion. No awkward leftover space, no randomly sized boxes.
- Name and role clearly identifiable, but achievements and products are the heroes.
- No video. Motion will be built in code; the comp may suggest it (mid-transition states, motion trails) without looking blurry.
- The design must come from his work and way of working (the five products, requirements to delivery), not from generic tech imagery. No terminals, code snippets, circuit boards, glowing nodes, laptops on desks, or stock devices.

## Typography

Choose a display face with a real point of view (a characterful grotesk, a sharp contemporary serif, or a variable wide/condensed family). Do not use or imitate Inter, Space Grotesk, IBM Plex, Playfair, Fraunces, Cormorant, DM Sans, Outfit or Plus Jakarta. Set type at confident scale with deliberate contrast between display and body. Text must be crisp and spelled exactly.

## Logo

Design a new AOHYS logo. The previous one ("aohys" in a plain sans) is rejected as boring. Explore a distinctive wordmark or monogram built from the letters a-o-h-y-s, with one ownable idea (for example a ligature, a symmetrical construction, a cut or fold that echoes "from requirement to product"). It must work small in a header and large as a mark. Use it in every comp.

## Deliverables (generate each as its own image, 1536x1024 landscape unless stated)

Reference images attached: real screenshots of the products (Central Belleza landing, Barber Central operations view, NutriPlan landing, NutriPlan dashboard, Casa Roca site, ETERIA site). When a comp shows a product, render a faithful, crisp version of that real interface, not an invented UI.

1. `logo-study.png` (1536x1024): the new logo system on white: primary wordmark large, compact monogram, header-size lockup, and the mark on honey and on brown ink fields. Clean presentation board, no mockups.

2. `especimen.png`: "Espécimen de sistema". The page as a luxurious design-system specimen: a rigorously symmetrical modular grid where each of the five products is a plate showing one real piece of its interface caught mid-state (a time slot being confirmed, a weekly plan assembling, a proposal total resolving, a date range selected, a draft flipping to published), with its purpose as a large confident caption. Large-scale type, whole color fields per plate, generous but disciplined proportion. It must feel like a printed specimen from a great type foundry, not a Bootstrap dashboard.

3. `espejo.png`: "Espejo requisito / producto". A perfectly mirrored composition around a strong central axis. Left: the business need as big, beautiful typographic requirement ("Una barbería necesita reservas y WhatsApp sin perder el día."). Right: the real Central Belleza interface that answers it, at equal visual weight. The axis is his contribution, rendered as a bold honey structural element (a fold, a hinge, a band) that visibly transforms requirement into interface. The name and role sit above the axis without the axis crossing them.

4. `gabinete.png`: "Gabinete en perspectiva invertida". A symmetrical cabinet of five compartments inspired by Korean chaekgeori screens, drawn in reverse perspective so it opens toward the viewer, rendered with rich flat mineral-pigment color in the fixed palette and fine brown outlines. Each compartment holds a crafted, illustrated artifact of one product (appointment card, weekly meal plan, event proposal, room key and reservation, a published page). The center compartment is active and widened. Illustration quality must be museum-grade, not clip art.

For every image, also write a sidecar `<name>.prompt.txt` in the same folder with the exact final prompt you used, and a `<name>.json` with `{"approved": false, "kind": "direction-comp", "generator": "codex image_generation", "syntheticData": true}`.

## Self-check before finishing

For each image, look at it and regenerate once if any of these fail: misspelled text, invented metrics or tech badges, colors outside the palette, asymmetry or unbalanced proportions, generic flat UI-kit look, the logo reads as plain text. Report the final file list.
