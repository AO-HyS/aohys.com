# AOHYS Issue Breakdown

This document breaks `docs/aohys-prd.md` into independently grabbable tracer-bullet issues.

Parent PRD issue: https://github.com/AO-HyS/aohys.com/issues/1

TDD plan: `docs/aohys-tdd-plan.md`

Release Train: `docs/release-train.md`

Environment Contract: `docs/environment-contract.md`

Public Content Graph: `docs/public-content-graph.md`

Dashboard UI Kit: `docs/dashboard-ui-kit.md`

## Published Issues

| Issue | Title |
| --- | --- |
| https://github.com/AO-HyS/aohys.com/issues/2 | Repository and Monorepo Foundation |
| https://github.com/AO-HyS/aohys.com/issues/3 | Public Astro Shell With Design Tokens |
| https://github.com/AO-HyS/aohys.com/issues/4 | Bilingual Routing, SEO, and Public Page Skeletons |
| https://github.com/AO-HyS/aohys.com/issues/5 | Home Page Proof Narrative |
| https://github.com/AO-HyS/aohys.com/issues/6 | Architecture and Public Code Sample Page |
| https://github.com/AO-HyS/aohys.com/issues/7 | Case Study Template and Casa Roca Detail |
| https://github.com/AO-HyS/aohys.com/issues/8 | Remaining Selected Work Case Studies |
| https://github.com/AO-HyS/aohys.com/issues/9 | Resume Page and ATS-Friendly PDF |
| https://github.com/AO-HyS/aohys.com/issues/10 | Convex Backend Foundation |
| https://github.com/AO-HyS/aohys.com/issues/11 | Contact Lead Capture With Email Notification |
| https://github.com/AO-HyS/aohys.com/issues/12 | PostHog Analytics and Error Capture |
| https://github.com/AO-HyS/aohys.com/issues/13 | Cloudflare and Wrangler Deployment Path |
| https://github.com/AO-HyS/aohys.com/issues/14 | Better Auth and Private Dashboard Shell |
| https://github.com/AO-HyS/aohys.com/issues/15 | Dashboard Lead Review Workflow |
| https://github.com/AO-HyS/aohys.com/issues/16 | Dashboard Content and Media Workflow |
| https://github.com/AO-HyS/aohys.com/issues/17 | Privacy, Security, and Launch Hardening |
| https://github.com/AO-HyS/aohys.com/issues/18 | Public README and Source Evaluation Package |
| https://github.com/AO-HyS/aohys.com/issues/31 | Quality Gates: Husky pre-commit and GitHub Actions verify workflow |

## Proposed Vertical Slices

### 1. Repository and Monorepo Foundation

**Blocked by:** None - can start immediately.

**User stories covered:** 61, 62, 63, 66, 67, 68.

Create the public repository foundation: Git initialization, package manager/workspace setup, monorepo structure, baseline commands, lint/type/build placeholders, Environment Contract documentation hooks, Release Train documentation hooks, and initial README/license boundaries. This is the prefactoring slice that makes later vertical slices easy to build and review.

### 2. Public Astro Shell With Design Tokens

**Blocked by:** 1.

**User stories covered:** 1, 2, 5, 32, 33, 34, 35, 36, 37, 63, 64, 65, 70.

Build the first demoable public shell in Astro: global layout, navigation, footer, approved color tokens, approved typography, font loading, home route, responsive behavior, basic metadata, and an Impeccable-ready structure. This slice should produce a visible page that can be reviewed in browser.

### 3. Bilingual Routing, SEO, and Public Page Skeletons

**Blocked by:** 2.

**User stories covered:** 5, 6, 7, 8, 24, 25, 35, 36, 38, 39.

Add the full V1 Public Content Graph and public route map in English and Spanish with stable content IDs, localized slugs, canonical metadata, language alternates, sitemap/robots behavior, privacy route, contact route, architecture route, resume route, case-study index, and route-level smoke checks.

### 4. Home Page Proof Narrative

**Blocked by:** 2, 3.

**User stories covered:** 1, 2, 3, 11, 12, 26, 31, 32, 33, 34, 47, 48, 49, 50, 51, 52, 70.

Implement the real home page narrative from Public Content Graph nodes: Alejandro-first hero, selected outcomes proof ledger, dark architecture-stage section, case-study previews, engineering practice section, contact CTA, and responsive/accessible visual QA.

### 5. Architecture and Public Code Sample Page

**Blocked by:** 2, 3.

**User stories covered:** 9, 10, 26, 27, 28, 29, 30, 64, 65.

Build the architecture page as a Public Content Graph node explaining the public source framing, public/private boundaries, deploy path, auth, media, analytics, email, privacy, and operational decisions. Include links to the README and source once the repository is available.

### 6. Case Study Template and Casa Roca Detail

**Blocked by:** 2, 3.

**User stories covered:** 11, 32, 34, 46, 47, 50.

Create the reusable case-study detail experience from graph-backed case-study nodes, then ship Casa Roca as the first complete production-proof case study with public evidence, confidentiality notes, responsive layout, and SEO metadata.

### 7. Remaining Selected Work Case Studies

**Blocked by:** 6.

**User stories covered:** 11, 46, 48, 49, 50, 51, 52.

Add The Barber Central, Nutri Plan, Enterprise Systems, and Engineering Practice using the same graph-backed case-study system. Each entry should distinguish production, active build, private build, enterprise/confidential work, and practice/process proof.

### 8. Resume Page and ATS-Friendly PDF

**Blocked by:** 2, 3.

**User stories covered:** 4, 53, 54, 59.

Build the dynamic resume page and downloadable PDF path as graph-backed public content. The resume should be readable, ATS-friendly, single-column, text-based, SEO-aware, and linked back to the dynamic site.

### 9. Convex Backend Foundation

**Blocked by:** 1.

**User stories covered:** 14, 16, 17, 18, 19, 20, 44, 56, 57, 59, 60.

Set up Convex for application state and define the first production-shaped data model for leads, media metadata, site settings, case-study metadata, and resume versions. Include Environment Contract mapping for local, preview, and production deployment variables and safe validation boundaries.

### 10. Contact Lead Capture With Email Notification

**Blocked by:** 3, 9.

**User stories covered:** 12, 13, 14, 15, 39, 40, 55, 56, 58.

Implement the public contact flow end-to-end: intent capture, form validation, spam resistance baseline, Convex lead persistence, Resend notification, PostHog explicit event, privacy-safe analytics behavior, email fallback messaging, WhatsApp CTA, and Environment Contract validation for provider settings.

Current implementation status: contact submissions now persist the lead before optional provider delivery. Missing or failing Resend/PostHog settings do not reject the visitor request after persistence; provider delivery status is returned for operations, and sanitized provider failure events are captured in PostHog when analytics is configured.

### 11. PostHog Analytics and Error Capture

**Blocked by:** 2, 3.

**User stories covered:** 39, 40, 41, 42, 65.

Wire explicit PostHog pageviews, selected conversion events, Environment Contract separation, disabled autocapture, and frontend error capture. Verify that sensitive contact message content is not captured.

Current implementation status: public pages emit explicit pageview/conversion/error events with an `environment` property. Cloudflare CSP allows the PostHog asset/config host, and server-side operational events cover lead provider failures plus dashboard runtime exceptions without sending cookies, tokens, exception messages, contact identity, or message text.

### 12. Cloudflare and Wrangler Deployment Path

**Blocked by:** 1, 2, 3.

**User stories covered:** 24, 25, 28, 29, 30, 43, 66.

Configure Wrangler, Cloudflare-compatible builds, the protected Release Train, preview/production deploy flow, Environment Contract validation, canonical domain behavior, `aohys.net` to `aohys.com` redirect, and deployment smoke checks.

Current implementation status: release scripts, Wrangler Pages Direct Upload plan, GitHub Actions workflow, release-target environment validation, Convex runtime environment sync, smoke commands, and Cloudflare Redirect Rules manifest are implemented in the #13 branch.

### 13. Better Auth and Private Dashboard Shell

**Blocked by:** 1, 9.

**User stories covered:** 16, 21, 22, 23, 35, 36, 59.

Create the private dashboard shell with Better Auth, Convex integration, admin allowlist, protected route behavior, noindex/robots protection, Dashboard UI Kit shell/surfaces, operational overview, and Environment Contract validation for auth origins/secrets.

Current implementation status: Cloudflare Pages functions protect `/dashboard`, render the Dashboard UI Kit shell/sign-in/states, mark private responses noindex/no-store, start Google OAuth through `/dashboard/sign-in/google`, proxy `/api/auth/*` to Convex while preserving the public host, catch unexpected dashboard runtime exceptions before Cloudflare can show a raw Worker 1101 page, and mount Better Auth in Convex with Google OAuth through the official `@convex-dev/better-auth` component.

### 14. Dashboard Lead Review Workflow

**Blocked by:** 10, 13.

**User stories covered:** 16, 56, 57, 59.

Build the first real dashboard workflow through the Dashboard UI Kit: list incoming leads, view details, update review/contact status, preserve privacy, represent loading/empty/error/saved states, and verify that changes reflect in Convex.

Current implementation status: Cloudflare Pages renders `/dashboard/leads` through `renderDashboardLeadWorkflow`, verifies the Better Auth session and admin allowlist before fetching private lead data, and updates lead review status through Convex HTTP actions protected by `DASHBOARD_API_TOKEN`. Local tests and browser QA cover noindex sign-in, 390px behavior, unauthorized access, token-protected Convex reads, and persisted status updates.

### 15. Dashboard Content and Media Workflow

**Blocked by:** 7, 9, 13.

**User stories covered:** 17, 18, 19, 20, 43, 44, 45, 46, 59, 60.

Build dashboard workflows through the Dashboard UI Kit for case-study content, media metadata, site settings, and resume content. Include Cloudflare media integration once the product choice is decided, and preserve Public Content Graph invariants when dashboard workflows publish public content.

Current implementation status: `/dashboard/case-studies`, `/dashboard/media`, `/dashboard/settings`, and `/dashboard/resume` render through `renderDashboardContentWorkflow`; Cloudflare Pages merges private Convex metadata with the Public Content Graph for stable content IDs, localized paths, and sitemap eligibility; private Convex endpoints store case-study metadata, media metadata with alt text/usage intent, `PUBLIC_` site settings, and resume PDF/version records. Cloudflare Images/R2 upload behavior remains deferred to the future Media Pipeline module.

### 16. Privacy, Security, and Launch Hardening

**Blocked by:** 10, 11, 12, 13.

**User stories covered:** 21, 22, 38, 39, 41, 58, 59.

Harden the launch surface: privacy page accuracy, Public Content Graph sitemap/robots behavior, Dashboard UI Kit mobile/state behavior, dashboard noindex validation, contact error states, analytics privacy, security headers where appropriate, Environment Contract separation, Release Train readiness checks, production smoke checks, and browser QA.

Current implementation status: privacy pages render graph-backed bilingual copy for contact data, PostHog analytics/errors, and private project boundaries; Cloudflare Pages ships `_headers` with security headers and PostHog CSP allowances; the contact form has safe validation, endpoint missing, email/provider, backend, and retry states; backend contact intake persists before optional provider delivery; dashboard runtime exceptions return private unavailable states instead of raw Worker 1101 pages; launch QA commands and browser checks live in `docs/launch-hardening.md`.

### 17. Public README and Source Evaluation Package

**Blocked by:** 1, 5, 9, 12.

**User stories covered:** 9, 10, 28, 29, 30, 61, 62, 67, 68, 69.

Write the public README and evaluation package: architecture overview, local development, environment variables, Convex, Cloudflare, PostHog, Resend, media, privacy/security, Dashboard UI Kit, Public Content Graph, Environment Contract, Release Train, license boundaries, and no-contribution framing.

Current implementation status: `README.md` now acts as the public evaluation package. It explains how to inspect and run the repo without private credentials, maps the architecture and providers, documents dashboard boundaries, distinguishes local/preview/production credentials, links the PRD, issue breakdown, TDD plan, Release Train, Environment Contract, Public Content Graph, Dashboard UI Kit, and Launch Hardening docs, and states the MIT-code versus reserved-content/license boundary. `verify:foundation` now checks for the required README sections and boundary language.

### 18. Quality Gates: Husky pre-commit and GitHub Actions verify workflow

**Blocked by:** 2, 3, 4.

**User stories covered:** 63, 64, 65, 66, 67, 68.

Add the baseline quality gates for local and pull-request review: Husky pre-commit, a GitHub Actions verify workflow, dependency-install validation, lint/typecheck/test/build coverage, and clear behavior for checks that do not require private provider secrets. This issue exists so testing and quality standards are not scattered across feature slices.

Current implementation status: Husky is installed through the root `prepare` script and `.husky/pre-commit` runs `pnpm run verify:precommit` with foundation validation, lint, typecheck, and tests. `pnpm verify` delegates to `verify:ci`, which runs foundation validation, lint, typecheck, tests, and build. `.github/workflows/quality-gates.yml` runs pull-request checks into `develop` and `main` with readable install/foundation/lint/typecheck/test/build steps that do not require private provider secrets. Pre-push remains manual so local iteration stays practical; meaningful PRs should run `pnpm verify` before merge.

## Architecture Review Notes

The first `/improve-codebase-architecture` candidate selected for implementation is the Release Train module. The second selected candidate is the Environment Contract module. The third selected candidate is the Public Content Graph module. The fourth selected candidate is the Dashboard UI Kit module. The quality-gates issue (#31) now tracks the local hook and PR-check surface that should support all of those modules.

Expected order for architecture deepening:

1. Release Train. Completed in documentation and issues.
2. Environment Contract. Completed in documentation and issues.
3. Public Content Graph. Completed in documentation and issues.
4. Dashboard UI Kit. Current architecture focus.

The Release Train should create locality for deployment rules and leverage for future agents. Branch protection, GitHub Actions, Wrangler, Cloudflare Preview/Production, environment validation, and smoke checks should not be scattered across unrelated issue work.

The Environment Contract should create locality for secrets, public variables, provider outputs, and environment validation. App code, dashboard code, Convex functions, and release workflows should cross the same validation seam instead of reading ad hoc provider variables directly.

The Public Content Graph should create locality for bilingual routes, SEO metadata, sitemap eligibility, evidence assets, case-study structure, resume content, and future dashboard publishing. Astro route files should consume the graph rather than becoming independent sources of content truth.

The Dashboard UI Kit should create locality for private dashboard shell, workflow surfaces, forms, lists/details, state handling, mobile behavior, and shadcn/ui primitive usage. Authenticated dashboard routes should consume dashboard workflow surfaces rather than composing raw primitives directly.

## Granularity Notes

The breakdown intentionally starts with two foundation issues, then switches to demoable vertical slices. It avoids creating separate horizontal tickets for "CSS", "schema", "routes", or "tests" unless they are part of a complete user-visible path.

Every issue should be executed with the project TDD plan: choose the public interface, write one failing behavior test, implement the minimal path, then refactor while green.
