# Design

This is a starter design context for the AOH&S site. It is not a final token system. Re-run or revise this document after the first real Astro pages, dashboard shell, and media assets exist.

## Register

brand

## Design Intent

The public site should feel like a senior engineering review translated into a memorable brand surface: precise, architectural, outcome-driven, and evidence-led. It should avoid the default "developer portfolio" and the default "SaaS landing page". The visitor should remember the judgment behind the work, not a list of tools.

Physical scene: a sunlit product stage in a small, beautifully made theatre. Real project evidence sits inside a fixed proscenium; olive doors close, the set changes behind them, and the doors reopen on the next project. Honey rails, apricot tickets, brown ink, screenshots, decisions, and release proof make the work feel tangible without turning it into a theme park.

## Color Strategy

Use a full-palette brand system with restrained application. The surface stays clean and high-contrast, but the brand should feel optimistic, precise, and human instead of black-white-red or monochrome. Color appears as proof marks, CTA fills, system paths, section signals, focus states, and small architectural annotations. Do not create a warm cream or beige editorial page.

Primary direction: honey + olive + apricot on neutral white, with brown ink for text, structure, and dark surfaces. The palette is warm, optimistic, slightly retro-modern, and playful without becoming childish. Honey carries primary actions and active rails. Olive carries stage doors, supportive fields, and positive states. Apricot carries hover, proof, and human energy. Brown ink replaces black, navy, and cold technical blue.

Starter OKLCH palette:

```css
:root {
  --color-bg: oklch(1 0 0);
  --color-surface: oklch(0.975 0.008 122);
  --color-ink: oklch(0.3649 0.0215 61.4); /* #473C33 */
  --color-muted: oklch(0.50 0.025 61.4);
  --color-rule: oklch(0.86 0.025 80);
  --color-primary: oklch(0.8623 0.1290 80); /* #FEC868 */
  --color-primary-ink: oklch(0.3649 0.0215 61.4);
  --color-secondary: oklch(0.7779 0.1104 121.8); /* #ABC270 */
  --color-secondary-ink: oklch(0.30 0.025 61.4);
  --color-accent: oklch(0.8008 0.1283 55.5); /* #FDA769 */
  --color-accent-ink: oklch(0.30 0.025 61.4);
  --color-dark: oklch(0.3649 0.0215 61.4);
  --color-dark-surface: oklch(0.31 0.022 61.4);
  --color-dark-ink: oklch(0.98 0.006 80);
}
```

The approved source colors came from the user's July 2026 palette reference. Preserve their relationships and recognizable hex equivalents: olive `#ABC270`, honey `#FEC868`, apricot `#FDA769`, and brown ink `#473C33`. Use neutral white for breathing room; occasional pale fields may be tinted subtly toward olive, but the page must not become cream, sand, or beige.

Approved palette contract (July 2026):

- Honey is the unmistakable primary brand color.
- Olive is the structural and motion color: doors, rails, selection, and supportive surfaces.
- Apricot is an accent for proof, hover, tickets, and human warmth.
- Brown ink carries body text, rules, diagrams, and dark sections.
- Blue, navy, cyan, purple, violet, and mint are not brand colors.
- Near-white stays neutral; warmth comes from the palette, not a cream page background.

## Typography

Avoid default tech fonts and training-data portfolio choices. Do not use Inter, IBM Plex, Space Grotesk, Playfair, Cormorant, Fraunces, Newsreader, or similar reflex picks.

Brand voice words for type: architectural, sunny, exact.

Use two open-source families:

- Display and interface: Mona Sans variable. It should carry hero headings, navigation, CTAs, case-study titles, architecture labels, and proof-ledger headings. Use its weight and width range for hierarchy instead of adding a mono costume.
- Body and long-form reading: Atkinson Hyperlegible Next variable. It should carry paragraphs, case-study prose, resume content, privacy copy, and form help text.

Do not use a monospace family as the default technical voice. For ledgers, metrics, dates, and proof rows, use tabular numerals inside Mona Sans or Atkinson instead of changing typeface.

Starter type tokens:

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

Role rules:

- Hero: Mona Sans, `--text-hero`, `--weight-hero`, line-height `--leading-heading`, letter-spacing `-0.03em`, `text-wrap: balance`, max width around 12-14ch when possible.
- H2: Mona Sans, `--text-h2`, `--weight-heading`, letter-spacing `-0.025em`, line-height `1.05`, `text-wrap: balance`.
- H3: Mona Sans, `--text-h3`, `--weight-heading`, letter-spacing `-0.015em`, line-height `1.12`.
- Lead copy: Atkinson Hyperlegible Next, `--text-lead`, weight 400, line-height `--leading-lead`, max width 58-64ch.
- Body: Atkinson Hyperlegible Next, `--text-body`, line-height `--leading-body`, max width 65-75ch.
- Captions, annotations, and nav: Mona Sans, `--text-caption` or `--text-small`, weight 520-620. Use normal letter spacing unless text is all caps; avoid repeated uppercase section eyebrows.
- Proof ledgers and metrics: use `font-variant-numeric: tabular-nums;` and `font-feature-settings: "tnum" 1;`.
- Dark architecture sections: keep the same families, increase body line-height to `--leading-dark-body`, and use slightly heavier body text if needed for perceived weight.

Loading rules:

- Self-host fonts from official sources during implementation; do not rely on a third-party runtime font CDN for the production site.
- Prefer variable `.woff2` files and subset if practical.
- Preload only critical above-the-fold weights/files.
- Use `font-display: swap` with metric-adjusted fallbacks, or Astro/Fontaine-style fallback metrics if the implementation stack supports it.
- Keep total public font families to these two unless a later critique proves the system needs more contrast.

## Layout

The home should read as a sequence of evidence, not a grid of cards.

Use:

- Large hero with outcome-focused copy and a strong evidence/art composition.
- Case study rows or editorial spreads, not identical cards.
- Screenshots and generated assets staged as proof artifacts.
- Dark or high-contrast architecture sections where the system view needs emphasis.
- Clear public/private separation in navigation and metadata.
- Generous rhythm: tight clusters for facts, larger gaps for conceptual transitions.

Avoid:

- Nested cards.
- Hero metric templates.
- Icon-card feature grids.
- Section labels repeated above every heading.
- Large rounded cards and soft ghost-card shadows.
- Decorative diagrams that do not explain anything.

## Imagery

The visual system should use generated editorial assets and sanitized screenshots together.

Generated assets, when they are genuinely needed, should show:

- Business goals becoming product systems.
- Architecture, workflows, deploy paths, and decision maps.
- Case-specific context for Casa Roca, The Barber Central, Nutri Plan, enterprise systems, and modern engineering practice.

Screenshots should be sanitized, cropped, and staged as proof. They should never expose private data, secrets, or accidental internal material.

Media architecture: Cloudflare stores and optimizes images; Convex stores metadata and references only.

## Motion

Motion should feel like a well-made product theatre: the stage stays put while the set changes. Project selection closes two olive doors over the current scene, swaps the real project content behind them, and reopens to reveal the next scene. The active ticket travels along a honey rail; proof stamps and annotations settle only after the reveal. Do not navigate away or replace the surrounding layout when switching projects. Do not gate content behind animation. Reduced motion must be supported.

Use motion sparingly:

- One strong first-load composition in which the stage assembles without delaying readable content.
- Door transitions use transform and clip-path, never animated layout properties. Closing, content swap, and opening form one short sequence; rapid selections are safely serialized or coalesced.
- Project selection remains keyboard- and touch-operable with correct tab semantics and announced state.
- Reduced motion replaces the door travel with an immediate content swap and a short crossfade.
- Small state transitions support navigation, language switching, proof tickets, and dashboard interactions.
- No bounce, elastic, or generic fade-on-scroll everywhere.

## Components And Surfaces

Public site:

- Global shell: compact sticky header, neutral white canvas, brown rules, honey primary action, and page-specific stage treatment.
- Home stage: data-driven project selector using published Content Graph entries and Cloudflare media; the doors close and reopen in place when selection changes.
- Project archive and case studies: ticket/rail navigation and evidence-led editorial rows, not identical cards.
- Architecture and practice: production-line sequencing that connects business pressure, decisions, implementation, verification, and release.
- Resume, contact, privacy, and legal pages: quieter compositions using the same palette, typography, controls, and proof language rather than a separate visual theme.
- Primary CTA: "Start a conversation" / "Hablemos".
- Secondary CTA: "View selected work" / equivalent Spanish copy.
- WhatsApp CTA: large but discreet, integrated into contact.
- Case study detail sections: problem, business outcome, role, constraints, architecture decisions, execution highlights, quality/security/performance, public evidence, confidentiality note.
- Architecture page: public code sample framing, not open-source community framing.

Dashboard:

- Private route: `/dashboard`.
- Language: English.
- Sections: Overview, Leads, Case studies, Media, Site settings, Resume.
- Overview is operational and checklist-driven, not an analytics dashboard.
- PostHog owns analytics and errors; do not duplicate event dashboards in the app.

## Bans For This Project

- Do not make the hero about React, Next.js, Convex, Cloudflare, Vercel, AWS, or any stack name.
- Do not describe the repo as an open-source community product.
- Do not imply client or product code is public.
- Do not use terminal aesthetics as shorthand for engineering quality.
- Do not use beige editorial restraint as the default.
- Do not use generic AI illustrations, glassmorphism, gradient text, or soft bordered shadow cards.
- Do not use cold corporate blue, navy, purple, violet, cyan, or mint as brand colors.
- Do not turn the stage into skeuomorphic machinery, a theme park, or a collection of fake dashboards. Real content and screenshots remain the evidence.
- Do not navigate to a new route when a visitor changes the active project inside the home stage.
