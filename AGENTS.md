# AOHYS Agent Instructions

Read this file before changing the repository.

## Coding orchestration

The active global `development-system` CLI supplies shared agent tools. Run
`development-system doctor --json` to inspect the active package and contract.
Read this file, README, CONTEXT.md and task-relevant docs; no repository adapter
is required. Use the installed `coding-orchestration` skill for nontrivial work.
Preserve the selected parent model and use T3/native host capabilities.

React changes preserve locality, accessibility, state ownership and the approved
visual language. Convex changes retain argument and return validators,
authorization, tenant boundaries and indexed bounded reads; follow schema and
migration docs for the affected boundary.

## Merge gate

Agents may push branches, open pull requests, and resolve or close review threads as part of normal execution. Do not merge any PR or branch into `develop`, `main`, or production release branches unless the user explicitly authorizes that merge. One instruction may authorize
implementation, merge and publication together; retain it through the task.
General instructions like "avanza" or "continua" alone are not merge approval.

## Delivery quality

- Use `pnpm quality:changed` for ordinary implementation and pre-push feedback.
- Run `pnpm quality:certify` once for the integrated candidate, not once per implementation lane.
- Both gates run static validation, lint, typecheck and build only; they run no automated tests.
- Select Browser QA (real observation of the running product) from observable risk. Documentation, copy, labels, icons, and internal-only changes do not require browser ceremony without a mapped user surface.
- Parallel or sequential lanes converge before `develop`; Git owns commit continuity and the branch produces one shared preview without manual SHA bookkeeping.
- Prove provider readiness before the shared preview when auth, data migrations, seeds, roles, or environment contracts changed.

## No automated tests

The owner does not want automated tests in this repository. Agents must not
create, generate, modify, or run automated tests of any kind (unit,
integration, E2E, or browser test suites), and must not add test runners,
test configs, test scripts, or test-only dependencies. This overrides any
skill, workflow, or template that asks for tests (including TDD). Verify
changes with typecheck, lint, build, and real browser observation of the
product instead.

Reviews run on Sol 6.1 High through `codex-review`, launched in the background;
Claude reviewers run only under a declared `Codex fallback:` line.

## Tool routing

- Use the bundled Browser plugin for browser and visual QA.
- Use Computer Use for local Mac app UI work that Browser or shell cannot perform.
- Do not replace Browser verification with ad hoc Playwright.
- Do not replace Computer Use with Browser or shell when local Mac app UI operation is the task.
- Do not use GitHub Actions to orchestrate local subagents.

## Devin Cloud

`environment.yaml` provisions the shared package once per cloud machine, before
repository dependencies. It does not copy shared tools out of this product.
`.devin/` holds cloud-specific config; secrets remain in Devin org secrets.
The local MCP config, local rules, Impeccable CI assets and `verify-aohys` remain
product-owned. A blueprint change does not prove a live Devin host loaded it.

## Agent skills

### Issue tracker

Linear is the operational tracker for AOHYS; external pull requests are not an automatic triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix` labels. See `docs/agents/triage-labels.md`.

### Domain docs

AOHYS uses a single domain context through `CONTEXT.md` and global ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## Development System package

The pinned dependency is used only by `pnpm run check:no-tests` in CI. Install
repo dependencies with the lockfile; this never changes HOME. Agent tools use
the active global installation and are updated once per machine. No product
publication is needed to adopt a shared tool update.
