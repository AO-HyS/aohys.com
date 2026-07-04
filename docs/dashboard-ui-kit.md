# AOHYS Dashboard Architecture

The dashboard is a private React application, not a server-rendered HTML kit.

## Decision

`apps/site` owns the public Astro SEO surface. `apps/dashboard` owns the private application under `/dashboard`.

Cloudflare Pages Functions remain the guard:

- verify Better Auth session through Convex;
- enforce the admin allowlist;
- serve the React app shell for `/dashboard/*`;
- inject `CONVEX_URL`, `BETTER_AUTH_URL`, and public delivery config for the React app;
- return `noindex`, `nofollow`, and `no-store` for private responses.

## Dashboard App

The React app uses:

- Vite for the SPA build;
- TanStack Router for dashboard routes;
- TanStack Table for lead review tables with sorting and pagination;
- shadcn/ui with Radix primitives and Tailwind v4 tokens;
- project-centered screens instead of unrelated case-study/media pages, with Settings reserved for site-level public build values.

Current app routes:

| Route | Purpose |
| --- | --- |
| `/dashboard` | Private landing route for the dashboard app |
| `/dashboard/projects` | Manage project text, SEO, CTA, URL, achievements, structure notes, and images |
| `/dashboard/leads` | Review and update lead status |
| `/dashboard/resume` | Manage downloadable resume versions |
| `/dashboard/settings` | Manage site-level public build values that do not belong to one project |

Legacy URLs `/dashboard/case-studies` and `/dashboard/media` are routed to the project workspace.

## Project Model

Projects are the dashboard unit. A project owns:

- public content ID;
- English and Spanish text;
- SEO description;
- CTA label and href;
- public project URL;
- achievements;
- implementation structure notes;
- status and public link state;
- image metadata;
- public-safe public links.

Site-level public settings, such as the public WhatsApp contact URL, belong in Settings instead of inside a project record.

The public Astro site still renders from the Public Content Graph for SEO stability. Dashboard edits are stored as Convex drafts. Publish marks reviewed drafts, triggers the Release Train through GitHub Actions, and `pnpm run publish:content:build` applies published drafts to the static graph before Astro builds. Save draft is not publish.

## Gaps To Close

- Media variants: decide whether Cloudflare Images variants alone are enough or whether R2 originals should be added later.
- Publish audit trail: add a dashboard-visible workflow run link after GitHub returns enough run metadata for the dispatched release.
- Bundle split: the dashboard currently builds as one Vite bundle; route-level code splitting can reduce the warning once the product surface stabilizes.

## Build

`apps/dashboard` builds static assets with stable filenames:

- `/dashboard-app/assets/dashboard.js`
- `/dashboard-app/assets/dashboard.css`

`apps/site` builds Astro, then builds the dashboard app and copies the assets into `apps/site/dist/dashboard-app` for Cloudflare Pages deploys.

## UI Rules

- Use shadcn/ui components added through the CLI.
- Use semantic tokens, not hardcoded color values in app components.
- Use `FieldGroup` and `Field` for forms.
- Keep the dashboard task-first, dense, and operational.
- Keep public SEO copy out of private runtime rendering until the publish pipeline exists.
- Project workspace layout is `project rail + editor` at normal desktop widths. Do not add a third media column until the viewport can support it; media becomes a side column only at wide desktop. On mobile, project selection uses a compact grid, not floating tabs or hidden horizontal overflow.
- Dashboard visual polish should keep high-contrast product tokens, visible active states, and save/publish feedback in the task flow.
