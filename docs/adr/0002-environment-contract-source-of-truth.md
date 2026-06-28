# Environment Contract Source of Truth

Status: accepted

AOHYS uses GitHub Environments as the source of truth for deploy-time preview and production secrets, while `.env.local` remains local-only and uncommitted. Provider dashboards can be changed manually during setup or incident recovery, but the matching GitHub Environment must be reconciled before the next deployment so the Release Train does not reintroduce stale secrets.

## Considered Options

- Provider dashboards as the source of truth: convenient during setup, but deployment can silently overwrite or diverge from manual fixes.
- Local `.env` files as the source of truth: easy for one developer, but unsafe for a public repo and impossible to audit for release.
- GitHub Environments as the source of truth: more setup work, but it gives the Release Train a visible, reviewable, automatable source for preview and production deploys.

## Consequences

- Environment validation becomes a required release gate.
- Provider-specific setup must document how values map into `local`, `preview`, and `production`.
- Incident recovery is incomplete until manual provider changes are copied back to the appropriate GitHub Environment.
