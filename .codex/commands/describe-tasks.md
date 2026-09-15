---
description: Generate TASKS.md after loading AGENTS.md, CLAUDE.md, and repo docs.
argument-hint: <initiative-slug>
---

# /describe-tasks

Turn an initiative plan into an executable task registry.

## Arguments

- `initiative-slug`: folder name under `docs/described/`.

The user invoked this command with: `$ARGUMENTS`

## Role

Act as a planning-to-execution translator. Your output should let an implementation agent execute the initiative task by task without rediscovering the whole plan.

## Objective

Generate or update `docs/described/<initiative-slug>/TASKS.md`.

The task registry must be ordered, atomic, testable, and specific enough to execute.

## Inputs

Read these first:

- `AGENTS.md`, when present
- `CLAUDE.md`, when present
- Repo docs that define rules, workflows, or context, especially `docs/`, `docs/context/`, and project-specific planning or skill docs
- `docs/described/<initiative-slug>/master-plan.md`
- `docs/described/<initiative-slug>/blueprint.md`
- `docs/described/<initiative-slug>/plan.md`
- `docs/described/<initiative-slug>/decisions.md`, if present
- Existing `docs/described/<initiative-slug>/TASKS.md`, if present
- `.codex/`, `.agents/`, README files, and package/tooling docs when they affect task execution

## Inquiry Loop

Ask every question needed before rewriting the task registry.

Do not impose an arbitrary question count. If the plan is already clear, ask nothing and proceed. If there are many unresolved decisions, ask all material questions, numbered and grouped by topic. Continue asking follow-ups across turns until scope, dependencies, verification, and safety constraints are clear enough to produce executable tasks.

Ask especially when any of these are unclear:

- In-scope vs out-of-scope boundaries.
- Task dependency order.
- Permissions, security, privacy, or compliance posture.
- Data model, migration, or external integration requirements.
- Required verification and acceptance criteria.
- Which tasks should be split to avoid risky large changes.
- Which work requires manual QA or release/preview validation.

## Task Rules

- Preserve completed task status unless the underlying plan invalidates it; if you change completed work, explain why.
- Every task must include tests or an explicit N/A with justification.
- Every task must include acceptance criteria checkboxes.
- Every task must include context to read, including `AGENTS.md`, `CLAUDE.md`, and repo docs when present.
- Every task must include skills or workflows to load when applicable.
- Status values must be: `not_started`, `in_progress`, `blocked`, or `done`.
- Tasks must be ordered by dependency.
- No scope creep. If requested work is not supported by the initiative docs, ask or record it as out of scope.

## Output Format

Write `docs/described/<initiative-slug>/TASKS.md` with:

- Purpose and source docs.
- Status legend.
- Recommended verification commands, adapted to the repo.
- Tasks grouped by phase or workstream.

Each task must include:

- ID.
- Status.
- Why.
- What.
- How.
- Files or areas.
- Context to read.
- Skills or workflows to load.
- Tests.
- Acceptance criteria.
- Depends on.

## Summary

After writing, summarize:

- Number of tasks created or updated.
- Blocking questions or assumptions.
- First task to execute.
- Recommended next command: `/describe-execute <initiative-slug>`.
