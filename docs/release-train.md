# AOHYS Release Train

This document defines the Release Train module for `aohys.com`. It exists so agents and humans follow the same path from implementation to production without relying on memory or ad hoc deployment steps.

## Goal

The Release Train keeps production safe while making development fast enough to use. `develop` is the shared development state and preview target. `main` is the production source of truth. Both branches are protected, and all production changes move through pull requests, preview verification, and production smoke checks.

## Module Shape

The Release Train is a deep module: callers learn a small release interface, while its implementation hides GitHub branch rules, GitHub Actions, Cloudflare preview and production deployments, Wrangler checks, environment validation, and smoke checks.

The seam is the release workflow. Feature work should not need to know provider details beyond the documented release commands and gates.

## Branches

| Branch | Role | Deployment meaning |
| --- | --- | --- |
| `develop` | Development Branch | Shared development preview state |
| `main` | Production Branch | Source of truth for `aohys.com` production |

Feature branches should target `develop`. Production promotion should target `main` from `develop`.

## Promotion Flow

1. Create a feature branch from `develop`.
2. Implement the vertical slice using the TDD plan.
3. Open a pull request into `develop`.
4. Run local verification and automated checks.
5. Merge to protected `develop` only after review and checks pass.
6. Let `.github/workflows/release-train.yml` deploy the `develop` build to Cloudflare Pages with branch `develop`.
7. Run preview smoke checks against the preview site.
8. Open a promotion pull request from `develop` to `main`.
9. Verify production readiness checks before merge.
10. Merge to protected `main`.
11. Let the workflow deploy the `main` build to Cloudflare Pages with branch `main`.
12. Run production smoke checks against `aohys.com`.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm run verify:precommit` | Husky pre-commit quality gate: foundation, lint, typecheck, tests. |
| `pnpm verify` | Full local and CI quality gate: foundation, lint, typecheck, tests, build. |
| `pnpm run cloudflare:local` | Build the Astro site and serve `apps/site/dist` with Wrangler Pages dev. |
| `pnpm run release:env:preview` | Validate GitHub Environment values for preview deploys without printing secrets. |
| `pnpm run release:env:production` | Validate GitHub Environment values for production deploys without printing secrets. |
| `pnpm run sync:convex-env:preview` | Sync preview runtime values from GitHub Environment variables into the preview Convex deployment without printing secret values. |
| `pnpm run sync:convex-env:production` | Sync production runtime values from GitHub Environment variables into the production Convex deployment without printing secret values. |
| `pnpm run deploy:preview` | Validate preview env, sync Convex preview runtime variables, deploy Convex with the preview deploy key, build `apps/site`, and run `wrangler pages deploy apps/site/dist --project-name aohys-com --branch develop`. |
| `pnpm run deploy:production` | Validate production env, sync Convex production runtime variables, deploy Convex with the production deploy key, build `apps/site`, and run `wrangler pages deploy apps/site/dist --project-name aohys-com --branch main`. |
| `pnpm run smoke:preview` | Fetch the preview smoke URL, verify a 2xx HTML response, public shell marker, and the production canonical URL. |
| `pnpm run smoke:production` | Fetch `https://aohys.com`, verify a 2xx HTML response, public shell marker, and the production canonical URL. |

## Required Gates

- install/build/type/lint verification;
- route-level public site smoke checks;
- dashboard protection checks for `/dashboard` noindex/no-store behavior;
- release-target environment validation before deploy;
- Cloudflare Preview deploy and smoke checks after `develop` merge;
- Cloudflare Production deploy and smoke checks after `main` merge;
- canonical `aohys.com` and `aohys.net` redirect checks before launch.

The launch-readiness checklist is maintained in [Launch Hardening Checklist](launch-hardening.md). Use it for preview smoke, production smoke, dashboard privacy checks, contact failure states, Cloudflare Pages security headers, and browser QA evidence.

## GitHub Actions

`.github/workflows/release-train.yml` runs `pnpm verify` on pull requests into `develop` and `main`. Pushes to `develop` deploy preview through GitHub Environment `preview`; pushes to `main` deploy production through GitHub Environment `production`.

`.github/workflows/quality-gates.yml` is the readable pull-request quality workflow. It installs with `pnpm install --frozen-lockfile`, then runs foundation validation, lint, typecheck, tests, and build as separate steps so failures are easy to diagnose without deployment secrets.

Husky owns the local pre-commit hook through `.husky/pre-commit`. The hook runs `pnpm run verify:precommit`, which intentionally skips the build step to keep local iteration practical while still catching foundation, lint, type, and behavior-test failures before a commit. Pre-push stays manual; run `pnpm verify` before opening or merging meaningful PRs.

The workflow expects GitHub Environment secrets for `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CONVEX_DEPLOY_KEY`, `RESEND_API_KEY`, `BETTER_AUTH_SECRET`, `DASHBOARD_API_TOKEN`, and `GOOGLE_CLIENT_SECRET`. Public or policy values such as `PUBLIC_SITE_URL`, `PUBLIC_POSTHOG_HOST`, `RESEND_FROM`, `BETTER_AUTH_TRUSTED_ORIGINS`, `GOOGLE_CLIENT_ID`, and `CLOUDFLARE_PROJECT_NAME` are read from GitHub Environment variables.

Branch protection currently requires reviews before merging to protected branches. In a one-owner account setup, the durable fix is to add a second reviewer or use an explicit owner action for merges that cannot satisfy last-pusher approval.

## Cloudflare

Convex runtime variables are synced before each Convex deploy through:

```sh
pnpm run sync:convex-env:preview
pnpm run sync:convex-env:production
```

The sync script reads the already-validated GitHub Environment values, writes a temporary `.env` file with `0600` permissions, runs `convex env set --from-file --force --deployment "$CONVEX_DEPLOYMENT"`, and deletes the temporary file. It excludes deploy-only provider credentials such as Cloudflare API tokens and Convex deploy keys.

Convex deploys then run before Cloudflare Pages deploys through:

```sh
env -u CONVEX_DEPLOYMENT pnpm --filter @aohys/backend exec convex deploy --typecheck enable --codegen enable
```

`CONVEX_DEPLOYMENT` is unset for the deploy command so CI selects the target deployment from `CONVEX_DEPLOY_KEY`.

The Cloudflare Pages project name is `aohys-com`. Site deploys use Wrangler Pages Direct Upload:

```sh
pnpm exec wrangler pages deploy apps/site/dist --project-name aohys-com --branch develop
pnpm exec wrangler pages deploy apps/site/dist --project-name aohys-com --branch main
```

`aohys.net`, `www.aohys.net`, and `www.aohys.com` canonicalization belongs in Cloudflare Redirect Rules, not `apps/site/public/_redirects`, because Cloudflare Pages `_redirects` does not support domain-level redirects. The intended rule payload is versioned in `cloudflare/redirect-rules.json`. Set `SMOKE_CANONICAL_REDIRECT_URL=https://aohys.net/` when the rule is active and should be verified by `pnpm run smoke:production`.

Preview runtime configuration still uses `https://preview.aohys.com` for `PUBLIC_SITE_URL`, `BETTER_AUTH_URL`, and trusted origins. The Release Train smoke step overrides only `SMOKE_BASE_URL` with the unique Cloudflare Pages deployment URL emitted by Wrangler, for example `https://ff7ed5fa.aohys-com.pages.dev`, so preview deploys can be verified immediately even before a custom preview DNS record is active. Public pages still render `https://aohys.com` as their canonical URL. Preview is a deployment verification surface, not a separate SEO surface.

## Environment Contract Dependency

The Release Train depends on the [Environment Contract](environment-contract.md). A deployment is not healthy if GitHub Environment secrets, Cloudflare variables, Convex deployment variables, or local variable documentation disagree.

Do not rely on manual provider changes as the final source of truth. If a production secret is repaired manually, the matching GitHub/Cloudflare/Convex source must be updated before rerunning deployment.

## GitHub Issues

The Release Train affects these existing issues:

- #2 Repository and monorepo foundation: create branch policy documentation, baseline commands, and local verification structure.
- #13 Cloudflare and Wrangler deployment path: implement the release workflow, Wrangler setup, Cloudflare Preview/Production behavior, canonical domain, redirects, and deployment smoke checks.
- #17 Privacy, security, and launch hardening: verify production readiness, environment separation, dashboard privacy, and launch smoke checks.
- #18 Public README and source evaluation package: document the release path for technical evaluators.

## TDD Connection

The Release Train is tested through observable behavior, not private workflow internals. Current tests validate the release deploy plan, release environment validation, GitHub Actions workflow surface, and Cloudflare Redirect Rules manifest. Later tracers should verify live preview URL behavior, production URL behavior, canonical redirects, and dashboard noindex/auth behavior.
