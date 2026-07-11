# AOHYS Dashboard Shell Prototype Decision

Date: 2026-07-11  
Issue: AOH-76  
Question: which visual and interaction system should extend Sunlit Systems Studio into the private operational dashboard?

## Prototype method

Three read-only, development-only full-shell prototypes were mounted on the existing `/dashboard` route and switched with a URL-stable `?variant=` parameter:

- `operations` — Operations Desk
- `ledger` — Review Ledger
- `flow` — Release Flow

The prototype contained no data queries, persistence, provider calls, or mutations. Arrow keys and the fixed switcher cycled variants. Browser review covered desktop and a 390 by 844 px viewport; all three variants rendered without document-level horizontal overflow. Dashboard typecheck, 17 tests, and production build passed. The production bundle did not include prototype copy.

The prototype was deleted after the decision, as required for throwaway design code.

## Direction A — Operations Desk

Operations Desk uses a compact brown navigation rail, white workbench, ruled operational checklist, and contextual “Now” area. It limits the visible vocabulary to navigation, sections, and operational rows. Honey identifies the current route and the one primary action; olive marks verified structure; apricot marks attention; brown carries ink and chrome.

Its strongest property is focus: the page answers “what needs attention next?” without pretending to be analytics, activity history, or a release provider. It preserves the familiar route model and lets every later screen reuse the same shell, page header, row, status, async, form, table, and save compositions.

## Direction B — Review Ledger

Review Ledger removes the sidebar and organizes the interface chronologically under a two-level top bar. It makes review decisions visible as a ruled sequence and is naturally keyboard-friendly.

Its strongest contribution is the language of review checkpoints and the idea that every row should expose one next action. Its weakness is truth: the current data model has updated timestamps, not an immutable activity or decision log. Presenting the full concept now would overstate what the system can prove. The prototype also drifted toward brand-page display scale rather than the calmer fixed product scale.

## Direction C — Release Flow

Release Flow uses a top navigation and an Overview-only sequence from Intake to Prepare to Review to Publish. It makes handoffs and publication semantics explicit and prevents “queued” from being mislabeled “published.”

Its strongest contribution is rigorous publication language and revision-bound readiness. Its weakness is model cost: a truthful implementation requires authoritative stage counts, blocker codes, review receipts bound to revisions, and verified deployment state. Those are valuable future domain capabilities, but adding a decorative stage board before those contracts exist would be feature theater.

## Decision

**Operations Desk is the implementation base.**

It best satisfies the current product, data, and architecture constraints:

- stable, familiar route navigation for repetitive private work;
- operational Overview without fake analytics;
- one next action based on deterministic readiness;
- brand continuity without importing public-site theatre;
- no dependency on an audit log, review receipt, or provider status that does not yet exist;
- strong mobile path through a standard Sheet rather than horizontal navigation;
- the smallest reusable composition system across all five dashboard surfaces.

## Elements adopted from the other directions

From Review Ledger:

- every operational row has one explicit next action;
- publication checkpoints and chronological language may be added only after an immutable activity/review contract exists;
- command navigation is a later enhancement after the core shell and keyboard flow are stable.

From Release Flow:

- publication states remain literal: ready to queue, workflow queued, provider unavailable, deployment verified;
- readiness gates return blocker codes and reasons from an authoritative Convex overview query;
- review becomes revision-bound if and when a real review receipt is added;
- no drag-and-drop stage movement or client-inferred stage truth.

## Production implementation contract

### Shell

- Brown desktop rail using the current shadcn Sidebar composition.
- Mobile global navigation in Sheet with a 44 px menu target.
- One route definition drives router identity, desktop navigation, and mobile navigation.
- Compact top utility bar with page identity, environment, and safe account context.
- No repeated badge eyebrow above every page heading.

### Overview

- `PublicationReadiness` built from an authoritative Convex overview query.
- First deterministic blocker becomes the page's single primary action.
- Context area shows the selected blocker and its safe source route.
- Recent activity is omitted until the backend can prove immutable activity.
- PostHog analytics remain in PostHog.

### Shared product vocabulary

- `Action`
- `AppNav`
- `PageHeader`
- `OperationalRow`
- `StatusBadge`
- `SectionPanel`
- `AsyncSurface`
- `FormField`
- `SaveBar`
- `ResponsiveDataView`
- `ConfirmAction`

### Visual rules

- Mona Sans for interface hierarchy; Atkinson Hyperlegible Next for longer reading/help copy.
- Neutral white canvas; honey action/current state; olive structure/success; apricot attention; brown ink/dark chrome; dedicated semantic red for errors/destructive state.
- Fixed product type scale, 4/8 spacing rhythm, restrained 6/10/14 px radii, no decorative soft shadows.
- 150–200 ms state motion only; reduced motion makes changes immediate.
- One primary action per decision cluster.
- No nested cards, generic metric grids, or full-site entrance choreography.

## Browser evidence and limitation

Browser verification confirmed:

- all three variants changed through the fixed switcher and URL parameter;
- Operations Desk, Review Ledger, and Release Flow rendered at desktop without horizontal overflow;
- Operations Desk rendered at 390 px without document-level overflow;
- prototype content did not call providers or application mutations.

The throwaway Operations Desk mobile prototype used a horizontally scrollable navigation rail. This is not the production decision. The production shell must use the audited shadcn Sidebar/Sheet composition and must be verified at 1440, 1024, 768, and 390 px.
