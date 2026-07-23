# Quality Scorecard

`pnpm quality:scorecard` is the repository's machine-readable local quality
profile. It does not replace existing gates; it runs them sequentially, records
their duration and result, and writes schema `1.0.0` JSON under
`output/quality-scorecard/`.

## Commands

- `pnpm quality:scorecard -- --plan`: print the resolved profile without running it.
- `pnpm quality:scorecard -- --gate lint,typecheck`: run selected gates.
- `pnpm quality:scorecard`: run the complete core profile.
- `pnpm quality:scorecard:test`: verify the scorecard contract.

`block` failures make the command fail. `observe` failures remain visible in
the report without blocking and are reserved for explicitly documented
migrations. Impeccable is blocking after its repo rules were calibrated.
Reports are local artifacts and must not contain credentials.

## Orchestration receipt

Every report exposes `gateResult`, gate start/finish timestamps, and the
runner-observed attempt count. A parent harness can correlate the gate run with
the agent execution by supplying these optional environment variables:

- `QUALITY_TASK_ID`
- `QUALITY_ORCHESTRATION_RUN_ID`
- `QUALITY_PARENT_RUN_ID`
- `QUALITY_HARNESS`
- `QUALITY_AGENT_ROLE`
- `QUALITY_MODEL`
- `QUALITY_REASONING`
- `QUALITY_ATTEMPT`
- `QUALITY_INPUT_TOKENS`
- `QUALITY_CACHED_INPUT_TOKENS`
- `QUALITY_OUTPUT_TOKENS`
- `QUALITY_COST_USD`

The scorecard records only supplied values. An absent model, token count, or
cost means the harness did not expose it; the runner never guesses those
values. `runId` remains the identifier of this quality-gate run, while
`orchestrationRunId` and `parentRunId` provide optional cross-run correlation.
Run IDs include a random UUID to remain collision-resistant. Gate timeouts send
`SIGTERM` and escalate to `SIGKILL` after a short grace period, so an
uncooperative child cannot leave the scorecard hanging indefinitely.
`latest.json` is published atomically under a lock and only advances to the
newest-started full run; abandoned locks are recovered by owner identity (or
age for malformed legacy locks), and selected-gate reports cannot overwrite it.

Do not invent budgets from one run. Collect five clean sequential runs on the
same machine, use the median as the baseline, and review any gate above 1.25x
that baseline. Promote a time budget or an observed quality gate to blocking
only after false positives and variance have been reviewed.

## Current local baseline

On 2026-07-23, five sequential full runs produced a 22.282s median
(22.073–22.892s, 1.39% coefficient of variation). The 28s wall budget and
per-gate budgets are intentionally `observe` until the same profile has enough
CI-runner evidence to promote them safely.
