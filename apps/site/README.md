# @aohys/site

Astro public site for `aohys.com`.

This surface owns public SEO pages, bilingual routes, metadata rendering, sitemap output, and the Impeccable-crafted public shell. Public routes should consume the Public Content Graph instead of defining content identity ad hoc in route files.

## Commands

```sh
pnpm --filter @aohys/site dev
pnpm --filter @aohys/site lint
pnpm --filter @aohys/site typecheck
pnpm --filter @aohys/site test
pnpm --filter @aohys/site build
```

Local Cloudflare Pages Functions QA needs explicit Wrangler bindings; shell-prefixed env vars are not enough for `pages dev`:

```sh
pnpm exec wrangler pages dev apps/site/dist \
  --ip 127.0.0.1 \
  --port 8788 \
  --compatibility-date=2026-06-28 \
  -b AOHYS_ENV=local \
  -b PUBLIC_SITE_URL=http://localhost:8788 \
  -b CONVEX_SITE_URL=https://patient-bird-955.convex.site \
  -b BETTER_AUTH_URL=http://localhost:8788 \
  -b BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:8788,http://localhost:4321 \
  -b ADMIN_EMAIL=a.ortizcrr@gmail.com,alejandro.ortiz@aohys.com \
  -b DASHBOARD_API_TOKEN=local-dashboard-token
```

Regenerate the ATS-friendly resume PDF after editing English resume graph content:

```sh
python3 apps/site/scripts/build-resume-pdf.py
```

The current shell includes the graph-backed home proof narrative, selected-work index, case-study detail pages, resume page, ATS PDF artifact, bilingual route skeletons, global tokens, font loading, graph-backed metadata, navigation, footer, sitemap, robots output, Astro native i18n config, and Vitest route/build smoke checks.

Cloudflare Pages security headers live in `public/_headers` for static assets and `src/security-headers.ts` for Pages Functions responses such as `/dashboard` and `/observability/csp`. The route build tests verify the header artifact alongside sitemap, robots, privacy, analytics, and contact failure-state behavior.

UI copy that belongs to the shell lives in locale JSON files under `src/i18n`. Public page identity, localized slugs, SEO metadata, and sitemap eligibility come from `@aohys/content-graph`.

Private behavior is implemented outside the Astro route graph:

- `/dashboard/*` is handled by Cloudflare Pages functions and renders `@aohys/dashboard-ui`.
- `/dashboard/sign-in/google` starts Google OAuth server-side, sets the Better Auth state cookie, and redirects to Google without client-side script.
- `/dashboard/case-studies`, `/dashboard/media`, `/dashboard/settings`, and `/dashboard/resume` render the content workflow by combining Public Content Graph nodes with private Convex metadata.
- `/api/auth/*` is proxied by Cloudflare Pages functions to Convex Better Auth routes.
- Private responses are `noindex, nofollow`, `cache-control: no-store`, and carry the shared CSP/reporting policy; dashboard routes stay out of sitemap generation.
