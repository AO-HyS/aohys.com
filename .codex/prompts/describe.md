---
description: Start a described initiative after loading AGENTS.md, CLAUDE.md, and repo docs.
argument-hint: <initiative-slug> <problem statement>
---

# /describe

Create a self-contained initiative folder for a repository, populated with real planning content.

## Arguments

- `initiative-slug`: kebab-case folder name under `docs/described/`.
- `problem statement`: the user-facing problem or outcome to plan.

The user invoked this command with: `$ARGUMENTS`

## Role

Act as an initiative planner. Your job is to understand the desired outcome deeply enough to write useful planning artifacts, not to implement code.

## Objective

Create `docs/described/<initiative-slug>/` and write:

- `README.md`
- `master-plan.md`
- `blueprint.md`
- `plan.md`
- `TASKS.md`
- `decisions.md`
- `qa.md`
- `manual-testing.md`
- `artifacts/.gitkeep`

Populate every file with initiative-specific content derived from the problem statement, repo context, and inquiry loop.

## Preflight

1. Parse the arguments. If either the slug or problem statement is missing, ask for the missing input before writing files.
2. Inspect the repo before asking questions. Prefer local context over asking the user for facts that are already in files.
3. Always load the repo rule sources before planning:
   - `AGENTS.md`, when present.
   - `CLAUDE.md`, when present.
   - Repo docs that define rules, workflows, or context, especially `docs/`, `docs/context/`, and project-specific planning or skill docs.
4. Also inspect `.codex/`, `.agents/`, README files, and relevant package/tooling docs when they affect the initiative.
5. Identify the likely work surfaces: frontend, backend, data, auth, billing, deployment, docs, QA, or other repo-specific domains.

## Inquiry Loop

Ask every question needed to remove material ambiguity before writing the initiative docs.

Do not impose an arbitrary question count. If one question is enough, ask one. If forty questions are genuinely needed, ask all forty. Number the questions clearly, group related questions under short headings, and keep asking follow-up questions across turns until the plan is specific enough to execute safely.

Prioritize questions about:

- Exact user-facing outcome.
- Primary users, roles, and workflows.
- In-scope and out-of-scope boundaries.
- Existing behavior and desired behavior.
- Data model, persistence, migrations, and backfills.
- Permissions, security, privacy, and compliance constraints.
- Integrations, external services, and environment requirements.
- UI/UX expectations, copy, accessibility, and responsive behavior.
- Rollout, feature flags, compatibility, and migration strategy.
- Verification, acceptance criteria, manual QA, and release gates.
- Risks, unknowns, dependencies, and non-goals.

Stop asking only when you can write a coherent blueprint, phased plan, initial task registry, QA plan, and manual testing plan without guessing on important scope, security, or correctness details.

## Writing Rules

- Do not implement product code.
- Use ASCII unless the repo already requires another character set.
- Follow repo-specific mandates and naming conventions.
- Treat `AGENTS.md`, `CLAUDE.md`, and repo docs as first-class rule sources. If they conflict, surface the conflict before writing plans that depend on the disputed rule.
- Keep scope tight. Record non-goals explicitly.
- Use available skills or documented project workflows when they apply.
- If repo instructions conflict with this command, follow the repo instructions and note the conflict.

## Output Requirements

Write these files:

- `README.md`: goal, scope, links, and gates.
- `blueprint.md`: problem, desired outcome, constraints, non-goals, and acceptance criteria.
- `master-plan.md`: workstreams, phases, guiding constraints, expected skills/context, and gates.
- `plan.md`: concrete phases with deliverables, verification approach, risks, and mitigations.
- `TASKS.md`: initial executable task registry with ordered atomic tasks.
- `decisions.md`: initial decisions and open decisions.
- `qa.md`: planned QA passes tailored to initiative risk.
- `manual-testing.md`: manual verification script tailored to the user flow.
- `artifacts/.gitkeep`: placeholder for evidence and generated artifacts.

Each initial task in `TASKS.md` should include:

- Status.
- Why.
- What.
- How.
- Files or areas likely affected.
- Context to read.
- Skills or workflows to load.
- Tests or an explicit N/A with justification.
- Acceptance criteria.
- Dependencies.

## Summary

After writing files, summarize:

- Created paths.
- Key decisions.
- Open questions, if any.
- Recommended next command: `/describe-tasks <initiative-slug>` or `/describe-execute <initiative-slug>`.
