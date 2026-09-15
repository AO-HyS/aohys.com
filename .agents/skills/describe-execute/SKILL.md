---
name: describe-execute
description: Use when the user invokes /describe-execute or asks to execute a described initiative task list after loading AGENTS.md, CLAUDE.md, repo docs, and the initiative QA/manual testing files.
---

# Describe Execute

Use this skill when the user asks for `/describe-execute <initiative-slug>` or wants Codex to execute tasks from `docs/described/<slug>/TASKS.md`.

## Workflow

1. Parse the initiative slug. If missing, ask for it before writing files.
2. Load `docs/described/<slug>/TASKS.md` plus the initiative planning files, especially `plan.md`, `blueprint.md`, `decisions.md`, `qa.md`, and `manual-testing.md`.
3. Always load repo rule sources before execution:
   - `AGENTS.md`, when present.
   - `CLAUDE.md`, when present.
   - Repo docs that define rules, workflows, or context, especially `docs/`, `docs/context/`, and project-specific planning or skill docs.
4. Select the next unblocked task from `TASKS.md`.
5. Implement the smallest coherent change for that task.
6. Update `TASKS.md` statuses and progress notes as tasks move through pending, in progress, blocked, and done.
7. Update initiative QA and manual testing files with what changed, what was verified, and any residual risk.
8. Continue executing unblocked tasks until the initiative is complete or a real blocker needs user input.

## Verification

Use the repo's own verification commands. If none are documented, infer the smallest defensible verification set from the package manager and test setup, then state the assumption.

Record:

- Commands run.
- Pass/fail result.
- Manual QA performed.
- Blockers or skipped checks with reasons.

## Rules

- Follow repo-specific mandates and naming conventions.
- Treat `AGENTS.md`, `CLAUDE.md`, and repo docs as first-class rule sources. If they conflict, surface the conflict before executing tasks that depend on it.
- Do not mark work complete without updating `TASKS.md`, `qa.md`, and `manual-testing.md`.
- Keep edits scoped to the active task unless a dependency is required.
