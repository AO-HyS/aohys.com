# AOHYS Agent Instructions

Read this file before changing the repository.

## Coding orchestration

For every non-trivial coding task, load the global `coding-orchestration` skill and use the global Codex agents from `${CODEX_HOME:-$HOME/.codex}/agents`. Their TOML files are the single source of truth for GPT-5.6 model, reasoning, and sandbox selection; do not add repo-local model maps, routers, or custom-agent copies.

Keep trivial direct answers, one-line read-only checks, and tiny localized edits on the parent agent. For delegated work, prefer parallel read-only discovery and verification, keep one writer by default, and preserve the dependency gates defined by the global skill.

Visual planning and visual recap are separate artifacts. Do not run them as part of normal execution unless the user asks for them.

## Merge gate

Agents may push branches, open pull requests, and resolve or close review threads as part of normal execution. Do not merge any PR or branch into `develop`, `main`, or production release branches unless the user explicitly approves that merge after reviewing the result. General instructions like "avanza", "haz todo", or "continua" are not merge approval.

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
