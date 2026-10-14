# Current work — primitives gardener (fix mode)

Canonical root: aohys. Base: develop. One branch per PR; current:
`feat/dashboard-kit-required` (PR #221).

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
and targets, #220 publication CLI.

Priority 5 (finite list items 7, 7b, 7c), in order:

1. #221 dashboard kit required for dialogs and badges (`dashboard-kit-bypass`
   in `architecture:fitness`), single-screen classes out of `lib/`.
2. Projects save feedback through `SaveBar` and `AsyncSurface`.
3. `brand-tokens`: one source generating the dashboard and site theme.
4. Retire Sunlit: move `proof-media` to Horizonte.
5. Close `primitives.json` and move the repo to tend.

Review budget (Development System 2.4.0): one Sol 6.1 High review per
finished PR, a second only on the fix diff of a blocking finding; docs-only and
small low-risk PRs skip Sol. Codex is requested once when the PR is ready, at
most once more.

Limits: publication keeps request keys, receipts and reconciliation (no generic
retry). Deleting Cloudflare objects and destructive migrations are out of scope.
Effects on providers (publishing to preview, rescheduling a dispatch) need the
owner's explicit authorization for that operation. Main and production wait
for the owner. Authenticated dashboard captures need the owner's session on the
preview; agents verify kit changes through a local harness that is never
committed.

Private evidence: `aohys-primitives-20261013` under the shared private
verification directory.
