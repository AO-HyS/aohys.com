# AOHYS Workspace

This document defines the monorepo foundation for `aohys.com`. It exists so implementation work starts with clear workspace boundaries, runnable local commands, and visible seams for the architecture modules already documented.

## Package Manager

Use pnpm from the repository root.

```sh
pnpm install
pnpm verify
```

The root `package.json` pins pnpm through `packageManager`. The root `verify` command runs foundation verification, then recursive build/lint/typecheck/test commands. Feature issues should replace remaining placeholders with real framework commands as each surface is scaffolded.

## Workspace Layout

| Path | Role |
| --- | --- |
| `apps/site` | Astro public site for SEO pages, bilingual routes, metadata, sitemap, and public shell. |
| `apps/dashboard` | Future private dashboard surface under `/dashboard`. |
| `apps/backend` | Future Convex backend surface for leads, content, media, settings, resume, auth, and dashboard workflows. |
| `packages/environment` | Future Environment Contract implementation. |
| `packages/content-graph` | Public Content Graph implementation for stable content IDs, bilingual routes, SEO metadata, sitemap behavior, and private route exclusions. |
| `packages/dashboard-ui` | Future Dashboard UI Kit implementation over the dashboard primitive adapter. |
| `packages/release-train` | Future Release Train checks, deploy helpers, and smoke-check helpers. |
| `scripts` | Repository-level verification and placeholder task helpers. |

## Module Seams

The foundation is intentionally shallow on implementation and strict on seams:

- Public routes should use `packages/content-graph` for identity, localized paths, metadata, sitemap rules, and private route exclusions.
- App and backend code should use `packages/environment` once provider wiring begins.
- Dashboard routes should use `packages/dashboard-ui` once the private dashboard exists.
- Deployment and smoke checks should collect in `packages/release-train` and root scripts.
- Convex code should live under `apps/backend` until issue #10 defines the final backend layout.

## Environment Files

`.env.example` documents safe local placeholders. Real values belong in `.env.local` locally and GitHub Environments for preview/production deploys. Provider dashboard changes are setup or recovery actions only; durable deploy-time values should be reconciled back to GitHub Environments.

## Source Boundary

The repository is public as an engineering sample. Code is MIT licensed. Content, brand, copy, resume material, case-study material, images, generated media, and assets are reserved unless stated otherwise.

This is not a community open-source product and does not include a contribution workflow.
