# AOHYS Dashboard Final Code Review

Date: 2026-07-11  
Fixed point: `origin/develop` at `e30efdea8aa423f88d893731b7bb973034d36840`  
Review target: PR #81, `codex/aohys-dashboard-100`  
Status: standards and specification reviews clean; merge remains explicitly unapproved.

## Standards review

The first independent pass found three actionable issues: bilingual project creation was split across client mutations; stable content identity was coupled to an English route slug; and navigation duplicated analytics route classification. The corrective pass also found two edge cases: publishing could translate a localized slug back into the wrong Content ID, and dynamic slugs could collide with static case-study routes.

All findings are resolved:

- one authenticated Convex mutation creates project metadata and both locale drafts atomically;
- stable `contentKey` identity is independent from `englishSlug` and `spanishSlug`;
- locale/index/static-route collision checks fail closed;
- a small exported static-route registry has an exact drift test against both locale dictionaries;
- the publishing bridge resolves the actual localized dictionary path back to its stable Content ID;
- navigation and analytics share one matcher while analytics preserves `unknown` for unmatched paths;
- the initial CTA is derived server-side rather than trusted from the client.

Final standards total: **0 unresolved actionable findings**. The shared `requireAdmin` authorization boundary remains intact.

## Specification review

The independent specification pass found two evidence defects, not product-scope defects: the responsive claim lacked the complete viewport/zoom/reduced-motion matrix, and the security report contradicted the already-completed PostHog browser proof.

Both are resolved:

- the exact deployed revision passed 25/25 authenticated route/viewport cases at 1440×900, 1024×768, 768×1024, 390×844, and 320×800;
- real Chrome page zoom at 200% with a 320 CSS px responsive viewport reported `innerWidth=scrollWidth=320` on the Projects workflow, its expected heading, and zero broken images; the route matrix separately covers all five surfaces at 320 CSS px;
- reduced-motion emulation was recognized and collapsed computed motion durations to `0.01ms` while preserving the mobile Sheet;
- `$pageview` and `dashboard_surface_viewed` were verified in Preview project 492205, prohibited properties were absent, GeoIP was disabled, and Do Not Track was restored.

Final specification total: **0 unresolved completion-evidence findings**. The independent re-review returned clean after the real-zoom receipt replaced the invalid device-density proxy.

## Verification and release receipt

- `pnpm run verify:ci`: passed.
- `pnpm audit --prod --audit-level high`: no known vulnerabilities.
- Backend: 39 tests; Dashboard: 36 tests; Content Graph: 24 tests; Site: 41 tests and 24 Astro pages.
- Final Release Train: `29158207406`.
- Immutable Preview: `https://c4720451.aohys-com.pages.dev`.
- Stable Preview alias: `https://develop.aohys-com.pages.dev`.
- Production promotion: blocked until the user reviews the result and explicitly approves merge.
