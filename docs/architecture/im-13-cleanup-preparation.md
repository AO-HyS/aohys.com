# IM-13 cleanup execution record

This record closes the one explicitly approved IM-13 removal. It binds source-derived evidence, the reviewed pre-removal commit, a verified content-addressed backup, and the user's exact approval to `packages/dashboard-ui/tsconfig.json`. It does not authorize any other deletion, provider change, merge, or release promotion.

## Reproduce the evidence

Run from the repository root:

```sh
node scripts/architecture/im13-cleanup-evidence.mjs
```

The command fails if the registry and checklist drift, a blocked source disappears without review, the removed surface reappears, a production reference appears, the exact authorization binding changes, or any remaining approval is opened in source control.

Against reviewed pre-removal commit `a7074783231871f69f972779245160633b411a7c`, only `packages/dashboard-ui/tsconfig.json` passed the zero-use checks. The user explicitly approved that path on 2026-08-23, it was removed from the repository and from the live compatibility registry, and the post-removal evidence now proves it remains absent. The other fifteen entries remain active or lack the runtime, traffic, or successor evidence required by their retirement conditions.

## Per-element approval checklist

The machine-readable checklist is [im-13-cleanup-gate.json](./im-13-cleanup-gate.json). Every row is deliberately closed.

| Registry element                          | Current gate                                                          | Human approval |
| ----------------------------------------- | --------------------------------------------------------------------- | -------------- |
| `dashboard-alias:/dashboard/case-studies` | Blocked: mounted alias; inbound use and successor unproven            | Not granted    |
| `dashboard-alias:/dashboard/media`        | Blocked: mounted alias; inbound use and successor unproven            | Not granted    |
| `public-redirect:/blog`                   | Blocked: published redirect; traffic/SEO obligation unproven          | Not granted    |
| `public-redirect:/agents`                 | Blocked: published redirect; traffic/SEO obligation unproven          | Not granted    |
| `public-redirect:/pricing`                | Blocked: published redirect; traffic/SEO obligation unproven          | Not granted    |
| `public-redirect:/es/blog`                | Blocked: published redirect; traffic/SEO obligation unproven          | Not granted    |
| `public-redirect:/es/agentes`             | Blocked: published redirect; traffic/SEO obligation unproven          | Not granted    |
| `public-redirect:/es/precios`             | Blocked: published redirect; traffic/SEO obligation unproven          | Not granted    |
| `public-redirect:/blog/*`                 | Blocked: published redirect; nested traffic/SEO obligation unproven   | Not granted    |
| `public-redirect:/es/blog/*`              | Blocked: published redirect; nested traffic/SEO obligation unproven   | Not granted    |
| `site-renderer:dashboard-sign-in`         | Blocked: live call; approved successor absent                         | Not granted    |
| `site-renderer:dashboard-state`           | Blocked: live calls; approved successor absent                        | Not granted    |
| `site-renderer:dashboard-app-shell`       | Blocked: live call; approved successor absent                         | Not granted    |
| `pages-entry:dashboard-renderer`          | Blocked: active Pages entry; approved successor absent                | Not granted    |
| `pages-entry:dashboard-fallback`          | Blocked: active catch path; approved successor absent                 | Not granted    |
| `package-surface:dashboard-ui-empty`      | Removed: one hashed file, zero production references, verified backup | Granted        |

No additional facade is a cleanup candidate. A future proposal must first add the facade to the compatibility registry with an owner, retirement condition, current zero-use evidence, backup target, rollback, and its own explicit approval.

## Authorization, backup, and rollback

The approved removal is bound to:

- Registry ID: `package-surface:dashboard-ui-empty`
- Target: `packages/dashboard-ui/tsconfig.json`
- Reviewed pre-removal SHA: `a7074783231871f69f972779245160633b411a7c`
- User statement: `Apruebo eliminar packages/dashboard-ui/tsconfig.json`
- Durable manifest: `/Users/corrortiz/.development-system/private/backups/aohys-architecture-convergence/im-13/a7074783231871f69f972779245160633b411a7c/manifest.json`
- Manifest SHA-256: `b5e3bd8613920dd34c81f2121c0e29e4cee0499336f00c996d9ce81e209df39b`
- Backed-up file SHA-256: `51cf1053c97d69ea5ce4da06990c8e92ccc519de3b305463609761430fc553fd`

Verify the durable backup at any time with:

```sh
node scripts/architecture/im13-cleanup-evidence.mjs --verify-backup /Users/corrortiz/.development-system/private/backups/aohys-architecture-convergence/im-13/a7074783231871f69f972779245160633b411a7c
```

If the integrated cleanup later fails its build or smoke checks, revert the IM-13 cleanup commit. For emergency file-only recovery, the reviewed source remains available:

```sh
git restore --source=a7074783231871f69f972779245160633b411a7c -- packages/dashboard-ui/tsconfig.json
pnpm quality:changed
```

File-only recovery deliberately makes the post-removal architecture evidence fail until the registry, policy, and tests are rolled back together. Approval of this row never approves another row; the top-level gate remains closed.
