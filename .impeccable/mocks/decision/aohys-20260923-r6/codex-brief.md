# Codex image brief: AOHYS landing, round 6

Use your native image generation tool (`image_generation`). Write outputs only
into `.impeccable/mocks/decision/aohys-20260923-r6/`. Do not write code, do not
edit other files, do not commit.

## Why this round is different

The owner rejected every earlier proposal as generic, boring and "nothing to do
with me". Those proposals all arranged his name plus product screenshots or
objects in a layout. This round is built from a taste calibration he completed
and confirmed. Follow it literally.

## Confirmed taste (owner's own words in quotes)

- "Cosas limpias, hermosas." Bright, airy, clean. "Me gusta el blanco con el café, claro. Me gustan los colores pasteles."
- His emotional reference (attached image `user-pin`): a bright Scandinavian interior, white walls, light wood, natural daylight, a glass door opening into a calm room, small mustard accents. Take its light, air, calm and the sense of looking through a threshold. Do not draw a house or furniture.
- Worlds he liked: a clean civic landing with one soft 3D object on white; a black-hole horizon page with fine, widely spaced type; a particle-detector page where evidence emerges from collisions; a fashion page where "one pull" transforms a cape. Shared quality: ONE protagonist with depth, everything else calm; fine precise type; generous space.
- Worlds he rejected: ornament, retro, collage, hand-drawn, pixel, dense grids, nostalgia, dark instrument panels, busy magazines.
- His energy: "Soy alegre, me gusta construir cosas, me apasiona hablar de productos y transformarlos en sistemas. Me gustan las cosas claras y limpias."
- His way of thinking: "Fallar rápido, moverme rápido, fallar, aprender, volver a hacer."

## Fixed identity

- Palette (pastel versions confirmed by the owner): white #FFFFFF and café/brown ink #473C33 as the base; pastel honey #FCE3A6, pastel olive #D6E2B4, pastel apricot #FDD2B1 as soft fields and light. Small touches of the full-strength honey #FEC868 are allowed for the single primary button. No blue, cyan, violet, mint, black, neon, dark backgrounds, heavy gradients or glassmorphism.
- Typography: fine, precise, generously spaced. A light-to-regular refined sans or a delicate contemporary serif for display; never heavy or condensed. Do not use or imitate Inter, Space Grotesk, IBM Plex, Playfair, Fraunces, Cormorant, DM Sans, Outfit, Plus Jakarta.
- Logo: the earlier logos were rejected. In each comp draw a quiet, refined "aohys" wordmark in fine lowercase with one subtle ownable detail (for example a continuous stroke joining o and h). Same logo in every comp.

## Product truth

- Name "Alejandro Ortiz Corro". Role line exactly "full stack development". Sentence exactly: "Desarrollo productos desde los requisitos hasta la entrega. Mi mayor fortaleza está en frontend."
- Nav: "Trabajo · Cómo trabajo · Trayectoria · CV · Contacto · EN/ES". One primary action: "Conoce mi trabajo".
- Products: The Barber Central (public brand Central Belleza: reservas, WhatsApp y operación), NutriPlan (consulta y seguimiento entre citas), ETERIA (propuestas y operación de eventos), Casa Roca (estancia y reservaciones), aohys (publicación del trabajo). When a comp shows a product, render the real interface faithfully from the attached screenshots, unaltered (never insert the aohys logo into a product screenshot).
- Never invent metrics, client logos, tech badges or claims. Sample data inside interfaces is illustrative.
- No photos of people. No video.

## Deliverables: desktop first viewport, 1536x1024 landscape each

1. `horizonte.png` — "Horizonte pastel". Bright white page. At the center, one large translucent soft sphere lit by daylight, like a lens: through it the real Central Belleza interface is visible, gently magnified. Around the sphere, two or three faint orbit lines carry ghosted earlier versions of the product (wireframe, rough prototype), showing iteration. Fine labels unfurl from the sphere naming parts ("Reservas", "WhatsApp", "Operación"). Name, role and sentence above in fine type, centered; the button below. Everything else calm and empty.

2. `iteracion.png` — "Iteración visible". Bright white page with soft daylight. At the center, the real NutriPlan dashboard emerges as a crisp floating panel with gentle depth; behind it, two translucent earlier versions (a sketch-like wireframe and a rough prototype) offset like trails, in pastel olive and apricot tints, so the viewer reads "fallar → aprender → volver a hacer". A tiny fine caption under each ghost: "v1", "v2", "entrega". Identity block and button calm above or at left, perfectly proportioned.

3. `borde.png` — "Borde iridiscente". Almost entirely white and quiet. One large soft rounded white form (like a cloud body, but clean and geometric enough to feel designed) holds the real Casa Roca site inside it; only its edge glows with a thin band of pastel honey, olive and apricot, like light diffracting at a cloud edge. Text achromatic brown, thin humanist sans, wide margins.

4. `ma.png` — "Ma: espacio activo". Pale plaster-white page. A single elegant line (a fine brown stroke with a pastel olive highlight) rises from the real ETERIA interface panel placed low and off-center, bending toward the name block placed high on the opposite side, leaving a charged, balanced triangle of empty space. Three small pastel accents only. Feels calm, deliberate, perfectly proportioned, not random.

For every image write `<name>.prompt.txt` (exact final prompt) and `<name>.json` with `{"approved": false, "kind": "direction-comp", "generator": "codex image_generation", "syntheticData": true, "round": "r6"}`.

## Self-check before finishing

Look at each image. Regenerate once if: text misspelled, a direction name printed as a heading, colors outside the pastel palette or a dark background, heavy or condensed type, product screenshot altered or logo inserted into it, invented metrics, cluttered composition, more than one protagonist. Report the file list and any remaining defect honestly.
