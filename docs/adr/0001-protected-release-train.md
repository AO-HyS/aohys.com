# Protected Release Train

Status: accepted

AOHYS uses a protected Release Train where feature branches promote into `develop` for development preview and `develop` promotes into `main` for production. This deliberately avoids direct production pushes because the site is both a public code sample and a business-critical presentation surface; release quality should be visible through review, Cloudflare preview, environment validation, and smoke checks before `aohys.com` changes.

## Considered Options

- Direct commits or PRs into `main`: faster, but too easy for agents or humans to skip preview and production verification.
- Single protected `main` only: simpler, but it loses a shared development state for Cloudflare Preview, dashboard/auth testing, and release rehearsals.
- Protected `develop` plus protected `main`: more process, but it gives clear locality for release rules and a safer promotion path.

## Consequences

- GitHub branch rules must protect both `develop` and `main`.
- Production deploys must come from `main`; development previews must come from pull requests or `develop`.
- Implementation work must treat release scripts, GitHub Actions, Cloudflare configuration, and smoke checks as one Release Train module.
- The current implementation uses `.github/workflows/release-train.yml`, root `deploy:*` and `smoke:*` scripts, and `packages/release-train` to keep the deployment behavior in one place.
