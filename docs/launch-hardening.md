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
- Cloudflare Pages `_headers` security header artifact plus shared Pages Functions headers for `/dashboard` and `/observability/csp`.
- Contact form visible states for validation failure, email/provider failure, backend failure, endpoint missing, and retry copy.
- Analytics sanitization so contact message text, email, phone, company, and form data do not enter PostHog browser events.
- Contact lead intake persists before optional Resend/PostHog provider delivery, and provider failures produce sanitized operational events when PostHog is configured.
- Malformed, invalid, abusive, or rate-limited intake emits sanitized `lead_intake_rejected` events; `lead_intake_failed` is reserved for real backend failures before persistence.
- Dashboard runtime exceptions are caught by the Cloudflare Pages boundary and return a private unavailable state instead of a raw Worker 1101 page.
- Environment Contract separation for local, preview, production, release, contact runtime, and dashboard runtime targets.
- React dashboard app state surfaces for loading, empty, saved, validation, unauthorized, configuration, and Environment Contract failures.

## Preview release checks

After merge to `develop`, wait for the Release Train preview job:

```sh
gh run list --branch develop --limit 5
pnpm run audit:posthog-env
SMOKE_BASE_URL=https://develop.aohys-com.pages.dev pnpm run smoke:preview
```

If `pnpm run audit:posthog-env` fails, remove any preview key and set only the retained production project key:

```sh
gh variable delete PUBLIC_POSTHOG_KEY --env preview --repo AO-HyS/aohys.com
gh variable set PUBLIC_POSTHOG_KEY --env production --repo AO-HyS/aohys.com --body "<production-posthog-project-key>"
pnpm run audit:posthog-env
```

If the GitHub Environment audit passes but the Release Train fails at `pnpm run audit:cloudflare-pages-runtime`, update the matching Cloudflare Pages runtime binding as well. GitHub remains the release source of truth, but Pages Functions execute with the Cloudflare deployment config values already stored on the Pages project.

Production keeps the retained production project key. Preview and local have no PostHog project/key and must emit zero events. Cloudflare Pages and Convex preview runtimes must also omit the key.

Set GitHub Environment variable `SMOKE_CONTACT_SUBMIT=true` in `preview` only to exercise Convex/Resend; it must not produce a PostHog event. Leave it unset in production unless you deliberately want live notification and analytics smoke.

Manual preview probes:

```sh
curl -sS -D - -o /tmp/aohys-dashboard.html https://develop.aohys-com.pages.dev/dashboard
curl -sS -D - -o /tmp/aohys-dashboard-projects.html https://develop.aohys-com.pages.dev/dashboard/projects
curl -sS -D - -o /tmp/aohys-contact.html https://develop.aohys-com.pages.dev/contact
curl -sS -D - -o /tmp/aohys-csp.txt \
  -H 'content-type: application/csp-report' \
  --data '{"csp-report":{"document-uri":"https://develop.aohys-com.pages.dev/contact/","violated-directive":"script-src-elem","effective-directive":"script-src-elem","blocked-uri":"https://example.invalid/config.js","disposition":"enforce"}}' \
  https://develop.aohys-com.pages.dev/observability/csp
```

Expected results:

- `/dashboard` and all private dashboard paths redirect anonymous visitors to `/dashboard/sign-in`.
- Dashboard responses include `x-robots-tag: noindex, nofollow` and `cache-control: no-store`.
- Public pages and Pages Functions responses include the Cloudflare Pages security headers once served by Cloudflare.
- `pnpm run smoke:preview` checks that CSP needs no third-party PostHog origins and that `/ingest` returns `404` in preview.
- `pnpm run smoke:preview` checks `/observability/csp`; preview accepts the report but emits no PostHog event.
- Contact page renders direct WhatsApp/email fallback and does not expose private dashboard data.
- Contact submission should return success once the lead is persisted; preview may use Resend but always reports analytics as skipped.
- Browser network inspection should show no PostHog request in preview.
- GitHub Environment and Cloudflare Pages preview must not define `PUBLIC_POSTHOG_KEY`; production must define it.

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
- Confirm public and authenticated dashboard events use `https://aohys.com/ingest/*`, and decode accepted payloads to verify `$pageview`, `$pageleave`, `$web_vitals`, fixed-shape exceptions, and business/friction events without PII.

## Browser QA

Use a real browser or Computer Use against preview before production:

- Public routes: `/`, `/case-studies`, `/architecture`, `/resume`, `/contact`, `/privacy`, `/es/`, `/es/contacto`.
- Private routes: `/dashboard`, `/dashboard/projects`, `/dashboard/leads`, `/dashboard/resume`.
- Dashboard mobile: validate at `390px` width; no horizontal overflow, no duplicate controls with the same meaning, visible text at least `12px`, and touch targets at least `44px`.
- Console cleanliness: no uncaught errors on public routes or dashboard sign-in, and no PostHog CSP violations.
- Contact failure states: endpoint missing, backend error, email/provider error, and validation error show safe copy plus retry/direct-contact fallback.
