# Current work — primitives gardener (tend mode)

Canonical root: aohys. Base: develop. One branch per PR; current:
`docs/primitives-closing` (fix mode closed).

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

Fix mode is closed: the finite list is done and `primitives.json` records 17
active primitives, adding the existing durable publication, contact intake,
public content graph, media policy, architecture fitness and quality gates
(the Pages dashboard gate folds into `admin-functions`). The repo is in tend:
the Steward checks the map weekly (aohys is on its allowlist), and the
recorded goals are the open follow-ups, not fix-mode work.

Review budget (Development System 2.4.0): one Sol 6.1 High review per
finished PR, a second only on the fix diff of a blocking finding; docs-only and
small low-risk PRs skip Sol. Codex is requested once when the PR is ready, at
most once more.

Limits: publication keeps request keys, receipts and reconciliation (no generic
retry). Deleting Cloudflare objects and destructive migrations are out of scope.
Effects on providers (publishing to preview, rescheduling a dispatch) need the
owner's explicit authorization for that operation. Main and production wait
for the owner. Authenticated dashboard checks use the owner's local Chrome cookies
(expect MCP `open` with `cookies: true`); T3 preview tabs keep cookies per tab
and Google rejects the delegated browser.

Private evidence: `aohys-primitives-20261013` under the shared private
verification directory.
