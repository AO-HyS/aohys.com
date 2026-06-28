# AOHYS Public Content Graph

This document defines the Public Content Graph module for `aohys.com`. It exists so Astro routes, localized slugs, SEO metadata, sitemap rules, evidence assets, case studies, resume content, and future dashboard editing all share one stable content model.

## Goal

The Public Content Graph gives the public site one source of truth for what can be rendered, where it lives, which locale variants exist, how it should be indexed, and which evidence supports each claim.

The graph should prevent page-level duplication. A future route should not have to separately invent its content ID, English slug, Spanish slug, canonical URL, language alternates, sitemap eligibility, Open Graph metadata, confidentiality note, and evidence links.

## Module Shape

The Public Content Graph is a deep module. Its interface should stay small: resolve a route, list public routes, load a content node, load a localized variant, and expose SEO/sitemap data.

Its current implementation hides local locale JSON dictionaries behind a TypeScript API. As the project grows, it can also hide Astro content collections, generated resume artifacts, dashboard-managed Convex metadata, media references, draft states, redirects, and future content migrations.

The seam is content resolution. Astro pages, sitemap generation, metadata helpers, case-study templates, resume rendering, and dashboard publishing workflows should cross that seam instead of reading scattered frontmatter or route constants directly.

## Stable Locale Rules

| Locale | Role | Route prefix | Notes |
| --- | --- | --- | --- |
| `en` | Default public language | none | English routes live at canonical root paths like `/architecture`. |
| `es` | Spanish public language | `/es` | Spanish routes live under `/es` with localized slugs. |

Rules:

- English is the default locale.
- Spanish uses the stable `/es` prefix.
- Do not use browser-language redirects for public SEO pages.
- Every localized page should emit canonical and language alternate metadata.
- Missing locale variants should be explicit rather than silently falling back.

## Stable Content IDs

Content IDs are internal and should not change when slugs or titles change.

Initial IDs:

| Content ID | English route | Spanish route | Type |
| --- | --- | --- | --- |
| `home` | `/` | `/es/` | landing page |
| `case-studies` | `/case-studies` | `/es/casos` | index |
| `case-study:casa-roca` | `/case-studies/casa-roca` | `/es/casos/casa-roca` | case study |
| `case-study:the-barber-central` | `/case-studies/the-barber-central` | `/es/casos/the-barber-central` | case study |
| `case-study:nutri-plan` | `/case-studies/nutri-plan` | `/es/casos/nutri-plan` | case study |
| `case-study:enterprise-systems` | `/case-studies/enterprise-systems` | `/es/casos/sistemas-enterprise` | case study |
| `case-study:engineering-practice` | `/case-studies/engineering-practice` | `/es/casos/practica-de-ingenieria` | case study |
| `practice` | `/practice` | `/es/practica` | practice page |
| `architecture` | `/architecture` | `/es/arquitectura` | architecture page |
| `resume` | `/resume` | `/es/cv` | resume page |
| `contact` | `/contact` | `/es/contacto` | contact page |
| `privacy` | `/privacy` | `/es/privacidad` | privacy page |

## Content Node Shape

The implementation can evolve, but every public content node should carry these concepts:

- stable content ID;
- type;
- locale variants;
- localized slug/path;
- title and summary;
- SEO title and description;
- canonical URL;
- language alternates;
- robots/sitemap eligibility;
- draft or published state;
- source boundary classification;
- evidence assets;
- confidentiality note when relevant.

Case-study nodes should additionally carry:

- project status: production proof, active build, private build, enterprise/confidential, or engineering practice;
- problem;
- business outcome;
- role;
- constraints;
- architecture decisions;
- execution highlights;
- quality/security/performance notes;
- public evidence links or assets.

## Sitemap And Robots Rules

Public sitemap eligibility should come from the graph, not from route-file assumptions.

Default public sitemap entries:

- published English public pages;
- published Spanish public pages;
- case-study detail pages with safe public evidence;
- resume page and dynamic resume URL.

Excluded from sitemap:

- `/dashboard` and all private dashboard routes;
- draft content;
- private work details;
- raw media management URLs;
- operational dashboard surfaces;
- future preview-only content.

Robots/noindex behavior should also be graph-driven for public pages and explicitly enforced for private routes.

## Evidence Assets

Evidence assets are references that support public claims: sanitized screenshots, public URLs, generated editorial images, architecture diagrams, PDF artifacts, and source links.

Rules:

- Evidence assets should not expose private data, secrets, private code, or internal client material.
- Screenshots carry most proof; generated images should be purposeful and limited.
- Media storage and optimization stay behind the future Media Pipeline module, while the graph stores usage intent and safe references.
- Alt text is part of the content node or evidence asset metadata, not an afterthought in page markup.

## Dashboard Dependency

The private dashboard may eventually edit case-study content, media metadata, site settings, and resume content. It should not bypass the Public Content Graph. Dashboard workflows should mutate content through a publishing seam that preserves stable IDs, locale variants, SEO fields, sitemap rules, and evidence safety.

## Current Test Surface

The Public Content Graph is tested with Vitest through route and metadata behavior:

- stable content IDs resolve to English and Spanish paths;
- route paths resolve back to graph nodes;
- SEO metadata includes canonical and language alternate data;
- sitemap entries come from graph eligibility;
- `/dashboard` and private routes are excluded;
- missing locale variants fail explicitly.

Astro route smoke tests consume the built site output instead of using ad hoc Node assertions. Later tracers should cover richer case-study content shape, resume/PDF relationships, evidence asset safety, and dashboard publishing invariants.

The current home tracer also uses the graph for the public proof narrative: selected outcomes resolve to localized case-study paths, evidence entries carry public-safe labels and accessible text, and the contact CTA keeps the institutional email plus WhatsApp path in the same locale-aware content seam.

The architecture page also resolves its public source framing through the graph. Its content owns the public/private boundary note, source links, Release Train, Environment Contract, Public Content Graph, and provider responsibility sections for English and Spanish routes.

Casa Roca is the first complete graph-backed case study. `case-study:casa-roca` owns its localized status label, overview, problem, business outcome, role, constraints, architecture decisions, execution highlights, quality/security/performance notes, public evidence link, alt text, and confidentiality note. Case-study routes without complete detail content continue to render skeleton route pages until their public-safe content is added.

The selected-work index is also graph-backed. It resolves Casa Roca, The Barber Central, Nutri Plan, Enterprise Systems, and Engineering Practice from stable case-study IDs, localized paths, explicit project statuses, public-safe evidence labels, and the same confidentiality-aware detail shape.
