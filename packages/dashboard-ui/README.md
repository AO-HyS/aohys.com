# @aohys/dashboard-ui

Dashboard UI Kit implementation package.

This package hides dashboard shell/state markup behind AOHYS-specific renderers. Cloudflare Pages functions consume these renderers for the first private dashboard shell without exposing private data or client-side secrets.

## Current API

- `renderDashboardShell()` renders the authenticated shell with navigation, page title, admin identity, and operational overview.
- `renderDashboardSignIn()` renders the private Google sign-in entry point.
- `renderDashboardState()` renders loading, unauthorized, configuration-error, and unavailable states.

The output is intentionally script-free HTML for the first guard/shell slice. Later dashboard workflows can add a shadcn/ui-backed adapter behind the same package boundary without rewriting route protection.

## Rules

- Keep private dashboard routes noindex.
- Use CSS variables for colors and sizing decisions; avoid hardcoded one-off values in route code.
- Preserve 390px usability, no horizontal overflow, and 44px touch targets.
- Keep primitive implementation details inside this package, not inside Cloudflare route handlers.
