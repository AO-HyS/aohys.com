# @aohys/environment

Environment Contract implementation package.

The interface stays small: list variable definitions, validate the current environment, expose safe public values later, and fail fast when required configuration is missing or unsafe for the target environment.

## Public API

- `getEnvironmentVariableDefinitions()` returns provider, classification, exposure, and required-environment metadata.
- `validateEnvironmentContract(environment, values)` validates a local, preview, or production value set.

## Convex Coverage

The current contract classifies these Convex values:

| Variable | Class | Exposure |
| --- | --- | --- |
| `CONVEX_URL` | Provider output | Server-only |
| `CONVEX_SITE_URL` | Provider output | Server-only |
| `CONVEX_DEPLOYMENT` | Provider output | Server-only |
| `CONVEX_DEPLOY_KEY` | Server secret | Server-only |

No Convex variable is currently exposed through a `PUBLIC_` browser prefix. Dashboard/client exposure should be introduced deliberately in a later dashboard issue if needed.

## Contact Coverage

The public contact form uses `PUBLIC_CONTACT_ENDPOINT` as a browser-safe build value. That value points at the Convex HTTP action for the active environment; Resend, PostHog, and Convex deploy secrets stay server-only.

| Variable | Class | Exposure |
| --- | --- | --- |
| `PUBLIC_CONTACT_ENDPOINT` | Public build value | Public browser |
| `RESEND_API_KEY` | Server secret | Server-only |
| `PUBLIC_POSTHOG_KEY` | Public build value | Public browser |

## PostHog Coverage

The public site uses PostHog through explicit events only. `PUBLIC_POSTHOG_KEY` and `PUBLIC_POSTHOG_HOST` are public browser values, while `PUBLIC_POSTHOG_AUTOCAPTURE` is a public policy value that starts as `false`.

Preview and production values belong in separate GitHub Environments. The browser client sends `$pageview`, selected CTA/form events, and fixed-shape error metadata without contact message text or contact identity. The Convex contact workflow separately emits `lead_submitted` with safe conversion metadata after a valid submission.
