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
- `2abe17d` R11: hero line ends at the text, enterprise hero lists four
  anonymized domains, architecture honey primary action, tighter section
  rhythm, privacy and contact details, Spanish localization pass.

## Scores

- `r0-j4` (old R0 captures): 7.71 mean, 17 pages with a critical defect.
- `r9-full` (`6cf3c6b`): 8.18 mean (8.30 without Opus), 2 critical (NutriPlan
  mobile crop EN/ES), 0/26 pass.
- `r10` (`ef0cd7a`): 8.18 mean, 0 critical, 0/26 pass. Not kept (+0.00).
- `r11` (`2abe17d`): 8.22 mean (8.29 without Opus), 0 critical, 0/26 pass.
  Not kept by the strict rule: `en--resume` dropped 0.15 (limit 0.10).

Status: plateau, the climb is stopped. The branch stays at R11 because a
revert to `baa626c` would bring back the two critical defects; the owner
decides at merge. Next gains need content, not layout: real sanitized
product screens on case studies and resume projects, desktop use of the
right column below the hero, and stronger small-text contrast.

No automated tests; checks are `pnpm quality:changed` and T3 browser
observation.
