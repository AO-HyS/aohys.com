# AOHYS Dashboard Architecture

The dashboard is a private React application, not a server-rendered HTML kit.

## Decision

`apps/site` owns the public Astro SEO surface. `apps/dashboard` owns the private application under `/dashboard`.

Cloudflare Pages Functions remain the guard:

- verify Better Auth session through Convex;
- enforce the admin allowlist;
- serve the React app shell for `/dashboard/*`;
- expose `/dashboard/api/*` as a private JSON proxy to Convex;
- keep `DASHBOARD_API_TOKEN` server-side only;
- return `noindex`, `nofollow`, and `no-store` for private responses.

## Dashboard App

The React app uses:

- Vite for the SPA build;
- TanStack Router for dashboard routes;
- TanStack Table for lead review tables with sorting and pagination;
- shadcn/ui with Radix primitives and Tailwind v4 tokens;
- project-centered screens instead of unrelated case-study/media/settings pages.

Current app routes:

| Route | Purpose |
| --- | --- |
| `/dashboard` | Private landing route for the dashboard app |
| `/dashboard/projects` | Manage project text, SEO, CTA, URL, achievements, structure notes, and images |
| `/dashboard/leads` | Review and update lead status |
| `/dashboard/resume` | Manage downloadable resume versions |

Legacy URLs `/dashboard/case-studies`, `/dashboard/media`, and `/dashboard/settings` are routed to the project workspace.

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

The public Astro site still renders from the Public Content Graph for SEO stability. Dashboard edits are stored as Convex project drafts until a publishing step promotes reviewed content into the static graph and triggers the release train. Save draft is not publish.

## Gaps To Close

- Media upload: replace temporary public URL metadata with Cloudflare Images direct upload from the dashboard. This needs a narrow runtime secret and an upload URL endpoint; do not place a broad Cloudflare release token into browser code.
- Publishing: add a reviewed publish action that writes content graph changes through source control or a safe build-dispatch workflow.
- Resume editor: add Convex resume section drafts for summary, experience, projects, skills, and education before treating `/dashboard/resume` as a full content editor.

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
