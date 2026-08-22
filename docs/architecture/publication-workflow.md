# Durable publication workflow

Dashboard publication uses Convex's native scheduler as the durable fallback. No Workpool or Workflow component is required for this bounded, one-dispatch operation.

1. The authenticated action resolves `AOHYS_ENV` strictly to `preview` or `production`.
2. One Convex mutation hashes the canonical pre-publication source, publishes local draft state, creates or reuses `PublicationRequest`, creates at most one eligible `PublicationAttempt`, and schedules the internal dispatcher atomically.
3. The dispatcher claims `scheduled` work with Convex OCC before calling GitHub and records a five-minute claim lease. A pending, dispatching, acknowledged, ambiguous, or deployed request is never dispatched again. A retryable provider rejection may create a later attempt under the same request. A response-lost or provider-accepted ambiguity is `rollback-needed` and is never retried automatically.
4. GitHub acknowledgement only moves the attempt to `acknowledged`. A workflow-level reconciliation job records a correlated Release Train plan/deploy failure or cancellation as explicit terminal evidence and retryable `release-failed`. The Release Train records an internal `PublicationReceipt` only after the environment smoke passes, and that receipt is the only transition to `deployed`.

The canonical request key includes the target environment and scope-specific source revision. Project requests include only that project's localized drafts and selected media; resume requests include the selected resume draft; `all` also includes release settings. Publish-mutated timestamps and media status are excluded, so retrying after the local commit reuses the same logical request. Source content and provider tokens are never persisted in publication rows.

## Preview acceptance gate

The provider integration remains unproven until a controlled preview `workflow_dispatch` preserves the request key and attempt id through a successful deploy and smoke, then writes a matching receipt. Retain the request key, attempt id, GitHub run id/URL/SHA, preview URL, and smoke output as evidence. This repository change does not perform that provider call.

The environment's `CONVEX_DEPLOY_KEY` must permit running internal mutations in addition to deployment. Provider readiness must verify that permission before the controlled run; a deploy-only key cannot write the receipt.

Manual publication dispatches are target-bound: preview must run from `refs/heads/develop`, production must run from `refs/heads/main`, and every checkout is pinned to the dispatch event SHA. Both terminal outcome and post-smoke receipt callbacks carry the Git ref; Convex rejects a target/ref mismatch even when the dispatch acknowledgement used the legacy `204` response and therefore has no provider run id.

## Recovery and rollback

- `release-failed` with `retryable: true`: an explicit dashboard publish retry may create one new attempt for the existing request.
- `rollback-needed`: inspect GitHub by attempt correlation before any retry. If the provider accepted the request, reconcile or roll back that run; do not dispatch blindly.
- A scheduled action that failed before claim stays `scheduled`. Only `publication:retryScheduledAfterStatusCheck` may reschedule it, after an explicit provider `not-found` status check and timestamp.
- A `dispatching` attempt is recoverable only after its claim lease expires. A provider status check timestamped after the lease changes explicit `not-found` evidence to retryable `release-failed`; an unknown outcome becomes non-retryable `rollback-needed`.
- A Release Train failure/cancellation callback is idempotent for the same request, attempt, branch, run, and outcome. Conflicting evidence fails closed. A later dashboard retry is allowed only after this terminal evidence (or a safe `not-found` reconciliation), never merely because time elapsed.
- A post-smoke receipt may resolve an `acknowledged`, still-`dispatching`, or response-lost `ambiguous` attempt because it is stronger provider evidence. `deployed` is monotonic: late dispatcher completions and failure/cancellation callbacks become no-ops once the request is deployed or a receipt exists. The receipt callback is idempotent only when every correlation field is identical. Conflicts fail closed. Roll back the release itself through the protected Release Train; never delete request, attempt, or receipt evidence.

The reconciliation job depends on release planning and both target deploy jobs with `if: always()`, then inspects the relevant `needs.*.result`. This covers release-plan failure and target failure/cancellation before the deploy job can run. GitHub documents that cancellation re-evaluates job conditions and lets an `always()` job continue, but a force-cancel, runner outage, or failure inside the reconciliation job can still prevent the callback. In that case, inspect the correlated GitHub run first and run `pnpm exec tsx scripts/record-publication-outcome.ts` manually with the original request key, attempt id, target, Git ref, run id/URL, terminal outcome, and environment `CONVEX_DEPLOY_KEY`. If GitHub cannot prove a terminal run, use the stale-claim status-check path and record `unknown` as `rollback-needed`; never retry from elapsed time alone.

The deterministic concurrency tests serialize simultaneous handler calls to model Convex mutation/OCC retry semantics and the unique request-key boundary. They prove application-level idempotency under that contract, not live provider scheduling; the controlled Preview acceptance gate remains the end-to-end concurrency and callback proof.
