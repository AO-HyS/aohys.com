# AOHYS React, TanStack, and codebase-health audit

Date: 2026-07-11  
Linear: AOH-74  
Scope: React 19 dashboard, TanStack Router/Table, Convex client ownership, editable state, composition, bundle output, module organization, duplication, and tests.

## Executive assessment

The dashboard uses the right platform choices but not yet the right module shape. React 19, TanStack Router, TanStack Table, Convex subscriptions, shadcn primitives, and strict TypeScript are present. There is no unnecessary global store and no TanStack Query cache fighting Convex.

The gap is concentration: every route is bundled up front, `ProjectsScreen` owns operational workflows and rendering in 1,478 lines after cleanup, `api.ts` is mostly shallow one-to-one hooks, form reset/dirty rules are dispersed, and the main “contract” test reads source strings rather than user behavior.

## Current measurements

- Dashboard TypeScript/TSX source: 5,644 lines.
- `projects-screen.tsx`: 1,478 lines.
- `resume-screen.tsx`: 747 lines.
- `api.ts`: 255 lines and 11 public hook/helper exports.
- Production bundle: one `dashboard.js` chunk, 761.43 kB minified / 226.80 kB gzip.
- Production CSS: 84.81 kB / 14.93 kB gzip.
- Vite warning: JavaScript chunk exceeds 500 kB.
- Route screens: all statically imported from `main.tsx`.
- Dashboard tests: 3 files / 13 tests; only one test is a source-string architecture contract.
- Effects after this audit: one legitimate Object URL cleanup effect, one legitimate media-query listener in `use-mobile`, and one avoidable Resume form-reset effect left for the planned module rewrite.

## Current guidance

- [React: You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — derive during render, use keys for conceptual identity changes, and keep user actions in event handlers.
- [React: Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state) — component identity controls form reset behavior.
- [TanStack Router code splitting](https://tanstack.com/router/latest/docs/guide/code-splitting) — route implementations are non-critical configuration and should load on demand.
- [TanStack Table state](https://tanstack.com/table/latest/docs/framework/react/guide/table-state) — control only state needed outside the table; otherwise use table-managed `initialState`.
- [Convex pagination](https://docs.convex.dev/database/pagination) — `usePaginatedQuery` remains reactive and provides load-more status without TanStack Query.

## Findings

### RCT-01 — The route graph ships as one large eager chunk

Strength: Strong  
Evidence: `apps/dashboard/src/main.tsx` statically imports Home, Projects, Leads, Resume, and Settings; Vite emits one 761.43 kB JavaScript chunk.

Projects and Resume are not needed to render the dashboard shell or Leads. TanStack Router is present but its code-splitting capability is unused.

Target: keep the root shell critical and lazy-load each Dashboard Surface implementation. Preserve preload-on-intent for navigation. The first-load budget should be measured after splitting rather than hiding the warning by raising `chunkSizeWarningLimit`.

### RCT-02 — Projects is an implementation, workflow coordinator, and UI tree in one screen

Strength: Strong  
Evidence: `projects-screen.tsx` acquires eight operations, owns upload/publish/delete sequences, pending keys, error translation, toasts, forms, media presentation, and creation logic.

`api.ts` does not hide this complexity; most hooks add a callback around one Convex function. Deleting those hooks removes complexity rather than redistributing it, so they are shallow.

Target: a deep Projects workflow module owns operation sequences and returns stable state/results. The Dashboard Surface composes explicit editor/media/publish views without knowing every Convex call or toast protocol. Do not add a polymorphic adapter seam: there is only one Convex implementation.

### RCT-03 — Editable state is reset through effects instead of identity

Strength: Strong  
Evidence before audit: Projects selection, locale form, upload form, Resume, Settings, and Lead status mirrored remote values into local state through effects.

Fixes completed:

- Project selection is now derived from requested ID plus the reactive project list.
- Project locale forms reset by an explicit content/draft identity key.
- Image upload form resets by project identity; only Object URL cleanup remains in an effect.
- Settings form resets by setting version identity.
- Lead status controls reset by lead/status identity.
- TanStack Table owns its initial sorting because no caller consumes sorting state.

Remaining target: move Resume editable state into a keyed domain module. It must own baseline, draft, locale identity, semantic dirty state, reset/rebase, and save result. Do not replace the removed effects with a universal shallow `useSyncedState` hook.

### RCT-04 — Dirty checking serializes whole forms during render

Strength: Worth exploring  
Evidence: Projects and Resume compare `JSON.stringify(form)` to `JSON.stringify(baseline)` on render; Resume also clones via JSON serialization.

This works for the current JSON-safe shapes but couples correctness to key ordering and repeats whole-object work on every edit. It also hides which fields changed.

Target: domain editable-state modules track semantic change at the update point or use a form state implementation that exposes dirty fields and reset behavior. Evaluate TanStack Form only if a prototype proves that its interface is smaller than the domain rules it replaces.

### RCT-05 — TanStack Table is client-paginating an already truncated server slice

Strength: Strong  
Evidence: Convex returns only the newest 50 leads; TanStack Table then paginates those rows in pages of 10.

The UI presents pagination controls but cannot reach lead 51. Client sorting also applies only to the slice, not the complete inbox.

Target: Convex cursor pagination owns server growth. TanStack Table owns only presentation state that applies to the loaded page/set. If global sorting/filtering becomes a requirement, make it part of the Convex query contract rather than pretending client sorting covers the full inbox.

### RCT-06 — Navigation identity is duplicated and blocks route locality

Strength: Strong  
Evidence: desktop nav, mobile nav, and route definitions are separate lists in `main.tsx`; legacy aliases and the legacy HTML package define additional identities.

Target: one route/navigation module supplies canonical Dashboard Surface identity and explicit aliases. Route implementations stay lazy. Desktop and mobile are render variants, not separate policy lists.

### RCT-07 — `dashboardClass` is mostly a shallow catalog

Strength: Worth exploring  
Evidence: `dashboard-classes.ts` exposes roughly 70 named class strings; most are used once. Removing many entries merely moves the same Tailwind string beside its only caller.

The theme variables earn depth because every primitive consumes them. One-use layout names do not.

Target: keep theme/tokens and genuinely repeated recipes; localize one-use layout classes with their Dashboard Surface. Use CVA where a visual primitive has real variants rather than creating a name for every class string.

### RCT-08 — The current test surface does not verify the dashboard users operate

Strength: Strong  
Evidence: `dashboard-contract.test.ts` reads files and searches for literals such as route strings, labels, and hook names. It can pass when the route is broken and fail after a behavior-preserving rename.

Current useful tests cover content projection and media-key helpers, but there are no render/interaction tests for routes, loading/empty/error states, locale switching, dirty-state preservation, save failure, media sequence, or keyboard operation.

Target: replace source-string assertions with route-manifest tests, workflow-module tests, and focused React interaction tests through the same interface users cross. Browser QA remains the final integration surface; unit tests should prove state and workflows without duplicating browser scripts.

### RCT-09 — Transport types and casts weaken TypeScript leverage

Strength: Strong  
Evidence: dashboard IDs are strings, then cast to Convex `Id` values in `api.ts`; `types.ts` restates backend shapes; project tests repeatedly use `as unknown as` fixtures.

Target: derive transport results/IDs from generated Convex types and build typed fixture factories. Keep UI-only projections explicit. A localized `as unknown as AuthClient` remains necessary today because `createAuthClient` and `ConvexBetterAuthProvider` expose incompatible generic session inference in the installed packages; a direct removal was attempted and rejected by TypeScript. Track that cast as an integration compatibility exception, not a pattern.

### RCT-10 — No TanStack Query responsibility is proven

Strength: Do not add  

Convex already provides reactive caching, deduplication, loading state, mutation integration, and pagination hooks for operational data. Cloudflare upload is a one-time event-driven transfer, not server state shared across screens. GitHub publication dispatch happens in Convex.

Target: do not install TanStack Query. Re-evaluate only if a future client-owned remote resource needs independent cache lifetime, retries, invalidation, and sharing outside Convex.

## Recommended implementation sequence

1. Route/navigation module and route-level code splitting.
2. Surface-specific Convex queries, starting with paginated Leads.
3. Deep Projects workflow module and behavioral tests.
4. Keyed Resume editable-state module; remove the final avoidable screen effect.
5. Derive transport IDs/types from Convex.
6. Remove shallow `api.ts` and one-use `dashboardClass` entries as callers migrate.
7. Replace source-string dashboard contract tests with route/workflow/interaction tests.
8. Measure production chunks and interactions on desktop and 390px mobile.

## Verification performed

- `pnpm --filter @aohys/dashboard typecheck` — passed after the effect/state changes.
- `pnpm --filter @aohys/dashboard test` — 3 files / 13 tests passed.
- `pnpm --filter @aohys/dashboard build` — passed; 761.43 kB / 226.80 kB gzip JavaScript baseline recorded.
- No browser automation, deploy, provider call, or external application traffic was used in this audit.
