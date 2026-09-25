# Catalogue motion study

Standalone, local design-session prototype. It demonstrates project switching;
it is not an implementation of the proposed landing or either depicted product.

## Media

Both PNGs are unmodified copies of browser captures observed on 2026-09-16.

- `media/barber-current-hero.png`: supplied source
  `/Users/corrortiz/.development-system/private/design/aohys-landing-2026-09-16/references/barber-current-hero.png`.
- `media/nutriplan-current-hero.png`: supplied source
  `/Users/corrortiz/.development-system/private/design/aohys-landing-2026-09-16/references/nutriplan-current-hero.png`;
  reference site recorded in the session brief:
  `https://nutriplan-landing.a-ortizcrr.workers.dev/`.

The selected composition reference is
`.impeccable/mocks/decision/aohys-20260916-r1/living-catalogue-v3.png`.
That generated image is not used as project evidence or embedded in this study.
Role text follows the selected composition's supplied role caption. This study
does not independently certify professional scope or product outcomes.

## Interaction

- User selection runs a 650 ms clip-path reveal over the outgoing capture,
  with a -2% horizontal outgoing drift and synchronized title/role crossfade.
  Easing: `cubic-bezier(.22,1,.36,1)`.
- Rapid selection coalesces to the last requested project after the active
  transition. No route change, automatic carousel, timer loop or canvas.
- Replay repeats the reveal into the selected project from the other capture.
- Reduced motion swaps immediately. The checkbox and live operating-system
  preference both apply; the system's reduced-motion setting takes precedence.
- Responsive CSS preserves the same controls, elements and in-memory state.
  No overlays or nested dismissal/focus layers are introduced.
- Images retain their original full frame and are noninteractive. There are no
  external fonts, assets, requests, data writes or dependencies.

## Run

From the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/design/prototypes/catalogue-motion
```

Open `http://127.0.0.1:8765/`. Browser verification is owned by the parent lane.
