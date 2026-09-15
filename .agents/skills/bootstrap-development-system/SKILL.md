---
name: bootstrap-development-system
description: Audit and prepare a new or existing Git repository for Alejandro Ortiz Corro's global agent-driven Development System. Use when creating a repository, onboarding a repository to Codex or T3 Code, refreshing stale Development System adapters, or checking whether lifecycle routing, product architecture guidance, and explicit phase commands are structurally ready. Do not use this skill to install a release train, configure hosting, or deploy.
---

# Bootstrap Development System

Prepare one repository for the canonical multi-harness agent workflow without importing another product's rules.

## Keep the boundary exact

- Manage only `.development-system/repository.json` and `.codex/development-system/repository.md`; retire only the legacy `.factory/development-system/repository.md` adapter.
- Preserve product domain, stack, design, package scripts, instructions, branch policy, release train, hosting, secrets, and paid services.
- Preserve both interfaces: automatic lifecycle inference and explicit phase commands.
- Treat T3 Code as a Codex-compatible client surface unless live evidence proves more.
- Emit the canonical product architecture baseline: domain ownership, module boundaries, dependency direction, file placement, React composition, component design, backend and type contracts, tests, documentation, performance/security, observability, and migration sequencing.
- Define component boundaries by cohesion, responsibility, state ownership, composition, and public Interfaces—not arbitrary line counts.
- Keep agent guardrails, global anti-slop policy, and Release Train design Development System-owned. Never duplicate them as product architecture workstreams; only verify that the product exposes compatible real commands.
- Keep `improve-codebase-architecture` manual and proposal-only.
- Never treat file presence as proof that a skill was loaded or influenced behavior.
- Never commit, push, open or merge a PR, deploy, promote, or activate a service unless separately authorized.
- Leave `bootstrap-release-train` untouched. Report missing review, validation, QA, or preview commands as product-owned gaps; do not create fake commands to make readiness green.

## Run the workflow

1. Resolve the repository root and read every applicable `AGENTS.md` before mutation.
2. Inspect `git status` and preserve existing changes.
3. Run a read-only audit first:

   ```sh
   python3 "${CODEX_HOME:-$HOME/.codex}/skills/bootstrap-development-system/scripts/bootstrap-development-system.py" \
     --repository /absolute/path/to/repository \
     --json
   ```

4. If the user authorized repository preparation, apply the adapter:

   ```sh
   python3 "${CODEX_HOME:-$HOME/.codex}/skills/bootstrap-development-system/scripts/bootstrap-development-system.py" \
     --repository /absolute/path/to/repository \
     --apply \
     --json
   ```

   Let the script select `initialize-repository` when the managed contract is absent, `normalize-repository` when an existing adapter needs preparation, and a no-op when the existing adapter is already prepared.

5. Inspect the final JSON. Require:
   - no `unexpectedChangedPaths` or `preExistingChangedPaths`;
   - all writes confined to `managedFiles` and any removal confined to `retiredManagedFiles`;
   - a post-transition audit bound to the current repository fingerprint;
   - explicit readiness and gaps for Codex and T3 Code;
   - `architectureBaseline` points to the installed architecture reference pack and separates product dimensions from Development System-owned capabilities;
   - no external side effects.
6. Run the repository's own focused validation only when one already exists and is safe. Do not confuse that product check with adapter readiness.
7. Summarize the selected transition, managed files, detected stack and commands, readiness by harness, residual gaps, global-installation warning, and the next separately authorized step.

## Choose the canonical CLI

Prefer `--development-system /absolute/path/to/development-system` when the canonical checkout is known. Otherwise let the script resolve, in order:

1. `AOHYS_DEVELOPMENT_SYSTEM_CLI`;
2. `aohys-development-system` on `PATH`;
3. `~/Documents/AO/.worktrees/development-system-current/bin/development-system`;
4. `~/Documents/AO/development-system/bin/development-system`.

Reject an unresolved or non-executable CLI instead of reconstructing the contract locally. The Development System repository remains the sole generator and source of truth.

## Interpret readiness honestly

- `prepared`: the repository adapter and its declared commands are structurally ready.
- `needs-preparation`: the adapter may exist, but the audit found concrete gaps such as missing review, validation, QA, or preview commands, inert skills, or foreign-product residue.
- `loaded` and `influenced`: require current, fingerprint-bound live harness evidence; structural bootstrap alone must leave them false.

Use `--require-prepared` only in CI or a deliberate acceptance check. Ordinary audit and bootstrap should still return useful JSON when gaps remain.

## Re-run safely

Re-run `--apply` after adding real product commands or changing repository instructions. Initialization and normalization are idempotent, reversible through Git, and must never modify files outside the managed namespace.
