# AOHYS Site Context

This context names the project concepts that should stay stable across the public site, private dashboard, deployment process, and documentation.

## Language

**Public Source Site**:
The public `aohys.com` codebase that visitors and technical evaluators can inspect as a working sample of AOHYS engineering standards.
_Avoid_: Open-source product, community OSS project, React portfolio

**Private Work**:
Client, employer, product, lead, operational, and dashboard material that is not public even when the site source is public.
_Avoid_: Hidden open source, unpublished repo content

**Release Train**:
The project release path that moves work from feature branches to development preview and then to production through protected promotion steps.
_Avoid_: Direct deploy, manual production push, branch convention

**Development Branch**:
The protected `develop` branch that represents the shared development environment and preview deployment target.
_Avoid_: Staging branch, test branch

**Production Branch**:
The protected `main` branch that represents the production source of truth for `aohys.com`.
_Avoid_: Master, live branch

**Preview Deployment**:
A Cloudflare deployment used to verify a pull request or the `develop` branch before production promotion.
_Avoid_: Temporary production, local preview

**Production Deployment**:
The Cloudflare deployment served from the Production Branch after the release gate passes.
_Avoid_: Final preview, manual upload

**Promotion**:
The act of moving already-reviewed work from one protected release state to the next.
_Avoid_: Push, sync, publish

**Smoke Check**:
A short verification pass that proves the externally visible behavior of a deployment before the release is considered healthy.
_Avoid_: Full test suite, manual glance

**Environment Contract**:
The shared agreement for environment names, public variables, secrets, provider wiring, and validation across local, preview, and production.
_Avoid_: Env notes, secret checklist

**Local Environment**:
The developer-machine environment used for local implementation and verification without production secrets.
_Avoid_: Development branch, local production

**Preview Environment**:
The non-production deployment environment used to verify pull requests and the Development Branch before production promotion.
_Avoid_: Staging if it means a separate product stage, temporary production

**Production Environment**:
The live deployment environment for the canonical `aohys.com` public site and private dashboard.
_Avoid_: Live preview, main environment

**Public Content Graph**:
The stable map of public content identities, locales, routes, metadata, sitemap eligibility, and evidence relationships.
_Avoid_: Page list, route config

**Dashboard UI Kit**:
The private dashboard module that presents AOHYS-specific workflow surfaces while using lower-level UI primitives as implementation details.
_Avoid_: shadcn screens, component dump
