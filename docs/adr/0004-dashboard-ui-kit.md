# Dashboard App Architecture

Status: accepted, amended

AOHYS uses a private React dashboard app in `apps/dashboard`. The public Astro site in `apps/site` does not implement dashboard workflows directly; it owns authentication, admin authorization, private response headers, and shell delivery.

The earlier Dashboard UI Kit direction was useful for the first guard/shell slice, but it produced the wrong product shape: HTML fragments attached to the public site instead of a real operations application. The active architecture is now a routed React app backed by Convex.

## Considered Options

- Server-render dashboard workflows from `apps/site`: simple to protect, but it keeps the dashboard as scattered HTML and makes real app behavior hard to maintain.
- Route files compose raw shadcn/ui primitives without app boundaries: fast initially, but state, mobile behavior, forms, tables, and errors would duplicate across routes.
- React dashboard app behind the Pages guard: more explicit setup, but it gives the dashboard a normal application architecture while preserving the same-domain private boundary.

## Decision

- `apps/dashboard` owns dashboard screens, routing, state, forms, and shadcn/ui components.
- `apps/site` serves the dashboard shell only after Better Auth session and admin allowlist checks pass.
- Browser code calls admin-gated public Convex functions directly through Better Auth JWTs; Pages Functions remain a route guard and shell renderer.
- Convex stores operational records and project drafts. The public Astro site keeps rendering from the Public Content Graph and applies reviewed dashboard drafts during the publish pipeline.

## Consequences

- Dashboard work should add routed React screens, not server-rendered workflow fragments.
- shadcn/ui should be installed and managed through its CLI inside `apps/dashboard`.
- Mobile dashboard behavior should be a first-class acceptance surface, including 390px checks.
- Public Content Graph publishing invariants and Environment Contract failures should surface through dashboard app states.
- `packages/dashboard-ui` remains a legacy fallback package for private sign-in/state HTML until those surfaces are moved or deleted.
