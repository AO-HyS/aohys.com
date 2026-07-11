# AOHYS Dashboard Implementation Frontier

Date: 2026-07-11  
Decision gate: AOH-77  
Parent initiative: AOH-67

## Outcome

Rebuild the dashboard presentation and application seams inside the existing authenticated React/Convex product. Do not restart the repository, replace the public site, migrate away from Convex, introduce TanStack Query without a proven responsibility, or rewrite working auth/release infrastructure.

The clean-slate boundary is the dashboard's **presentation and workflow composition**, not its trusted data and deployment boundaries.

## Preserve

- Cloudflare Pages dashboard guard, noindex/no-store behavior, Better Auth session verification, and admin allowlist.
- Convex as the owner of reactive operational state.
- The Public Content Graph and Astro's reviewed-content build boundary.
- Existing project/resume/lead/settings records and public paths.
- Explicit save and publish semantics, including the truthful distinction between Convex publication and queued provider workflow.
- Local shadcn/Radix source, current `radix-nova` base, Toaster, AlertDialog, Field family, Select, Tabs, Skeleton, Table, and focus foundations.
- Projects master-detail workflow, bilingual editing, media fallback, and destructive media confirmation.
- Existing release train and merge gate: no merge without explicit user approval after review.

## Rebuild

- Dashboard shell and navigation as the chosen Operations Desk system.
- Overview as an authoritative operational-readiness surface with one next action.
- Dashboard foundations: approved fonts, Sunlit Systems Studio product tokens, density, semantic states, motion, and responsive chrome.
- Accessible Dashboard Primitive Adapter and reusable workflow compositions.
- Resume information architecture: one focused section, explicit dirty/save/publish state, completion, preview/context, and safe repeated-row removal.
- Leads mobile task rows, exact cursor pagination, sorting semantics, and focused status updates.
- Loading, empty, error, permission, not-found, retry, and stale-data states across every route.

## Refactor

- Split the eager route bundle.
- Replace broad dashboard queries with per-surface and paginated Convex contracts.
- Move Projects operations out of the 1,400-line screen into a deep workflow module.
- Replace effect-driven remote/local synchronization with domain editable-state modules.
- Replace `JSON.stringify` dirty comparisons with semantic normalization/comparison.
- Derive dashboard transport/result types from generated Convex contracts where practical.
- Consolidate navigation identity, media policy, and publication invariants.
- Standardize PostHog event/property vocabulary and keep all payloads anonymous and fixed-shape.

## Migrate

- Geist to Mona Sans for interface hierarchy and Atkinson Hyperlegible Next for longer help/read copy.
- Teal/navy/blue/purple dashboard tokens to honey/olive/apricot/brown product-semantic roles.
- Raw form composition to `FormField` with programmatic ID/description/error ownership.
- Ad hoc badges to typed `StatusBadge`.
- Raw skeleton/paragraph branches to `AsyncSurface` states.
- Desktop-only data tables to `ResponsiveDataView`.
- Legacy `packages/dashboard-ui` to a narrow pre-React sign-in/access-state renderer near the site guard.

## Delete after consumers move

- Legacy HTML dashboard workflows and their obsolete tests.
- `@source "../../../packages/dashboard-ui/src"` from dashboard Tailwind input.
- Unused chart tokens.
- The shallow, mostly one-use `dashboardClass` catalog.
- Shallow dashboard API wrappers that hide no workflow.
- Duplicate media custom-ID and public-URL resolution implementations.
- Unused public Convex exports already identified by the audit.
- Avoidable state-reset effects; retain only external-system synchronization and cleanup effects.

## Target module boundaries

```text
Dashboard route
  -> surface query + route state
  -> AOHYS workflow composition
  -> deep domain workflow/editable-state module
  -> generated Convex operations

AOHYS workflow composition
  -> Dashboard Primitive Adapter
  -> local shadcn/Radix primitives
```

Screens should know domain intent and rendered state. They should not know upload sequences, toast orchestration keys, label/error ID wiring, mobile/desktop primitive switching, or duplicated publication/media policy.

## Operations Desk production contract

- Brown desktop rail; mobile shadcn Sheet; one route model drives both and the router.
- Neutral white workbench with firm rules rather than nested cards.
- Honey for current selection/primary action, olive for verified structure/success, apricot for attention, brown for ink/chrome, dedicated red for destructive/error.
- One primary action per decision cluster.
- Overview asks “what blocks the next trustworthy release?” and links to the first deterministic blocker.
- No activity log until immutable activity exists.
- No four-stage release board until authoritative stage/review/deployment truth exists.
- No embedded PostHog analytics.

## Execution sequence

### 1. Foundation tracer

Ship the production Operations Desk shell through real routes with approved tokens/fonts, one navigation model, route splitting, pending/error/not-found behavior, and core primitive adapters. This makes later screen work safe and visually coherent.

### 2. Overview tracer

Add one authoritative Convex overview query that returns bounded readiness gates, blocker codes/reasons, and safe source routes. Render the first useful action without client-inferred counts or fake provider state.

### 3. Evidence and publication tracer

Consolidate media identity/resolution and publication selection into shared deep policy modules, proving one existing project from draft/media selection through reviewed build output. This removes divergence before the Projects redesign grows around it.

### 4. Resume tracer

Replace the wall of cards with a section-focused editor and editable-state module. Make labels, dirty state, save/publish, removal, validation, loading/error, desktop, and 390 px behavior correct end to end.

### 5. Projects tracer

Move operational sequences into a Projects workflow module, migrate the chosen master-detail UI to the kit, progressively disclose locale/SEO/evidence/media/release work, and add behavioral workflow tests.

### 6. Leads tracer

Introduce cursor pagination and a responsive data contract, then ship semantic desktop sorting and 390 px task rows with anonymous PostHog outcomes.

### 7. Settings and legacy retirement tracer

Migrate Settings to shared form/async/save contracts, move sign-in/access states to the site boundary, delete legacy dashboard workflows and the stale Tailwind scan, and prove auth/noindex behavior remains intact.

### 8. Quality and observability tracer

Complete behavioral accessibility coverage, route/performance budgets, PostHog Preview dashboard proof, Browser interaction matrix, Computer Use provider verification, preview deployment, scorecard re-audit, and production promotion only after explicit merge approval.

## Dependency rules

- Foundation blocks every page redesign.
- Overview requires foundation but does not block Resume/Projects once the kit is stable.
- Evidence/publication policy should land before the Projects workflow redesign.
- Resume and evidence/publication can run after foundation with disjoint ownership, but this execution will keep one writer by default.
- Leads depends on foundation and its own cursor query, not on Projects/Resume.
- Legacy retirement waits until every active consumer has moved.
- Provider and deployed proof waits for an integrated preview.

## Verification contract

Every tracer must satisfy:

- focused unit/behavioral tests for the new module;
- dashboard typecheck, tests, and production build;
- repository `git diff --check` and `pnpm run verify:precommit` at integration gates;
- Browser review at relevant desktop and 390 px states;
- keyboard-only behavior for every changed interaction;
- no prohibited analytics payloads;
- no unresolved Critical/High security finding;
- no merge to `develop` or `main` without explicit user approval.

The final integrated preview must additionally prove:

- 1440, 1024, 768, and 390 px layouts;
- 200% zoom and reduced motion;
- loading, empty, error, permission, retry, dirty, saving, saved, publish queued, and destructive confirmation states;
- PostHog event visibility and project isolation using normal navigation only;
- no private identifiers, contact content, secrets, or provider messages in analytics/network payloads;
- route-level bundle improvement from the current 766.89 kB eager dashboard entry;
- page-by-page scorecard evidence and regression-free public landing page.

## Deferred capabilities, not hidden work

- Immutable activity/audit log.
- Revision-bound human review receipts.
- Verified provider deployment history in Convex.
- Command palette after core keyboard/navigation quality is proven.
- TanStack Query unless a non-Convex remote-state responsibility is demonstrated.
- A Release Flow board until its domain truth exists.

These can become future initiatives. They are not required to make the current dashboard exemplary.
