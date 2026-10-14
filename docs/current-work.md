# Current work — primitives gardener (fix mode)

Canonical root: aohys. Base: develop. Branch per PR; current:
fix/resume-server-validation.

Goal: one source per primitive, recorded in
`docs/architecture/primitives.json` and valid under
`development-system check-primitives`. Accepted plan and inventory live in the
shared private research `primitives-20261013` (inventory read at cdf47b0).

Order: resume server validation (trust boundary) → domain vocabulary →
Environment Contract destinations → `admin*` builders and one allowlist, then
`auditEvents` → release and publication CLI verbs, retire `deploy:*` chains and
`publishContentFromDashboard`, write journeys in the feature map → mandatory
dashboard kit and one token source.

Limits: publication keeps request keys, receipts and reconciliation (no generic
retry). Deleting Cloudflare objects and destructive migrations are out of scope.
Main and production wait for the owner.

Private evidence: `aohys-primitives-20261013` under the shared private
verification directory.
