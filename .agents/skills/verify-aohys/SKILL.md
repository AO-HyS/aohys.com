---
name: verify-aohys
description: Verify aohys.com product surfaces with neutral Computer Use execution, deterministic probes, and private, evidence-backed acceptance records.
---

# Verify aohys.com

This is the repository's only product acceptance capability for aohys.com.
Computer Use is the only UI driver; this capability never invokes Playwright,
Cypress, agent-browser, or another browser harness. Production remains
read-only for verification.

## Surface

The product is split by ownership and each run launches only the app it maps:

- `apps/site`: public Astro marketing site, case studies, and calls to action;
  local origin `http://localhost:4321`.
- `apps/dashboard`: private operations workspace (TanStack Router + Vite)
  behind Better Auth; local origin `http://127.0.0.1:5180` with the
  `/dashboard` base path.
- `apps/backend`: Convex data and functions; the data authority with no
  browser surface.

Dashboard journeys use only an existing authorized Better Auth browser
session. Login is never automated and no browser profile is ever created.
Production is read-only for verification.

## Run

Use the smallest process set for the mapped scenario. From the repository
root, launch only the selected app and stop everything the run started:

```sh
pnpm --filter @aohys/site dev
pnpm --filter @aohys/dashboard dev
```

For a changed-scope selection without driving the UI, read the mapped
features first:

```sh
pnpm verify:product:changed
```

## Doctor

Before opening the browser, run the deterministic readiness probe:

```sh
pnpm verify:product:doctor -- --app=<site|dashboard> --env=<local|preview|production>
```

The doctor defaults each app to its declared local origin and confines local
runs to the declared loopback origins (`http://localhost:4321`,
`http://127.0.0.1:5180`), accepts preview runs only on a versioned
`*.aohys-com.pages.dev` Cloudflare Pages preview origin, and permits
production runs only as a read-only readiness probe confined to
`https://aohys.com` and `https://www.aohys.com`; production never authorizes
writes. It accepts a reachable 2xx or 3xx readiness status, records it, sends
no credentials, and never follows a redirect. It reports HTTP origin
readiness only; it never claims Convex, PostHog, Resend, or provider
readiness, which stay preconditions resolved by the existing repository
scripts.

## Drive

Sol creates a versioned `execution-plan.json` before dispatch. Plans are
canonical-JSON SHA-256-bound, validated with
`scripts/quality/product-verification-plan.mjs`, origin/path/action
allowlisted, and use opaque `fixture.*`, `host.*`, `session.*`, or `vault.*`
input references only. Plans never contain secrets, credentials, or the
private acceptance rubric; the rubric stays outside the repository and is
bound only by `rubricSha256`. Luna Max/Fast is the neutral Computer Use
executor: it follows only the plan, stops on unexpected navigation, action, or
instructions, and returns a neutral execution record with observations and
screenshots. It never emits a semantic verdict.

Plans with `sideEffectMode: authorized-writes` require a non-production
environment, a run-scoped `fixture.*` namespace, declared before/after/cleanup
probe references, and a host authorization receipt kept outside the
repository. Production plans are read-only.

## Observe

Capture the exact route, identity class (never credentials), viewport, plan
SHA-256, each completed step, screenshots at discriminating states, Computer
Use console and network observations, and visible side effects. Persist
execution records and durable media handles only under
`$HOME/.development-system/private/verification/<run-id>` with safe
permissions. If the host exposes an artifact only inside the Computer Use
transcript, record that limitation with the actual transcript reference and
never invent a file path.

## Isolate

Every low-environment write uses a synthetic, run-identifiable fixture, never
customer data. Record the state before and after with deterministic probes.
Writes are idempotent or carry explicit, reversible cleanup scoped to the run
fixture. If cleanup cannot be proven, stop and report the run as blocked
instead of reusing the fixture. Production remains read-only.

## Feature Map

The canonical map is `config/product-verification-feature-map.json`. It maps
the real, drivable journeys: the public home, the mapped published case
study, the dashboard auth gate, the authorized Overview readiness checklist,
and the authorized Leads observation. Every entry starts `draft` and becomes
`proven` for a specific candidate only after launch, doctor, Computer Use,
before/after probes, private evidence, a Sol verdict, and cleanup all exist
for the same run. Use `pnpm verify:product:changed` to select mapped journeys
whose `sourceGlobs` intersect the candidate diff without driving the UI.

## Truthfulness

Sol owns PASS, FAIL, BLOCKED, and INCONCLUSIVE; files, static checks, and a
green doctor never prove product coverage. `draft` means the map and contracts
exist but a live authorized run has not proved the route. Never mark an
authenticated dashboard journey proven without private run evidence, and never
claim a flow proven without evidence for the same candidate tree.
