---
name: describe
description: Use when the user invokes /describe or asks to create a described initiative after loading AGENTS.md, CLAUDE.md, and repo docs. Creates docs/described/<slug>/ planning artifacts through an inquiry loop that asks as many questions as needed.
---

# Describe Initiative

Use this skill when the user asks for `/describe <initiative-slug> <problem statement>` or otherwise wants to create a described initiative.

## Workflow

1. Parse the initiative slug and problem statement from the user message. If either is missing, ask for the missing input before writing files.
2. Inspect the repository before asking questions.
3. Always load repo rule sources before planning:
   - `AGENTS.md`, when present.
   - `CLAUDE.md`, when present.
   - Repo docs that define rules, workflows, or context, especially `docs/`, `docs/context/`, and project-specific planning or skill docs.
4. Also inspect `.codex/`, `.agents/`, README files, and relevant package/tooling docs when they affect the initiative.
5. Ask every question needed to remove material ambiguity before writing docs. Do not impose an arbitrary question count; ask one question if one is enough, or all needed questions if many are required.
6. Keep asking follow-up questions across turns until the plan is specific enough to execute safely.
7. Create `docs/described/<initiative-slug>/` with:
   - `README.md`
   - `master-plan.md`
   - `blueprint.md`
   - `plan.md`
   - `TASKS.md`
   - `decisions.md`
   - `qa.md`
   - `manual-testing.md`
   - `artifacts/.gitkeep`

## Rules

- Do not implement product code.
- Follow repo-specific mandates and naming conventions.
- Treat `AGENTS.md`, `CLAUDE.md`, and repo docs as first-class rule sources. If they conflict, surface the conflict before writing plans that depend on it.
- Keep scope tight and record non-goals explicitly.
- Use available skills or documented project workflows when they apply.
