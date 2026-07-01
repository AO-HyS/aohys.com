# AOHYS Dashboard UI Kit

This document defines the Dashboard UI Kit module for the private `aohys.com/dashboard` surface. It exists so operational workflows share one dashboard language instead of each screen composing raw primitives, layout rules, validation states, and mobile behavior independently.

## Goal

The Dashboard UI Kit gives the private dashboard a small interface for common workflow surfaces while hiding low-level visual primitives. The dashboard should feel quiet, operational, readable, and efficient, not like a public landing page or a pile of unrelated screens.

The private dashboard is English-only in V1 and exists for admin workflows: overview, leads, case studies, media, site settings, and resume.

## Module Shape

The Dashboard UI Kit is a deep module. Its future interface should stay small: render the dashboard shell, render workflow surfaces, render data lists/details/forms, render state feedback, and expose consistent mobile behavior.

Its implementation can hide shadcn/ui source components, TanStack Router conventions, form composition, table/list switching, mobile navigation, accessibility defaults, loading/empty/error states, and design-token mapping.

The seam is dashboard workflow composition. Authenticated routes should cross this seam instead of composing primitive UI directly.

Issue #14 implements the first production-shaped seam in `packages/dashboard-ui`: script-free renderers for the private shell, sign-in page, and guard states. Cloudflare Pages functions consume this package for `/dashboard`; `/dashboard/sign-in/google` bridges the script-free sign-in button to Better Auth's JSON social sign-in endpoint server-side.

Issue #15 adds the first real workflow surface: lead list, lead detail, review status form, saved/validation/provider states, and 390px compact behavior. Cloudflare Pages keeps the route private and calls Convex dashboard HTTP endpoints through `DASHBOARD_API_TOKEN`; public browser code never receives that token.

Issue #16 adds the first content and media workflow surface. `/dashboard/case-studies`, `/dashboard/media`, `/dashboard/settings`, and `/dashboard/resume` render through `renderDashboardContentWorkflow`, merge Convex metadata with the Public Content Graph for stable IDs/localized paths/sitemap eligibility, and save only metadata through private Convex endpoints. Media originals and Cloudflare Images/R2 upload flows remain behind the future Media Pipeline decision; this slice stores metadata, alt text, usage intent, and safe references only.

The June 30 refinement separates the previously repeated content workflow into distinct task surfaces:

- `/dashboard/case-studies` focuses on public proof: status, evidence state, localized paths, sitemap eligibility, and asset health.
- `/dashboard/media` focuses on proof assets: storage key, alt text, usage intent, content ID attachment, and case-study mapping.
- `/dashboard/settings` focuses on public runtime values: contact paths, provider outputs, policy values, and the boundary between public settings and private secrets.
- `/dashboard/resume` focuses on hiring artifacts: downloadable resume versions and keeping the dynamic resume page aligned with the public graph.
- The authenticated frame now includes persistent View site, Public work, and Sign out actions.

## Primitive Adapter

Use `shadcn/ui` as the Dashboard Primitive Adapter, not as the dashboard interface.

Rules:

- Add and update shadcn/ui source through the shadcn CLI during implementation.
- Prefer existing shadcn/ui primitives before custom markup.
- Keep shadcn/ui imports and primitive choices inside the Dashboard UI Kit implementation when practical.
- Use semantic tokens and variants rather than raw color styling.
- Use form primitives consistently: `FieldGroup`, `Field`, validation states, and accessible descriptions.
- Use existing feedback primitives for empty, loading, alert, toast, dialog, sheet, drawer, tooltip, and badge behavior.
- Keep icon usage inside buttons accessible and consistent with the project icon setup chosen during implementation.

## Dashboard Surfaces

Initial dashboard surfaces:

| Surface | Purpose |
| --- | --- |
| `dashboard-shell` | Authenticated frame, navigation, page title area, responsive layout, and route outlet |
| `overview-surface` | Operational checklist, quick links, and setup status |
| `lead-workflow-surface` | Lead list, lead detail, status update, contact metadata, and safe notes |
| `content-workflow-surface` | Case-study, resume, and site settings editing through Public Content Graph invariants |
| `media-workflow-surface` | Media metadata, alt text, public-safe usage intent, and future Cloudflare media integration |
| `state-surface` | Empty, loading, error, disabled, unauthenticated, unauthorized, and saved states |

These names are architectural concepts, not final file names.

Implemented V1 surfaces:

| Export | Purpose |
| --- | --- |
| `renderDashboardShell` | Authenticated frame with navigation, page title, admin identity, sign-out, public surface links, and publishing-room overview. |
| `renderDashboardSignIn` | Private Google sign-in entry point with noindex metadata. |
| `renderDashboardState` | Loading, unauthorized, provider/configuration error, and unavailable states. |
| `renderDashboardLeadWorkflow` | Lead list/detail workflow with review status updates, empty/saved/validation/provider states, and compact mobile controls. |
| `renderDashboardContentWorkflow` | Route-aware case-study, media, site settings, and resume metadata workflow with Public Content Graph guardrails, form states, side panels, and compact mobile controls. |

## Mobile Behavior

The dashboard must be usable on phone-sized screens from the start.

Rules:

- Validate at a 390px-wide viewport during dashboard work.
- Avoid horizontal overflow.
- Keep visible touch targets at least 44px.
- Avoid visible text below 12px.
- Use compact mobile list/detail surfaces instead of compressed desktop tables.
- Prefer one mobile/desktop variant per control based on viewport behavior; do not render duplicate controls with the same meaning at the same time.
- Keep primary navigation reachable on mobile without turning every workflow into a modal.

## Workflow States

Every dashboard workflow should define these states at the Dashboard UI Kit seam:

- loading;
- empty;
- ready;
- validation error;
- provider/configuration error;
- save pending;
- save success;
- unauthorized;
- unavailable because Environment Contract validation failed.

These states should be tested through authenticated route behavior, not by testing primitive internals.

## Relationship To Other Modules

| Module | Relationship |
| --- | --- |
| Environment Contract | Dashboard provider/auth/media failures should surface as operational state, not hidden console errors. |
| Public Content Graph | Dashboard publishing workflows must preserve stable content IDs, locale variants, SEO fields, sitemap eligibility, and evidence safety. |
| Release Train | Dashboard changes should be preview-smoked before production promotion. |
| Future Media Pipeline | Media workflow surfaces should not bind route screens directly to a storage provider. |

## TDD Connection

The Dashboard UI Kit should be tested through authenticated dashboard behavior. The first useful tracer is that an anonymous visitor cannot access `/dashboard`, while the allowlisted admin can see the dashboard shell with navigation and an operational overview. Later tracers should verify leads, content, media, resume, settings, state surfaces, mobile layout at 390px, and no duplicate controls.
