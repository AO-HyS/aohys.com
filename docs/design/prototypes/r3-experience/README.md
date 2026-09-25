# Two experience mocks — 18 September 2026

Throwaway, Spanish design previews. Neither direction is selected for the real
site. Request: extend the shortlisted Sobreimpresión and Firma en movimiento
compositions to project pages, architecture and CV, with working motion.

Run from the repository root:

```sh
python3 docs/design/prototypes/r3-experience/serve.py
```

Open `http://127.0.0.1:61847/sobreimpresion/` or `/firma/`.
Each has home, six project cases, architecture, CV and contact views. The mock
does not submit forms, store selections or modify the published site. The
utility control links to the other experience; direction selection remains in
the existing Impeccable review/chat.

## Motion hypotheses

- **Sobreimpresión:** honey, olive and apricot planes align over the project
  image. A short masked transition introduces the next case. Color and layout
  extend to the content pages; text remains readable.
- **Firma en movimiento:** one restrained olive path connects the personal
  introduction to the project and continues through architecture and career.
  The path redraws while the next image is revealed.
- Both use explicit actions, rapid-action cancellation and reduced motion.
  There is no autoplay or scroll interception.

## Sources and boundaries

- Profile-first, full-stack positioning, equal collaboration paths and palette:
  current user confirmations in `../../landing-redesign-brief.md`.
- References: final `overprint-v2.png` and `moving-signature-v2.png` under
  `.impeccable/mocks/decision/aohys-20260917-r3/` at the repository root.
- Public product images: current landing screenshots from `catalogue-motion`
  and existing public ETERIA / Casa Roca media in `apps/site/public/images/proof`.
- Two schematic diagrams in `shared` were authored for this preview. They
  explain responsibilities and a workflow, not measured results or real UI.
- Product summaries: public content graph, with enterprise descriptions
  superseded by the candidate's 18 September corrected experience.
- CV: `opportunity-os/docs/candidate-experience.md` and `candidate-voice.md`.
  Historical job titles and date ranges retained; private app/client names,
  unconfirmed metrics and the stale resume PDF excluded.
- Mona Sans: existing local Fontsource package; license copied alongside font.

Authorized endpoint: temporary remote review. No production edits, commit,
merge or release. Base revision: `552a7941cf78924abc98975be90f3f82396bc421`.
