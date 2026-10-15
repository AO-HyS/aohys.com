# @aohys/release-train

Release Train verification package.

This package owns the small public interface for deployment planning and release-time environment validation. Root scripts and GitHub Actions use it so feature work does not need to duplicate Cloudflare Pages branch names, project names, canonical URLs, or release-target contract checks.

## Public API

- `buildCloudflarePagesDeployPlan(environment)` returns the Cloudflare Pages Direct Upload command shape for `preview` or `production`.
- `validateReleaseEnvironment(environment, values)` validates the Environment Contract for deploy-time values and rejects obvious target drift.

## Release Targets

| Environment  | Branch    | Site URL                    | Cloudflare project |
| ------------ | --------- | --------------------------- | ------------------ |
| `preview`    | `develop` | `https://preview.aohys.com` | `aohys-com`        |
| `production` | `main`    | `https://aohys.com`         | `aohys-com`        |

Both environments use `https://aohys.com` as the rendered canonical URL for public SEO pages.
Preview smoke checks run against the unique Cloudflare Pages deployment URL emitted by Wrangler, such as `https://ff7ed5fa.aohys-com.pages.dev`, because branch deployments are available immediately even when a custom preview subdomain is not. Without `SMOKE_BASE_URL`, smoke uses the target's `liveUrl`: `https://develop.aohys-com.pages.dev` for preview and `https://aohys.com` for production.

Root commands:

```sh
pnpm run release:env:preview
pnpm release preview
pnpm run smoke:preview
pnpm run release:env:production
pnpm release production
pnpm run smoke:production
```

`pnpm release <preview|production>` (`scripts/release.ts`) runs the steps of `buildReleasePlan(environment)` in order and stops at the first failure: validate the Environment Contract, audit the production-only PostHog boundary, sync the runtimes, deploy Convex with the matching `CONVEX_DEPLOY_KEY`, apply published content, build `apps/site`, and deploy Cloudflare Pages with Wrangler (production also reconciles the canonical domain). `--plan` prints the steps without running them.

Domain-level redirects are represented in `cloudflare/redirect-rules.json`, not Cloudflare Pages `_redirects`.
