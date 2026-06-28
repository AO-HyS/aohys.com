# Design

This is a starter design context for the AOH&S site. It is not a final token system. Re-run or revise this document after the first real Astro pages, dashboard shell, and media assets exist.

## Register

brand

## Design Intent

The public site should feel like a senior engineering review translated into a memorable brand surface: precise, architectural, outcome-driven, and evidence-led. It should avoid the default "developer portfolio" and the default "SaaS landing page". The visitor should remember the judgment behind the work, not a list of tools.

Physical scene: a product architecture review on a clean white drafting table, with redline decisions, screenshots, system maps, and deployment proof arranged like evidence.

## Color Strategy

Use a full-palette brand system with restrained application. The surface stays clean and high-contrast, but the brand should feel optimistic, precise, and human instead of black-white-red or monochrome. Color appears as proof marks, CTA fills, system paths, section signals, focus states, and small architectural annotations. Do not create a warm cream or beige editorial page.

Primary direction: honey + mint on white for the public site, with dark ink + pastel signal for architecture sections.

Starter OKLCH palette:

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

The updated seed color came from Impeccable seed `seed-149`: `oklch(0.600 0.124 70.0)`. Keep the primary hue in the honey/amber family, but tune lightness/chroma so it reads as optimistic and professional rather than warning-orange. Mint is for architecture/system flow, sky is for links and informational states, coral is for rare emphasis, and dark ink is for high-contrast technical sections.

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

Generated assets should show:

- Business goals becoming product systems.
- Architecture, workflows, deploy paths, and decision maps.
- Case-specific context for Casa Roca, The Barber Central, Nutri Plan, enterprise systems, and modern engineering practice.

Screenshots should be sanitized, cropped, and staged as proof. They should never expose private data, secrets, or accidental internal material.

Media architecture: Cloudflare stores and optimizes images; Convex stores metadata and references only.

## Motion

Motion should feel like review, assembly, and reveal: annotations settle, screenshots align, proof artifacts enter with purpose. Do not gate content behind animation. Reduced motion must be supported.

Use motion sparingly:

- One strong first-load composition.
- Small state transitions for navigation, language switching, and dashboard interactions.
- No bounce, elastic, or generic fade-on-scroll everywhere.

## Components And Surfaces

Public site:

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
