# Current work

- Root: `/Users/corrortiz/Documents/AO/aohys`
- Branch: `claude/landing-horizonte` (from `develop` at `79c4686`)
- Task: migrate the approved Horizonte pastel (home) and Ma (interior pages)
  redesign from `docs/design/prototypes/horizonte/` into `apps/site`, applying
  round-7 feedback. Brief: `docs/design/landing-redesign-brief.md`.

## Done

- Home: WebGL lens stage with the four-phase project switch, orbit ghosts and
  labels, big AOHYS title, work list, "How I build", career strip, two paths.
- Interior pages in Ma: case studies, case index, architecture, practice,
  resume (career timeline), contact (form behavior unchanged), privacy.
- New header/footer, Mona Sans (width axis) type system, `horizonte.css`.
- Checks: `astro check`, `astro build`, `impeccable detect`, browser captures.

## Open

- User confirmation: typeface and wordmark are provisional.
- Existing site tests assert the previous Sunlit markup
  (`apps/site/test/public-shell-build.test.ts`, `source-quality.test.ts`,
  `scripts/quality/product-verification-feature-map.test.mjs`); they need
  updating once the user authorizes test changes.
- Review in the user's own browser; new capture of the redesigned AOHYS site
  for its lens texture.
- The pre-existing staged Development System adoption and `.impeccable/` mocks
  are unrelated to this commit and remain staged.
