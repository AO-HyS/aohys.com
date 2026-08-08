# Development System repository adapter

Contract version: `1.2.0`
Product: `aohys.com`
Harness: `factory`

Factory uses this documented equivalent when a native Codex-only capability is unavailable.

Preserve this product's domain language, stack, commands, release policy, and visual design. Do not import another product's vocabulary. Generating or normalizing this adapter never activates a paid service; later use of declared paid agent tooling still requires repository opt-in or an explicit user invocation.

## Lifecycle interface

Both operator styles are supported:

- Automatic routing: describe directly requested implementation, review, diagnosis, research, or QA normally. `drive-development-flow` loads only that matching flow and never infers a special planning stage or expands authority. Recommendation-only requests remain read-only.
- Explicit routing: invoke the exact phase command when you want direct control.

Explicit phase commands:

- `/wayfinder`: optional discovery outside the normal lifecycle; explicit invocation only.
- `/grill-with-docs`: requirements; explicit invocation only and stop for human approval.
- `/to-spec`: spec plus Local Visual Plan; explicit invocation only and stop for human approval.
- `/to-tickets`: executable slices; explicit invocation only and stop for human approval.
- `/flow-implement`: one named terminal slice; run the autonomous development loop only inside the request's existing authority and stop at the pinned human boundary. Tests, validation, review, correction, and proportional QA are development substeps and grant no external-state authority.
- `/flow-code-review`: independent review of an existing branch or pull request.
- `/working-backwards`: customer-first feature definition through the three persisted approval gates; it produces an implementation map but never authorizes implementation.

Before implementation, pin one objective, constraints, exact scope, required evidence and validation, a verifiable stop condition, and every human or external-state boundary. A native goal is created only on explicit request; its persistence never expands authority or scope.

Commit, push, pull-request, preview, and deploy state changes occur only when the request and repository policy authorize them. Merge, release, and production remain separate exact human authorizations. Neither automatic nor explicit phase routing grants promotion authority.

## Delivery policy

- Ordinary implementation and pre-push feedback use the changed-validation command. A full repository suite is never implicit.
- Full certification runs once for the integrated change when explicitly requested or required by the repository release policy.
- QA is selected by observable risk. Documentation, labels, copy, icons, and internal-only changes do not inherit browser or E2E work without a mapped surface.
- Parallel or sequential implementation lanes converge before `develop`; Git carries their history, and `develop` produces one shared branch preview without manual SHA bookkeeping.
- Provider readiness for auth, data migrations, seeds, roles, and environment contracts is proven before the shared preview merge when those surfaces changed.

## Operational prerequisite

Repository adapter readiness is structural, not proof of skill loading. Synchronize global skill catalog `0.6.0` and verify that the active Codex or Factory harness discovers these commands plus `drive-development-flow` and `working-backwards`. T3Code shares the Codex adapter structurally but has no independent live command proof in this release.

Global `exa-search` is paid public-web retrieval. This adapter only declares its availability and never calls or activates it. A repository opt-in or explicit user invocation is required, and every request must receive no secrets, private source, customer data, PHI, PII, private URLs, or private identifiers. Global `global-agent-guardrails` must be enabled and audited separately; it is defense in depth, not authorization or a sandbox.

## Stack rules

- React: preserve component locality, accessibility, and existing visual design; use the configured validation and QA commands. React Doctor is advisory unless this repository explicitly configures it as a gate.
- Convex: require argument and return validators, explicit authorization boundaries, indexed bounded reads, and the repository's configured validation command.

## Repository commands

Review

- pnpm run lint

Changed validation

- pnpm run quality:changed

Full certification

- pnpm run quality:certify

Provider readiness

- pnpm run quality:provider-readiness

Legacy validation alias

- pnpm run verify:changed

QA

- pnpm run test

Preview

- pnpm run cloudflare:local

## Architecture diagnostic

`improve-codebase-architecture` is manual and proposal-only. It must propose deepening before any separately authorized refactor.
