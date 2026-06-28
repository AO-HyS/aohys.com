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

The current shell includes the graph-backed home proof narrative, bilingual route skeletons, global tokens, font loading, graph-backed metadata, navigation, footer, sitemap, robots output, Astro native i18n config, and Vitest route/build smoke checks. It is not yet the full public V1 content experience.

UI copy that belongs to the shell lives in locale JSON files under `src/i18n`. Public page identity, localized slugs, SEO metadata, and sitemap eligibility come from `@aohys/content-graph`.
