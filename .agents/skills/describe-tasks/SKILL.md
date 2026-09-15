---
name: describe-tasks
description: Use when the user invokes /describe-tasks or asks to generate or regenerate TASKS.md for a described initiative after loading AGENTS.md, CLAUDE.md, and repo docs.
---

# Describe Tasks

Use this skill when the user asks for `/describe-tasks <initiative-slug>` or wants to generate or regenerate `TASKS.md` for an initiative in `docs/described/<slug>/`.

## Workflow

1. Parse the initiative slug. If missing, ask for it before writing files.
2. Load the initiative folder under `docs/described/<slug>/`, especially `README.md`, `master-plan.md`, `blueprint.md`, `plan.md`, `decisions.md`, `qa.md`, and `manual-testing.md`.
3. Always load repo rule sources before task generation:
   - `AGENTS.md`, when present.
   - `CLAUDE.md`, when present.
   - Repo docs that define rules, workflows, or context, especially `docs/`, `docs/context/`, and project-specific planning or skill docs.
4. Inspect relevant source, tests, package scripts, and tooling before finalizing tasks.
5. Regenerate `docs/described/<slug>/TASKS.md` as an executable task registry.

## TASKS.md Requirements

Include:

- Task ID, title, status, owner/agent lane, dependencies, and changed surface.
- Acceptance criteria.
- Implementation notes grounded in repo context.
- Required verification commands adapted to the repo.
- Manual QA expectations.
- A progress log area.

Tasks must be small enough to execute independently and ordered by dependency, risk, and feedback value.

## Rules

- Do not implement product code.
- Do not invent scope beyond the described initiative.
- Follow repo-specific mandates and naming conventions.
- Treat `AGENTS.md`, `CLAUDE.md`, and repo docs as first-class rule sources. If they conflict, surface the conflict before generating tasks that depend on it.
