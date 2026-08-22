# IM-12 Convex Preview Insights protocol

Static analysis records deterministic maximum read/write envelopes, but only the Preview deployment can demonstrate subscription invalidation fanout and mutation contention.

## Gate and owner

Owner: release operator with access to the AOHYS Preview Convex deployment and its Insights/Logs. This is an external Preview gate; local execution must not claim it complete.

## Candidate identity

Record the integrated Git SHA, Convex deployment name, UTC capture window, authenticated test role, dataset row counts by affected table, and the generated `docs/research/im-12-performance-baseline.json` source revision.

## Read/fanout capture

1. Open exactly one authenticated dashboard client on each journey: overview, projects, leads, resume, settings.
2. Establish an idle baseline, then perform one bounded mutation relevant to that journey using non-production fixture data.
3. In Convex Insights/Logs, retain function name, invocation count, rows/documents read, bytes read/returned when available, execution duration, and the number of subscribed clients invalidated/re-run.
4. Repeat once with two concurrent authenticated clients. Do not extrapolate beyond the observed client count.

## Contention capture

1. For media selection, prepare one target plus 100 deselected siblings; run one selection and verify zero sibling patches plus one target patch.
2. Prepare one selected sibling; repeat and verify one sibling patch plus one target patch.
3. Exercise concurrent requests only in Preview with recoverable fixture data. Record OCC retries/conflicts, final selected row count, mutation duration, and write count.
4. For durable publication, use the approved Preview publication path and retain the identity-source read, local-publication read/write, request/attempt state writes, scheduled job, and deduped repeat behavior. Do not dispatch production.

## Required outcome

Attach raw provider evidence or mark each metric `unproven` with owner and reason. Values remain report-only until repeated Preview and production/RUM evidence supports a reviewed threshold. Never infer fanout or contention from static `.take()` limits alone.
