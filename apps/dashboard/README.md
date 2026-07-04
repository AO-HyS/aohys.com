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
- `/dashboard/settings`

Legacy URLs `/dashboard/case-studies` and `/dashboard/media` are handled by the same React app and land on the project workspace. `/dashboard/settings` is a dedicated site-settings workspace for public build values that do not belong to one project.

The primary workflow is project-centered: title, summary, SEO description, CTA, project URL, achievements, structure notes, project media, public link state, and public content graph IDs live together.

Saving in the dashboard writes private drafts to Convex and clears their published marker. Publishing marks reviewed drafts and project media as published, triggers the Release Train through GitHub Actions, and lets `pnpm run publish:content:build` apply those drafts plus generated public media/settings files before Astro builds.

Media upload uses Cloudflare Images direct creator upload URLs. The browser selects a local file, the backend creates a one-time upload URL with server-side credentials, and the dashboard stores metadata plus the resulting delivery URL only after the file upload succeeds.

The resume workspace edits the public resume sections directly: summary, highlights, projects, experience, skills, education, languages, proof panel, and PDF artifact metadata.

All private dashboard responses must remain `noindex, nofollow` and `cache-control: no-store`.
