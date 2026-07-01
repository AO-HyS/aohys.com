# @aohys/dashboard-ui

Legacy private HTML fallback renderers.

The active dashboard application is `apps/dashboard`: a Vite React app with TanStack Router and shadcn/ui, served under `/dashboard` by `apps/site` after Better Auth and admin checks.

This package remains only for small private sign-in/state fallbacks while the migration is completed. New dashboard workflows should not be added here.

## Current API

- `renderDashboardSignIn()` renders the private Google sign-in entry point.
- `renderDashboardState()` renders unavailable, unauthorized, loading, and configuration states.
- Older shell/workflow renderers remain exported for compatibility tests, but they are not the active dashboard architecture.

## Rules

- Keep private dashboard responses noindex and no-store.
- Do not add new project, lead, media, settings, or resume workflows here.
- Add new dashboard UI in `apps/dashboard` and expose data through `/dashboard/api/*`.
