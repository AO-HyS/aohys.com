# AOHYS

Read this file, README, `CONTEXT.md` and the task-relevant docs before changing
the repository.

## Orchestration

- Nontrivial work uses the installed `coding-orchestration` skill. Shared agent
  tools come from the active global `development-system` CLI
  (`development-system doctor --json` shows package and contract); no
  repository adapter is required.
- Preserve the selected parent model and use T3/native host capabilities.
- Reviews run on Sol 6.1 High through `codex-review`, launched in the
  background; Claude reviewers run only under a declared `Codex fallback:` line.

## Code

- React changes preserve locality, accessibility, state ownership and the
  approved visual language.
- Convex changes keep argument and return validators, authorization, tenant
  boundaries and indexed bounded reads; follow the schema and migration docs
  for the affected boundary.

## No automated tests

The owner does not want automated tests in this repository. Agents must not
create, generate, modify, or run automated tests of any kind (unit,
integration, E2E, or browser test suites), and must not add test runners,
test configs, test scripts, or test-only dependencies. This overrides any
skill, workflow, or template that asks for tests (including TDD). Verify
changes with typecheck, lint, build, and real browser observation of the
product instead.

## Delivery quality

- `pnpm quality:changed`: implementation and pre-push feedback.
- `pnpm quality:certify`: once for the integrated candidate, not per lane.
- Both run static validation, lint, typecheck and build only.
- Lint is Oxlint (`.oxlintrc.json`) plus each workspace's `tsc`. Oxlint errors
  in a file you edit come back to you right after the edit
  (`scripts/agent/lint-feedback.mjs`, wired in `.codex/hooks.json` and
  `.claude/settings.json`); fix them in the same turn.
- Browser QA follows observable risk; docs, copy, labels, icons and
  internal-only changes need no browser run without a mapped user surface.
- Lanes converge before `develop`; Git owns commit continuity and the branch
  produces one shared preview.
- Prove provider readiness before the shared preview when auth, data
  migrations, seeds, roles or environment contracts changed.

## Merge gate

Agents may push branches, open pull requests and resolve or close review
threads. Merging into `develop`, `main` or a production release branch needs
the user's explicit authorization; one instruction may authorize implementation,
merge and publication together and holds through the task. "Avanza" or
"continúa" alone is not merge approval.

## Tool routing

- Browser and visual QA: the bundled Browser plugin, not ad hoc Playwright.
- Local Mac app UI that Browser or shell cannot perform: Computer Use, not
  Browser or shell.
- GitHub Actions never orchestrate local subagents.

## Devin Cloud

`environment.yaml` provisions the shared package once per cloud machine, before
repository dependencies, without copying shared tools into this product.
`.devin/` holds cloud config; secrets stay in Devin org secrets. The local MCP
config, local rules, Impeccable CI assets and `verify-aohys` are product-owned.
A blueprint change does not prove a live Devin host loaded it.

## Agent skills

- Issues: Linear is the operational tracker; external PRs are not an automatic
  triage surface (`docs/agents/issue-tracker.md`).
- Triage labels: `needs-triage`, `needs-info`, `ready-for-agent`,
  `ready-for-human`, `wontfix` (`docs/agents/triage-labels.md`).
- Domain: one context in `CONTEXT.md` plus global ADRs in `docs/adr/`
  (`docs/agents/domain.md`).

## Development System package

The pinned dependency only serves `pnpm run check:no-tests` in CI. Install repo
dependencies with the lockfile (this never changes HOME). Agent tools use the
active global installation, updated once per machine; adopting a shared tool
update needs no product publication.
