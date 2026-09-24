# Current work

- Root: `/Users/corrortiz/Documents/AO/aohys`
- Branch: `claude/landing-horizonte` (from `develop` at `79c4686`)
- Task: migrate the approved Horizonte pastel (home) and Ma (interior pages)
  redesign from `docs/design/prototypes/horizonte/` into `apps/site`, applying
  round-7 feedback. Brief: `docs/design/landing-redesign-brief.md`.

## Done

- Home: WebGL lens stage with the four-phase project switch, orbit ghosts and
  labels, big AOHYS title, work list, "How I build", career strip, two paths.
- Every public page in Ma: case studies (6), case index, architecture,
  practice, resume (career timeline), contact (form behavior unchanged),
  privacy, and the 404 page.
- Prototype logo (`AohysLogo.astro`) and prototype type: Spectral (display)
  and Jost (text), self-hosted through Fontsource.
- All automated tests removed at the owner's request; `AGENTS.md` forbids
  adding or running tests. Verification is typecheck, lint, build and
  screenshots in the owner's Google Chrome.

## Open

- `.codex/development-system/repository.md` and
  `.development-system/repository.json` still list a `test` command; they are
  managed Development System files and belong to the pending DS 1.29.1
  adoption, which stays uncommitted on this branch (root `package.json` bump
  kept in the working tree).
- New capture of the redesigned AOHYS site for its lens texture.
