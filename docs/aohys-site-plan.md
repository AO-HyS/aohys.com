# AOHYS Site Plan

## Understanding
We are creating a new public source website for Alejandro Ortiz Corro and AOH&S at `aohys.com`. The site is a working sample of engineering standards, not a community open-source project and not a promise that client/product code is public. Alejandro is the primary subject; AOH&S is the professional company/brand behind the work.

The site should help with job search and client acquisition by focusing on business outcomes, architecture, reliability, security, quality, and scalability. The public experience should not lead with stack names, though the architecture can show modern engineering choices as evidence.

The old React portfolio remains untouched. The new repo will be `AO-HyS/aohys.com`, built as a monorepo with Astro for the public SEO surface, a private dashboard under `/dashboard`, Convex as the backend, Cloudflare for hosting/domains/media delivery, PostHog for analytics/errors, and Resend for lead notifications.

The Impeccable design direction is now resolved enough to begin implementation. The site should combine a spacious architecture-stage feeling with proof-ledger sections: large evidence surfaces, restrained pastel color, strong typography, and visible system decisions without becoming a developer-terminal portfolio or a generic SaaS landing page.

## Decisions
- Primary audience: Hiring managers, tech leads, and technical founders first; clients second.
- Positioning: Business outcomes plus reliable architecture.
- Identity: Alejandro first, AOH&S second.
- Repo: New public repository at `AO-HyS/aohys.com`.
- Public source framing: This site's code is public as a working example of Alejandro's engineering standards; it is not a community open-source product.
- Contributions: No contribution workflow; no `CONTRIBUTING.md`; do not promote issues or external PRs.
- License: MIT for code; all rights reserved for content, brand, copy, CV, case study material, images, and assets.
- Domains: `aohys.com` is canonical; `aohys.net` redirects 301 to `aohys.com`.
- Domain shape: One domain only; private dashboard lives at `aohys.com/dashboard`.
- Dashboard SEO: `/dashboard` is private, authenticated, omitted from sitemap, and `noindex`.
- Monorepo layout: `apps/site`, `apps/dashboard`, `packages/convex`, `packages/config`, and media-related helpers as needed.
- Public site: Astro, SEO-first, bilingual, prerendered/static where appropriate and Cloudflare-capable where server behavior is needed.
- Dashboard: React SPA with Vite and TanStack Router, in English.
- Backend: Convex is the primary backend for application state, content metadata, leads, auth integration, and dashboard workflows.
- Auth: Better Auth plus Convex, with an initial admin allowlist for `alejandro.ortiz@aohys.com`.
- Hosting/deploy: Cloudflare with Wrangler, GitHub Actions, and `develop -> main -> production`.
- Media: Cloudflare handles image storage/optimization; Convex stores metadata and references only.
- Media upload: Dashboard supports uploading images from V1.
- Media scope: A small set of generated images plus sanitized screenshots; prompts are not required metadata.
- Analytics and errors: PostHog handles pageviews, explicit events, dashboards, and errors; autocapture starts disabled.
- Contact: Primary form stores leads in Convex and sends notifications through Resend.
- Contact email: Public email is `alejandro.ortiz@aohys.com`; system sender is `Alejandro Ortiz <contact@aohys.com>`.
- WhatsApp: Add a large but discreet WhatsApp CTA; use `+52 229 902 0825` temporarily until the business Meta number is ready.
- Resend DNS: Verify Cloudflare DNS before production, especially SPF alignment for Resend.
- i18n: English is default at `/`; Spanish lives under `/es/`.
- Slugs: Public section slugs are localized; internal IDs remain stable.
- Public Content Graph: stable content IDs own route paths, locale variants, SEO metadata, sitemap eligibility, and evidence relationships.
- Public route implementation: Astro uses native i18n config, the public shell uses locale JSON for UI copy, and the Public Content Graph owns page identity, localized slugs, metadata, sitemap rules, and private route exclusions.
- Content source of truth: public pages should resolve through the graph instead of duplicating slugs, metadata, alternates, and sitemap rules in each route file.
- Content safety: evidence assets must carry public-safe usage intent and alt text; private work details, private data, and dashboard routes are excluded from the public graph.
- Content documentation: The canonical content planning document is `docs/public-content-graph.md`; the architectural decision is `docs/adr/0003-public-content-graph.md`.
- Dashboard language: English only.
- Release Train: `develop` is the Development Branch, `main` is the Production Branch, and both branches should be protected.
- Promotion flow: feature branches target `develop`; production promotion moves from `develop` to `main` through a pull request, Cloudflare deployment checks, and smoke verification.
- Release module: Release scripts, GitHub Actions, Cloudflare Preview/Production behavior, environment validation, and smoke checks should be treated as one Release Train module.
- Release documentation: The canonical release planning document is `docs/release-train.md`; the architectural decision is `docs/adr/0001-protected-release-train.md`.
- Environment Contract: `local`, `preview`, and `production` are the stable environment names across app code, release workflows, and provider setup.
- Environment source of truth: GitHub Environments own deploy-time preview and production secrets; `.env.local` is local-only and uncommitted.
- Environment validation: Release Train gates should fail before deploy if required values are missing, secrets drift, or provider targets point to the wrong environment.
- Environment documentation: The canonical environment planning document is `docs/environment-contract.md`; the architectural decision is `docs/adr/0002-environment-contract-source-of-truth.md`.
- Convex backend foundation: `apps/backend` owns the Convex schema, generated bindings, and first public lead intake mutation. The initial dev deployment is `dev/aohys-local`; preview and production values remain GitHub Environment responsibilities.
- Contact workflow: `/contact` and `/es/contacto` render a real bilingual form with preferred contact path, consent, spam honeypot, direct email, and WhatsApp fallback. Submissions target the Convex HTTP action `/contact`, which persists leads, sends Resend notifications, and captures PostHog conversion metadata without message text or contact identity.
- Public analytics workflow: the Astro layout emits an explicit PostHog `$pageview` payload per public route, with browser autocapture disabled. Contact and CTA events are limited to `contact_form_viewed`, `contact_form_submit_attempted`, `contact_form_submit_failed`, `whatsapp_cta_clicked`, and `email_cta_clicked`; contact field values are stripped before capture. Browser errors are captured with fixed metadata only.
- CTA: Primary CTA is neutral: "Start a conversation" / "Hablemos"; contact form captures lead intent.
- Privacy: Include serious minimal privacy pages from V1; no newsletter in V1.
- CV: `/resume` is the primary dynamic resume URL; `/es/cv` is the Spanish route. The downloadable PDF lives at `/downloads/alejandro-ortiz-corro-resume.pdf`.
- Resume SEO: Resume content is graph-backed, ATS-readable, linked to the PDF artifact, and linked back to dynamic site context.
- Public V1 pages EN: `/`, `/case-studies`, `/case-studies/casa-roca`, `/case-studies/the-barber-central`, `/case-studies/nutri-plan`, `/case-studies/enterprise-systems`, `/case-studies/engineering-practice`, `/practice`, `/architecture`, `/resume`, `/contact`, `/privacy`.
- Public V1 pages ES: `/es/`, `/es/casos`, `/es/casos/casa-roca`, `/es/casos/the-barber-central`, `/es/casos/nutri-plan`, `/es/casos/sistemas-enterprise`, `/es/casos/practica-de-ingenieria`, `/es/practica`, `/es/arquitectura`, `/es/cv`, `/es/contacto`, `/es/privacidad`.
- Dashboard V1 sections: Overview, Leads, Case studies, Media, Site settings, Resume.
- Dashboard overview: Operational checklist and quick links, not embedded analytics.
- Dashboard UI Kit: private dashboard routes should use AOHYS workflow surfaces instead of composing raw primitives directly.
- Dashboard primitive adapter: use shadcn/ui as editable source primitives behind the Dashboard UI Kit implementation.
- Dashboard mobile: validate dashboard workflows at 390px, avoid horizontal overflow, keep visible tap targets at least 44px, and do not render duplicate mobile/desktop controls with the same meaning.
- Dashboard documentation: The canonical dashboard planning document is `docs/dashboard-ui-kit.md`; the architectural decision is `docs/adr/0004-dashboard-ui-kit.md`.
- Case study structure: Problem, business outcome, role, constraints, architecture decisions, execution highlights, quality/security/performance, public evidence, confidentiality note.
- Case study ordering: Casa Roca as production proof; The Barber Central as modern technical flagship; Nutri Plan as active private build; Enterprise Systems as scale/credibility; Engineering Practice as current AI-assisted process.
- Casa Roca: Present with real name and public link to `casa-roca.mx`.
- The Barber Central and Nutri Plan: Present as active builds, with visible development pages/screenshots when useful.
- Enterprise work: Include a dedicated home section for Tala, Drift, Prenuvo, AutoZone/DataZone, Accenture, and CEMEX/NEORIS, summarized with confidentiality.
- Engineering practice: Present modern agent/AI-assisted engineering, QA, architecture, observability, deployment, and documentation as practice, not as invented LLM product work.
- Architecture page: Use `/architecture`, with a "Public code sample" section explaining the repo and system decisions.
- README: Full architecture/evaluation README, including local development, env vars, Convex, Cloudflare, PostHog, Resend, media, privacy/security, deploy flow, and license boundaries.
- Visual direction: Architecture-stage sections plus proof-ledger sections. The site should feel like a senior engineering review on a clean drafting table, not an agency template or a card grid.
- Visual density: Use few large evidence artifacts, generous negative space, horizontal proof rows, annotated system diagrams, and strong section pacing.
- Visual color: Use a pastel-professional full palette with restrained application. The base is honey + mint on white; architecture sections use dark ink + pastel signal.
- Color roles: Honey/amber is for primary CTA and proof marks; mint is for architecture/system flow; sky is for links and informational states; coral is rare emphasis; dark ink is for high-contrast technical sections.
- Typography: Use Mona Sans variable for display, navigation, CTAs, case-study titles, architecture labels, proof-ledger headings, and interface details.
- Long-form typography: Use Atkinson Hyperlegible Next variable for paragraphs, case-study prose, resume content, privacy copy, and form help text.
- Technical type: Do not use monospace as the technical voice. Use tabular numerals in Mona Sans or Atkinson for ledgers, dates, metrics, and proof rows.
- Layout bans: No identical icon-card grids, no nested cards, no hero metric template, no terminal aesthetic, no repeated uppercase section eyebrows, no numbered section scaffolding, no beige editorial default, no glassmorphism, no gradient text, no soft ghost-card shadows.
- Motion: Motion should feel like review, assembly, and reveal: annotations settle, screenshots align, and proof artifacts enter with purpose. Content must never depend on animation to appear.
- Visual assets: Generated editorial assets plus sanitized screenshots, optimized through Cloudflare. Generated imagery should be limited and purposeful; screenshots carry most case-study proof.
- Quality gates: Local behavior tests should use Vitest for package and built-site checks; Husky pre-commit plus GitHub Actions verification are tracked in issue #31.

## Design System Snapshot

### Color

Use OKLCH tokens as the starting palette. These may be tuned after browser review, but the color roles should stay stable.

```css
:root {
  --color-bg: oklch(1 0 0);
  --color-surface: oklch(0.965 0.002 260);
  --color-ink: oklch(0.18 0.012 260);
  --color-muted: oklch(0.42 0.018 250);
  --color-rule: oklch(0.88 0.006 260);
  --color-primary: oklch(0.70 0.145 78);
  --color-primary-ink: oklch(0.15 0.015 80);
  --color-mint: oklch(0.78 0.105 160);
  --color-mint-ink: oklch(0.18 0.04 165);
  --color-sky: oklch(0.74 0.09 240);
  --color-sky-ink: oklch(0.18 0.04 245);
  --color-coral: oklch(0.68 0.15 35);
  --color-coral-ink: oklch(1 0 0);
  --color-dark: oklch(0.09 0.006 260);
  --color-dark-surface: oklch(0.14 0.01 260);
}
```

### Typography

Use two open-source families:

- `Mona Sans` variable for display and interface.
- `Atkinson Hyperlegible Next` variable for long-form reading.

Starter tokens:

```css
:root {
  --font-display: "Mona Sans", "Mona Sans Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Atkinson Hyperlegible Next", "Atkinson Hyperlegible Next Fallback", ui-sans-serif, system-ui, sans-serif;

  --text-caption: 0.8125rem;
  --text-small: 0.875rem;
  --text-body: 1rem;
  --text-lead: clamp(1.125rem, 0.35vw + 1.05rem, 1.375rem);
  --text-h3: clamp(1.5rem, 1vw + 1.25rem, 2rem);
  --text-h2: clamp(2.15rem, 2.4vw + 1.5rem, 4rem);
  --text-hero: clamp(3rem, 6vw + 0.25rem, 5.75rem);

  --leading-caption: 1.35;
  --leading-body: 1.62;
  --leading-lead: 1.45;
  --leading-heading: 1.04;
  --leading-dark-body: 1.7;

  --weight-body: 400;
  --weight-medium: 520;
  --weight-heading: 680;
  --weight-hero: 760;
}
```

Implementation rules:

- Self-host fonts from official sources.
- Prefer variable `.woff2` files.
- Preload only critical above-the-fold files.
- Use `font-display: swap` with metric-adjusted fallbacks where practical.
- Keep body copy at 16px or above and cap long-form measure at 65-75ch.

## Public Site Composition

The home should read as a sequence of proof, not a list of feature cards.

Recommended home sequence:

1. Hero: Alejandro-first value proposition, "Start a conversation" CTA, secondary selected work CTA, and one large evidence/artifact composition.
2. Selected outcomes: proof-ledger rows for Casa Roca, The Barber Central, Nutri Plan, and enterprise systems.
3. Architecture stage: dark ink section showing public/private boundaries, deploy path, auth/media/analytics/email responsibilities, and why the site itself is a working sample.
4. Case study preview: horizontal evidence rows with image/screenshot slots, role, constraints, outcome, and link.
5. Engineering practice: agent-assisted workflow, QA discipline, observability, deployment, and documentation as current practice.
6. Contact: form, email, and large but discreet WhatsApp CTA.

Current implementation status: the first real home pass is graph-backed and includes Alejandro-first copy, selected outcome rows, a dark architecture section, engineering practice rows, institutional email, and WhatsApp CTA. The dedicated contact route now owns the full lead capture UI and provider-backed submission path. Future case-study issues should replace proof placeholders with sanitized screenshots and richer detail pages.

Architecture page status: `/architecture` and `/es/arquitectura` now render graph-backed public source framing, public/private boundary copy, Release Train, Environment Contract, Public Content Graph, provider responsibilities, and GitHub source/documentation links.

Case study status: the selected-work index and all primary case-study detail routes now use graph-backed content. Casa Roca, The Barber Central, Nutri Plan, Enterprise Systems, and Engineering Practice carry localized status labels, public-safe evidence, confidentiality notes, and the agreed problem/outcome/role/constraints/architecture/execution/quality structure.

Case study pages should use the same proof-ledger rhythm:

- Problem.
- Business outcome.
- Role.
- Constraints.
- Architecture decisions.
- Execution highlights.
- Quality/security/performance notes.
- Public evidence.
- Confidentiality note.

Resume page status: `/resume` and `/es/cv` now render graph-backed semantic CV content, localized metadata, contact links, dynamic context links, and a downloadable ATS-first PDF artifact. The PDF is generated from the English graph content with `apps/site/scripts/build-resume-pdf.py` and is intentionally single-column and text-based.

Resume pages should remain typography-first, ATS-friendly, and visibly linked to the dynamic site. Do not over-design the resume surface in a way that hurts parsing or readability.

## Implementation Sequence

1. Initialize the Git repo and monorepo in this workspace.
2. Establish the Release Train expectations in documentation, branch protection, baseline verification commands, and GitHub issue scope.
3. Establish the Environment Contract expectations in documentation, issue scope, and future validation gates.
4. Establish the Public Content Graph expectations in documentation, route scope, SEO rules, and future dashboard publishing rules.
5. Establish the Dashboard UI Kit expectations in documentation, dashboard route scope, mobile behavior, and future shadcn/ui adapter rules.
6. Scaffold `apps/site` as the Astro public site with Cloudflare/Wrangler compatibility in mind.
7. Add shared design tokens, font loading, global layout, metadata helpers, i18n routing, sitemap/robots basics, and the home shell.
8. Build public V1 route skeletons in English and Spanish.
9. Implement the first real home page with the approved visual system.
10. Run browser QA for desktop and mobile, then use Impeccable polish on the visible public home.
11. Add case study detail content and resume content.
12. Add contact form integration with Convex and Resend. Current status: implemented with Convex HTTP action, provider adapters, and PostHog safe conversion metadata.
13. Add PostHog analytics and error capture. Current status: implemented for explicit pageviews, selected CTA/form conversion events, fixed-shape browser error capture, disabled autocapture, and documented preview/production Environment Contract values.
14. Add Cloudflare/Wrangler release path. Current status: implemented with Convex deploy before Cloudflare Pages Direct Upload, GitHub Actions release workflow, preview/production Environment Contract validation, Cloudflare Pages project naming, smoke commands, and a versioned Cloudflare Redirect Rules manifest for canonical host redirects.
15. Add dashboard, Better Auth, media management, and private workflows after the public shell proves the design and content direction. Current status: first dashboard guard/shell implemented with Cloudflare Pages functions, Dashboard UI Kit renderers, server-side Better Auth Google sign-in bridge through Convex, admin allowlist checks, noindex/no-store responses, auth-specific Environment Contract targets, lead review backed by private Convex dashboard endpoints, and a metadata-only content/media/settings/resume workflow that preserves Public Content Graph IDs and localized paths. Cloudflare media originals/variants remain a future Media Pipeline decision.
16. Harden privacy, security, and launch readiness. Current status: privacy routes now explain contact data, PostHog analytics/errors, and private project boundaries; Cloudflare Pages `_headers` applies security headers; contact form states distinguish validation, endpoint missing, email/provider, backend, and retry paths; launch QA is documented in `docs/launch-hardening.md`.

Next Impeccable command after this document:

```bash
$impeccable craft AOHYS public site shell
```

## Open Questions
- Exact Cloudflare product choice for media originals versus variants: Cloudflare Images, R2, or both.
- Cloudflare Images activation/account hash for generated media delivery.
- Final business WhatsApp number after Meta verification is complete.
- Exact sanitized screenshots and development URLs to use for The Barber Central and Nutri Plan.
- Whether GitHub Issues can be disabled on `AO-HyS/aohys.com` after repo creation.
