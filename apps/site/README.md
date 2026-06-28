# @aohys/site

Astro public site for `aohys.com`.

This surface owns public SEO pages, bilingual routes, metadata rendering, sitemap output, and the Impeccable-crafted public shell. Public routes should consume the Public Content Graph instead of defining content identity ad hoc in route files.

## Commands

```sh
pnpm --filter @aohys/site dev
pnpm --filter @aohys/site lint
pnpm --filter @aohys/site typecheck
pnpm --filter @aohys/site test
pnpm --filter @aohys/site build
```

Regenerate the ATS-friendly resume PDF after editing English resume graph content:

```sh
python3 apps/site/scripts/build-resume-pdf.py
```

The current shell includes the graph-backed home proof narrative, selected-work index, case-study detail pages, resume page, ATS PDF artifact, bilingual route skeletons, global tokens, font loading, graph-backed metadata, navigation, footer, sitemap, robots output, Astro native i18n config, and Vitest route/build smoke checks.

UI copy that belongs to the shell lives in locale JSON files under `src/i18n`. Public page identity, localized slugs, SEO metadata, and sitemap eligibility come from `@aohys/content-graph`.
