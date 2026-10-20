# Durable publication workflow

Dashboard publication uses Convex's native scheduler as the durable fallback. No Workpool or Workflow component is required for this bounded, one-dispatch operation.

1. The authenticated action resolves `AOHYS_ENV` strictly to `preview` or `production`.
2. One Convex mutation hashes the canonical pre-publication source, publishes local draft state, creates or reuses `PublicationRequest`, creates at most one eligible `PublicationAttempt`, and schedules the internal dispatcher atomically.
3. The dispatcher claims `scheduled` work with Convex OCC before calling GitHub and records a five-minute claim lease. A pending, dispatching, acknowledged, ambiguous, or deployed request is never dispatched again. A retryable provider rejection may create a later attempt under the same request. A response-lost or provider-accepted ambiguity is `rollback-needed` and is never retried automatically.
4. GitHub acknowledgement only moves the attempt to `acknowledged`. A workflow-level reconciliation job records correlated Release Train plan/deploy failures, plus cancellation paths when that downstream job starts, as explicit terminal evidence and retryable `release-failed`. The Release Train records an internal `PublicationReceipt` only after the environment smoke passes, and that receipt is the only transition to `deployed`.

The canonical request key includes the target environment and scope-specific source revision. Project requests include only that project's localized drafts and selected media; resume requests include the selected resume draft; `all` also includes release settings. Publish-mutated timestamps and media status are excluded, so retrying after the local commit reuses the same logical request. Source content and provider tokens are never persisted in publication rows.

## Preview acceptance gate

The controlled operator/provider path was observed on 2026-10-18 (local time)
at source `d233b1eb9c352f8a68b9a2ca55f5ce2c561ff006`, using explicitly synthetic
requests and attempts on preview backend `effervescent-minnow-483`:

- `reconcile + not-found` produced retryable `release-failed` / `failed`.
- `reconcile + unknown` produced non-retryable `rollback-needed` / `ambiguous`
  without scheduling a dispatch.
- `retry + not-found` created one successful scheduler job. GitHub Release Train
  [run 39183569721](https://github.com/AO-HyS/aohys.com/actions/runs/39183569721)
  deployed preview, passed smoke and wrote one matching `PublicationReceipt`;
  its request ended `deployed`.

The retry request key is
`273ae10998120144dd98b9496791f26a35797da0b01e6f681ac2db6b2ffd3004`, attempt
`273ae10998120144dd98b9496791f26a35797da0b01e6f681ac2db6b2ffd3004.1`.
The receipt matches request/attempt IDs, target `preview`, `refs/heads/develop`,
run ID/URL and the source SHA above. The versioned deployment is
`https://84be838b.aohys-com.pages.dev`; the actual release log records smoke on
`https://develop.aohys-com.pages.dev`. Smoke on the versioned origin remains
unproven.

Private evidence is under
`~/.development-system/private/verification/aohys-pending16-20261018/`:
`operator-plan.json`, `operator-execution.json`, `operator-denials-verdict.json`,
`operator-final-readback.json`, `receipt-correlation-verdict.json` and
`provider-release.log`. Invalid target/state/correlation/unknown/date inputs
were refused without changing the terminal fixture, receipts or audit;
protected drafts, versions, media, metadata and settings matched before/after.
Three synthetic requests and attempts, one receipt, six audit events, one
completed job and a release-smoke lead in `new` state are retained. Operator
notification delivery is unconfirmed. These are synthetic setup and real
provider effects, not recovery of an organic stuck attempt; do not replay the
private execution script or repeat the dispatch to fill an already-proven gate.

The authenticated dashboard gate ran on 2026-10-19 on the stable preview
alias (`aohys-item1-20261019`): an allowed admin's invalid resume content was
rejected server-side without writes, a valid save and byte-identical
restoration were observed with their audit rows, and the same session was
refused by Pages and Convex once the preview allowlist excluded it. The
admin's dashboard Publish created a request and dispatched release run
39372485104, which failed at the public claim check (`derived-percentage` in
the preview resume draft). The request is preserved as `release-failed`;
the draft was re-saved unchanged to clear `publishedAt`. Since #229, publish
refuses such a project or resume source before any publication write; the
release check remains the final guard. On 2026-10-20, after that label was
replaced, the admin's dashboard Publish of the EN resume reached `deployed`
through run 39467984608 (preview deploy and smoke passed) with one matching
receipt (`publish-ok-verdict.json`). Since #234, sign-in started on a
versioned host is handed to the stable alias, so Google no longer sees an
unregistered callback.

The environment's `CONVEX_DEPLOY_KEY` must permit running internal mutations in
addition to deployment. The controlled run above observed a successful
`recordReceipt` operator event with credential class `deploy-key` on the preview
deployment. Future runs must recheck that capability; a deploy-only key cannot
write the receipt.

Manual publication dispatches are target-bound: preview must run from `refs/heads/develop`, production must run from `refs/heads/main`, and every checkout is pinned to the dispatch event SHA. Both terminal outcome and post-smoke receipt callbacks carry the Git ref; Convex rejects a target/ref mismatch even when the dispatch acknowledgement used the legacy `204` response and therefore has no provider run id.

## Recovery and rollback

Operators recover with the publication CLI, never by assembling `convex run` arguments by hand. Every command takes `--target preview|production`; the CLI reads the reached deployment's `AOHYS_ENV` and the request target first, and the mutation checks again before any write that the attempt belongs to its request and that the expected target, the request target and the deployment's `AOHYS_ENV` agree. A mismatch writes nothing.

```sh
pnpm publication status --target preview --attempt <publicationAttemptId>
pnpm publication reconcile --target preview --attempt <id> --provider-status not-found|unknown --checked-at <ISO time> --authorization-ref <owner authorization>
pnpm publication retry --target preview --attempt <id> --provider-status not-found --checked-at <ISO time> --authorization-ref <owner authorization>
```

`reconcile` applies the stale-claim transition below and `retry` reschedules only a `scheduled` attempt with a `not-found` check, dispatching to GitHub again; both change publication state, so both require an owner authorization reference, checked by the CLI and the mutation. Each CLI write records an `operator` audit event with the deployment read on the server, the credential class (`deploy-key` or `cli-session`) and the authorization reference. `recordReceipt` and `reconcileWorkflowOutcome` always record an `operator` event with the deployment read on the server. The Release Train scripts declare `operator` (credential class, the run URL as reference, label `release-train`); a backend that predates the field rejects it in argument validation, before its handler runs, and the script makes the same call once without it, so callbacks keep working during a rollout. The credential class follows the Convex CLI's resolution (process environment, then `apps/backend/.env.local` and `.env`, empty values unset, a deploy key wins), and the CLI is invoked with exactly that credential.

- `release-failed` with `retryable: true`: an explicit dashboard publish retry may create one new attempt for the existing request.
- `rollback-needed`: inspect GitHub by attempt correlation before any retry. If the provider accepted the request, reconcile or roll back that run; do not dispatch blindly.
- A scheduled action that failed before claim stays `scheduled`. Only `publication:retryScheduledAfterStatusCheck` may reschedule it, after an explicit provider `not-found` status check and timestamp.
- A `dispatching` attempt is recoverable only after its claim lease expires. A provider status check timestamped after the lease changes explicit `not-found` evidence to retryable `release-failed`; an unknown outcome becomes non-retryable `rollback-needed`.
- A Release Train failure/cancellation callback is idempotent only when request, attempt, target, branch, run id/URL, release SHA, and outcome all match persisted evidence. Even after deployment, any mismatch fails closed before the callback becomes a no-op. A later dashboard retry is allowed only after terminal evidence (or a safe `not-found` reconciliation), never merely because time elapsed.
- A post-smoke receipt may resolve an `acknowledged`, still-`dispatching`, or response-lost `ambiguous` attempt because it is stronger provider evidence. `deployed` is monotonic: late dispatcher completions and failure/cancellation callbacks become no-ops once the request is deployed or a receipt exists. The receipt callback is idempotent only when every correlation field is identical. Conflicts fail closed. Roll back the release itself through the protected Release Train; never delete request, attempt, or receipt evidence.

The reconciliation job depends on release planning and both target deploy jobs with `if: always()`, then inspects the relevant `needs.*.result`. This automatically covers ordinary plan/deploy failures. GitHub's [workflow cancellation reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation) only guarantees condition re-evaluation for jobs that are already running; it does not guarantee that this pending downstream `needs` job will start after a concurrency or UI cancellation. If it does start, it records the cancellation. Otherwise, inspect the correlated GitHub run first and run `pnpm exec tsx scripts/record-publication-outcome.ts` manually with the original request key, attempt id, target, Git ref, run id/URL, release SHA, terminal outcome, and environment `CONVEX_DEPLOY_KEY`. A force-cancel, runner outage, or failure inside reconciliation uses the same manual path. A re-run of a workflow pinned before operator provenance existed omits `operator`; the backend rejects that callback in argument validation, before any write, and the same manual path with the current scripts (which declare provenance, with the run URL as reference) records it. If GitHub cannot prove a terminal run, use the stale-claim status-check path and record `unknown` as `rollback-needed`; never retry from elapsed time alone.

Earlier handler-level simulations modeled Convex mutation/OCC retries and the
unique request-key boundary; they did not prove live concurrency. The controlled
preview run above proves the single-dispatch provider and receipt path.
Concurrent authenticated dashboard publication remains unproven. The repository
has no automated tests.
