# Current work — primitives gardener (fix mode)

Canonical root: aohys. Base: develop. Branch per PR; current:
feat/domain-vocabulary (PR #212).

Goal: one source per primitive, recorded in
`docs/architecture/primitives.json` and valid under
`development-system check-primitives`. The finite list and authorization
contract were accepted in cross-review (Astra Extra High, five rounds, v5
`11ab9c06`); inventory, plan and accepted list live in the shared private
research `primitives-20261013`.

Done: #211 resume server validation (merged; admin-session rejection on
preview not reached yet).

Order: domain vocabulary (#212) → build-script mirrors and unknown guards →
Environment Contract destinations → feature map and its validators →
`admin*` builders, one allowlist and the `public-function-guard` check →
`auditEvents` → release CLI, targets and dead code → publication CLI →
mandatory dashboard kit → brand tokens and Sunlit → close `primitives.json`.

Limits: publication keeps request keys, receipts and reconciliation (no generic
retry). Deleting Cloudflare objects and destructive migrations are out of scope.
Effects on providers (publishing to preview, rescheduling a dispatch) need the
owner's explicit authorization for that operation. Main and production wait
for the owner.

Private evidence: `aohys-primitives-20261013` under the shared private
verification directory.
