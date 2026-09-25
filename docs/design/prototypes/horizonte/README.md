# Horizonte pastel — motion prototype

Disposable design prototype for the AOHYS public-landing redesign, in the
approved **Horizonte pastel** direction (round 6, seed `90569fd1` re-roll 5,
candidate 6). Interior pages use the **Ma** language: one fine protagonist
line traveling through active empty space. This is a design artifact: it does
not modify `apps/`, `packages/`, `DESIGN.md`, or any product surface, and it
is not wired to any build or deploy.

Authority: `.impeccable/mocks/decision/aohys-20260923-r6/horizonte.png` (home
comp), `ma.png` (interior language), `ref-user-pin.png` (daylight reference),
`apps/site/.impeccable/surfaces/apps-site-src-pages-index-astro.md`,
`docs/design/landing-redesign-brief.md` (rounds 5–6 and chat confirmations).

## Open it

```sh
cd docs/design/prototypes/horizonte
python3 -m http.server 8130
# then open http://127.0.0.1:8130/
```

Any static file server works. Opening `index.html` via `file://` mostly works
too, but the EN/ES toggle and fonts behave best over HTTP.

Pages:

- `index.html` — home. `?p=<slug>` preselects a product
  (`the-barber-central`, `nutri-plan`, `eteria`, `casa-roca`, `aohys`).
- `caso.html?p=the-barber-central` — case study (any `?p=` slug works).
- `trayectoria.html` — the seven-role trajectory in the Ma system.
- `?lang=en` forces English; the toggle persists to `localStorage`.

## What is real vs synthetic

Real:

- Lens textures and case imagery are sanitized copies of published AOHYS
  assets (`apps/site/public/images/proof/`) plus the current published AOHYS
  homepage screenshot. ETERIA has no public operations-interface capture, so
  its lens shows the landing's garden-table photograph and says so in the alt
  text and caption.
- All facts: names, roles, dates, statuses, purposes, contributions,
  decisions, links. Sources: `packages/content-graph/src/locales/{es,en}.json`
  and the approved narrative
  (`opportunity-os/docs/candidate-narrative.json`, condensed into
  `content.js`). No metrics, clients, or claims were invented.
- The Barber Central case mirrors the approved case-study structure:
  purpose, contribution, decisions, interface, next project, live preview
  link.

Synthetic:

- The three "ghosts" in orbit — `v1 · boceto`, `v2 · prototipo`, `entrega` —
  are illustrative wireframe drawings generated in code (`ghostSVG` in
  `home.js`). They symbolize the fail → learn → redo loop; they are not
  historical artifacts.
- The `aohys` wordmark SVG is a provisional recreation of the comp's fine
  lowercase logo with the continuous o–h stroke; it is not an approved logo.
- The daylight leaf shadows are decorative SVG blurs standing in for the
  comp's soft photographic shadows.
- Fonts (Spectral + Jost) load from Google Fonts for the prototype only; the
  production contract requires self-hosting.

## Motion spec

The signature transition (project switching), ~1100 ms:

| Phase   | Time    | What happens                                                                                                                                                                                                                                            |
| ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inhale  | 0–32%   | Refraction strength rises, a liquid ripple travels through the lens, the sphere grows ~4%, orbit ghosts begin traveling with an ease-in, connectors retract and part labels fade, page daylight starts its quiet hue shift.                             |
| Swirl   | 28–62%  | The current interface swirls/dissolves through the lens (rotation increases toward the rim); at 45% the content swaps: ghosts become the next product's versions, labels and captions change.                                                           |
| Resolve | 45–75%  | The next interface resolves from the lens center outward through a soft noise front; the lens tint crosses to the next pastel.                                                                                                                          |
| Settle  | 60–100% | One damped overshoot on the sphere's scale; ghosts overshoot their new slots by ~1.9× and come to rest; connectors redraw and labels slide back in beside their ghosts (outer side, or above/below when the viewport is narrow); daylight wash settles. |

Supporting motion: idle breathing on the sphere, slow orbit drift, three
beads traveling the orbit paths, pointer parallax on the lens (dead zone,
6%/frame lerp), daylight leaf shadows swaying over 28–36 s. The "Cómo
trabajo" loop runs a single honey dot around five stations (fail fast → move
fast → fail → learn → build again), highlighting each in turn, only while in
view. Interior pages draw the Ma line with scroll (stroke-dashoffset against
the first node below 66% of the viewport); nodes fill with pastel as the line
reaches them. The line runs in the gutter beside each block and turns only in
the empty band between blocks, so it never crosses copy. Home → case navigation uses the cross-document View
Transitions API: the clicked lens/orb morphs into the case hero orb over
~760 ms, with a plain crossfade where unsupported.

Input: click, ARIA tablist (Arrow/Home/End with roving tabindex), arrow keys
on the focused lens, and horizontal swipe on the stage. Rapid selection
coalesces — last wins; retargeting is free before 30% progress and queued
(a shortened 780 ms follow-up) after.

## Fallbacks and limits

- WebGL2 first (`#version 300 es`), WebGL1 fallback from the same shader
  source; if neither works, a CSS `clip-path` circular reveal with the same
  timing runs instead. Context loss swaps to the CSS lens; context restore
  re-initializes the scene.
- `prefers-reduced-motion`: no animation frames run, no ripple, no drift; the
  swap is immediate with a ~180 ms crossfade; the Ma line draws fully and the
  loop is static. Changes to the preference apply live.
- Rendering pauses when the hero leaves the viewport or the tab is hidden.
  DPR caps at 1.5 (desktop) / 1 (mobile and coarse pointers).
- Mobile (≤760px): the stage crops to viewport width, orbits 2 and 3 hide,
  ghosts shrink, part labels become a static caption row, and the tab bar
  becomes a scroll-snapping rail.

## Files

```
index.html        home
caso.html         case study (Ma)
trayectoria.html  career (Ma)
styles.css        shared system
site.js           chrome, i18n, Ma line, view-transition source
lens.js           WebGL2/WebGL1 refractive sphere
home.js           stage, ghosts, labels, selector, sections
case.js, tray.js  page controllers
content.js        copy + project data (condensed from approved sources)
assets/           local copies of real imagery (JPEG-converted)
review/           verification screenshots (review/r2: final round)
```

Fonts are the only network dependency (Google Fonts, prototype-only).
