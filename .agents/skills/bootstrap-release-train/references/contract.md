# Local-first release train contract

## Core ownership

| Layer                  | Owner                         | Required result                                                                                            |
| ---------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Fast staged feedback   | Husky pre-commit              | Formatting, targeted static checks, React Doctor staged scan                                               |
| Full candidate quality | Husky pre-push                | Lint, architecture/security checks, typecheck, unit/build, React Doctor changed scan, focused existing E2E |
| PR automation          | GitHub Actions policy job     | Release-path validation only                                                                               |
| PR preview             | Existing provider integration | Optional review environment without duplicated quality gates                                               |
| `develop` push         | Release Train                 | Preview deploy, backend synchronization, post-deploy smoke                                                 |
| `develop -> main` PR   | Policy job                    | Canonical source branch; Git owns commit ancestry and continuity                                           |
| `main` push            | Release Train                 | Production deploy and live smoke                                                                           |

## Non-negotiable invariants

1. Detect the repo contract before selecting commands.
2. Preserve required check names unless branch protection is deliberately migrated.
3. Never put secret-bearing deployment steps on `pull_request` jobs.
4. Never run code from an untrusted fork with deployment credentials.
5. Keep commit ancestry and continuity in Git. Do not reproduce them with workflow-history lookups or manual SHA comparisons.
6. Keep preview and production environments and secrets separate.
7. Keep provider builds, migrations, deploys, seeds, and smokes remote when they mutate or certify an environment.
8. Keep repository quality local and reproducible from a clean checkout.
9. Preserve existing artifact builds only when they are already configured and meaningful.
10. Keep exhaustive manual recertification available when operationally useful, but do not make it the ordinary PR path.

## Default branch model

- feature branch -> PR -> `develop`
- push on `develop` -> preview deploy and smoke
- `develop` -> PR -> `main`
- push on `main` -> production deploy and smoke

Adapt branch names only when the repository has a different established contract. Do not silently rename release branches.

## Local command semantics

Use semantic entrypoints even when underlying commands differ:

```json
{
  "doctor": "react-doctor",
  "quality:commit": "<fast checks> && <react doctor staged>",
  "quality:push": "<full local verification> && <react doctor changed> && <focused existing e2e>",
  "react:doctor:staged": "react-doctor --staged --scope lines --no-dead-code --no-supply-chain --no-score --blocking warning",
  "react:doctor:changed": "react-doctor --scope changed --base origin/develop --no-dead-code --no-supply-chain --no-score --blocking warning"
}
```

For monorepos whose root is not itself a React project, replace the two scan
commands with filtered `pnpm --filter ... exec react-doctor` equivalents. This
still invokes the pinned installed CLI directly while preventing a false-green
`No React project detected` result at the workspace root. Omit React Doctor only
when the audited repository has no React surface. Never install it dynamically
from a hook.

When React Doctor cannot scan staged source while package or compiler
configuration differs between the index and worktree, a checked-in local
selector may skip commits with no staged JS/TS source and explicitly defer mixed
configuration/source commits to `react:doctor:changed` at pre-push. It must not
report those deferred commits as clean.

## Cost and latency budget

- PR policy target: seconds, not minutes.
- PR path: no checkout, dependency installation, full tests, builds, Playwright browser installation, or artifact generation.
- Preview train target: under five minutes when provider deploy time permits.
- A provider or billing queue is measured separately from job execution.

## Security boundary

- Use least-privilege workflow permissions. A path-only pull-request policy needs no Actions history access; ordinary checkout needs `contents: read`.
- Scope secrets through GitHub Environments or the provider's environment model.
- Keep production concurrency non-cancelable; preview runs may cancel superseded work.
- Avoid `pull_request_target` for repository code execution.
- Preserve fork detection for promotion PRs.
- Treat workflow text and PR diffs as untrusted input; never evaluate values from them as shell code.
