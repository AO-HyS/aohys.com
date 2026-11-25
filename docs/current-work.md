# Current work — public site design hill climb (R9 close-out, R10+)

Canonical root: `/Users/corrortiz/Documents/AO/aohys`. Branch
`design/hill-climb-r9-20261122`, based on `develop` `d8a3aec`. No PR yet.
Merge into `develop` needs the owner's explicit OK; nothing goes to `main`.

Goal: every public route of `apps/site` (26 routes, EN + ES) passes the blind
design jury: mean >= 8.5, every judge >= 8.0, no critical defects.

## Jury (owner decision 2026-11-24)

Sol 6.1 High, Opus 5.5 High, GLM 5.3 Flash (opencode), Neon High
(Antigravity). Opus is also the author, so the scoreboard reports a mean
without it. Prompts, captures, scores and the plan live outside the repository
in `~/.development-system/private/aohys-hill-climb/` (`r10-plan.md`).

Keep rule per round: no new critical defects; mean up by at least 0.03 (or more
pages pass with a non-negative mean); no edited page drops more than 0.1; no
untouched page drops more than 0.2 or loses PASS. Two rounds without a kept
change is a plateau.

## Commits on the branch

- `04caa1c` R9 design: clearer public actions, evidence moved up.
- `6cf3c6b` mobile navigation above page transitions.
- `baa626c` mobile menu closes outside the header, lens keeps moving on
  retarget, header above view transitions, contact summary 44px + focus ring,
  NutriPlan full screenshot link mobile-only in a new tab.
- `ef0cd7a` R10 candidate: Ma line reaches the hero bottom, smaller case h1,
  NutriPlan mobile name-column crop, "Product evidence" heading, Spanish
  leftovers.

## Scores

- `r0-j4` (old R0 captures): 7.71 mean, 17 pages with a critical defect.
- `r9-full` (`6cf3c6b`): 8.18 mean (8.30 without Opus), 2 critical (NutriPlan
  mobile crop EN/ES), 0/26 pass.
- `r10` (`ef0cd7a`): jury running.

No automated tests; checks are `pnpm quality:changed` and T3 browser
observation.
