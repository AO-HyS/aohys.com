# Observability contract

`signal-catalog.v1.json` is the versioned contract for signal ownership, purpose, allowed properties, privacy, and retention. Validate it with:

```sh
node scripts/observability/validate-signal-catalog.mjs
node --test scripts/observability/*.test.mjs
```

`alert-catalog.v1.json` separately defines local alert operations. Every actionable alert has an owner, signal and correlation keys, a threshold copied from the measured IM-12 baseline, a measurement window, deduplication and quieting rules, a runbook, and a verified-fix criterion. Dimensions whose runtime evidence is still unproven remain `report-only` with `numericThreshold: null`.

```sh
pnpm observability:validate
pnpm observability:alert-drill
```

The drill creates a production build, writes a fresh measurement only to a temporary directory, runs the real semantic performance tests, and evaluates the runbook's verified-fix criteria. Its trigger exercise is explicitly a simulation; its successful verification is a fresh local result. It performs no provider writes and does not claim that an alert is live.

Public-site and dashboard browser exceptions use PostHog `captureException` so the SDK creates the structured exception list. The final `before_send` boundary removes messages and other arbitrary nested values while retaining the error type and sanitized stack frames. Browser, edge, and contact-backend events include `release` only when the injected value is a complete 40-character Git commit SHA. LCP, INP, and CLS are the only catalogued Core Web Vitals; `first-input` is not used as an INP substitute.

## External rollout gate

No provider was queried or mutated during implementation. Before rollout, a human-authorized provider check must select PostHog project `489978` and read only event names, counts, timestamps, and property names. Historical repository evidence also names project `492205`; that conflict must be resolved in the provider UI before any controlled-exception claim is accepted.

Release Train integration must inject both `PUBLIC_RELEASE_SHA` and `VITE_RELEASE_SHA` from the exact `${{ github.sha }}` value, then run `pnpm observability:audit:deploy` before either deploy command. The Environment Contract requires both complete SHAs and rejects drift between browser, edge, and backend release identity. Workflow wiring remains the integration owner's step after the publication lane converges.

The controlled exception drill must run in an approved safe environment with the release variables injected from the same `github.sha`. It passes only when one synthetic exception appears in project `489978` with `source`, `error_type`, `release`, and an evaluable sanitized `$exception_list` stack; payload values, replay links, person profiles, and source-map upload remain out of scope. Source maps are deferred unless the captured minified stack proves non-actionable.
