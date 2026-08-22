# Work archive eager-image regression

Owner: `product-engineering`

This runbook is local and provider-independent. It handles the `work-archive-eager-image-regression` alert emitted by the deterministic IM-12 measurement. It does not prove that a PostHog alert is active.

## Correlate

1. Materialize `release` and `measurementRevision` from the measurement's `source.revision`, then record both values from the alert signal.
2. Confirm that the observed metric is `/observations/publicSite/workArchiveEagerImages` from `pnpm performance:measure`.
3. Deduplicate repeated evidence with `alertId + release + measurementRevision`; the catalog quiets that tuple for 1,440 minutes.

## Diagnose

1. Inspect the work-archive card images in the public-site source.
2. Confirm that only the first above-the-fold archive image is eager. Later cards must remain lazy.
3. Do not change WebGL, bundle, RUM, or Convex limits while diagnosing this alert; those dimensions are report-only until their external baselines exist.

## Correct

1. Restore lazy loading for every work-archive image after the first card.
2. Run `pnpm performance:measure` to produce a fresh build measurement.
3. Run `pnpm performance:test` to verify the semantic assertion.

## Verify the fix

The fix is verified only when the new measurement reports `workArchiveEagerImages <= 1` and the performance tests pass. A source edit, a green build without the metric, or a provider acknowledgement alone does not close the alert.

The reproducible local drill is `pnpm observability:alert-drill`; it verifies the committed evidence at `docs/observability/evidence/im-11-alert-drill.v1.json` without sending data to PostHog, Convex, or another provider.
