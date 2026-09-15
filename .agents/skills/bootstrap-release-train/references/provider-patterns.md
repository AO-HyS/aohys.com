# Provider adapter patterns

## Cloudflare plus Convex owned by GitHub Actions

Keep the existing sequence unless provider documentation or runtime evidence proves it wrong:

1. Resolve Preview or Production environment.
2. Checkout the trusted protected-branch SHA.
3. Install the pinned package manager and dependencies.
4. Validate environment contracts without printing values.
5. For preview, sync/deploy Convex and seed only explicit QA data when already supported.
6. Build and deploy selected Cloudflare Pages or Worker surfaces.
7. Run provider and HTTP smoke checks.
8. Publish URL/deployment evidence.

Do not run repository lint, typecheck, unit tests, React Doctor, or browser QA here. A build required to produce the Cloudflare artifact is still allowed.

For production, preserve backend-before-frontend ordering when the frontend depends on newly deployed Convex functions.

## Vercel Git integration owns deployment

Do not add `vercel deploy` to GitHub Actions when the Git integration already deploys commits.

- Let Vercel publish PR/develop previews and production from its configured production branch.
- Keep GitHub Actions limited to the release-path policy or a tiny ownership marker if the repository needs a stable check.
- Verify Vercel's native branch deployment status and GitHub deployment record; do not duplicate their commit association in a second SHA gate.
- Retrieve `environment_url` from GitHub deployments and perform a read-only HTTP smoke when accessible.
- Treat Vercel SSO/protection redirects as an access boundary, not a failed deployment, when Vercel itself reports Ready.

If GitHub cannot start even a policy job because of billing, report that separately. Do not disguise it with code changes or add a runner label that is not installed for the repository owner.

## Existing non-Cloudflare provider workflow

Preserve the provider's working deploy job. Remove only duplicated quality phases after proving the equivalent local commands pass from a clean checkout. Keep provider setup, artifact creation, deployment, environment scoping, rollback hooks, and smoke checks.

## Mobile artifacts

Retain a mobile artifact path only when the audit finds an active workflow command such as:

- Gradle assemble/bundle plus APK/AAB upload;
- `xcodebuild archive` or an IPA export/upload;
- an existing Expo/EAS build;
- a repository-owned mobile artifact script invoked by Actions.

Keep artifact builds out of ordinary feature PR policy. Prefer protected-branch push, tag, release, or explicit manual dispatch according to the existing contract.

Source validation is not artifact generation. If the repo only runs native source checks locally, preserve those checks in `quality:push` and do not invent signing, TestFlight, Play Store, or release credentials.

## No deployment owner detected

Install the local quality boundary and generate a policy-only workflow, but do not fabricate a deployment. Report the missing provider decision and the exact evidence needed to continue.
