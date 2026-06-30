# @aohys/environment

Environment Contract implementation package.

The interface stays small: list variable definitions, validate the current environment, and fail fast when required configuration is missing or unsafe for the target environment.

## Public API

- `getEnvironmentVariableDefinitions()` returns provider, classification, exposure, required-environment, and optional required-target metadata.
- `validateEnvironmentContract(environment, values, options)` validates a local, preview, or production value set. The default target is `release`; runtime code should pass the narrowest target it owns, such as `{ target: "runtime" }`, `{ target: "dashboard-runtime" }`, or `{ target: "auth-runtime" }`.

## Convex Coverage

The current contract classifies these Convex values:

| Variable | Class | Exposure |
| --- | --- | --- |
| `CONVEX_URL` | Provider output | Server-only |
| `CONVEX_SITE_URL` | Provider output | Server-only |
| `CONVEX_DEPLOYMENT` | Provider output | Server-only |
| `CONVEX_DEPLOY_KEY` | Server secret | Server-only |

No Convex variable is currently exposed through a `PUBLIC_` browser prefix. Dashboard/client exposure should be introduced deliberately in a later dashboard issue if needed.

`CONVEX_DEPLOY_KEY` is release-only. Convex runtime/contact code validates with `{ target: "runtime" }` so deployed functions do not require deploy credentials.

## Better Auth Coverage

The private dashboard uses Cloudflare Pages functions for route protection and Convex Better Auth routes for Google sign-in/session verification.

| Variable | Class | Exposure | Runtime target |
| --- | --- | --- | --- |
| `BETTER_AUTH_SECRET` | Server secret | Server-only | auth-runtime |
| `BETTER_AUTH_URL` | Provider output | Server-only | dashboard-runtime and auth-runtime |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Policy value | Server-only | dashboard-runtime and auth-runtime |
| `ADMIN_EMAIL` | Policy value | Server-only | dashboard-runtime and auth-runtime |
| `DASHBOARD_API_TOKEN` | Server secret | Server-only | dashboard-runtime |
| `GOOGLE_CLIENT_ID` | Provider output | Server-only | auth-runtime |
| `GOOGLE_CLIENT_SECRET` | Server secret | Server-only | auth-runtime |

`dashboard-runtime` intentionally does not require contact, Resend, PostHog, Google OAuth credentials, or the Better Auth signing secret. It only needs enough configuration to redirect, call the Convex session endpoint, enforce the admin allowlist, and call private Convex dashboard endpoints with `DASHBOARD_API_TOKEN`. `auth-runtime` requires the Google OAuth credentials and Better Auth secret because Convex serves `/api/auth/*` behind the Cloudflare proxy.

## Contact Coverage

The public contact form uses `PUBLIC_CONTACT_ENDPOINT` as a browser-safe build value. That value points at the Convex HTTP action for the active environment; Resend, PostHog, and Convex deploy secrets stay server-only.

| Variable | Class | Exposure |
| --- | --- | --- |
| `PUBLIC_CONTACT_ENDPOINT` | Public build value | Public browser |
| `RESEND_API_KEY` | Server secret | Server-only |
| `PUBLIC_POSTHOG_KEY` | Public build value | Public browser |

## PostHog Coverage

The public site uses PostHog through explicit events only. `PUBLIC_POSTHOG_KEY` and `PUBLIC_POSTHOG_HOST` are public browser values, while `PUBLIC_POSTHOG_AUTOCAPTURE` is a public policy value that starts as `false`.

Preview and production values belong in separate GitHub Environments and should point to separate PostHog project keys. The browser client sends `$pageview`, selected CTA/form events, and fixed-shape error metadata without contact message text or contact identity. The Convex contact workflow separately emits `lead_submitted` with safe conversion metadata after a valid submission, `lead_provider_failed` when Resend/PostHog provider delivery fails after persistence, and `lead_intake_failed` when the backend rejects or cannot persist a submission.

## Cloudflare Coverage

Cloudflare release variables are release-only unless a later runtime feature needs them.

| Variable | Class | Exposure |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Provider output | Server-only |
| `CLOUDFLARE_API_TOKEN` | Server secret | Server-only |
| `CLOUDFLARE_PROJECT_NAME` | Provider output | Server-only |
| `CLOUDFLARE_IMAGES_ACCOUNT_HASH` | Provider output | Server-only |

`CLOUDFLARE_IMAGES_ACCOUNT_HASH` is optional until Cloudflare Images is activated for this account. The deploy path uses `CLOUDFLARE_API_TOKEN` through GitHub Environment secrets.
