---
description: Execute tasks after loading AGENTS.md, CLAUDE.md, and repo docs.
argument-hint: <initiative-slug>
---

# /describe-execute

Execute a described initiative sequentially until the selected work is complete.

## Arguments

- `initiative-slug`: folder name under `docs/described/`.

The user invoked this command with: `$ARGUMENTS`

## Role

Act as an end-to-end implementation agent. Work one task at a time, keep the task registry current, and do not mark work complete without verification evidence.

## Objective

Follow:

- `docs/described/<initiative-slug>/master-plan.md`
- `docs/described/<initiative-slug>/TASKS.md`

Execute tasks until all applicable tasks are `done`, or until you hit a blocker that requires user input.

## Preflight

1. Read the initiative docs.
2. Always load the repo rule sources before implementation:
   - `AGENTS.md`, when present.
   - `CLAUDE.md`, when present.
   - Repo docs that define rules, workflows, or context, especially `docs/`, `docs/context/`, and project-specific planning or skill docs.
3. Also inspect `.codex/`, `.agents/`, README files, and package/tooling docs when they affect execution.
4. Inspect current Git status and avoid overwriting unrelated user changes.
5. Identify verification commands from repo docs and package scripts.
6. Find the first `in_progress` task, otherwise the first `not_started` task.

## Inquiry Loop

Before implementing a task, ask every question needed to avoid guessing on correctness, security, data, UX, or scope.

Do not impose an arbitrary question count. If the task is clear, proceed. If the task has many unresolved decisions, ask all material questions, numbered and grouped by topic. Continue asking follow-ups across turns until you can implement safely.

Stop and ask when ambiguity affects:

- Product behavior.
- Security, permissions, or privacy.
- Data migrations or destructive changes.
- External services, credentials, or deployment environments.
- Acceptance criteria or verification.
- Conflicts with repo instructions.

## Execution Loop

For each task:

1. Mark the task `in_progress`.
2. Load the task's required context and skills/workflows.
3. Implement the smallest coherent slice.
4. Add or update required tests.
5. Run the repo-appropriate verification gates.
6. Perform required manual QA when the task affects user-visible behavior or integrations.
7. Record evidence in `docs/described/<initiative-slug>/qa.md` and `docs/described/<initiative-slug>/manual-testing.md`.
8. Mark the task `done` only after implementation, tests, gates, and evidence are complete.
9. Continue with the next task unless the user asked for one task only or a blocker appears.

## Non-Negotiables

- Do not implement code without updating tests when tests are required.
- Do not mark a task done if gates were not run, unless you clearly record why they could not run.
- Do not hide failed verification.
- Do not overwrite unrelated user changes.
- Do not expand scope beyond the initiative docs without asking.
- Do not skip `AGENTS.md`, `CLAUDE.md`, or repo docs when they exist; these are where repo rules usually live.

## Verification

Use the repo's own commands. If none are documented, infer the smallest defensible verification set from the package manager and test setup, then state the assumption.

Prefer targeted verification while working, then run the broader changed-surface gate expected by the repo before finalizing.

## Summary

After execution, summarize:

- Tasks completed.
- Files changed.
- Tests and verification run.
- Manual QA evidence recorded.
- Remaining tasks or blockers.
