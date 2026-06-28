# Public Content Graph

Status: accepted

AOHYS uses a Public Content Graph with stable content IDs, explicit locale variants, localized slugs, metadata rules, sitemap eligibility, and evidence relationships. This is deliberate because the public site must be bilingual, SEO-friendly, dashboard-editable later, and credible as a public code sample; scattering route metadata across individual Astro pages would make i18n and SEO shallow and fragile.

## Considered Options

- File-system routes as the only source of truth: simple at first, but slugs, metadata, alternates, sitemap rules, and case-study evidence would duplicate across files.
- Headless CMS first: powerful, but too much provider complexity before the public shell proves the content model.
- Public Content Graph first: more upfront modeling, but it gives route generation, SEO, case-study templates, resume content, and dashboard publishing one seam.

## Consequences

- Public routes should resolve from stable content IDs instead of hard-coded page assumptions.
- English and Spanish paths can change without changing internal content identity.
- Sitemap, canonical URLs, language alternates, dashboard exclusion, and evidence safety should be graph-driven.
- Future dashboard content workflows must preserve graph invariants instead of mutating isolated page files.
