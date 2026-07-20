# Development System repository adapter

Contract version: `0.7.0`
Product: `aohys.com`
Harness: `factory`

Factory uses this documented equivalent when a native Codex-only capability is unavailable.

Preserve this product's domain language, stack, commands, release policy, and visual design. Do not import another product's vocabulary or activate paid services.

## Stack rules

- React: preserve component locality, accessibility, and existing visual design; use the configured validation and QA commands. React Doctor is advisory unless this repository explicitly configures it as a gate.
- Convex: require argument and return validators, explicit authorization boundaries, indexed bounded reads, and the repository's configured validation command.

## Commands

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
