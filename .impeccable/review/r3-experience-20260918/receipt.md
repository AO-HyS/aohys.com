# Two executable experience mocks — 18 September 2026

Authorized endpoint: rough, navigable design proposals to help choose between
Sobreimpresión and Firma en movimiento. Neither is selected. Product source,
release and publication remain unchanged.

## Access

- https://bringing-dealing-sudden-barn.trycloudflare.com/sobreimpresion/
- https://bringing-dealing-sudden-barn.trycloudflare.com/firma/

Temporary Cloudflare tunnel to a read-only static server on 127.0.0.1:61847.
Server session 46051; tunnel session 70360. The server exposes only prototype
HTML, CSS, JS, images and font files. `.env` and server source return 404;
traversal to the repository root was rejected. `caffeinate -i -t 14400` keeps
idle sleep from interrupting the current review for four hours; connectivity
and process lifetime still govern availability.

Run command and content provenance: `docs/design/prototypes/r3-experience/README.md`.
Base revision: `552a7941cf78924abc98975be90f3f82396bc421`, with existing dirty
design artifacts preserved. Only mock directories, shared assets, brief and
review evidence were added/updated in this turn.

## Observed behavior

Browser plugin / Computer Use, Chrome extension browser 1:

- Both remote entries rendered their profile, full-stack positioning, one main
  action and project imagery. Images loaded; carousel covered six cases.
- Next-project controls changed the project; intermediate outgoing/incoming
  images were observed. Rapid sequences ended at the latest requested case.
- Keyboard Enter activated carousel controls. Reduced-motion checkbox kept
  navigation working and settled the selected image without the masked reveal.
- Opened NutriPlan case, architecture, CV, work and contact in both directions.
  CV rendered all seven roles from the updated source. Public contact links
  were inspected; no mail was sent.
- Cross-direction links retained the route, including CV to CV.
- Desktop 1440px and mobile 390px viewport checks; the scrollable mobile
  content area was 375px with the browser scrollbar. No horizontal overflow
  observed in the checked home/CV states.
- No browser error/warning logs in the checked sessions. No product tests or
  certification suite required for this isolated throwaway static mock.
- `node --check` passed for both app scripts and shared content; `git diff
--check` passed. `remote-assets.json` records HTTP status and SHA-256 of all
  final served assets, compared byte-for-byte with local files.
- Temporary viewport overrides reset; two default-size home tabs retained as
  deliverables with motion enabled. Runtime model identity not independently
  attested beyond the tool-provided agent roles.

Source-defined motion: Sobreimpresión project reveal 620ms, route transition
390ms; Firma masked project reveal 600ms, route transition 400ms, SVG line draw.
This is a working sketch of motion, not performance benchmarking or a final
production animation specification.

## Independent visible critique

Reviewer `mock_visual_review` inspected twelve working screenshots against
`overprint-v2.png` and `moving-signature-v2.png`. It found one material issue:
the original fixed comparison toolbar obscured page content. Both designers
moved the controls to normal flow above the header. The reviewer confirmed
the affected Firma home/CV mobile and architecture desktop states; the initial
Sobreimpresión capture set already included the correction.

Conformity: profile-first hierarchy, restrained palette, single focal project,
distinct compositions, readable architecture and seven-role CV. The reviewer
reported no unresolved material visual blockers for the requested rough mock.
Equal Sobreimpresión contact paths were checked separately in Browser DOM,
since that section was outside the reviewer's homepage crop.

Limits: no direction selected, no production acceptance, no live contact
submission, no actual print/PDF output checked. Static review does not validate
motion; interaction checks above are separate. The print button invokes the
browser print dialog but a finished downloadable CV is outside this mock.
