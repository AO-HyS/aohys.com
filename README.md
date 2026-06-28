# AOHYS Public Site

Public source website for Alejandro Ortiz Corro and AOH&S.

This repository is being built as a working sample of engineering standards: public Astro site, private dashboard, Convex backend, Cloudflare deployment/media handling, PostHog analytics/errors, and Resend lead notifications.

## Status

Repository foundation is available. The public Astro shell and bilingual graph-backed route skeletons are now scaffolded; the home proof narrative, dashboard, backend, quality gates, and deployment work continue through the approved vertical-slice issues.

## Local Development

Use pnpm from the repository root.

```sh
pnpm install
pnpm verify
```

The current workspace includes runnable Astro and Public Content Graph checks. `pnpm verify` runs foundation validation, linting, type checks, Vitest route/content tests, and builds across the monorepo.

## Workspace

- [Workspace foundation](docs/workspace.md)
- `apps/site`: Astro public SEO surface.
- `apps/dashboard`: future private dashboard surface under `/dashboard`.
- `apps/backend`: future Convex backend surface.
- `packages/environment`: future Environment Contract implementation.
- `packages/content-graph`: Public Content Graph implementation for stable IDs, bilingual routes, SEO metadata, sitemap behavior, and private route exclusions.
- `packages/dashboard-ui`: future Dashboard UI Kit implementation.
- `packages/release-train`: future Release Train checks and smoke helpers.

## Planning Documents

- [Product context](PRODUCT.md)
- [Design context](DESIGN.md)
- [Domain context](CONTEXT.md)
- [Site plan](docs/aohys-site-plan.md)
- [PRD](docs/aohys-prd.md)
- [Issue breakdown draft](docs/aohys-issue-breakdown.md)
- [TDD plan](docs/aohys-tdd-plan.md)
- [Release Train](docs/release-train.md)
- [Environment Contract](docs/environment-contract.md)
- [Public Content Graph](docs/public-content-graph.md)
- [Dashboard UI Kit](docs/dashboard-ui-kit.md)
- [ADR 0001: Protected Release Train](docs/adr/0001-protected-release-train.md)
- [ADR 0002: Environment Contract Source of Truth](docs/adr/0002-environment-contract-source-of-truth.md)
- [ADR 0003: Public Content Graph](docs/adr/0003-public-content-graph.md)
- [ADR 0004: Dashboard UI Kit](docs/adr/0004-dashboard-ui-kit.md)

## Source Boundary

The site code is public as a working example. This is not a community open-source product, and private client or product code is not public.

Code is MIT licensed. Content, brand, copy, resume material, case-study material, images, and assets are reserved unless stated otherwise.

This repo intentionally does not include a contribution workflow.

## Environment

Copy `.env.example` to `.env.local` for local development. Real local secrets stay uncommitted; preview and production deploy-time values belong in GitHub Environments according to the [Environment Contract](docs/environment-contract.md).
