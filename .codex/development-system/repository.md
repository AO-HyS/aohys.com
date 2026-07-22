# Development System repository adapter

Contract version: `0.8.0`
Product: `aohys.com`
Harness: `codex`

Codex uses the native repository adapter; T3Code shares this Codex contract and state namespace.

Preserve this product's domain language, stack, commands, release policy, and visual design. Do not import another product's vocabulary or activate paid services.

## Lifecycle interface

Both operator styles are supported:

- Automatic routing: describe the software goal normally. `drive-development-flow` may classify or recommend the next stage, but a recommendation never starts a manual stage or grants authority.
- Explicit routing: invoke the exact phase command when you want direct control.

Explicit phase commands:

- `$wayfinder`: optional discovery outside the normal lifecycle; explicit invocation only.
- `$grill-with-docs`: requirements; stop for human approval.
- `$to-spec`: spec plus Local Visual Plan; stop for human approval.
- `$to-tickets`: executable slices; stop for human approval.
- `$flow-implement`: one named terminal slice; run the autonomous implementation-review-correction loop only inside the request's existing authority and stop at the pinned human boundary.
- `$flow-code-review`: independent review of an existing branch or pull request.

Commit, push, pull-request, preview, and deploy state changes occur only when the request and repository policy authorize them. Merge, release, and production remain separate exact human authorizations. Neither automatic nor explicit phase routing grants promotion authority.

## Operational prerequisite

Repository adapter readiness is structural, not proof of skill loading. Synchronize global skill catalog `0.2.0` and verify that the active harness discovers these commands plus `drive-development-flow`.

## Stack rules

- React: preserve component locality, accessibility, and existing visual design; use the configured validation and QA commands. React Doctor is advisory unless this repository explicitly configures it as a gate.
- Convex: require argument and return validators, explicit authorization boundaries, indexed bounded reads, and the repository's configured validation command.

## Repository commands

Review

- pnpm run lint

Validation

- pnpm run verify:ci

QA

- pnpm run test

Preview

- pnpm run cloudflare:local

## Architecture diagnostic

`improve-codebase-architecture` is manual and proposal-only. It must propose deepening before any separately authorized refactor.
