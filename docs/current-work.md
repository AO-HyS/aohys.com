# Current work — primitives gardener (fix verification reopened)

Canonical root: `/Users/corrortiz/Documents/AO/aohys`. Base: `develop`
`d233b1eb9c352f8a68b9a2ca55f5ce2c561ff006` (2026-10-18).
The v5 implementation is delivered (#211–#224; production #225/#227).
This continuation reopens only the remaining acceptance evidence.
Delivery branch: `docs/primitives-preview-write-proof`; PR #228:
https://github.com/AO-HyS/aohys.com/pull/228. On 2026-10-19 the owner authorized
everything through production ("No te detengas hasta que todo esté en
producción… Te doy permiso de hacer todo lo que necesitas hacer"). The
authenticated allowed/denied gate passed on 2026-10-19 (item 1 below); the
dashboard publish it exercised found a defect fixed by #229. This file is the continuation handoff.

Goal: one source per primitive, recorded in
`docs/architecture/primitives.json` and valid under
`development-system check-primitives`. The finite list and authorization
contract were accepted in cross-review (Astra Extra High, five rounds, v5
`11ab9c06`); inventory, plan and accepted list live in the shared private
research `primitives-20261013`.

Done (merged to develop): #211 resume server validation, #212 domain
vocabulary, #213 build-script payload types and unknown guards, #214
Environment Contract destinations, #215 feature map write and denied journeys,
#216 admin builders and allowlist, #217 `auditEvents`, #218–#219 release CLI
and targets, #220 publication CLI, #221 dashboard kit required, #222 projects
save feedback through `SaveBar` and `AsyncSurface`, #223 `brand-tokens`
(one palette source generating the site and dashboard themes) and Sunlit
retired.

The finite implementation list is done and `primitives.json` records 17
active primitives, adding the existing durable publication, contact intake,
public content graph, media policy, architecture fitness and quality gates
(the Pages dashboard gate folds into `admin-functions`). The Steward continues
map upkeep (aohys is on its allowlist). The owner
reopened the acceptance follow-ups below in fix mode on 2026-10-18. They
remain pending until the real behavior and side effects are observed.

Current review budget: one Sol 6.1 High review per finished PR, as the owner
explicitly requested for this continuation; a second only on the fix diff of a
blocking finding. Codex is requested once when the PR is ready, at most once
more. No review is spent on an unfinished acceptance pass.

## Retained authorization (2026-10-18)

The owner explicitly authorizes branches, PRs, merges into develop after all
gates, repository CLIs/MCPs and agent-initiated Google/browser login using the
repository accounts. This supersedes the old "login is never automated"
restriction in the verification skill/feature-map preconditions for this run.
The owner also requested the publication write paths and their proof; do not
ask again for already-authorized preview work. Production, data deletions and
destructive migrations still require the owner's approval. Publication keeps
request keys, receipts and reconciliation; no blind or timed retry.

Every PR needs `system-recap`, one finished-head Sol review without blocking
findings, and a clean `development-system pr-review-status <PR URL>`. Before
every develop merge: QuickE2E with Jev, allowed role, denied role and side
effects, with its private evidence path in the PR. No exception was granted.
One browser operator at a time; verify the live account and role before effects.
No cross-review was requested or run. All auxiliary files/evidence stay under
`~/.development-system/private`; no automated tests or emitted replay specs.

## Remaining acceptance and exact resumption

1. **Item 1 — PASSED on preview (stable alias), 2026-10-19.** Session: the
   owner's real Google account `a.ortizcrr@gmail.com`, synced from their Chrome
   (expect MCP cookies) into a two-cookie private storageState. Allowed admin:
   `upsertResumeDraft` with non-JSON and wrong-shape content returned "Resume
   content does not match the resume contract; nothing was saved." with no
   audit row; QuickE2E `admin-resume-valid-save` PASS (Jev) changed the EN
   location and wrote one `content:upsertResumeDraft` session audit event;
   versions unchanged; the original contentJson was restored byte-identically.
   Denied: the preview `ADMIN_EMAIL` GitHub environment variable was narrowed to
   `alejandro.ortiz@aohys.com` (release run 39371674175 synced Pages and Convex);
   the same session got Pages 403 on `/dashboard` and `/dashboard/resume`,
   QuickE2E `denied-session-dashboard` and `denied-session-resume` PASS
   (attack, control `/`), and Convex refused `listForDashboard` and
   `upsertResumeDraft` ("This account is not allowed to use the dashboard.")
   with no data change. The allowlist was restored and redeployed (run
   39372145963): Pages 200 and Convex readback match. Evidence:
   `aohys-item1-20261019/verification-summary.json`. Each of the two releases
   left one synthetic smoke lead (`new`). The versioned-origin Google callback
   (`redirect_uri_mismatch`) was fixed later by #234 (see Versioned sign-in).
2. **Item 6 — PASSED for the operator CLI and provider paths on preview.** Existing `publication-cli` (#220), unchanged source: three
   explicitly synthetic fixture requests/attempts were appended under
   `aohys-pending16-20261018-operator-v1`; no real request existed initially.
   `reconcile + not-found` produced request `release-failed`, attempt `failed`,
   retryable true; `reconcile + unknown` produced `rollback-needed` / `ambiguous`,
   retryable false, with no scheduler job. `retry + not-found` scheduled one
   successful dispatcher job and GitHub acknowledged preview workflow run
   `39183569721` on develop. Target and missing authorization-reference CLI
   rejections plus `retry + unknown` left the per-request snapshot unchanged.
   Operator audit rows name preview deployment, CLI credential class and the
   retained user authorization. These are real calls against live preview,
   using synthetic setup; they are not an organic provider incident or
   authenticated dashboard evidence. Never replay `operator-run.py`: its
   receipt is the reconciliation anchor. Preserve all synthetic publication
   and audit records rather than deleting them. Provider run
   https://github.com/AO-HyS/aohys.com/actions/runs/39183569721 completed
   successfully at source `d233b1e`. The versioned deployment URL is
   `https://84be838b.aohys-com.pages.dev`; the retained release log shows smoke
   actually checked `https://develop.aohys-com.pages.dev`, then recorded one
   matching receipt. Smoke on the versioned origin remains unproven. The retry request is
   `deployed`; its single scheduler job succeeded. Final protected-data
   comparison matched exactly. Four operator and two system audit events were
   observed. Server rejections for target, terminal state, unknown retry and
   invalid fixture correlation, plus CLI rejection of future/invalid check
   dates, left the terminal fixture, receipts and audit unchanged. See
   `operator-final-summary.json`, `operator-final-readback.json` and
   `operator-denials-verdict.json`. This closes the operator-path follow-up,
   not the separate authenticated dashboard publish journey.

### Access and environment observations

- `apps/backend/.env.local` exists but contains only `CONVEX_DEPLOYMENT`,
  `CONVEX_URL`, `CONVEX_SITE_URL`, pointing to old `dev:patient-bird-955`.
  That deployment lacks `publication:status`. There is **no root `.env.local`**.
  No QA passwords, allowed/denied account pair or AOHyS storageState was found
  in the inspected env files, QA docs, feature map or prior AOHyS evidence.
  `host.dashboard-operator-session` and `host.dashboard-denied-session` are
  references, not credentials. A prior cookie-import receipt is not a usable
  current session. (2026-10-18 pass.) Superseded on 2026-10-19: the owner's
  real Chrome session supplied the account, and item 1 passed.
- Preview at the start of this pass was `https://be0e9ec6.aohys-com.pages.dev`, source
  `d233b1e`, stable alias `https://develop.aohys-com.pages.dev`. GitHub deployment
  `7103393808` / release run `38801046255` succeeded. The doctor observes only
  HTTP readiness (302), not authenticated acceptance.
- Preview backend is `effervescent-minnow-483`; `publication:status` reports
  `deploymentEnvironment: preview`. CLI-session access works. Use
  `CONVEX_DEPLOYMENT=preview:effervescent-minnow-483` for the publication CLI;
  explicitly clear inherited deploy keys/tokens so they cannot select another
  deployment. Always read status/environment before a write.
- T3 default profile had no session. The agent initiated Google OAuth on the
  stable alias and reached **Email or phone**, without an account chooser.
  No credentials were available to finish login. The agent closed its own tab.
- QuickE2E 0.5.0 pin `98f74b6ceb44e8eb68c0bc176e522983639b9521`, engine Jev
  through the installed TypeSafe preload, clicked Google sign-in on the
  versioned preview. Google returned **`redirect_uri_mismatch`** for that
  versioned callback. The stable alias did not show that error in the T3 pass.
  The 2026-10-19 item 1 pass authenticated on the stable alias;
  #234 now hands versioned-host sign-in to the stable alias; a login completed
  from a versioned host remains unobserved. Do not mark its
  feature-map journeys proven from the stable alias alone.
- Two initial anonymous gate flow definitions were rejected by QuickE2E as
  `WEAK_ASSERTION`: their absent-shell text was not present on the public
  control page. Those are invalid verification definitions, **not passes or
  product authorization failures**. Correct their control/oracle before reuse;
  never weaken the authenticated allowed/denied acceptance to make them pass.

### Evidence, checks and delivery state

Private run: `~/.development-system/private/verification/aohys-pending16-20261018/`.
`authorization.json`, `preconditions.flow.mjs`, `quicke2e.log`, `trace/` and
`video/` retain the actual attempted pass. `provider-readback.json` holds the
initial empty publication baseline, target mismatch rejection and anonymous
read denial; `verification-summary.json` records the browser proof limits.
`operator-plan.json`, `operator-execution.json`, `operator-live-readback.json`,
`operator-denials*` and `provider-run-watch.log` retain the subsequent operator
pass. Six synthetic fixture rows were appended; three operator transitions,
scheduler claim/completion audit events and one preview workflow dispatch
occurred. Protected drafts, versions, media, metadata and settings matched
exactly both immediately and after release completion. The final release smoke
stored one synthetic contact lead, retained in `new` state as a disclosed
residual effect; no data deletion or unauthenticated status bypass was used to
remove/close it. Operator notification delivery was not independently observed
(`SMOKE_CONTACT_SUBMIT=true`). One post-smoke publication receipt is retained.
That 2026-10-18 pass had no allowed/denied Google session, data deletion,
merge or production action; the 2026-10-19 session pass is item 1 above.

`check-primitives`: PASSED (17 active). `check-no-tests`: PASSED.
`quality:changed` and `quality:certify`: PASSED. The first certification attempt
failed because its nested private TMPDIR exceeded the tsx Unix-socket path
limit (`listen EINVAL`); a short private TMPDIR fixed it. Existing
merged #211 and #220 report Codex `no-findings`; this does not certify the new
acceptance evidence. The final PR review receipts and Codex status are recorded
in the private run and PR; the browser role gate itself passed on 2026-10-19
(item 1).
The one Sol review found a non-blocking smoke-URL overstatement, corrected by
distinguishing the versioned deployment from the stable alias actually smoked.
No second Sol round is spent on that documentary correction. The first Codex
round found that the canonical publication runbook still called this provider
gate unproven; it now records the same run, synthetic setup and remaining
authenticated gate. The second and final Codex request covers these fixes.

3. **Dashboard publish — DEFECT FOUND, fixed in `fix/publish-claims-preflight`.** QuickE2E
   `admin-resume-publish-preview` PASS: the allowed admin's Publish created
   request `36d2fea7…` and dispatched run 39372485104. That release failed at
   `apply published dashboard content`: the preview EN resume draft (July seed)
   contains "80% load-time reduction" (`derived-percentage`). The request is
   `release-failed`, retryable, reconciled by the workflow; it is preserved.
   Because publishing had marked the draft published, every later preview
   release would have failed; the admin re-saved the identical content, which
   cleared `publishedAt`. Fix: `fix/publish-claims-preflight` runs the same
   public claim policy on the scoped publication source in
   `publishDurablyHandler` and throws before any request, attempt or local
   publish. It scans only the project and resume parts of the source, the
   only parts the release turns into the checked dictionaries (Sol finding:
   archived media alt text must not block a safe publish). The adminAction
   `attempted` audit row is still written for a refused call; that is the
   action audit contract, not a publication write. The claim was later
   replaced in the preview draft (see Happy path below).

State (2026-10-20): #228 and #229 merged to develop (develop release run
39375912131 passed). Before merge, the #229 head's functions on preview Convex
refused the admin's Publish of the unchanged draft: no request, no attempt, no
draft change, one `attempted` action audit row (`preflight-live.json`).
Production promotion: PR #230 (develop to main). Do not repeat the allowlist
narrowing, the publish attempts or the promotion; their evidence is final.

Happy path (2026-10-20, owner's go-ahead to finish everything): the preview EN
resume highlight label "80% load-time reduction" became "Sub-second load
times", backed by the same entry's "3-5 seconds to under 1 second"; nothing
else changed. A first QuickE2E edit changed the wrong label and its Publish was
refused by the preflight (one `attempted` row, no request); the admin's direct
save from the pre-attempt content replaced it. QuickE2E
`admin-publish-clean-resume` PASS: request `71285723…` reached `deployed`
through run 39467984608 (preview deploy and smoke passed) with one matching
receipt, and `/resume/` on the preview alias shows the new label
(`publish-ok-verdict.json`). Do not repeat this publish.

Versioned sign-in (2026-10-20, #234): Google matches the exact redirect URI
and each deployment gets a new host, so a versioned host asked for an
unregistered `https://<versioned-host>/api/auth/callback/google`. Sign-in
started on a versioned Pages host now redirects to the environment's stable URL
first. Live after release run 39486154048: the versioned host's sign-in reached
Google's account chooser with the alias callback and no mismatch. Google
refused to finish the interactive login in the automated browser, so a login
started on a versioned host was not completed (`aohys-versioned-signin-20261020`).

Open, with no authorized work pending: the publish action's refusal of a
non-allowlisted session and concurrent publication are unproven. Synthetic smoke leads stay in `new`.

Historical private evidence: `aohys-primitives-20261013` under the same shared
private verification directory; it is not fresh acceptance for this candidate.
