# AOHYS Workspace

This document defines the monorepo foundation for `aohys.com`. It exists so implementation work starts with clear workspace boundaries, runnable local commands, and visible seams for the architecture modules already documented.

## Package Manager

Use pnpm from the repository root.

```sh
pnpm install
pnpm verify
```

The root `package.json` pins pnpm through `packageManager`. The root `verify` command runs foundation verification, then recursive build/lint/typecheck/test commands. Release commands live at the root because the Release Train crosses the public site, Environment Contract, Cloudflare Pages, and GitHub Environments.

## Workspace Layout

| Path | Role |
| --- | --- |
| `apps/site` | Astro public site for SEO pages, bilingual routes, metadata, sitemap, public shell, and dashboard auth guard. |
| `apps/dashboard` | Private React dashboard app served under `/dashboard` with TanStack Router, shadcn/ui, and Convex-backed workflows. |
| `apps/backend` | Convex backend surface for leads, content, media, settings, resume, auth, and dashboard workflows. |
| `packages/core` | Shared TypeScript primitives used across app and package boundaries. |
| `packages/environment` | Environment Contract implementation for provider variable definitions and runtime/release validation. |
| `packages/content-graph` | Public Content Graph implementation for stable content IDs, bilingual routes, SEO metadata, sitemap behavior, and private route exclusions. |
| `apps/site/src/dashboard-access-states.ts` | Narrow pre-React sign-in and access-state renderer for the private dashboard guard. |
| `packages/release-train` | Release Train checks, deploy plans, and smoke-check helpers. |
| `scripts` | Repository-level verification, release environment validation, and smoke commands. |

## Module Seams

The foundation is intentionally shallow on implementation and strict on seams:

- Public routes should use `packages/content-graph` for identity, localized paths, metadata, sitemap rules, and private route exclusions.
- Reusable primitives should live in `packages/core` once they cross a single feature boundary or are likely to repeat across apps.
- App and backend code should use `packages/environment` for provider variable classification and validation.
- Dashboard workflows should live in `apps/dashboard`; `apps/site` should only protect routes, serve the app shell, and inject the runtime config needed for direct Convex access.
- Deployment and smoke checks should collect in `packages/release-train`, root scripts, and `.github/workflows/release-train.yml`.
- Convex code lives under `apps/backend/convex`; generated bindings in `apps/backend/convex/_generated` are committed because backend functions typecheck against them.

## Environment Files

`.env.example` documents safe local placeholders. Real values belong in `.env.local` locally and GitHub Environments for preview/production deploys. Provider dashboard changes are setup or recovery actions only; durable deploy-time values should be reconciled back to GitHub Environments.

## Cloudflare Release Surface

`pnpm run cloudflare:local` serves the built public site through Wrangler Pages dev. `pnpm run deploy:preview` and `pnpm run deploy:production` validate the target Environment Contract, audit PostHog project separation, build `apps/site`, then run `wrangler pages deploy apps/site/dist --project-name aohys-com` with the correct branch.

Domain canonicalization is not stored in `apps/site/public/_redirects`; Cloudflare Pages redirects do not support domain-level redirects. The intended Cloudflare Redirect Rules payload is versioned in `cloudflare/redirect-rules.json` and should be applied in Cloudflare for `aohys.net`, `www.aohys.net`, and `www.aohys.com`.

## Source Boundary

The repository is public as an engineering sample. Code is MIT licensed. Content, brand, copy, resume material, case-study material, images, generated media, and assets are reserved unless stated otherwise.

This is not a community open-source product and does not include a contribution workflow.
