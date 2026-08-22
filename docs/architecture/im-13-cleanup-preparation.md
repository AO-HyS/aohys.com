# IM-13 cleanup preparation

This is a preparation gate, not removal authorization. It records source-derived evidence, creates a content-addressed backup, and keeps approval closed for every compatibility-registry entry. Nothing in this document authorizes deleting a path, changing a provider, or promoting a release.

## Reproduce the evidence

Run from the repository root:

```sh
node scripts/architecture/im13-cleanup-evidence.mjs
```

The command fails if the registry and checklist drift, a blocked source disappears without review, the empty surface gains or loses a tracked file, its known hash changes, a package manifest appears, a production reference appears, or any approval is opened in source control.

Against baseline commit `619ec0df5b08edebbde0f78db248fabbf59971e2` and the current worktree, only `packages/dashboard-ui/tsconfig.json` passes the zero-use checks. It remains merely **eligible for human review**. The other fifteen entries are active or missing the runtime/traffic/successor evidence required by their retirement conditions.

## Per-element approval checklist

The machine-readable checklist is [im-13-cleanup-gate.json](./im-13-cleanup-gate.json). Every row is deliberately closed.

| Registry element                          | Current gate                                                              | Human approval |
| ----------------------------------------- | ------------------------------------------------------------------------- | -------------- |
| `dashboard-alias:/dashboard/case-studies` | Blocked: mounted alias; inbound use and successor unproven                | Not granted    |
| `dashboard-alias:/dashboard/media`        | Blocked: mounted alias; inbound use and successor unproven                | Not granted    |
| `public-redirect:/blog`                   | Blocked: published redirect; traffic/SEO obligation unproven              | Not granted    |
| `public-redirect:/agents`                 | Blocked: published redirect; traffic/SEO obligation unproven              | Not granted    |
| `public-redirect:/pricing`                | Blocked: published redirect; traffic/SEO obligation unproven              | Not granted    |
| `public-redirect:/es/blog`                | Blocked: published redirect; traffic/SEO obligation unproven              | Not granted    |
| `public-redirect:/es/agentes`             | Blocked: published redirect; traffic/SEO obligation unproven              | Not granted    |
| `public-redirect:/es/precios`             | Blocked: published redirect; traffic/SEO obligation unproven              | Not granted    |
| `public-redirect:/blog/*`                 | Blocked: published redirect; nested traffic/SEO obligation unproven       | Not granted    |
| `public-redirect:/es/blog/*`              | Blocked: published redirect; nested traffic/SEO obligation unproven       | Not granted    |
| `site-renderer:dashboard-sign-in`         | Blocked: live call; approved successor absent                             | Not granted    |
| `site-renderer:dashboard-state`           | Blocked: live calls; approved successor absent                            | Not granted    |
| `site-renderer:dashboard-app-shell`       | Blocked: live call; approved successor absent                             | Not granted    |
| `pages-entry:dashboard-renderer`          | Blocked: active Pages entry; approved successor absent                    | Not granted    |
| `pages-entry:dashboard-fallback`          | Blocked: active catch path; approved successor absent                     | Not granted    |
| `package-surface:dashboard-ui-empty`      | Eligible for human review: one hashed file and zero production references | Not granted    |

No additional facade is a cleanup candidate. A future proposal must first add the facade to the compatibility registry with an owner, retirement condition, current zero-use evidence, backup target, rollback, and its own explicit approval.

## Backup and rollback gate

Before requesting approval, create a new backup directory outside the repository and verify it:

```sh
backup_dir="$(mktemp -d /tmp/aohys-im13-backup.XXXXXX)"
node scripts/architecture/im13-cleanup-evidence.mjs --prepare-backup "$backup_dir"
node scripts/architecture/im13-cleanup-evidence.mjs --verify-backup "$backup_dir"
```

The backup operation refuses to overwrite an existing backup file. Its manifest binds the repository HEAD, relative path, byte count, and SHA-256 while retaining `destructiveExecutionAuthorized: false`.

If a later, separately approved removal fails its post-removal build or smoke checks, restore from the reviewed pre-removal commit:

```sh
git restore --source=<reviewed-pre-removal-sha> -- packages/dashboard-ui/tsconfig.json
node scripts/architecture/im13-cleanup-evidence.mjs
pnpm quality:changed
```

The human approval must name the single registry ID, target path, evidence-report HEAD, verified backup manifest path and hash, and reviewed pre-removal SHA. Approval of one row never approves another row.
