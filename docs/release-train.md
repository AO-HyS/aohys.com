# AOHYS Release Train

This document defines the Release Train module for `aohys.com`. It exists so agents and humans follow the same path from implementation to production without relying on memory or ad hoc deployment steps.

## Goal

The Release Train keeps production safe while making development fast enough to use. `develop` is the shared development state and preview target. `main` is the production source of truth. Both branches are protected, and all production changes move through pull requests, preview verification, and production smoke checks.

## Module Shape

The Release Train is a deep module: future callers should learn a small release interface, while its implementation hides GitHub branch rules, GitHub Actions, Cloudflare preview and production deployments, Wrangler checks, environment validation, and smoke checks.

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
5. Verify the Cloudflare Preview deployment.
6. Merge to protected `develop` only after checks pass.
7. Open a promotion pull request from `develop` to `main`.
8. Verify production readiness checks before merge.
9. Merge to protected `main`.
10. Watch the Cloudflare Production deployment.
11. Run production smoke checks against `aohys.com`.

## Required Gates

The exact scripts will be implemented during the monorepo foundation and deployment issues, but the gates are stable:

- install/build/type/lint verification;
- route-level public site smoke checks;
- dashboard protection checks once `/dashboard` exists;
- environment validation before deploy;
- Cloudflare Preview smoke checks before `develop` merge;
- Cloudflare Production smoke checks after `main` merge;
- canonical `aohys.com` and `aohys.net` redirect checks before launch.

## Environment Contract Dependency

The Release Train depends on the Environment Contract. A deployment is not healthy if GitHub Environment secrets, Cloudflare variables, Convex deployment variables, or local variable documentation disagree.

Before production release automation exists, do not rely on manual provider changes as the final source of truth. If a production secret is repaired manually, the matching GitHub/Cloudflare/Convex source must be updated before rerunning deployment.

## GitHub Issues

The Release Train affects these existing issues:

- #2 Repository and monorepo foundation: create branch policy documentation, baseline commands, and local verification structure.
- #13 Cloudflare and Wrangler deployment path: implement the release workflow, Wrangler setup, Cloudflare Preview/Production behavior, canonical domain, redirects, and deployment smoke checks.
- #17 Privacy, security, and launch hardening: verify production readiness, environment separation, dashboard privacy, and launch smoke checks.
- #18 Public README and source evaluation package: document the release path for technical evaluators.

## TDD Connection

The Release Train should be tested through observable behavior, not through private workflow internals. The first useful tracer is a command or workflow that proves the Cloudflare-compatible build and reports the expected release state. Later tracers should verify preview URL behavior, production URL behavior, canonical redirects, and dashboard noindex/auth behavior.
