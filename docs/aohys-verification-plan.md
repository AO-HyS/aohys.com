# AOHYS Verification Plan

This document maps the published PRD and vertical-slice issues to real verification.

The rule for this project: aohys has no automated tests. Do not create, run, or keep unit, integration, E2E, or browser test suites, test runners, or test scripts. Every implementation issue is verified by observing the real product at the highest practical public interface: the Browser, computer use, and the repository verification CLI (`pnpm run verify:product` and its feature map), backed by lint, typecheck, and build.

## Operating Loop

For each issue:

1. Confirm the public interface the issue changes.
2. Pick the most important behavior for that slice.
3. Implement the smallest useful path for that behavior.
4. Run lint, typecheck, and build.
5. Observe the behavior in the running product with the Browser (or computer use for local app UI) and record the evidence.
6. Run `pnpm run verify:product` for the affected features in its feature map.
7. Repeat one behavior at a time; refactor only while the observed behavior still holds.

## Verification Principles

- Verify behavior through public interfaces, not internal file structure.
- Prefer Browser observation of the running site or dashboard for user-visible behavior.
- Prefer Convex public functions/actions over direct database inspection.
- Prefer route-level SEO/render observation over component internals.
- Verify email/analytics through adapter boundaries and safe environments; never send real events or emails from ordinary local runs.
- Keep one piece of evidence focused on one observable behavior.
- Record evidence per behavior: Browser capture or observation, computer use notes, and the verification CLI output.

## Core Verification Surfaces

### Public Site

Highest surface: run the built or dev Astro site and inspect user-visible routes resolved from the Public Content Graph.

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

Highest surface: graph-backed route and metadata resolution.

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

Highest surface: submit through the public contact interface in a safe environment, then verify public outcomes through supported APIs/adapters.

Use for:

- Lead persistence.
- Validation.
- Resend notification adapter behavior.
- PostHog explicit event behavior.
- Spam-resistance baseline.

### Dashboard

Highest surface: authenticated browser behavior against the React dashboard app, backed by Cloudflare Pages auth/API proxying and Convex HTTP endpoints.

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

Highest surface: Cloudflare/Wrangler smoke checks.

Use for:

- Build compatibility.
- Preview deploy behavior.
- Environment variable wiring.
- Canonical domain behavior.
- `aohys.net` to `aohys.com` redirect.
- Release Train behavior from feature branch to `develop` preview to `main` production.

### Environment Contract

Highest surface: environment validation command/module.

Use for:

- Required variable checks.
- Public versus secret variable separation.
- Local/preview/production provider target checks.
- Better Auth origin checks.
- PostHog autocapture policy checks.
- Resend sender/domain readiness checks.
- Convex deployment target checks.

## Per-Issue First Verified Behavior

| Issue                                                | Public Interface                                                                  | First Verified Behavior                                                                                                                                                                                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #2 Repository and Monorepo Foundation                | CLI project commands                                                              | `verify` command runs from a fresh checkout and reports the current project state without app code, including Environment Contract documentation links.                                                                                                             |
| #3 Public Astro Shell With Design Tokens             | Public home route                                                                 | Home route renders with global layout, approved fonts/tokens loaded, and no console errors.                                                                                                                                                                         |
| #4 Bilingual Routing, SEO, and Public Page Skeletons | Public Content Graph and public route map                                         | Stable content IDs for `/` and `/es/` resolve to localized routes with correct canonical and language alternate metadata.                                                                                                                                           |
| #5 Home Page Proof Narrative                         | Graph-backed public home route                                                    | Visitor sees Alejandro-first positioning, primary CTA, and selected-work proof section sourced from graph-backed content.                                                                                                                                           |
| #6 Architecture and Public Code Sample Page          | Graph-backed architecture route                                                   | Architecture page explains public/private boundaries and links to repo context, with sitemap and metadata behavior from the graph.                                                                                                                                  |
| #7 Case Study Template and Casa Roca Detail          | Graph-backed case-study detail route                                              | Casa Roca page renders the complete case-study structure with public links/media and confidentiality note.                                                                                                                                                          |
| #8 Remaining Selected Work Case Studies              | Graph-backed case-study index and detail routes                                   | Each selected work entry appears in the index and links to a detail page with the correct project status.                                                                                                                                                           |
| #9 Resume Page and ATS-Friendly PDF                  | Graph-backed resume route and PDF artifact                                        | Resume page renders semantic sections and the PDF artifact is text-based, downloadable, and linked from the graph.                                                                                                                                                  |
| #10 Convex Backend Foundation                        | Convex public API/functions and Environment Contract                              | A valid lead-like payload can be validated through the public function boundary without direct DB coupling, and Convex variables map to the current environment.                                                                                                    |
| #11 Contact Lead Capture With Email Notification     | Contact form and Environment Contract                                             | A valid contact submission stores a lead, sends notification through the email adapter, and records only safe analytics metadata when provider settings validate.                                                                                                   |
| #12 PostHog Analytics and Error Capture              | Analytics adapter and Environment Contract                                        | Pageview and conversion events are explicit, environment-aware, and do not include contact message text.                                                                                                                                                            |
| #13 Cloudflare and Wrangler Deployment Path          | Release Train and Wrangler/build commands                                         | Cloudflare-compatible build command completes and exposes documented output for preview and production smoke testing.                                                                                                                                               |
| #14 Better Auth and Private Dashboard Shell          | Dashboard route, Environment Contract, React app shell, and Convex runtime config | Anonymous visitor cannot access `/dashboard`; allowlisted admin can reach the React shell, auth origins/secrets validate, and the shell exposes navigation plus operational overview.                                                                               |
| #15 Dashboard Lead Review Workflow                   | React dashboard lead workflow                                                     | Admin can view a newly submitted lead, update its review status through an admin-gated Convex mutation, and see loading/empty/error/saved states.                                                                                                                   |
| #16 Dashboard Content and Media Workflow             | React dashboard project workspace                                                 | Admin can manage one project's text, SEO description, CTA, URL, achievements, structure notes, status, evidence state, and image metadata while Public Content Graph invariants are preserved.                                                                      |
| #17 Privacy, Security, and Launch Hardening          | Production-like smoke checks                                                      | Public routes, dashboard protection, dashboard mobile/state behavior, privacy copy, analytics privacy, and contact error states pass launch smoke checks.                                                                                                           |
| #18 Public README and Source Evaluation Package      | Repository documentation                                                          | README gives an evaluator enough information to run, inspect, and understand the repo without private credentials, including dashboard architecture.                                                                                                                |
| #31 Quality Gates: Husky and GitHub Actions          | Local hooks and pull request workflow                                             | Pre-commit runs staged formatting, foundation validation, and staged React Doctor; pre-push runs changed validation and React Doctor on the branch delta; PR checks run install, foundation, lint, typecheck, and build without requiring private provider secrets. |

## Issue Body Guidance

When an agent starts an issue, it should add a short verification plan to its working notes:

```md
## Verification Plan

- Public interface:
- First behavior:
- Browser / computer use observation:
- Verification CLI (`pnpm run verify:product`) features:
- Minimal implementation path:
- Refactor candidates after the behavior is observed:
```

The agent should keep that plan narrow. If the issue reveals a better surface, update the plan.

## Refactor Timing

Refactor only after a vertical behavior is observed working. In this repo, expected refactor targets are:

- shared route metadata helpers after bilingual SEO is verified;
- design tokens and layout primitives after the public shell is verified;
- content schema/content loading boundaries after case-study routes are verified;
- email/analytics adapters after the contact flow is verified;
- dashboard data access boundaries after dashboard auth and lead review are verified.

## Anti-Patterns To Reject

- Adding automated tests, test runners, test configs, or test scripts of any kind.
- Verifying Astro components by private internals instead of route behavior.
- Inspecting Convex internals instead of verifying through public functions/actions.
- Sending real PostHog events or Resend emails from ordinary local runs.
- Creating shallow helper modules only to make checks easy.
- Refactoring while the current behavior is broken.
- Adding speculative dashboard/content features before public shell behavior is proven.
- Treating protected `develop` and `main` as documentation-only branch names instead of release behavior to verify.
- Letting provider dashboards become invisible sources of truth for production secrets.
- Reading environment variables ad hoc across app modules instead of through the Environment Contract seam.
- Duplicating slugs, canonical URLs, language alternates, sitemap rules, or case-study structure across individual route files.
- Letting dashboard publishing mutate public content without preserving Public Content Graph invariants.
- Returning to server-rendered dashboard HTML fragments instead of a real React dashboard app with routed workflows.
- Treating mobile dashboard usability as a late polish pass.
