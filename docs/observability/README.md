# Observability contract

`signal-catalog.v1.json` is the versioned contract for signal ownership, purpose, allowed properties, privacy, and retention. Validate it with:

```sh
node scripts/observability/validate-signal-catalog.mjs
node --test scripts/observability/*.test.mjs
```

Public-site and dashboard browser exceptions use PostHog `captureException` so the SDK creates the structured exception list. The final `before_send` boundary removes messages and other arbitrary nested values while retaining the error type and sanitized stack frames. Browser, edge, and contact-backend events include `release` only when the injected value is a complete 40-character Git commit SHA. LCP, INP, and CLS are the only catalogued Core Web Vitals; `first-input` is not used as an INP substitute.

## External rollout gate

No provider was queried or mutated during implementation. Before rollout, a human-authorized provider check must select PostHog project `489978` and read only event names, counts, timestamps, and property names. Historical repository evidence also names project `492205`; that conflict must be resolved in the provider UI before any controlled-exception claim is accepted.

The controlled exception drill must run in an approved safe environment with the release variables injected from the same `github.sha`. It passes only when one synthetic exception appears in project `489978` with `source`, `error_type`, `release`, and an evaluable sanitized `$exception_list` stack; payload values, replay links, person profiles, and source-map upload remain out of scope. Source maps are deferred unless the captured minified stack proves non-actionable.
