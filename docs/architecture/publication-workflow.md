# Durable publication workflow

Dashboard publication uses Convex's native scheduler as the durable fallback. No Workpool or Workflow component is required for this bounded, one-dispatch operation.

1. The authenticated action resolves `AOHYS_ENV` strictly to `preview` or `production`.
2. One Convex mutation hashes the canonical pre-publication source, publishes local draft state, creates or reuses `PublicationRequest`, creates at most one eligible `PublicationAttempt`, and schedules the internal dispatcher atomically.
3. The dispatcher claims `scheduled` work with Convex OCC before calling GitHub. A pending, dispatching, acknowledged, ambiguous, or deployed request is never dispatched again. A retryable provider rejection may create a later attempt under the same request. A response-lost or provider-accepted ambiguity is `rollback-needed` and is never retried automatically.
4. GitHub acknowledgement only moves the attempt to `acknowledged`. The Release Train records an internal `PublicationReceipt` after the environment smoke passes. That receipt is the only transition to `deployed`.

The canonical request key includes the target environment and scope-specific source revision. Project requests include only that project's localized drafts and selected media; resume requests include the selected resume draft; `all` also includes release settings. Publish-mutated timestamps and media status are excluded, so retrying after the local commit reuses the same logical request. Source content and provider tokens are never persisted in publication rows.

## Preview acceptance gate

The provider integration remains unproven until a controlled preview `workflow_dispatch` preserves the request key and attempt id through a successful deploy and smoke, then writes a matching receipt. Retain the request key, attempt id, GitHub run id/URL/SHA, preview URL, and smoke output as evidence. This repository change does not perform that provider call.

The environment's `CONVEX_DEPLOY_KEY` must permit running internal mutations in addition to deployment. Provider readiness must verify that permission before the controlled run; a deploy-only key cannot write the receipt.

## Recovery and rollback

- `release-failed` with `retryable: true`: an explicit dashboard publish retry may create one new attempt for the existing request.
- `rollback-needed`: inspect GitHub by attempt correlation before any retry. If the provider accepted the request, reconcile or roll back that run; do not dispatch blindly.
- A scheduled action that failed before claim stays `scheduled`. Only `publication:retryScheduledAfterStatusCheck` may reschedule it, after an explicit provider `not-found` status check and timestamp.
- A receipt callback is idempotent only when every correlation field is identical. Conflicts fail closed. Roll back the release itself through the protected Release Train; never delete request, attempt, or receipt evidence.
