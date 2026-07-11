# AOHYS TDD Plan

This document adapts the `/tdd` skill to the published PRD and vertical-slice issues.

The rule for this project: every implementation issue starts with one behavior test at the highest practical public interface, then minimal implementation, then refactor. Do not write a bulk test suite before building. Do not test private helpers just because they are easier to reach.

## Operating Loop

For each issue:

1. Confirm the public interface the issue changes.
2. Pick the most important behavior for that slice.
3. Write one failing test for that behavior.
4. Implement the smallest useful path to pass it.
5. Repeat one behavior at a time.
6. Refactor only while green.
7. Run the issue's verification command and browser smoke checks before handoff.

## Testing Principles

- Test behavior through public interfaces, not internal file structure.
- Prefer browser/integration seams over isolated unit tests when the behavior is user-visible.
- Prefer Convex public functions/actions over direct database inspection.
- Prefer route-level SEO/render checks over component implementation checks.
- Prefer email/analytics adapter boundaries over calling third-party services in ordinary tests.
- Keep mocks at system edges: network services, PostHog transport, Resend transport, Cloudflare media APIs, and auth provider callbacks.
- Keep one test focused on one observable behavior.
- Do not use tests to lock in temporary implementation details.
- Use Vitest for local package/site behavior tests unless a higher-value browser or provider smoke check is required.
- Avoid one-off Node assertion scripts for ordinary test coverage; if a check belongs in the quality surface, make it a named test or a release smoke command.

## Core Test Seams

### Public Site

Highest seam: run the built or dev Astro site and inspect user-visible routes resolved from the Public Content Graph.

Use for:

- Home page proof narrative.
- English and Spanish routing.
- SEO metadata.
- Architecture page.
- Case studies.
- Resume page.
- Contact page UI.
- Privacy page.
- Responsive layout and a11y smoke checks.

### Public Content Graph

Highest seam: graph-backed route and metadata resolution.

Use for:

- Stable content ID to localized route mapping.
- Canonical URL generation.
- Language alternate generation.
- Sitemap eligibility.
- Robots/noindex behavior.
- Case-study content shape.
- Resume route/PDF relationship.
- Evidence asset safety and alt text requirements.

### Backend and Contact

Highest seam: submit through the public contact interface in a safe environment, then verify public outcomes through supported APIs/adapters.

Use for:

- Lead persistence.
- Validation.
- Resend notification adapter behavior.
- PostHog explicit event behavior.
- Spam-resistance baseline.

### Dashboard

Highest seam: authenticated browser behavior against the React dashboard app, backed by Cloudflare Pages auth/API proxying and Convex HTTP endpoints.

Use for:

- Access control.
- Lead review.
- Project content, image metadata, and contact settings.
- Resume management.
- Dashboard noindex and private routing.
- Workflow state surfaces.
- Mobile behavior at 390px.
- No duplicate controls with the same meaning.

### Deployment

Highest seam: Cloudflare/Wrangler smoke checks.

Use for:

- Build compatibility.
- Preview deploy behavior.
- Environment variable wiring.
- Canonical domain behavior.
- `aohys.net` to `aohys.com` redirect.
- Release Train behavior from feature branch to `develop` preview to `main` production.

### Environment Contract

Highest seam: environment validation command/module.

Use for:

- Required variable checks.
- Public versus secret variable separation.
- Local/preview/production provider target checks.
- Better Auth origin checks.
- PostHog autocapture policy checks.
- Resend sender/domain readiness checks.
- Convex deployment target checks.

## Per-Issue First Tracer Tests

| Issue | Public Interface | First Tracer Test |
| --- | --- | --- |
| #2 Repository and Monorepo Foundation | CLI project commands | `verify` command runs from a fresh checkout and reports the current project state without app code, including Environment Contract documentation links. |
| #3 Public Astro Shell With Design Tokens | Public home route | Home route renders with global layout, approved fonts/tokens loaded, and no console errors. |
| #4 Bilingual Routing, SEO, and Public Page Skeletons | Public Content Graph and public route map | Stable content IDs for `/` and `/es/` resolve to localized routes with correct canonical and language alternate metadata. |
| #5 Home Page Proof Narrative | Graph-backed public home route | Visitor sees Alejandro-first positioning, primary CTA, and selected-work proof section sourced from graph-backed content. |
| #6 Architecture and Public Code Sample Page | Graph-backed architecture route | Architecture page explains public/private boundaries and links to repo context, with sitemap and metadata behavior from the graph. |
| #7 Case Study Template and Casa Roca Detail | Graph-backed case-study detail route | Casa Roca page renders the complete case-study structure with public links/media and confidentiality note. |
| #8 Remaining Selected Work Case Studies | Graph-backed case-study index and detail routes | Each selected work entry appears in the index and links to a detail page with the correct project status. |
| #9 Resume Page and ATS-Friendly PDF | Graph-backed resume route and PDF artifact | Resume page renders semantic sections and the PDF artifact is text-based, downloadable, and linked from the graph. |
| #10 Convex Backend Foundation | Convex public API/functions and Environment Contract | A valid lead-like payload can be validated through the public function boundary without direct DB coupling, and Convex variables map to the current environment. |
| #11 Contact Lead Capture With Email Notification | Contact form and Environment Contract | A valid contact submission stores a lead, sends notification through the email adapter, and records only safe analytics metadata when provider settings validate. |
| #12 PostHog Analytics and Error Capture | Analytics adapter and Environment Contract | Pageview and conversion events are explicit, environment-aware, and do not include contact message text. |
| #13 Cloudflare and Wrangler Deployment Path | Release Train and Wrangler/build commands | Cloudflare-compatible build command completes and exposes documented output for preview and production smoke testing. |
| #14 Better Auth and Private Dashboard Shell | Dashboard route, Environment Contract, React app shell, and Convex runtime config | Anonymous visitor cannot access `/dashboard`; allowlisted admin can reach the React shell, auth origins/secrets validate, and the shell exposes navigation plus operational overview. |
| #15 Dashboard Lead Review Workflow | React dashboard lead workflow | Admin can view a newly submitted lead, update its review status through an admin-gated Convex mutation, and see loading/empty/error/saved states. |
| #16 Dashboard Content and Media Workflow | React dashboard project workspace | Admin can manage one project's text, SEO description, CTA, URL, achievements, structure notes, status, evidence state, and image metadata while Public Content Graph invariants are preserved. |
| #17 Privacy, Security, and Launch Hardening | Production-like smoke suite | Public routes, dashboard protection, dashboard mobile/state behavior, privacy copy, analytics privacy, and contact error states pass launch smoke checks. |
| #18 Public README and Source Evaluation Package | Repository documentation | README gives an evaluator enough information to run, inspect, and understand the repo without private credentials, including dashboard architecture. |
| #31 Quality Gates: Husky and GitHub Actions | Local hooks and pull request workflow | Pre-commit and PR checks run the same core quality commands, including lint, typecheck, test, and build, without requiring private provider secrets. |

## Issue Body Guidance

When an agent starts an issue, it should add a short TDD plan to its working notes:

```md
## TDD Plan

- Public interface:
- First behavior:
- First failing test:
- Minimal implementation path:
- Refactor candidates after green:
- Verification command:
```

The agent should keep that plan narrow. If the issue reveals a better seam, update the plan before adding more tests.

## Refactor Timing

Refactor only after a vertical behavior is green. In this repo, expected refactor targets are:

- shared route metadata helpers after bilingual SEO is green;
- design tokens and layout primitives after the public shell is green;
- content schema/content loading boundaries after case-study routes are green;
- email/analytics adapters after the contact flow is green;
- dashboard data access boundaries after dashboard auth and lead review are green.

## Anti-Patterns To Reject

- Writing all tests for an issue before any implementation.
- Testing Astro components by private internals instead of route behavior.
- Keeping route/source smoke checks as custom Node scripts when Vitest can own the behavior.
- Mocking Convex internals instead of testing through public functions/actions.
- Testing PostHog or Resend by sending real events/emails in default local tests.
- Creating shallow helper modules only to make unit tests easy.
- Refactoring while the current tracer test is red.
- Adding speculative dashboard/content features before public shell behavior is proven.
- Treating protected `develop` and `main` as documentation-only branch names instead of release behavior to verify.
- Letting provider dashboards become invisible sources of truth for production secrets.
- Reading environment variables ad hoc across app modules instead of through the Environment Contract seam.
- Duplicating slugs, canonical URLs, language alternates, sitemap rules, or case-study structure across individual route files.
- Letting dashboard publishing mutate public content without preserving Public Content Graph invariants.
- Returning to server-rendered dashboard HTML fragments instead of a real React dashboard app with routed workflows.
- Treating mobile dashboard usability as a late polish pass.
