# AOHYS Issue Breakdown Draft

This draft breaks `docs/aohys-prd.md` into independently grabbable tracer-bullet issues. It is not published yet because the `AO-HyS/aohys.com` GitHub repository and issue tracker do not exist locally yet.

## Proposed Vertical Slices

### 1. Repository and Monorepo Foundation

**Blocked by:** None - can start immediately.

**User stories covered:** 61, 62, 63, 66, 67, 68.

Create the public repository foundation: Git initialization, package manager/workspace setup, monorepo structure, baseline commands, lint/type/build placeholders, environment documentation, and initial README/license boundaries. This is the prefactoring slice that makes later vertical slices easy to build and review.

### 2. Public Astro Shell With Design Tokens

**Blocked by:** 1.

**User stories covered:** 1, 2, 5, 32, 33, 34, 35, 36, 37, 63, 64, 65, 70.

Build the first demoable public shell in Astro: global layout, navigation, footer, approved color tokens, approved typography, font loading, home route, responsive behavior, basic metadata, and an Impeccable-ready structure. This slice should produce a visible page that can be reviewed in browser.

### 3. Bilingual Routing, SEO, and Public Page Skeletons

**Blocked by:** 2.

**User stories covered:** 5, 6, 7, 8, 24, 25, 35, 36, 38, 39.

Add the full V1 public route map in English and Spanish with localized slugs, canonical metadata, language alternates, sitemap/robots behavior, privacy route, contact route, architecture route, resume route, case-study index, and route-level smoke checks.

### 4. Home Page Proof Narrative

**Blocked by:** 2, 3.

**User stories covered:** 1, 2, 3, 11, 12, 26, 31, 32, 33, 34, 47, 48, 49, 50, 51, 52, 70.

Implement the real home page narrative: Alejandro-first hero, selected outcomes proof ledger, dark architecture-stage section, case-study previews, engineering practice section, contact CTA, and responsive/accessible visual QA.

### 5. Architecture and Public Code Sample Page

**Blocked by:** 2, 3.

**User stories covered:** 9, 10, 26, 27, 28, 29, 30, 64, 65.

Build the architecture page explaining the public source framing, public/private boundaries, deploy path, auth, media, analytics, email, privacy, and operational decisions. Include links to the README and source once the repository is available.

### 6. Case Study Template and Casa Roca Detail

**Blocked by:** 2, 3.

**User stories covered:** 11, 32, 34, 46, 47, 50.

Create the reusable case-study detail experience using the agreed structure, then ship Casa Roca as the first complete production-proof case study with public evidence, confidentiality notes, responsive layout, and SEO metadata.

### 7. Remaining Selected Work Case Studies

**Blocked by:** 6.

**User stories covered:** 11, 46, 48, 49, 50, 51, 52.

Add The Barber Central, Nutri Plan, Enterprise Systems, and Engineering Practice using the same case-study system. Each entry should distinguish production, active build, private build, enterprise/confidential work, and practice/process proof.

### 8. Resume Page and ATS-Friendly PDF

**Blocked by:** 2, 3.

**User stories covered:** 4, 53, 54, 59.

Build the dynamic resume page and downloadable PDF path. The resume should be readable, ATS-friendly, single-column, text-based, SEO-aware, and linked back to the dynamic site.

### 9. Convex Backend Foundation

**Blocked by:** 1.

**User stories covered:** 14, 16, 17, 18, 19, 20, 44, 56, 57, 59, 60.

Set up Convex for application state and define the first production-shaped data model for leads, media metadata, site settings, case-study metadata, and resume versions. Include dev/prod environment notes and safe validation boundaries.

### 10. Contact Lead Capture With Email Notification

**Blocked by:** 3, 9.

**User stories covered:** 12, 13, 14, 15, 39, 40, 55, 56, 58.

Implement the public contact flow end-to-end: intent capture, form validation, spam resistance baseline, Convex lead persistence, Resend notification, PostHog explicit event, privacy-safe analytics behavior, email fallback messaging, and WhatsApp CTA.

### 11. PostHog Analytics and Error Capture

**Blocked by:** 2, 3.

**User stories covered:** 39, 40, 41, 42, 65.

Wire explicit PostHog pageviews, selected conversion events, environment separation, disabled autocapture, and frontend error capture. Verify that sensitive contact message content is not captured.

### 12. Cloudflare and Wrangler Deployment Path

**Blocked by:** 1, 2, 3.

**User stories covered:** 24, 25, 28, 29, 30, 43, 66.

Configure Wrangler, Cloudflare-compatible builds, preview/production deploy flow, environment documentation, canonical domain behavior, `aohys.net` to `aohys.com` redirect, and deployment smoke checks.

### 13. Better Auth and Private Dashboard Shell

**Blocked by:** 1, 9.

**User stories covered:** 16, 21, 22, 23, 35, 36, 59.

Create the private dashboard shell with Better Auth, Convex integration, admin allowlist, protected route behavior, noindex/robots protection, dashboard layout, and operational overview.

### 14. Dashboard Lead Review Workflow

**Blocked by:** 10, 13.

**User stories covered:** 16, 56, 57, 59.

Build the first real dashboard workflow: list incoming leads, view details, update review/contact status, preserve privacy, and verify that changes reflect in Convex.

### 15. Dashboard Content and Media Workflow

**Blocked by:** 7, 9, 13.

**User stories covered:** 17, 18, 19, 20, 43, 44, 45, 46, 59, 60.

Build dashboard workflows for case-study content, media metadata, site settings, and resume content. Include Cloudflare media integration once the product choice is decided.

### 16. Privacy, Security, and Launch Hardening

**Blocked by:** 10, 11, 12, 13.

**User stories covered:** 21, 22, 38, 39, 41, 58, 59.

Harden the launch surface: privacy page accuracy, dashboard noindex validation, contact error states, analytics privacy, security headers where appropriate, environment separation, production readiness checks, and browser QA.

### 17. Public README and Source Evaluation Package

**Blocked by:** 1, 5, 9, 12.

**User stories covered:** 9, 10, 28, 29, 30, 61, 62, 67, 68, 69.

Write the public README and evaluation package: architecture overview, local development, environment variables, Convex, Cloudflare, PostHog, Resend, media, privacy/security, deploy flow, license boundaries, and no-contribution framing.

## Granularity Check

The breakdown intentionally starts with two foundation issues, then switches to demoable vertical slices. It avoids creating separate horizontal tickets for "CSS", "schema", "routes", or "tests" unless they are part of a complete user-visible path.

Questions to approve before publishing:

1. Does this granularity feel right, or should the public site be split into smaller slices?
2. Are the dependency relationships correct?
3. Should dashboard/content/media be split further before issue publication?
