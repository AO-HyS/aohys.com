# @aohys/content-graph

Public Content Graph implementation package for `aohys.com`.

Astro routes, sitemap generation, metadata helpers, resume rendering, case-study templates, and dashboard publishing workflows should cross this seam instead of duplicating content identity or route rules.

## What It Owns

- stable public content IDs;
- English and Spanish route paths;
- canonical URLs and language alternates;
- localized titles, summaries, SEO titles, and SEO descriptions;
- graph-backed home proof narrative, selected outcomes, evidence labels, and contact CTA data;
- graph-backed architecture/source-framing content and source documentation links;
- sitemap eligibility;
- private dashboard route exclusions;
- explicit failures when a locale variant is missing.

## Public API

- `getPublicRouteMap()` lists all public route variants.
- `resolvePublicPath(pathname)` resolves a URL path to its graph route or returns `null` for unknown/private paths.
- `getLocalizedPath(contentId, locale)` returns the route path for a stable content ID.
- `getHomePageContent(locale)` returns the localized home proof narrative with graph-backed case-study paths.
- `getArchitecturePageContent(locale)` returns the localized architecture page framing and source links.
- `getSeoMetadata(contentId, locale)` returns canonical, alternates, robots, title, and description.
- `getSitemapEntries()` returns graph-approved sitemap entries.

The first consumer is `apps/site`, but future dashboard publishing should preserve these invariants instead of writing isolated Astro routes.

Current locale content lives in JSON dictionaries under `src/locales`. Tests are written with Vitest and cover route resolution, localized paths, SEO metadata, sitemap entries, private route exclusions, and missing locale failures.
