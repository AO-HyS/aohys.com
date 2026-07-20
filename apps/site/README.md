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
  -b CONVEX_URL=https://patient-bird-955.convex.cloud \
  -b CONVEX_SITE_URL=https://patient-bird-955.convex.site \
  -b BETTER_AUTH_URL=http://localhost:8788 \
  -b BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:8788,http://localhost:4321 \
  -b ADMIN_EMAIL=a.ortizcrr@gmail.com,alejandro.ortiz@aohys.com
```

Regenerate the text-based resume PDF after editing English resume graph content:

```sh
pnpm run build:resume-pdf
```

Preview and production deploys run `publish:content:build` and then `verify:published-content`. That post-publish gate regenerates the PDF from the applied canonical resume, extracts it in the public-route test, and rebuilds the site before Cloudflare receives any files. A dashboard revision can replace curated static content only when its own `updatedAt` is later than the entry's `approvedAt`; republishing old copy does not make it fresh. Bump `approvedAt` whenever a curated locale entry is reviewed and changed in source.

Each curated case study and resume entry also carries an `approvedHash`. Source changes must update both the approval timestamp and hash; CI recomputes the digest so forgetting the approval boundary cannot silently expose an older dashboard revision.

Only the deploy command sets `AOHYS_DASHBOARD_CONTENT_APPLIED=1`, after the authenticated publication bridge has applied reviewed dashboard revisions. Normal CI never trusts a marker stored in public content and always enforces the committed approval hashes.

Curated case studies use the public-safe evidence assets committed with their copy by default. Dashboard media can replace one only after an admin explicitly selects that asset later than the case study's code-reviewed `approvedAt`; publishing alone does not refresh that per-asset review signal.

The current shell includes the graph-backed home proof narrative, selected-work index, case-study detail pages, resume page, text-based PDF artifact, bilingual route skeletons, global tokens, font loading, graph-backed metadata, navigation, footer, sitemap, robots output, Astro native i18n config, and Vitest route/build smoke checks.

Cloudflare Pages security headers are authored in `src/security-headers.ts`. `public/_headers` is generated from that shared source with `pnpm --filter @aohys/site sync:headers`, and `sync:headers:check` guards it during site lint/test. Pages Functions responses such as `/dashboard` and `/observability/csp` use the same module directly. The route build tests verify the generated header artifact alongside sitemap, robots, privacy, analytics, and contact failure-state behavior.

UI copy that belongs to the shell lives in locale JSON files under `src/i18n`. Public page identity, localized slugs, SEO metadata, and sitemap eligibility come from `@aohys/content-graph`.

Private behavior is implemented outside the Astro route graph:

- `/dashboard/*` is handled by Cloudflare Pages functions and serves the `@aohys/dashboard` React app after session/admin checks.
- Dashboard data is read and written directly by the React app through admin-gated Convex functions. The shell injects `CONVEX_URL`, the active request origin for Better Auth, and the required Cloudflare Images delivery hash as browser runtime config.
- `/dashboard/sign-in/google` starts Google OAuth server-side, sets the Better Auth state cookie, and redirects to Google without client-side script.
- `/dashboard/projects` combines Public Content Graph nodes with Convex project drafts, image metadata, site contact values, and resume artifacts.
- `/api/auth/*` is proxied by Cloudflare Pages functions to Convex Better Auth routes.
- Private responses are `noindex, nofollow`, `cache-control: no-store`, and carry the shared CSP/reporting policy; dashboard routes stay out of sitemap generation.
