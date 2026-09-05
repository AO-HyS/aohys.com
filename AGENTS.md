# AOHYS Agent Instructions

Read this file before changing the repository.

## Coding orchestration

For every non-trivial coding task, load the global `coding-orchestration` skill and use the global Codex agents from `${CODEX_HOME:-$HOME/.codex}/agents`. Their TOML files are the single source of truth for model, reasoning, and sandbox selection; do not add repo-local model maps, routers, or custom-agent copies.

Keep trivial direct answers, one-line read-only checks, and tiny localized edits on the parent agent. For delegated work, prefer parallel read-only discovery and verification, keep one writer by default, and preserve the dependency gates defined by the global skill.

Visual planning remains opt-in. Non-trivial completion, requested reviews and
spec explanations use the shared Development System document command and template.

## Merge gate

Agents may push branches, open pull requests, and resolve or close review threads as part of normal execution. Do not merge any PR or branch into `develop`, `main`, or production release branches unless the user explicitly authorizes that merge. One instruction may authorize
implementation, merge and publication together; retain it through the task.
General instructions like "avanza" or "continua" alone are not merge approval.

## Delivery quality

- Use `pnpm quality:changed` for ordinary implementation and pre-push feedback.
- Run `pnpm quality:certify` once for the integrated candidate, not once per implementation lane.
- Select E2E and Browser QA from observable risk. Documentation, copy, labels, icons, and internal-only changes do not require browser ceremony without a mapped user surface.
- Parallel or sequential lanes converge before `develop`; Git owns commit continuity and the branch produces one shared preview without manual SHA bookkeeping.
- Prove provider readiness before the shared preview when auth, data migrations, seeds, roles, or environment contracts changed.

## Tool routing

- Use the bundled Browser plugin for browser and visual QA.
- Use Computer Use for local Mac app UI work that Browser or shell cannot perform.
- Do not replace Browser verification with ad hoc Playwright.
- Do not replace Computer Use with Browser or shell when local Mac app UI operation is the task.
- Do not use GitHub Actions to orchestrate local subagents.

## Agent skills

### Issue tracker

Linear is the operational tracker for AOHYS; external pull requests are not an automatic triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix` labels. See `docs/agents/triage-labels.md`.

### Domain docs

AOHYS uses a single domain context through `CONTEXT.md` and global ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## Development System package

Read `.codex/development-system/repository.md` for the active shared process.
The pinned development dependency supplies the shared contract and skills. Run
`pnpm ds setup` explicitly after adopting a release; dependency installation
never changes HOME. Use the installed global roster for models and effort.
Astra owns decisions, design, review and Computer Use; OpenCode Go is the first
bounded implementation route. Keep product tokens, architecture and release
rules here; Impeccable and focused interface skills complement that context.
