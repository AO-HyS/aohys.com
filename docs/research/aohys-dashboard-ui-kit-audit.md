# AOHYS Dashboard UI Kit and Primitive Adapter Audit

Date: 2026-07-11  
Issue: AOH-73  
Scope: `apps/dashboard` and its remaining dependency on `packages/dashboard-ui`  
Method: source review, current shadcn CLI inspection, official shadcn documentation, deterministic Impeccable scan, independent visual review, and local Browser verification at 1280x720 and 390x844.

## Decision

Preserve the installed Radix/shadcn foundation, but replace the dashboard's visual foundation and screen-level composition. The dashboard currently behaves like a functional admin shell while looking and reading like a generic shadcn starter. It does not yet demonstrate the same authored system, product judgment, or brand discipline as the public site.

The target is not a collection of prettier screens. It is a small Dashboard UI Kit plus a Dashboard Primitive Adapter that makes correct composition the easiest path:

- shadcn remains the local primitive source;
- screens consume AOHYS adapters and workflow compositions rather than raw styling catalogs;
- the Sunlit Systems Studio palette and typography become the shared identity;
- accessibility, async states, responsive behavior, mutation feedback, and semantic headings become enforced contracts.

## Audit health score

| Dimension | Score | Current evidence |
| --- | ---: | --- |
| Accessibility | 2/4 | Focus treatment and dialog structure are sound, but many form labels are not programmatically associated and route-level recovery states are absent. |
| Performance and perceived loading | 2/4 | Skeletons exist, but the app is one eager JavaScript bundle and unresolved queries can look like permanent loading. |
| Responsive design | 2/4 | The shell does not overflow at 390 px, but navigation and actions use 28–32 px controls and Leads remains a 960 px table inside horizontal scroll. |
| Theming | 1/4 | Semantic variables exist, but their teal/blue/navy/purple values and Geist font contradict the approved AOHYS identity. |
| Anti-patterns and product craft | 1/4 | Overview is the generic three-card admin pattern, eyebrow badges repeat above headings, and Resume is a wall of nested card-like editors. |
| **Total** | **8/20** | **Poor — systemic redesign required, with a sound primitive base to build on.** |

The bundled deterministic detector returned no mechanical violations. That is useful evidence that the implementation avoids obvious CSS gimmicks; it does not override the authored review, where layout sameness, identity drift, and missing product states are the material problems.

## What is already strong

- The project uses the current `radix-nova` shadcn base, Tailwind v4, semantic color variables, Lucide icons, and local component source.
- The installed Button, Card, Field, Select, Tabs, Sheet, and most related primitives match the current registry.
- Alert dialogs include titles, descriptions, cancel paths, and explicit destructive confirmation for media deletion.
- Project editing already has the right workflow nucleus: master-detail selection, bilingual content, explicit save/publish, media fallback, and visible mutation feedback.
- Toaster feedback covers pending, success, and failure for the important mutations.
- Project/media transitions respect reduced motion, and media previews include alt text and deterministic fallback content.
- Browser verification at 390 px found no document-level horizontal overflow.

These are the parts to deepen, not replace.

## Findings

### P1 — The private product has a different, prohibited identity

Evidence:

- `apps/dashboard/src/styles.css` imports Geist.
- `apps/dashboard/src/lib/dashboard-classes.ts` defines teal primary colors and a navy/blue sidebar, plus blue and purple chart tokens.
- `DESIGN.md` establishes Mona Sans, Atkinson Hyperlegible Next, honey `#FEC868`, olive `#ABC270`, apricot `#FDA769`, brown ink `#473C33`, and explicitly rejects blue, navy, cyan, purple, violet, and mint.

Impact: the authenticated surface feels like a separate starter product. That weakens the repository's central claim that the design system and engineering system are intentional end to end.

Decision: move theme variables into the dashboard CSS foundation, reuse the approved font packages, and map brand colors to product-semantic roles. Honey is primary action/current selection, olive is structural/supportive state, apricot is proof/attention, brown is ink and the dark shell. Color must communicate state, not decorate every panel.

### P1 — Form labels are frequently only visual

Measured evidence:

- 52 `FieldLabel` usages exist across dashboard screens; only eight currently declare `htmlFor`.
- Resume repeats unlabeled Input/Textarea groups throughout `resume-screen.tsx`.
- Projects repeats the same pattern in identity, outcome, SEO, CTA, and structure fields.
- The lead-status Select has no explicit label association.
- `Field` renders a `role="group"`; it does not automatically bind its `Label` to an adjacent control.
- Only one screen-level `aria-invalid`, `data-invalid`, and `FieldError` contract exists.

Impact: screen-reader names, click-to-focus behavior, validation announcements, and error ownership are inconsistent. This conflicts with WCAG 2.2 1.3.1 and 3.3.2.

Decision: introduce an AOHYS `FormField` adapter that owns stable control, description, and error IDs; requires an accessible label; wires `aria-describedby` and `aria-invalid`; and supports Input, Textarea, Select, and file controls without screen-level ceremony.

### P1 — Async, empty, error, and route states are incomplete

Evidence:

- Loading is represented by eight Skeleton usages, but queries expose no explicit error/retry state to the screens.
- Leads, media, and resume artifacts use muted paragraphs for empty states.
- TanStack Router has no configured pending, error, or not-found UI. The local server emitted the default not-found warning during review.
- A failed authorization/network path can therefore resemble permanent loading or fall through to generic text.

Impact: users cannot distinguish slow, empty, unauthorized, and failed states, and they are not given a recovery action.

Decision: add route-level pending/error/not-found composition and an `AsyncSurface` family with Loading, Empty, Error, Retry, and permission-denied variants. Empty states teach the next action; errors preserve user work and explain recovery.

### P1 — Overview is navigation, not an operational overview

Evidence:

- `dashboard-home.tsx` is a three-column grid of identical Cards, each with icon, description, and `Open` button.
- Settings is omitted.
- No release readiness, pending draft, missing media, new lead, resume artifact, or publication-health signal is presented.
- `DESIGN.md` explicitly says Overview is operational and checklist-driven, not analytics.

Impact: the highest-level dashboard page adds no information beyond the sidebar and visually reproduces a saturated SaaS template.

Decision: replace it with an operational command center: a prioritized next action, publication readiness checklist, drafts/assets needing attention, new leads, resume health, and release-train state. Do not invent vanity metrics.

### P1 — Resume exposes the entire content model at once

Evidence:

- Resume renders ten or more consecutive Cards and repeated nested bordered editors.
- Most sections are simultaneously editable.
- Save/publish controls compete with PDF artifact management and detailed arrays.
- Destructive row removal has no consistent confirm/undo policy.

Impact: cognitive load is critical, scanning is slow, and the user has weak orientation about what changed or what still needs review.

Decision: use section navigation plus one focused editable section, a sticky Save/Publish bar, per-section completion/dirty state, and an adjacent preview/context panel where useful. Repeated item editors use a consistent `EditableList` composition and explicit destructive safeguards.

### P2 — Product density is being confused with small hit areas

Browser measurements at 390 px:

- mobile navigation and sign-out controls are 28 px high;
- Overview actions are 32 px high;
- the dashboard does not overflow horizontally.

WCAG 2.2 AA criterion 2.5.8 establishes a 24 by 24 CSS pixel minimum with exceptions, so the measured controls are not automatically an AA failure. They are nevertheless too small for the desired high-comfort touch experience.

Decision: keep dense 32–36 px visual controls where appropriate on pointer devices, but make primary mobile navigation, destructive controls, and repeated touch actions expose at least a 44 px hit area. Do not claim 44 px is the AA minimum.

### P2 — Leads is desktop responsive, not mobile adapted

Evidence:

- the table is fixed to `min-w-[960px]` and placed in horizontal overflow;
- status editing and pagination remain table-shaped at 390 px;
- the backing query is already capped at 50 records before local pagination.

Impact: mobile users must pan horizontally to understand and update a lead, while pagination gives a misleading sense of completeness.

Decision: add a `ResponsiveDataView` adapter: semantic table on desktop, task-focused rows/cards on small screens, shared sorting/status behavior, and cursor pagination from Convex.

### P2 — Status language is ad hoc

Evidence:

- project, publication, link, media, lead, and resume states reuse generic Badge variants without a shared semantic mapping;
- the current system does not guarantee icon/text accompaniment or prevent color-only meaning.

Impact: the same visual treatment can mean draft, source, neutral metadata, or workflow status.

Decision: add a typed `StatusBadge` adapter with neutral, info, success, warning, critical, and unavailable roles. Domain labels and icons remain explicit; color is supportive only.

### P2 — `dashboardClass` is a styling catalog, not a primitive adapter

Evidence:

- the catalog contains roughly 60 keys;
- more than 45 keys are consumed only once;
- structure, state, and semantics remain in the screen while class strings are merely moved to another file.

Impact: screens stay large, relationships are harder to see, and the apparent abstraction provides little leverage.

Decision: replace one-use aliases with named components or local layout classes. Keep only true shared tokens/variants. The adapter should hide required relationships and accessibility contracts, not hide arbitrary Tailwind strings.

### P2 — The legacy dashboard UI still leaks into the active build surface

Evidence:

- `styles.css` scans `packages/dashboard-ui/src` even though the React dashboard no longer consumes its workflows.
- the package remains required by the site's sign-in and pre-React access-state rendering.

Impact: unused legacy workflow styles stay eligible for generation and the repository appears to support two dashboard systems.

Decision: first reduce the legacy package to the sign-in/access-state surface or move those renderers next to the route guard. Only then delete the Tailwind source reference and dead workflows. Do not remove the package blindly.

### P2 — Two installed primitives have registry drift

The current shadcn dry run reports the installed Button, Card, Field, Select, Tabs, Sheet, and Label as identical to the registry. `AlertDialog` differs from the current registry, which now composes Button directly and adds size/media semantics. Separator was confirmed identical when checked individually.

Decision: merge the AlertDialog update deliberately after checking local consumers. Never overwrite customized components wholesale.

## Target Dashboard UI Kit

### Foundations

- `dashboard.css`: brand-semantic product tokens for canvas, surface, ink, muted ink, rule, action, olive structure, apricot attention, danger, success, focus, sidebar, and overlays.
- Mona Sans for interface hierarchy; Atkinson Hyperlegible Next only for longer reading and help copy.
- A compact spacing rhythm based on 4/8 px, radii limited to 6/10/14 px, and no decorative wide shadows.
- Motion tokens in the 150–250 ms product range, with reduced-motion variants.
- Explicit z-index layers for sticky chrome, overlays, toasts, and tooltips.

### Primitive adapters

| Adapter | Responsibility |
| --- | --- |
| `Action` | Primary honey ticket, secondary text action, quiet utility, destructive action, pending and disabled state. |
| `FormField` | Label/control/description/error identity and validation contract. |
| `StatusBadge` | Typed status vocabulary with text/icon support and non-color meaning. |
| `SectionPanel` | Semantic heading level, description, action area, and optional footer without nested-card defaults. |
| `AsyncSurface` | Loading, empty, error, retry, unavailable, and permission states. |
| `ConfirmAction` | Consistent destructive confirmation built on AlertDialog. |
| `ResponsiveDataView` | Desktop table and mobile task row from one data/state contract. |
| `SaveBar` | Dirty, saving, saved, publish readiness, and the one primary action for an editor. |
| `LocaleSwitch` | Accessible language switching with stable selected state. |
| `AppNav` | One navigation definition rendered as desktop sidebar and mobile sheet. |

### Workflow compositions

- `DashboardShell`
- `PageHeader`
- `OperationalChecklist`
- `MasterDetailWorkspace`
- `EditableSection`
- `EditableList`
- `MediaPicker`
- `PublicationReadiness`
- `ActivityRow`

## Preserve, replace, add, delete

### Preserve

- local shadcn/Radix source and current base preset;
- Field, AlertDialog, Toaster, Tabs, Select, Skeleton, and Table primitives;
- Projects master-detail workflow, bilingual editor, explicit publish, media fallback, and destructive confirmation;
- current focus rings, `aria-live` mutation feedback, and reduced-motion treatment.

### Replace

- Geist and the teal/navy/blue theme;
- generic Overview card grid;
- repeated badge eyebrows above page headings;
- Resume's simultaneous wall of editor cards;
- table-only mobile Leads;
- ad hoc Badge status meanings;
- the shallow one-use `dashboardClass` catalog.

### Add

- the adapters and compositions above;
- route pending/error/not-found states;
- operational readiness and recovery states;
- programmatic form identity and validation summary;
- mobile data views and 44 px comfort hit areas;
- semantic heading contracts and behavioral accessibility tests.

### Delete after consumer migration

- unused chart tokens;
- obsolete one-use class aliases;
- the dashboard Tailwind source scan of `packages/dashboard-ui`;
- legacy HTML dashboard workflows, after the small sign-in/access-state consumers have moved.

## Screen baseline

| Surface | Current score | Primary opportunity |
| --- | ---: | --- |
| Overview | 3.5/10 | Replace redundant navigation cards with operational readiness and next action. |
| Projects | 6/10 | Preserve master-detail; simplify layers and progressively disclose SEO/media/delivery. |
| Leads | 4.5/10 | Responsive task rows and real server pagination. |
| Resume | 3/10 | One-section-at-a-time editor, sticky save/publish, completion and safe removal. |
| Settings | 5.5/10 | Use the shared FormField/SaveBar/async contracts and clearer scope copy. |
| Shell/navigation | 4/10 | Shared brand identity, one route model, collapsible/mobile shadcn Sidebar composition. |

## Implementation order

1. Foundations, navigation model, shell, and primitive adapters.
2. Operational Overview.
3. Resume information architecture and editable-state module.
4. Projects workflow decomposition and progressive disclosure.
5. Leads responsive data view and cursor pagination.
6. Settings migration and legacy dashboard-ui retirement.
7. Browser QA at 1440, 1024, 768, and 390 px; keyboard-only flow; 200% zoom; reduced motion; loading/empty/error/success states.

This order makes each later screen prove and reuse the same system instead of inventing a second local design vocabulary.
