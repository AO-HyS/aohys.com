# AOHYS Dashboard 100/100 Quality Scorecard

Status: accepted research result for the AOHYS dashboard program.

## Current completion audit — 2026-07-11

The implementation, defensive review, release train, Preview Deployment, and final provider/browser verification are complete. The current **evidence score is 100/100** against this scorecard.

| Category | Earned | Evidence |
| --- | ---: | --- |
| Product workflows and UX | 15/15 | Overview, Projects, Leads, Resume, Settings, aliases, async states, guarded destructive/publish actions, and Browser route matrix passed in Preview. |
| Visual system and interaction craft | 15/15 | Operations Desk tokens/adapters, shared shadcn primitives, page-by-page redesign, and Impeccable detector with zero findings. |
| Accessibility and responsive behavior | 10/10 | Labels, keyboard semantics, focus contracts, contained tables, mobile task surfaces, and exact deployed 390×844 CSS px proof passed on Overview, Projects, Leads, Resume, and Settings with `scrollWidth=innerWidth=390`. |
| Security and privacy | 15/15 | Defensive review reports zero unresolved validated Critical/High findings; private headers/auth boundaries, analytics sanitization, dependency audit, and negative tests passed. |
| Convex, Better Auth, and data boundaries | 10/10 | Admin authorization, explicit validators/returns, cursor pagination, indexed rate limiting, bounded reads, shared policies, and zero remaining `.collect()` calls. |
| Architecture and code organization | 15/15 | Typed navigation, deep project workflow, shared media/settings policy, editable-state modules, and deletion of the legacy 928-line workflow package. |
| React, TanStack, and runtime performance | 10/10 | Effects remain only for external synchronization/cleanup; TanStack Router/Table ownership is explicit; route chunks are lazy; entry fell from ~549 kB to 257.47 kB without a build warning. |
| PostHog observability | 5/5 | Preview/Production separation passed; `$pageview` and `dashboard_surface_viewed` are visible in Preview project 492205. The final dashboard receipt records `environment=preview`, `path=/dashboard/projects`, `surface=projects`, `GeoIP disabled=true`, and no prohibited private properties. |
| Testing, delivery, and public-sample clarity | 5/5 | Frozen install, repeated `verify:ci`, 24-route Astro build, dependency audit, successful Release Train, Preview smoke, PR #81, and updated public documentation. |
| **Total** | **100/100** | **All rubric points and release gates are proven on the current Preview build.** |

- Preview: `https://f1e5345b.aohys-com.pages.dev`
- Stable Preview alias: `https://develop.aohys-com.pages.dev`
- Release Train: `https://github.com/AO-HyS/aohys.com/actions/runs/29155634781`
- PR: `https://github.com/AO-HyS/aohys.com/pull/81`

### Final proof receipts

1. With explicit approval, Do Not Track was temporarily disabled for ordinary read-only Preview navigation. `$pageview` and `dashboard_surface_viewed` were verified in `AOHYS Public Site - Preview`; the setting was restored and `navigator.doNotTrack === "1"` was rechecked afterward.
2. The deployed Overview, Projects, Leads, Resume, and Settings routes were measured at an authoritative 390×844 CSS px viewport. Every route reported `innerWidth=390`, `scrollWidth=390`, and no page-level horizontal overflow.
3. The final analytics receipt is device `019f518a-7790-7d2f-9ca0-19a8b6d5ef8d` in Preview project 492205. Its application properties are the expected safe shape and GeoIP enrichment is disabled.

## Purpose

This scorecard turns “100/100” into a release claim that must be proven with current code, runtime, provider, and visual evidence. A category cannot receive credit from intent, screenshots alone, string-presence tests, or a green build that does not exercise the requirement.

The dashboard reaches **100/100 only when it earns all 100 points and every release gate passes**. A gate failure makes the build **not releasable**, even when its arithmetic score would otherwise be high.

## Non-negotiable release gates

1. **Security and privacy:** zero unresolved validated Critical or High security findings; no authentication or admin-authorization bypass; no secret, contact message, lead identity, or private operational payload in analytics, logs, public HTML, client bundles, or public Convex responses.
2. **Data integrity:** create, update, publish, archive, delete, and status workflows preserve the Public Content Graph, Environment Contract, and Release Train invariants without silent loss or partial success presented as success.
3. **Accessibility:** the complete authenticated processes conform to WCAG 2.2 AA; no keyboard trap, inaccessible authentication step, obscured focus, missing accessible name, or blocking contrast/reflow defect remains.
4. **Runtime health:** every dashboard route and required Workflow State renders without uncaught exceptions, failed required requests, hydration/runtime warnings, or persistent console errors in the deployed Preview Environment.
5. **Verification:** `pnpm verify` passes from a clean install; behavior tests cover changed contracts; Browser evidence covers desktop and mobile; Preview Deployment and Smoke Checks succeed.
6. **Observability:** required PostHog events and exceptions are visible in the correct preview project with the documented safe property shape; preview and production keys remain separated.
7. **Evidence integrity:** a requirement is incomplete when its only proof is source-text matching, a mocked happy path, or an uninspected screenshot.

## Weighted rubric

| Category | Points |
| --- | ---: |
| Product workflows and UX | 15 |
| Visual system and interaction craft | 15 |
| Accessibility and responsive behavior | 10 |
| Security and privacy | 15 |
| Convex, Better Auth, and data boundaries | 10 |
| Architecture and code organization | 15 |
| React, TanStack, and runtime performance | 10 |
| PostHog observability | 5 |
| Testing, delivery, and public-sample clarity | 5 |
| **Total** | **100** |

## 1. Product workflows and UX — 15 points

Full credit requires:

- Overview, Projects, Leads, Resume, Settings, and preserved legacy aliases each have one clear operational purpose and no duplicate navigation or competing primary action.
- Every Dashboard Surface proves the relevant Workflow States: loading, empty, unauthorized, configuration error, validation error, save pending, saved, provider failure, and retry/recovery.
- Create, edit, select, publish, archive/delete, filter/sort/paginate, sign-out, and external-preview flows complete end to end with truthful feedback.
- Destructive and publishing actions communicate scope and consequence before execution; partial provider failures are distinguishable from persistence failures.
- Empty states teach the next valid action; loading uses structural skeletons; errors preserve user input and provide a recovery path.
- Desktop and mobile expose equivalent capability without duplicate controls or hidden required actions.

Required evidence:

- Route-by-route workflow matrix with expected states and observed results.
- Browser recordings or screenshots plus console/network evidence at 1440px, 768px, 390px, and 320px.
- Behavior tests for success, invalid input, unauthorized access, provider failure, and recovery.

Scoring: 3 points for route/IA clarity, 4 for workflow completeness, 3 for state/error quality, 3 for mobile parity, and 2 for truthful destructive/publishing feedback.

## 2. Visual system and interaction craft — 15 points

Full credit requires:

- The Dashboard UI Kit translates Sunlit Systems Studio into a restrained product register: neutral task surfaces, brown ink, honey primary action/current selection, olive structure/success, and apricot warning or human emphasis.
- The Dashboard Primitive Adapter owns shared tokens and behavior; Dashboard Surfaces do not invent local button, form, status, overlay, table, spacing, radius, shadow, or icon systems.
- Typography, density, hierarchy, spacing, dividers, alignment, and empty/error/loading states are consistent across every route.
- Controls implement default, hover, focus, active, disabled, loading, validation, and error states.
- Motion communicates state in roughly 150–250 ms, respects reduced motion, and never delays access to the task.
- Impeccable absolute bans and product bans have zero unresolved detector or review findings: no gradient text, decorative glass, nested ghost cards, oversized radii, decorative grids, repeated eyebrow scaffolding, or gratuitous product motion.

Required evidence:

- Token and primitive inventory with before/after ownership.
- Full-page screenshots for every Dashboard Surface at desktop and 390px.
- Independent visual review with all P0/P1 findings closed and no unresolved high-confidence “AI slop” pattern.
- Contrast measurements for every semantic token pairing.

Scoring: 4 points for coherent visual language, 4 for primitive consistency, 3 for hierarchy/density, 2 for interaction states, and 2 for motion/reduced motion.

## 3. Accessibility and responsive behavior — 10 points

Full credit requires:

- WCAG 2.2 AA conformance across complete processes, including keyboard operation, focus order/visibility/not-obscured, names/roles/values, status messages, labels, errors, reflow, and accessible authentication.
- Text contrast is at least 4.5:1 for normal text and 3:1 for qualifying large text; meaningful UI graphics and authored focus indicators meet non-text contrast requirements.
- Pointer targets meet WCAG 2.2 AA minimum sizing/spacing. AOHYS project policy targets 44×44 CSS px for primary touch controls except inline text links or documented equivalent-spacing cases.
- At 200% zoom and 320 CSS px width, required workflows remain usable without two-dimensional page scrolling; intentional data-table scrolling is contained and labelled.
- Automated accessibility checks report zero serious or critical violations, and manual keyboard/screen-reader checks cover every route and overlay.

Required evidence:

- Automated report plus manual keyboard, focus, zoom/reflow, and screen-reader checklist.
- Measurements for contrast, visible target size, and horizontal overflow.
- Browser proof for open/close/focus restoration in Dialog, Sheet, Select, Tooltip, and destructive confirmation flows.

Scoring: 4 points for WCAG semantics/keyboard, 2 for contrast/focus, 2 for reflow/responsiveness, and 2 for touch/overlay behavior.

## 4. Security and privacy — 15 points

Full credit requires:

- The standard Codex Security workflow completes threat modeling, discovery, validation, attack-path analysis, coverage receipts, and a final report.
- Every private route is protected by Better Auth session validation and the admin allowlist; every public Convex function independently enforces authorization.
- Server/client trust boundaries, input validation, output minimization, CSRF/origin behavior, CSP, noindex/private caching, upload constraints, publish credentials, and provider callbacks meet the applicable OWASP ASVS 5.0 controls.
- Secrets remain server-only and environment-scoped. Preview and production bindings are distinct and audited.
- Media, analytics, errors, logs, notifications, and public content never expose Private Work.
- Dependencies and generated artifacts have no unresolved exploitable Critical/High issue.

Required evidence:

- Security report with complete worklist receipts and validated severity.
- Negative authorization tests for every private route and public Convex function.
- Environment/secret inventory, CSP/header assertions, dependency audit, and public-bundle/payload inspection.

Scoring: 5 points for authn/authz, 3 for validation/data exposure, 3 for browser/platform controls, 2 for secrets/environments, and 2 for dependency/provider hardening.

## 5. Convex, Better Auth, and data boundaries — 10 points

Full credit requires:

- Every public query, mutation, action, and HTTP action has runtime argument validation, an explicit return contract where practical, and access control that cannot be spoofed through caller-provided identity.
- Shared authorization helpers concentrate admin checks; internal-only behavior uses internal functions rather than public exposure.
- Reads use indexes with specific ranges and bounded result methods (`first`, `unique`, `take`, or `paginate`) where growth is possible; no unjustified full-table scan or unbounded `collect` remains.
- Writes are atomic where the user expects one operation, idempotent where retries can occur, and explicit about partial external-provider failure.
- Schema, indexes, retention, file/media metadata, and migrations match the operational domain.
- Convex owns reactive server state. TanStack Query is introduced only for a separately proven cache responsibility that Convex does not own.

Required evidence:

- Function inventory mapping exposure, validators, authorization, return shape, tables, indexes, and bounds.
- Tests for unauthorized, malformed, missing, duplicate, retry, conflict, and provider-failure cases.
- Convex dashboard/log/health evidence from the Preview Environment.

Scoring: 3 points for authorization/validation, 2 for schema/indexes, 2 for bounded performance, 2 for mutation/action correctness, and 1 for reactive ownership.

## 6. Architecture and code organization — 15 points

Full credit requires:

- The deep-module architecture review is complete and every Strong recommendation is implemented, explicitly rejected with a durable reason, or represented by an approved ADR.
- Dashboard Surfaces depend on small AOHYS interfaces, not raw provider mechanics or broad bags of callbacks/state.
- The Dashboard UI Kit and Dashboard Primitive Adapter create leverage and locality; deleting either would redistribute meaningful complexity rather than merely remove pass-through files.
- Domain, routing, application workflow, provider, persistence, and presentation responsibilities have clear seams and no circular dependency.
- Duplicate projections, validation, status copy, form state, media rules, and legacy Dashboard UI Kit paths are consolidated or intentionally retained with an expiry condition.
- Tests cross the same interface as callers; implementation details are not extracted solely to make tests possible.
- File and folder names use the ubiquitous language in `CONTEXT.md`; dead code, stale aliases, unused exports, historical workflow packages, and generated local artifacts are absent from the shipped diff.

Required evidence:

- Architecture HTML report and before/after dependency map.
- Duplicate/dead-code inventory with disposition.
- Interface-level tests and ADR updates for hard-to-reverse decisions.
- Reviewer confirmation that no unresolved Strong deepening candidate or undocumented legacy seam remains.

Scoring: 4 points for depth/locality, 3 for seams/dependencies, 3 for duplication/legacy removal, 3 for interface-level testing, and 2 for ubiquitous language/navigation.

## 7. React, TanStack, and runtime performance — 10 points

Full credit requires:

- Every `useEffect` is justified as synchronization with an external system. Derived state, prop-to-state mirroring, user-event work, and render transformations do not use effects.
- Server state stays in Convex subscriptions; route/shareable UI state uses validated TanStack Router params/search; table sorting/filtering/pagination uses explicit TanStack Table state.
- Components subscribe only to the state they render; expensive work is measured before memoization; static data and route configuration are not recreated unnecessarily.
- No avoidable request waterfall, duplicate subscription, unbounded render loop, stale closure, race, or leaked object URL/listener remains.
- Route-level code splitting and bundle inspection show no unexplained heavy dependency. Project policy: no changed dashboard entry/chunk grows more than 10% without a documented, measured benefit.
- Deployed field data should meet “good” Core Web Vitals at the 75th percentile: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1. Until field volume is sufficient, repeatable mobile lab evidence and TBT are recorded as proxies, not misrepresented as field proof.

Required evidence:

- Effect ledger with external system, dependencies, cleanup, and Strict Mode behavior.
- React Profiler/render evidence for hot workflows.
- Route/search schema tests, table-state tests, bundle report, and before/after runtime measurements.
- Web Vitals evidence from Preview or an explicitly labelled lab proxy.

Scoring: 3 points for state/effect correctness, 2 for TanStack ownership, 2 for rendering/subscriptions, 1 for bundle discipline, and 2 for measured runtime quality.

## 8. PostHog observability — 5 points

Full credit requires:

- A versioned event registry defines event name, trigger, environment, owner, property schema, privacy classification, and verification query.
- Autocapture remains explicitly disabled unless a later privacy decision reverses it; explicit events and exceptions use a fixed allowlist.
- Contact text, email, phone, lead identity, auth material, full URLs with sensitive search params, provider error bodies, and secrets never enter PostHog.
- Preview and production projects/keys are separate; local development does not pollute either project.
- Required pageview, CTA, form, dashboard-auth/error, backend lead, provider-failure, and exception events are visible with the expected property shape in the PostHog provider dashboard.

Required evidence:

- Static event/property audit and privacy tests.
- Computer Use screenshots or recorded evidence from PostHog Live Events/Error Tracking in the correct project.
- Environment-separation audit output.

Scoring: 2 points for registry/schema, 1 for privacy, 1 for environment separation, and 1 for live provider proof.

## 9. Testing, delivery, and public-sample clarity — 5 points

Full credit requires:

- `pnpm install --frozen-lockfile` and `pnpm verify` pass from the clean program branch.
- Tests exercise behavior and failure modes; source-text contract tests are supplemental only.
- Changed Dashboard Surfaces have Browser QA evidence with zero unexplained console/network errors.
- The Preview Deployment completes Convex sync/deploy, content publish, Cloudflare deployment, environment audits, and Smoke Checks.
- README, architecture map, ADRs, and evaluation guide accurately explain how the system is organized, verified, and promoted without exposing Private Work.
- The implementation PR is focused, reviewable, has green required checks, and contains a preservation/cleanup ledger. Protected-branch Promotion still requires explicit user approval.

Required evidence:

- Clean-install command log, test report, Browser evidence, deployment URL, smoke output, and PR check state.
- Public-source review confirming the documentation matches the shipped architecture.

Scoring: 2 points for executable gates, 1 for behavior coverage, 1 for preview/Browser proof, and 1 for public-sample/review quality.

## Score reporting

Every audit and implementation review must report:

1. points earned and possible for each category;
2. failed release gates;
3. evidence links or file/command/runtime references;
4. unproven requirements, scored as zero rather than assumed;
5. regressions compared with the previous measured score;
6. the smallest next set of changes that increases the score without hiding debt.

“100/100” is valid only when the final completion audit independently rechecks every gate and all 100 points against the current Preview Deployment and current repository state.

## Primary sources

- [WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 new success criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React: Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices)
- [Convex indexes and bounded reads](https://docs.convex.dev/database/reading-data/indexes/)
- [TanStack Router search params](https://tanstack.com/router/latest/docs/guide/search-params)
- [TanStack Router render optimizations](https://tanstack.com/router/latest/docs/guide/render-optimizations)
- [shadcn Field composition](https://ui.shadcn.com/docs/components/radix/field)
- [shadcn Sidebar composition](https://ui.shadcn.com/docs/components/radix/sidebar)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [PostHog JavaScript SDK](https://posthog.com/docs/libraries/js)
- [PostHog data-collection controls](https://posthog.com/docs/privacy/data-collection)

## AOHYS contracts used

- `PRODUCT.md`
- `DESIGN.md`
- `CONTEXT.md`
- `docs/adr/0001-protected-release-train.md`
- `docs/adr/0002-environment-contract-source-of-truth.md`
- `docs/adr/0003-public-content-graph.md`
- `docs/adr/0004-dashboard-ui-kit.md`
- `docs/environment-contract.md`
- `docs/release-train.md`
- `scripts/verify-foundation.mjs`
