# Agent Execution

This document defines the execution-only agent workflow for AOHYS. Visual planning and visual recap are separate review artifacts; this policy is for assigning execution workers, models, and tools while code is being changed or verified.

## Execution Shape

The orchestrator owns the goal, worker assignment, heartbeat, escalation, and final gate. Workers own narrow tasks and return evidence: files changed, commands run, browser observations, screenshots, logs, or explicit blockers.

Default loop:

1. Assign a worker from the task surface.
2. Run the smallest useful command or tool pass.
3. Heartbeat with status, evidence, and next step.
4. Escalate when risk or repeated failure appears.
5. Finish only after the repo gate for the change passes.

Start a repo-local execution run with:

```sh
pnpm run agent:start -- --goal "Implement the change" --file apps/dashboard/src/main.tsx
```

The command writes `agent-runs/<timestamp>-<slug>/execution-run.md` and `execution-run.json`. Workers in the same wave can be launched in parallel. A later wave waits for the evidence from its dependencies.

Repo-local automatic usage is declared in `AGENTS.md`: agents should run `pnpm run agent:start` before non-trivial execution work, then launch workers by wave when the host supports subagents. If subagent tooling is unavailable, the same wave order is still the execution checklist.

## Model Tiers

| Tier | OpenAI model | Use in this repo |
| --- | --- | --- |
| `fast` | `gpt-5.4-nano` | Repo search, file maps, log summaries, heartbeat summaries, cheap classification. |
| `fast` | `gpt-5.4-mini` | Focused subagents, Browser QA, Computer Use, small edits, structured checks. |
| `balanced` | `gpt-5.4` | Available for normal implementation, but this repo defaults implementation workers to `gpt-5.5` low reasoning. |
| `deep` | `gpt-5.5` | Orchestration at `xhigh`, normal implementation at `low`, Convex/auth/release/review at `high` or `xhigh`. |
| `deep` | `gpt-5.4-pro`, `gpt-5.5-pro` | Human-selected escalation only; not automatic default routing. |
| `restricted-preview` | `gpt-5.6` | Not routed by default; only if explicitly available and intentionally selected. |
| `specialized` | `gpt-5.3-codex`, `gpt-5.4-cyber`, `o3-deep-research`, `o4-mini-deep-research`, `computer-use-preview` | Use only when that product surface is explicitly configured. Local Codex execution still uses this repo's workers. |
| `specialized` | `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1-mini`, `gpt-realtime-2`, `gpt-realtime-translate`, `gpt-realtime-whisper`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `sora-2`, `sora-2-pro`, embeddings | Use only for their media, audio, transcription, video, or retrieval job, not code execution. |

The router lives in `packages/core/src/agent-execution.ts`. Its model list should be refreshed when OpenAI changes the public model catalog.

## Worker Surfaces

| Worker | Default model | Tool surface | Job |
| --- | --- | --- | --- |
| `orchestrator` | `gpt-5.5` | shell | Goal ownership, heartbeat, escalation, and final gate decisions. |
| `scout` | `gpt-5.4-nano` | shell | Find files, tests, routes, commands, logs, and contracts. |
| `implementer` | `gpt-5.5` | shell | Make scoped normal code changes with low reasoning after the orchestrator has done the hard thinking. |
| `convex-specialist` | `gpt-5.5` | convex | Convex schema/functions, auth/session boundaries, data safety, runtime contracts. |
| `browser-qa` | `gpt-5.4-mini` | Browser plugin | Localhost, preview, production, route, responsive, accessibility, and VAR evidence. |
| `computer-operator` | `gpt-5.4-mini` | Computer Use plugin | Local Mac UI actions that Browser or shell cannot perform. |
| `reviewer` | `gpt-5.5` | shell | Behavioral risk, missing tests, privacy, release, and data-loss review. |
| `release-manager` | `gpt-5.5` | shell | Release train, environment checks, smoke commands, and promotion readiness. |

Browser work must use the bundled Browser plugin. Do not replace it with ad hoc Playwright for this workflow. Computer Use must be reserved for local Mac app UI actions and must follow the plugin confirmation policy before risky UI actions.

## Routing Rules

Route to `scout` when the task is only discovery: search, map, list, summarize, or identify likely files.

Route to `browser-qa` when the task mentions visible behavior, routes, localhost, preview, responsive states, accessibility, screenshots, or VAR.

Route to `computer-operator` when the task requires operating a local Mac app UI by clicking, typing, dragging, scrolling, or changing visible app settings.

Route to `convex-specialist` when the task touches Convex schema/functions, Better Auth, sessions, environment variables, secrets, deploy/release, migrations, dashboard runtime contracts, or a repeated failure.

Route to `implementer` for scoped code changes after discovery is complete and no high-risk signal is present.

Escalate to `gpt-5.5` when:

- the same problem fails twice;
- the change can lose data;
- auth, secrets, environment, release, or Convex contracts are involved;
- Browser QA reveals a behavior mismatch the implementer cannot explain;
- the worker cannot state the cause and evidence clearly.

## Gates

Use `pnpm run verify:precommit` for normal code changes. Use `pnpm verify` before meaningful PRs or release-bound changes. Add Browser evidence for visible UI changes and release smoke commands for promotion work.
