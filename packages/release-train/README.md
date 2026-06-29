# @aohys/release-train

Release Train verification package.

This package owns the small public interface for deployment planning and release-time environment validation. Root scripts and GitHub Actions use it so feature work does not need to duplicate Cloudflare Pages branch names, project names, or canonical URLs.

## Public API

- `buildCloudflarePagesDeployPlan(environment)` returns the Cloudflare Pages Direct Upload command shape for `preview` or `production`.
- `validateReleaseEnvironment(environment, values)` validates the Environment Contract for deploy-time values and rejects obvious target drift.

## Release Targets

| Environment | Branch | Site URL | Cloudflare project |
| --- | --- | --- | --- |
| `preview` | `develop` | `https://preview.aohys.com` | `aohys-com` |
| `production` | `main` | `https://aohys.com` | `aohys-com` |

Both environments use `https://aohys.com` as the rendered canonical URL for public SEO pages.

Root commands:

```sh
pnpm run release:env:preview
pnpm run deploy:preview
pnpm run smoke:preview
pnpm run release:env:production
pnpm run deploy:production
pnpm run smoke:production
```

Domain-level redirects are represented in `cloudflare/redirect-rules.json`, not Cloudflare Pages `_redirects`.
