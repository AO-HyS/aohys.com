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
