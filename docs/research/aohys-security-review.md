# AOHYS Defensive Security Review

Date: 2026-07-11  
Scope: public contact intake, private dashboard guard, Convex functions, media/publication policy, public settings, analytics, build output, and release environment boundaries.  
Method: defensive source review, trust-boundary tracing, negative unit tests, header/runtime checks, dependency audit, and public-output inspection. No offensive provider testing, destructive probes, credential testing, or synthetic contact submissions were performed.

## Release result

- Unresolved validated Critical findings: **0**
- Unresolved validated High findings: **0**
- Production merge: **not authorized**
- Preview provider verification: Release Train, smoke, and PostHog server-event proof passed; privacy-preserving browser-event proof remains tracked by AOH-86.

## Remediated findings

| Boundary | Risk | Resolution | Evidence |
| --- | --- | --- | --- |
| Contact intake | Anonymous mutation bypassed the HTTP abuse-control boundary and durable per-email limit | Removed the legacy public mutation, kept persistence internal, and enforced a bounded indexed submission window before insert | `apps/backend/convex/leads.ts`, `apps/backend/test/leads-security.test.ts` |
| Dashboard data | Broad/unbounded reads could grow into bandwidth and execution failures | Added cursor pagination for Leads and replaced remaining content `.collect()` calls with explicit limits and fail-closed overflow handling | `apps/backend/convex/leads.ts`, `apps/backend/convex/content.ts`, `apps/backend/test/leads-pagination.test.ts` |
| Media publication | Duplicated URL/custom-ID policy risked traversal and divergent public selection | Consolidated validation, public URL resolution, and deterministic publication selection in `@aohys/core`; rejected credentials, traversal, encoded traversal/slashes, and unsupported new R2 writes | `packages/core/src/media-policy.ts`, `packages/core/test/media-policy.test.ts` |
| Public settings | Arbitrary setting keys/URLs could reach generated public configuration | Restricted writes to a canonical direct `https://wa.me/<digits>` value and revalidated during the build applicator | `packages/core/src/public-settings.ts`, `apps/backend/test/site-setting-security.test.ts` |
| Analytics | Dashboard or public event properties could include private identity/content | Disabled autocapture, persistence, profiles, and recording; introduced fixed events/properties and a denylist sanitizer for identity, messages, contact values, auth material, and URLs | `apps/dashboard/src/lib/analytics.ts`, `apps/dashboard/src/lib/analytics.test.ts` |
| Private HTML | Legacy workflow renderer duplicated private models and enlarged the pre-React boundary | Deleted the legacy workflow package; retained only narrow sign-in/access states beside the Cloudflare site guard | `apps/site/src/dashboard-access-states.ts`, `apps/site/test/dashboard-access.test.ts` |

## Authorization and platform controls

- Every public dashboard Convex query/mutation/action calls the shared admin authorization boundary; persistence-only helpers remain internal.
- Cloudflare dashboard routes validate Better Auth sessions server-side and compare normalized email against the environment allowlist.
- Private responses use `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, and the repository CSP.
- Dashboard runtime configuration serializes only required public/runtime values and escapes `<` before embedding JSON.
- Provider credentials remain server-side and are excluded from public runtime payloads and PostHog properties.

## Verification receipts

- `pnpm install --frozen-lockfile`: passed.
- `pnpm run verify:ci`: passed after the dashboard implementation and bundle split.
- `pnpm audit --prod --audit-level high`: no known vulnerabilities.
- Local Cloudflare runtime: private configuration error returned 503, no-store, noindex/nofollow, and CSP.
- Impeccable detector: zero findings.
- Public Astro build: 24 routes; Casa Roca sanitized evidence asset remained reachable in local Browser proof.

## Remaining external proof

AOH-86 deployed Preview successfully through the official Release Train, passed environment audits and smoke, and verified the correct PostHog Preview project. Do Not Track suppressed browser telemetry during QA, so browser-event proof remains pending explicit permission to temporarily change that local privacy setting. Production remains blocked until explicit user approval.
