# @aohys/content-graph

Public Content Graph implementation package for `aohys.com`.

Astro routes, sitemap generation, metadata helpers, resume rendering, case-study templates, and dashboard publishing workflows should cross this seam instead of duplicating content identity or route rules.

## What It Owns

- stable public content IDs;
- English and Spanish route paths;
- canonical URLs and language alternates;
- localized titles, summaries, SEO titles, and SEO descriptions;
- graph-backed home narrative, selected outcomes, public link/media labels, and contact CTA data;
- graph-backed architecture/source-framing content and source documentation links;
- graph-backed selected-work index entries with status labels and localized paths;
- graph-backed case-study detail content, public links/media, and confidentiality notes;
- graph-backed resume content, contact links, dynamic context links, and PDF artifact metadata;
- sitemap eligibility;
- private dashboard route exclusions;
- explicit failures when a locale variant is missing.

## Public API

- `getPublicRouteMap()` lists all public route variants.
- `resolvePublicPath(pathname)` resolves a URL path to its graph route or returns `null` for unknown/private paths.
- `getLocalizedPath(contentId, locale)` returns the route path for a stable content ID.
- `getSharedI18n(locale)` returns shared graph, dashboard, backend, and publication-bridge labels from typed locale catalogs.
- `getAlternateLocale(locale)` and `getLocalizedCaseStudyPath(locale, slug)` centralize locale routing decisions.
- `getHomePageContent(locale)` returns the localized home narrative with graph-backed case-study paths.
- `getArchitecturePageContent(locale)` returns the localized architecture page framing and source links.
- `getCaseStudyIndexContent(locale)` returns the localized selected-work index entries.
- `getCaseStudyPageContent(contentId, locale)` returns localized case-study detail content when a case study has a complete public page.
- `getResumePageContent(locale)` returns localized semantic resume content and the PDF artifact relationship.
- `getSeoMetadata(contentId, locale)` returns canonical, alternates, robots, title, and description.
- `getSitemapEntries()` returns graph-approved sitemap entries.

The first consumer is `apps/site`, but future dashboard publishing should preserve these invariants instead of writing isolated Astro routes.

Canonical public content lives in JSON dictionaries under `src/locales`; shared application labels live under `src/i18n`. Consumers must select copy through these typed catalogs instead of locale-driven ternaries or `if` branches. Tests are written with Vitest and cover route resolution, localized paths, shared labels, SEO metadata, sitemap entries, private route exclusions, and missing locale failures.
