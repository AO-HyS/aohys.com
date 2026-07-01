# @aohys/dashboard

Private dashboard workspace for `aohys.com/dashboard`.

`apps/dashboard` is a Vite React app with TanStack Router and shadcn/ui. It is the private product surface for managing the public-site operating data.

Route protection still lives in Cloudflare Pages Functions so `/dashboard` can stay on the same public domain while Astro keeps the SEO-only public pages static. Auth/session verification goes through Better Auth routes backed by Convex, and the Pages Function enforces the admin allowlist before it serves the React shell.

The browser never receives `DASHBOARD_API_TOKEN`. React calls `/dashboard/api/*`; the Pages Function validates the session/admin and proxies the request to private Convex HTTP endpoints.

Current app routes:

- `/dashboard`
- `/dashboard/projects`
- `/dashboard/sign-in`
- `/dashboard/leads`
- `/dashboard/resume`

Legacy URLs `/dashboard/case-studies`, `/dashboard/media`, and `/dashboard/settings` are handled by the same React app and land on the project workspace.

The primary workflow is project-centered: title, summary, SEO description, CTA, project URL, achievements, structure notes, image metadata, evidence status, and public content graph IDs live together.

All private dashboard responses must remain `noindex, nofollow` and `cache-control: no-store`.
