---
name: bootstrap-release-train
description: Audit, install, migrate, or simplify a repository release train into a local-first contract with Husky, lint-staged, the React Doctor CLI, focused existing E2E, lightweight pull-request policy, preview deployment from develop, and production promotion from main. Use when adopting an old or new repository, reducing slow or expensive GitHub Actions, standardizing develop-to-main releases, preserving existing Cloudflare, Convex, Vercel, or mobile artifact deployment behavior, or diagnosing whether a release train matches this contract.
---

# Bootstrap Release Train

Build the release train from the repository's current deployment truth. Keep quality local, keep environment mutation remote, and preserve any deployment or mobile artifact path that already works.

## 1. Establish the boundary

1. Read every applicable `AGENTS.md` and repo-local deployment/testing instruction.
2. Inspect worktrees and dirty state. Never clean or overwrite unrelated changes.
3. Confirm the requested terminal boundary: local implementation, PR, merge to `develop`, preview verification, or production promotion.
4. Treat `main`/production as a separate authorization boundary unless the user explicitly includes it.
5. Read [references/contract.md](references/contract.md) completely.

## 2. Audit before editing

Run the bundled read-only auditor from the target repository:

```sh
node "${CODEX_HOME:-$HOME/.codex}/skills/bootstrap-release-train/scripts/audit-release-train.mjs" --repo . --live
```

Use `--json` for machine-readable output or `--output <path>` to preserve an audit artifact. `--live` may query GitHub rulesets and required checks through authenticated `gh`; it never changes remote state.

Resolve from evidence:

- package manager and pinned version;
- existing lint, typecheck, unit, build, E2E, architecture, security, and provider checks;
- preview and production branches and environments;
- Cloudflare, Convex, Vercel, or other deployment ownership;
- current required check names and workflow filenames;
- existing Android/iOS artifact jobs;
- provider secrets and environment scoping without printing secret values.

If deployment ownership is ambiguous, stop before replacing workflows. Present the evidence and the smallest unresolved decision.

## 3. Select the adapter

Read only the relevant section of [references/provider-patterns.md](references/provider-patterns.md):

- Cloudflare or Convex deployment owned by GitHub Actions;
- Vercel Git integration owned deployment;
- an existing provider workflow that must be retained;
- an existing mobile artifact build.

Use files under `assets/templates/` as starting contracts, not blind replacements. Preserve stable workflow names, job names, environment names, secrets, aliases, project identifiers, deploy ordering, and smoke commands unless evidence requires a migration.

## 4. Install the local quality boundary

1. Preserve the repository's package manager and pinned version.
2. Add or reuse Husky, lint-staged, and Prettier.
3. Pin `react-doctor` to an exact version and invoke its CLI directly. In a monorepo whose root is not a React project, use a filtered `pnpm ... exec react-doctor` workspace command so every React app is actually scanned. A checked-in local staged-file selector may wrap that command when it explicitly skips non-source commits and defers mixed configuration/source commits to the pre-push changed scan. Do not use `npx`, `pnpm dlx`, or runtime package injection in hooks.
4. Define these semantic scripts using the repo's real commands:
   - `doctor`: direct `react-doctor` entrypoint so the CLI recognizes the installation;
   - `quality:commit`: fast deterministic checks plus `react:doctor:staged`;
   - `quality:push`: the full local gate plus `react:doctor:changed` and focused E2E when an existing selector is available;
   - `react:doctor:staged`: staged lines only;
   - `react:doctor:changed`: branch diff against `origin/develop` or the detected integration branch.
5. Make `.husky/pre-commit` run lint-staged and `quality:commit`.
6. Make `.husky/pre-push` reject any dirty tree before running `quality:push`.
7. Run the normal package installation and confirm Husky generated `.husky/_`; verify `core.hooksPath` points to it.

Keep commit-time feedback short. Put typecheck, broad unit tests, builds, and focused E2E in pre-push unless the repository proves they are cheap enough for pre-commit.

Do not invent E2E or mobile artifact infrastructure. Preserve and focus what already exists; document an absent capability as absent.

## 5. Simplify the remote train

Implement these invariants:

1. Feature PR into `develop`:
   - run one stable, lightweight policy check;
   - do not checkout, install packages, run repository quality, or download browsers;
   - allow provider-native PR previews to run independently when already configured.
2. Push to `develop`:
   - deploy preview using the existing provider adapter;
   - deploy/sync Convex when it is part of the existing contract;
   - run credential-free or narrowly credentialed post-deploy smoke checks;
   - publish preview URL/evidence when the provider supports it.
3. PR from canonical `develop` to `main`:
   - reject forks and any other source branch;
   - let Git and the pull request preserve commit ancestry and continuity;
   - do not query workflow history or compare commit SHAs in the policy job;
   - keep preview readiness as its native branch deployment/check, without copying its identity into a second gate;
   - retain the existing required check name when branch protection depends on it.
4. Push to `main`:
   - deploy production through the existing adapter;
   - preserve deployment ordering and smoke the live environment;
   - record provider deployment IDs or artifact digests automatically when they are needed for rollback or external provenance.
5. Manual quality:
   - keep exhaustive remote quality available only as `workflow_dispatch` when useful for recovery or independent recertification.

Keep deployment builds in CI when the provider requires them. The prohibition is on duplicated repository quality, not on the build needed to produce a deployable artifact.

## 6. Verify the installed contract

Run the repository's complete local gate, then the bundled verifier:

```sh
node "${CODEX_HOME:-$HOME/.codex}/skills/bootstrap-release-train/scripts/verify-release-train.mjs" --repo .
```

Also verify:

- workflow YAML parses;
- hook files are executable;
- `git diff --check` passes;
- React Doctor runs from the installed dependency without downloading a package;
- focused E2E selects the expected tests and uses isolated local ports;
- no secret values appear in logs or committed files;
- existing native artifact commands remain present when the audit found them.

For a real installation, open one PR to `develop` and measure the policy check. After merge, observe the branch preview deploy and smoke. Promote to `main` only when authorized, then verify production separately.

## 7. Report the outcome

Return:

- files and contracts changed;
- local commands and results;
- preserved provider and mobile paths;
- PR policy duration and whether it avoided checkout/install/browser downloads;
- preview URL, provider deployment identity when available, deploy duration, and smoke result;
- production state and whether it was intentionally untouched;
- external blockers such as billing, missing provider installation, unavailable branch protection, or absent secrets.

Do not call an unstarted billing-blocked job a code failure. Do not call a provider deployment complete until its real status and smoke evidence agree.
