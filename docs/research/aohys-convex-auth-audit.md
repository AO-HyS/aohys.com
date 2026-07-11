# AOHYS Convex and Better Auth audit

Date: 2026-07-11  
Linear: AOH-72  
Scope: `apps/backend/convex`, backend adapters, dashboard Convex client usage, Better Auth integration, schema/indexes, and operational data separation.

## Executive assessment

The current backend is materially safer and more production-shaped than the dashboard score suggests. Public dashboard functions consistently call `requireAdmin`, sensitive helper functions are internal, every first-party registered Convex function has argument and return validators, provider credentials remain server-side, and the React dashboard correctly uses Convex subscriptions rather than adding TanStack Query over reactive server state.

The remaining work is mostly contract depth and scaling correctness:

1. `content.listForDashboard` is one reactive read across six operational data groups, so unrelated writes rerun and retransmit the entire dashboard payload.
2. Leads silently stop at the newest 50 records; there is no cursor or “more” state.
3. Content reads mix unbounded collections with silent hard caps. Before this audit, capped media/settings/resume reads selected the oldest rows because they had no descending order.
4. Publication writes Convex state before dispatching GitHub. A provider failure can leave “published” state without a queued Release Train, and retries can repeat dispatch.
5. Dashboard request/response types duplicate Convex validators and then cast string IDs back to `Id<...>`, weakening end-to-end type leverage.
6. Expected operational errors use free-form `Error` messages instead of stable `ConvexError` codes.

## Sources and current guidance

- [Convex best practices](https://docs.convex.dev/understanding/best-practices/) — await promises, avoid query filters, bound collections, remove redundant indexes, validate public functions, protect public functions, schedule/run only internal functions, and keep most logic in plain TypeScript helpers.
- [Convex auth in functions](https://docs.convex.dev/auth/functions-auth) — authorization must be enforced inside each relevant function through trusted identity.
- [Convex error handling](https://docs.convex.dev/functions/error-handling) — use structured application errors for expected client-visible failures.
- [Convex paginated queries](https://docs.convex.dev/database/pagination) — use cursor pagination for growing result sets rather than silent fixed slices.
- [Better Auth Convex integration](https://better-auth.com/docs/integrations/convex) — the repository follows the supported component, auth config, route registration, client plugin, and provider pattern.
- [Better Auth security](https://better-auth.com/docs/reference/security) and [rate limits](https://better-auth.com/docs/concepts/rate-limit) — trusted origins, secure cookies, proxy/header assumptions, and production rate limiting remain explicit security policy.

## Findings

### CVX-01 — One mega-subscription couples all Dashboard Surfaces

Strength: Strong  
Evidence: `apps/backend/convex/content.ts:150-217`, `apps/dashboard/src/api.ts:103-111`, every content/settings/resume screen calls `useDashboardContent`.

`listForDashboardHandler` reads case-study metadata, project drafts, resume drafts, media, settings, and resume versions together. A settings edit can invalidate the project and resume payload; a media edit can rerender Settings. The interface makes every caller learn the full aggregate even when a Dashboard Surface needs one slice.

Target contract: reactive reads are organized by Dashboard Surface and return only the fields and ordering that surface renders. Convex remains the reactive-state owner; no TanStack Query cache is introduced.

### CVX-02 — Growing inbox and content sets truncate without pagination semantics

Strength: Strong  
Evidence: `apps/backend/convex/leads.ts:94-98` uses newest-first `take(50)`; content uses `take(100)`/`take(50)` and `collect()` without a cursor contract.

The leads inbox cannot reach record 51. Media/settings/resume versions have caps but no `hasMore` signal. Project/case-study/resume-draft collections are currently small by product shape but are not bounded by schema.

Target contract: leads use Convex cursor pagination and the UI represents initial loading, loading more, exhausted, and error states. Content queries either prove a domain cardinality invariant or return an explicit bounded result with truncation metadata.

### CVX-03 — Publication is not an idempotent durable workflow

Strength: Strong  
Evidence: `apps/backend/convex/contentActions.ts:95-104` mutates publication state, then calls GitHub; `apps/backend/convex/content.ts:446-561` rewrites drafts/media before provider success.

If GitHub dispatch fails, Convex records can be marked published while no Release Train is queued. Retrying can rewrite timestamps and dispatch more than once. The action has no durable publication request identity or retry state.

Target contract: create a durable publication request with an idempotency key and explicit workflow state, then let an internal action advance it. Convex persistence and external dispatch remain separately observable; retries reuse the same request rather than creating a second release intent.

### CVX-04 — Expected errors have no stable code contract

Strength: Worth exploring  
Evidence: `requireAdmin`, lead lookup, media ownership, provider configuration, and publish failures throw free-form `Error`; dashboard toasts display `error.message`.

Production Convex intentionally sanitizes unexpected errors. UI behavior should not depend on parsing runtime message prefixes.

Target contract: expected failures use `ConvexError` data with stable codes such as `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, and `PROVIDER_UNAVAILABLE`. Dashboard copy maps codes, while internal logs retain provider detail.

### CVX-05 — Dashboard types duplicate the Convex contract

Strength: Strong  
Evidence: `apps/dashboard/src/types.ts`, request types in `apps/dashboard/src/api.ts`, validators in `apps/backend/convex/content.ts`, and ID casts in `useSaveLeadStatus`/media mutations.

The same draft/media/resume/lead shapes are maintained in validators, TypeScript interfaces, the publication script, and UI projections. The dashboard stores IDs as `string` and casts them at the mutation seam.

Target contract: derive transport results and document IDs from generated Convex types. Keep only UI projection types in the dashboard. Publication scripts consume one shared validated representation instead of local copies.

### CVX-06 — Better Auth is sound, with two policy decisions to make explicit

Strength: Worth exploring  
Evidence: `apps/backend/convex/auth.ts`, `apps/backend/convex/http.ts`, `apps/site/src/dashboard-access.ts`, `apps/dashboard/src/lib/auth-client.ts`.

What is already correct:

- official Convex component and auth provider config;
- Google credentials and secret remain in Convex environment;
- exact trusted-origin list plus project-scoped preview host pattern;
- secure-cookie decision follows HTTPS site URL;
- database-backed Better Auth rate limiting;
- Pages guard checks a real session and the same admin allowlist before serving the shell;
- every privileged Convex function repeats authorization through `requireAdmin`.

Decisions to make explicit:

1. `trustedProxyHeaders: true` is safe only while allowed hosts/trusted origins remain closed and the Convex auth origin cannot turn arbitrary forwarded hosts into accepted origins. Preserve tests for unknown hosts and preview patterns.
2. Admin policy currently trusts a matching Better Auth email. If the product requires verified-email enforcement in addition to Google OAuth, add it as an explicit invariant after confirming existing account state; do not silently lock out the current admin.

## Fixes completed in this audit

### Removed dead public surface

- Removed unused `auth.getCurrentUser`; the official `getAuthUser` client function remains.
- Removed unused public `content.upsertCaseStudyMetadata`; project-draft upsert already owns metadata updates.

Deletion was verified by repository-wide caller search and backend typecheck/tests.

### Corrected media query locality

- Replaced `mediaMetadata.by_content_id` with `by_content_id_and_usage`.
- Selection and initial public-media exclusivity now constrain both fields in the index instead of collecting by content and filtering usage in memory.
- Project publication still uses the compound index by its `contentId` prefix, so the redundant shorter index is unnecessary.

### Corrected bounded-read ordering

- Media, site settings, and resume versions now use descending order before `take`, ensuring caps retain the newest records rather than the oldest records.

### Security remediation inherited from AOH-70

- Removed the legacy anonymous `leads.submit` mutation.
- `/contact` persists only through an internal mutation.
- Contact persistence atomically enforces a bounded indexed submission window before insert.

## Recommended target contract

| Area | Target |
| --- | --- |
| Public functions | Every public function has explicit access policy, args validator, returns validator, and stable error codes. |
| Internal functions | Scripts, schedulers, actions, and HTTP actions call only internal functions for privileged implementation work. |
| Reactive reads | One query per Dashboard Surface; no TanStack Query over Convex subscriptions. |
| Growing collections | Cursor pagination or an explicit proven cardinality bound; never a silent slice. |
| Indexes | Query predicates live in indexes; no duplicated prefix index unless ordering proves it necessary. |
| Writes | Idempotent where retries are expected; direct patch when a prior read adds no invariant. |
| Publication | Durable request identity, observable states, idempotent dispatch, separate persistence/provider failure. |
| Errors | Structured `ConvexError` codes for expected failures; provider/private detail stays server-side. |
| Types | Transport and IDs derive from generated Convex types; dashboard owns only UI projections. |
| Auth | Better Auth/Convex component stays canonical; trusted origins, preview hosts, secure cookies, proxy assumptions, verified-email policy, and rate limits have direct tests. |
| Data separation | Public build receives only classified public values and published Evidence Assets; Private Work remains admin/internal. |
| Tooling | Add `@convex-dev/eslint-plugin` recommended rules plus focused no-filter/no-collect checks once the query split lands. |

## Verification

- `pnpm --filter @aohys/backend typecheck` — passed.
- `pnpm --filter @aohys/backend test` — 8 files, 23 tests passed.
- No Convex deploy, live endpoint request, provider call, or secret access was performed.
