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

The current shell includes the home route, global tokens, font loading, metadata, navigation, footer, and local verification scripts. It is not yet the full public V1 route set.
