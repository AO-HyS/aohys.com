# AOHYS Public Site

Public source website for Alejandro Ortiz Corro and AOH&S.

This repository is a working sample of Alejandro's AI-native product-development practice: an Astro public site, a private React dashboard app, Convex backend workflows, Cloudflare deployment and media handling, PostHog analytics/errors, Resend lead notifications, Better Auth authentication, and a protected release path. Human accountability stays explicit from business intent and domain decisions through implementation, verification, and release.

The canonical public domain is `https://aohys.com`. `aohys.net` is intended to redirect to `aohys.com` through Cloudflare Redirect Rules.

## Status

The repository foundation, public Astro shell, bilingual Public Content Graph routes, case-study routes, resume route, contact backend, explicit PostHog analytics, Cloudflare/Wrangler release path, private React dashboard app, lead review workflow, project workspace, resume editor, dashboard publish flow, and launch hardening are scaffolded through the approved vertical-slice issues.

The dashboard can save private Convex drafts, publish reviewed project/resume content into the next Astro build, and request direct Cloudflare Images upload URLs without exposing Cloudflare tokens to the browser.

## Evaluation Guide

This repository is meant to be readable by hiring teams, technical founders, and engineers who want to inspect how the site is put together. You can evaluate the public source without private credentials.

Start with the docs:

- [PRD](docs/aohys-prd.md)
- [Issue breakdown](docs/aohys-issue-breakdown.md)
- [TDD plan](docs/aohys-tdd-plan.md)
- [Release Train](docs/release-train.md)
- [Environment Contract](docs/environment-contract.md)
- [Public Content Graph](docs/public-content-graph.md)
- [Dashboard architecture](docs/dashboard-ui-kit.md)
- [Launch Hardening](docs/launch-hardening.md)

For a hiring or product evaluation, the shortest public path is the bilingual home page, the six selected case studies, the lifecycle architecture, and the concise two-page resume PDF. The public site explains outcomes and public-safe evidence; the reusable Development System, client repositories, and operational material remain private work.

Run the repo locally from the root:

```sh
pnpm install
cp .env.example .env.local
pnpm verify
pnpm --filter @aohys/site dev
```

`pnpm verify` is the main local quality gate. It runs foundation validation, linting, type checks, Vitest route/content tests, and builds across the monorepo.

To evaluate the Cloudflare Pages shape locally:

```sh
pnpm run cloudflare:local
```

The public pages can be inspected without secrets. Provider-backed flows such as live contact submission, authenticated dashboard data, Convex deploys, Resend delivery, PostHog ingestion, Better Auth Google OAuth, and Cloudflare media uploads require environment-specific credentials that are not committed.

## Quality Gates

The repo uses visible local and remote gates because this site is also a public engineering sample.

| Gate | Command | Runs |
| --- | --- | --- |
| Pre-commit | `pnpm run verify:precommit` | foundation validation, lint, typecheck, tests |
| Local full verify | `pnpm verify` | foundation validation, lint, typecheck, tests, build |
| Pull request CI | `.github/workflows/quality-gates.yml` | install with frozen lockfile, foundation validation, lint, typecheck, tests, build |
| Release Train | `.github/workflows/release-train.yml` | verify, then Cloudflare preview/production deploys on protected branch pushes |

Husky installs through the root `prepare` script and runs `.husky/pre-commit` before commits. Pre-push stays manual for now: `pnpm verify` is required before opening or merging meaningful PRs, but it is not enforced as a local hook so iteration stays practical.

## Architecture Map

| Area | Location | Responsibility |
| --- | --- | --- |
| Public SEO site | `apps/site` | Astro routes, bilingual pages, metadata, sitemap, robots, public contact UI, dashboard route guard, and shell runtime config |
| Private dashboard app | `apps/dashboard` served under `/dashboard` | React app with TanStack Router, shadcn/ui, project workflows, lead review, resume operations, and direct admin-gated Convex access |
| Backend | `apps/backend` | Convex schema, HTTP actions, contact leads, email notification adapters, PostHog server events, Better Auth routes, and admin-gated dashboard functions |
| Environment Contract | `packages/environment` | Shared variable registry, local/preview/production validation, public-vs-secret boundaries |
| Public Content Graph | `packages/content-graph` | Stable content IDs, localized routes, SEO metadata, sitemap eligibility, public-safe content relationships, and the editorial order of selected systems |
| Release Train | `packages/release-train` and `.github/workflows/release-train.yml` | Branch-to-environment release plan, Cloudflare deploy commands, smoke checks, redirect manifest |
| Documentation | `docs/` | Product, architecture, TDD, release, environment, dashboard, privacy, and issue planning |

The system intentionally keeps public communication separate from private operational work. Public Astro pages present selected systems, outcomes, evidence, and the six-stage delivery lifecycle for SEO and direct reading; authenticated workflows and the adaptable Development System remain behind private boundaries.

## Workspace

- [Workspace foundation](docs/workspace.md)
- `apps/site`: Astro public SEO surface and Cloudflare Pages functions for dashboard auth/API proxying.
- `apps/dashboard`: private React dashboard app for project, lead, and resume workflows.
- `apps/backend`: Convex backend surface for contact workflows, Better Auth routes, leads, content/media metadata, site settings, resume versions, and private operations.
- `packages/core`: shared foundation package.
- `packages/environment`: Environment Contract implementation.
- `packages/content-graph`: Public Content Graph implementation for stable IDs, bilingual routes, SEO metadata, sitemap behavior, and private route exclusions.
- `apps/site/src/dashboard-access-states.ts`: narrow pre-React sign-in and access-state renderer used by the private site guard.
- `packages/release-train`: Release Train deployment plans, environment validation, workflow checks, and smoke helpers.

## Public Source Boundary

This repository's code is public as a working example of Alejandro Ortiz Corro and AOH&S engineering standards.

It is not a community open-source product. It is not a promise that private client code, private product code, operational dashboards, business data, credentials, or internal delivery process details are public.

Publicly inspectable:

- the website source code;
- the architecture and release documentation;
- public-safe case-study framing;
- public route, SEO, i18n, privacy, contact, and dashboard-boundary implementation;
- testing and verification structure.

Not public:

- private client repositories;
- proprietary implementation details from client work;
- private Convex data;
- provider credentials;
- dashboard operational data;
- original CV source material beyond what is deliberately published;
- private screenshots or media that have not been sanitized for public use.

This repo intentionally does not include a contribution workflow. There is no `CONTRIBUTING.md`, no community issue template, and no expectation that external pull requests drive the product.

## Environment and Credentials

Copy `.env.example` to `.env.local` for local development. Real local secrets stay uncommitted. Preview and production deploy-time values belong in GitHub Environments according to the [Environment Contract](docs/environment-contract.md).

| Environment | Purpose | Source of truth | Credential expectation |
| --- | --- | --- | --- |
| `local` | Developer machine and public-source evaluation | `.env.local` plus `.env.example` | Public pages and tests run without private provider secrets; live provider workflows need local secrets |
| `preview` | `develop` branch verification | GitHub Environment `preview` | Non-production Cloudflare, Convex, PostHog, Resend, Better Auth, and Google OAuth values |
| `production` | `main` branch and `aohys.com` | GitHub Environment `production` | Production Cloudflare, Convex, PostHog, Resend, Better Auth, and Google OAuth values |

The repository distinguishes browser-safe values from server-only secrets. Public build values use explicit `PUBLIC_` names, while a small set of provider outputs such as Convex client URL and Cloudflare Images delivery hash may enter the dashboard shell when they are not credentials. Secret values such as `RESEND_API_KEY`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`, `CONVEX_DEPLOY_KEY`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_IMAGES_API_TOKEN` must never be committed or exposed through the public site bundle.

Release validation commands:

```sh
pnpm run release:env:preview
pnpm run release:env:production
pnpm run audit:posthog-env
```

Deploy commands:

```sh
pnpm run deploy:preview
pnpm run smoke:preview

pnpm run deploy:production
pnpm run smoke:production
```

Release deploys validate GitHub Environment values, audit PostHog project separation, sync the Convex runtime environment from those values, push Convex, then deploy Cloudflare Pages. The canonical host redirect from `aohys.net` to `aohys.com` is represented in `cloudflare/redirect-rules.json` because Cloudflare Pages `_redirects` does not support domain-level redirects.

The PostHog audit compares GitHub Environment `preview` and `production` public analytics values and fails if both environments use the same project key. Smoke commands also verify served CSP, anonymous dashboard redirect/sign-in behavior, and the configured contact endpoint.

## Provider Responsibilities

| Provider | Responsibility in this repo |
| --- | --- |
| Cloudflare | DNS, `aohys.com` hosting, `aohys.net` redirect rules, Pages deploys through Wrangler, preview/production surfaces, security headers, Cloudflare Images delivery |
| Convex | Application state, contact leads, content/media metadata, project and resume drafts, site settings, resume versions, Better Auth integration, private dashboard endpoints |
| PostHog | Separate preview/production projects, explicit pageviews, selected conversion events, browser error capture, sanitized contact/dashboard operational events, dashboard/error analysis outside the repo |
| Resend | Lead notification email from the institutional sender once provider credentials and DNS are ready |
| Better Auth | Google sign-in, session handling through Convex, trusted origins, admin allowlist integration |
| GitHub | Public source hosting, protected `develop` and `main`, GitHub Environments, pull-request checks, Release Train workflow, dashboard-triggered `workflow_dispatch` publishes |

Cloudflare Images owns dashboard media delivery. Convex creates short-lived direct upload URLs with a narrow Images token, stores only metadata and delivery URLs, and never stores image originals.

## Dashboard Architecture

The dashboard lives under the same domain at `/dashboard`, but it is private by design.

Dashboard rules:

- dashboard routes are authenticated;
- dashboard responses are `noindex` and `no-store`;
- dashboard routes are omitted from the public sitemap;
- dashboard workflows run in the React app instead of server-rendered HTML route fragments;
- dashboard copy is English-only for V1;
- private dashboard data is loaded directly through admin-gated Convex functions after the Pages shell verifies the session/admin allowlist;
- public browser bundles never receive dashboard secrets.

Current V1 dashboard workflows include sign-in, overview, leads, project content, image metadata, WhatsApp/contact setting, and resume versions. Projects are the core dashboard unit: text, achievements, structure notes, public URL, CTA, SEO description, status, evidence state, and images belong together. The dashboard is part of the working sample, but public evaluators should inspect architecture and boundary behavior rather than expecting access to private operational data.

## Privacy and Security

The public site includes bilingual privacy routes and launch-hardening checks. See [Launch Hardening](docs/launch-hardening.md) for the current manual and automated QA checklist.

Current protections:

- privacy pages explain contact data, analytics/errors, and private project boundaries;
- contact form errors return safe public codes instead of provider internals;
- contact leads are persisted before optional provider delivery so Resend/PostHog drift does not lose a request;
- contact analytics never send name, email, phone, company, or message body to PostHog;
- browser PostHog autocapture starts disabled;
- preview and production PostHog projects stay separated through environment-specific public keys plus an `environment` event property;
- dashboard runtime exceptions are caught at the Cloudflare Pages boundary and reported as sanitized PostHog events before a private unavailable state is returned;
- Cloudflare Pages `_headers` is generated from the shared security header module and applies security headers for static public pages; Pages Functions use that same module directly for private dashboard and observability responses;
- `/dashboard` is omitted from sitemap and returns private-cache/robot headers;
- smoke checks verify public HTML, canonical behavior, and dashboard privacy boundaries.

## Planning Documents

- [Product context](PRODUCT.md)
- [Design context](DESIGN.md)
- [Domain context](CONTEXT.md)
- [Site plan](docs/aohys-site-plan.md)
- [PRD](docs/aohys-prd.md)
- [Issue breakdown draft](docs/aohys-issue-breakdown.md)
- [TDD plan](docs/aohys-tdd-plan.md)
- [Release Train](docs/release-train.md)
- [Launch Hardening](docs/launch-hardening.md)
- [Environment Contract](docs/environment-contract.md)
- [Public Content Graph](docs/public-content-graph.md)
- [Dashboard architecture](docs/dashboard-ui-kit.md)
- [ADR 0001: Protected Release Train](docs/adr/0001-protected-release-train.md)
- [ADR 0002: Environment Contract Source of Truth](docs/adr/0002-environment-contract-source-of-truth.md)
- [ADR 0003: Public Content Graph](docs/adr/0003-public-content-graph.md)
- [ADR 0004: Dashboard App Architecture](docs/adr/0004-dashboard-ui-kit.md)

## License and Asset Boundaries

Code is MIT licensed through [LICENSE](LICENSE).

Content, brand, copy, resume material, case-study material, images, screenshots, generated images, media assets, and AOH&S identity assets are reserved unless stated otherwise. The MIT license applies to the software code, not to private client work or reserved public-site content.
