# Codex correction pass: AOHYS round 5b

Use your native image generation tool to EDIT the three attached comps (in this order: especimen.png, espejo.png, gabinete.png) and write the corrected versions into `.impeccable/mocks/decision/aohys-20260923-r5b/` as `especimen-v2.png`, `espejo-v2.png`, `gabinete-v2.png`, each with a `.prompt.txt` holding the exact prompt used and a `.json` of `{"approved": false, "kind": "direction-comp", "generator": "codex image_generation", "syntheticData": true, "correctionOf": "<original>.png"}`. The fourth attachment is `logo-study.png` (transparent background): it is the ONE logo to use. Do not edit any other file and do not commit.

Keep each comp's composition, illustration quality, real product screenshots and palette (white, brown ink #473C33, honey #FEC868, olive #ABC270, apricot #FDA769). Only make these corrections:

## All three comps must become a landing page first viewport (1536x1024)

- Slim header across the top: the logo from logo-study.png (the rounded "aohys" ligature wordmark, brown ink) at left; nav at right exactly "Trabajo · Cómo trabajo · Trayectoria · CV · Contacto · EN/ES".
- Clearly readable identification: "Alejandro Ortiz Corro" with the role line exactly "full stack development", plus the sentence exactly "Desarrollo productos desde los requisitos hasta la entrega. Mi mayor fortaleza está en frontend." Place it symmetrically on the page axis; the products remain the dominant visual.
- Exactly one primary action: a honey pill button "Conoce mi trabajo".
- Never print the direction name as a heading: remove "Espécimen de sistema" and "Gabinete en perspectiva invertida" entirely.
- Replace any other logo variant (leaf marks, cut h, pinwheel) with the logo from logo-study.png.

## Per comp

- especimen: keep the five colored plates and real screenshots. Make room for the header and identification block by slightly reducing plate height, preserving perfect symmetry. On the aohys plate, remove the invented text ("Un trabajo más humano", "Ideas, sistemas, experiencias…", "Diseño para organizar…"); show instead a clean web page layout with the new logo and the sentence "Desarrollo productos desde los requisitos hasta la entrega." The ETERIA plate may stay the illustrated proposal folio.
- espejo: remove the four decorative leaf clusters in the corners and the leaf/pinwheel mark on the honey axis. Add the "Conoce mi trabajo" button centered under the requirement text or at the base of the axis, keeping the mirror balance. Replace the header logo with the logo-study wordmark.
- gabinete: strengthen true reverse perspective (each compartment's back wall visibly wider than its front opening). Put the identification block and CTA centered above the cabinet in place of the removed title. Keep product labels and the illustrated artifacts. Remove the ornamental emblem dividers above and below if they crowd the header.

## Self-check

Look at each result; regenerate once if text is misspelled, the direction name still appears, the logo differs from logo-study.png, a metric or tech badge was invented, or symmetry broke. Report the final file list.
