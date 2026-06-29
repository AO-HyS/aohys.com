# @aohys/dashboard

Private dashboard workspace for `aohys.com/dashboard`.

V1 route protection currently lives in Cloudflare Pages functions so `/dashboard` can stay on the same public domain while Astro keeps the SEO-only public pages static. The rendered shell comes from `@aohys/dashboard-ui`, and session verification goes through Better Auth routes backed by Convex.

The dashboard runtime does not receive the Better Auth signing secret. It reads session state through the Convex Better Auth endpoint and enforces the admin allowlist at the Pages edge.

This surface is English-only in V1 and should consume the Dashboard UI Kit for shell, workflow surfaces, state handling, and mobile behavior. Dashboard routes should not compose primitive UI directly when a Dashboard Surface exists.

Current protected routes:

- `/dashboard`
- `/dashboard/sign-in`
- `/dashboard/leads`
- `/dashboard/case-studies`
- `/dashboard/media`
- `/dashboard/settings`
- `/dashboard/resume`

The content routes share one Dashboard UI Kit workflow. They read private Convex metadata, combine it with the Public Content Graph for stable public IDs and localized paths, and submit metadata-only changes through private Convex endpoints.

All private dashboard responses must remain `noindex, nofollow` and `cache-control: no-store`.
