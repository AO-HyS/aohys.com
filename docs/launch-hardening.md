# Launch Hardening Checklist

This checklist is the launch-readiness surface for issue #17. It is intentionally runnable and evidence-oriented: checks should prove public/private boundaries, privacy behavior, security headers, contact failure states, and deploy health before promotion.

## Static and source checks

Run before every launch hardening PR:

```sh
pnpm verify
pnpm --filter @aohys/backend exec tsc --noEmit -p convex/tsconfig.json
```

What these cover:

- Public Content Graph routes, canonical URLs, alternates, robots, sitemap entries, and `/dashboard` exclusion.
- Public privacy copy for contact data, PostHog analytics/errors, and private project boundaries.
- Cloudflare Pages `_headers` security header artifact.
- Contact form visible states for validation failure, email/provider failure, backend failure, endpoint missing, and retry copy.
- Analytics sanitization so contact message text, email, phone, company, and form data do not enter PostHog browser events.
- Contact lead intake persists before optional Resend/PostHog provider delivery, and provider failures produce sanitized operational events when PostHog is configured.
- Contact intake failures before persistence emit sanitized `lead_intake_failed` events when PostHog is configured.
- Dashboard runtime exceptions are caught by the Cloudflare Pages boundary and return a private unavailable state instead of a raw Worker 1101 page.
- Environment Contract separation for local, preview, production, release, contact runtime, and dashboard runtime targets.
- Dashboard UI Kit state surfaces for loading, empty, saved, validation, unauthorized, configuration, and Environment Contract failures.

## Preview release checks

After merge to `develop`, wait for the Release Train preview job:

```sh
gh run list --branch develop --limit 5
pnpm run audit:posthog-env
SMOKE_BASE_URL=https://develop.aohys-com.pages.dev pnpm run smoke:preview
```

Manual preview probes:

```sh
curl -sS -D - -o /tmp/aohys-dashboard.html https://develop.aohys-com.pages.dev/dashboard
curl -sS -D - -o /tmp/aohys-dashboard-case-studies.html https://develop.aohys-com.pages.dev/dashboard/case-studies
curl -sS -D - -o /tmp/aohys-contact.html https://develop.aohys-com.pages.dev/contact
```

Expected results:

- `/dashboard` and all private dashboard paths redirect anonymous visitors to `/dashboard/sign-in`.
- Dashboard responses include `x-robots-tag: noindex, nofollow` and `cache-control: no-store`.
- Public pages include the Cloudflare Pages security headers once served by Cloudflare.
- `pnpm run smoke:preview` checks that the served CSP allows PostHog script/config and ingest hosts plus Convex contact endpoints.
- Contact page renders direct WhatsApp/email fallback and does not expose private dashboard data.
- Contact submission should return success once the lead is persisted; Resend/PostHog provider drift should not reject the visitor request.
- Browser console should not show CSP violations for `us-assets.i.posthog.com`.
- GitHub Environment `preview` and `production` should use different PostHog project keys. If they match, preview and production events are filterable by `environment` but still land in the same PostHog project.

## Production promotion checks

Before promoting `develop` into `main`:

```sh
pnpm run release:env:production
pnpm run smoke:production
```

After production deploy:

- Confirm `https://aohys.com/robots.txt` disallows `/dashboard`.
- Confirm `https://aohys.com/sitemap.xml` contains public graph routes and no dashboard URL.
- Confirm `https://aohys.net/` redirects canonically to `https://aohys.com/` when Cloudflare redirect rules are active.
- Confirm `/privacy` and `/es/privacidad` explain contact data, analytics/errors, and private project boundaries without implying private client/product code is public.

## Browser QA

Use a real browser or Computer Use against preview before production:

- Public routes: `/`, `/case-studies`, `/architecture`, `/resume`, `/contact`, `/privacy`, `/es/`, `/es/contacto`.
- Private routes: `/dashboard`, `/dashboard/leads`, `/dashboard/case-studies`.
- Dashboard mobile: validate at `390px` width; no horizontal overflow, no duplicate controls with the same meaning, visible text at least `12px`, and touch targets at least `44px`.
- Console cleanliness: no uncaught errors on public routes or dashboard sign-in, and no PostHog CSP violations.
- Contact failure states: endpoint missing, backend error, email/provider error, and validation error show safe copy plus retry/direct-contact fallback.
