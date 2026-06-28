# AOHYS Public Site PRD

## Problem Statement

Alejandro Ortiz Corro needs a public professional site that actually helps him win high-trust opportunities: senior software roles, technical collaborations, architecture reviews, and serious client conversations. The current site has not generated clients and does not sufficiently demonstrate business judgment, architecture quality, modern engineering practice, or the ability to deliver polished software across the full stack.

The new site must do more than look good. It must act as a public working sample for AOH&S: fast, bilingual, SEO-friendly, accessible, open for code review, and clear about the boundary between public source and private client/product work. It must let recruiters, technical leads, founders, and clients quickly understand that Alejandro can translate ambiguous business goals into reliable product systems.

## Solution

Create a new public source monorepo for `aohys.com`, owned by the `AO-HyS` GitHub organization, with an Astro public site, private dashboard, Convex backend, Cloudflare deployment/media/domain handling, PostHog analytics/error tracking, and Resend lead notifications.

The public site will be Alejandro-first and AOH&S-second. It will lead with outcomes, architecture, quality, security, scalability, and evidence instead of stack names. It will include bilingual pages, case studies, an architecture/public-code-sample page, an ATS-friendly resume page, a contact flow, and a prominent but discreet WhatsApp CTA for the Mexico market.

The private dashboard will live under the same domain at `/dashboard`, protected by Better Auth and an admin allowlist. It will manage leads, case-study content, media metadata, site settings, and resume content. Analytics and error dashboards remain in PostHog instead of being duplicated in the app.

The visual implementation will follow the Impeccable process and the approved design direction: architecture-stage sections, proof-ledger sections, large evidence artifacts, generous whitespace, honey/mint/sky/coral pastel signal colors, Mona Sans for display/interface, Atkinson Hyperlegible Next for long-form content, and explicit rejection of common AI slop patterns.

## User Stories

1. As a hiring manager, I want to understand Alejandro's seniority within a few seconds, so that I can decide whether to continue evaluating him.
2. As a technical lead, I want to see architecture decisions and tradeoffs, so that I can judge Alejandro's engineering judgment.
3. As a founder, I want to understand what business outcomes Alejandro can help create, so that I can decide whether to start a conversation.
4. As a recruiter, I want a clear resume page and PDF, so that I can evaluate Alejandro in both human and ATS workflows.
5. As a search engine crawler, I want semantic, prerendered public pages, so that the site can be indexed accurately.
6. As a Spanish-speaking visitor, I want a Spanish version of the site, so that I can understand the work without relying on browser translation.
7. As an English-speaking visitor, I want English as the default site language, so that international evaluators get the primary experience immediately.
8. As a bilingual visitor, I want stable language routes, so that I can share the exact version I want.
9. As a technical evaluator, I want the site source to be public, so that I can inspect Alejandro's standards directly.
10. As a technical evaluator, I want license and content boundaries to be explicit, so that I know the site code is public but client/product code is private.
11. As a potential client, I want to see proof from real projects, so that I can trust the claims on the page.
12. As a potential client, I want a clear contact path, so that I can ask about a product, website, architecture review, or technical help.
13. As a visitor in Mexico, I want a WhatsApp contact option, so that I can start a conversation through the channel I naturally use.
14. As Alejandro, I want leads saved in the backend, so that contact requests are not lost.
15. As Alejandro, I want lead notifications by email, so that I can respond quickly.
16. As Alejandro, I want a dashboard for leads, so that I can review incoming opportunities without editing code.
17. As Alejandro, I want a dashboard for case-study content, so that I can improve the site as new evidence becomes available.
18. As Alejandro, I want a dashboard for media metadata, so that screenshots and generated images can be managed safely.
19. As Alejandro, I want a dashboard for site settings, so that contact email, WhatsApp number, and similar public settings are easy to update.
20. As Alejandro, I want a dashboard for resume content, so that the dynamic resume and PDF can stay aligned.
21. As Alejandro, I want the dashboard private and noindexed, so that operational workflows do not leak into search results.
22. As an unauthorized visitor, I should not access private dashboard data, so that leads and private operations remain protected.
23. As an admin, I want login limited to `alejandro.ortiz@aohys.com` initially, so that dashboard access is controlled.
24. As a visitor, I want the canonical domain to be `aohys.com`, so that links and SEO are consistent.
25. As a visitor reaching `aohys.net`, I want to be redirected to `aohys.com`, so that there is one public source of truth.
26. As a technical evaluator, I want an architecture page, so that I can see how the site is designed, deployed, observed, and secured.
27. As a technical evaluator, I want the architecture page to explain public/private boundaries, so that the public-source framing is not misleading.
28. As a technical evaluator, I want a README with local development and deployment instructions, so that I can evaluate the repo without guessing.
29. As a technical evaluator, I want environment variable documentation, so that the integration boundaries are clear.
30. As a technical evaluator, I want to see Cloudflare, Convex, PostHog, Resend, and auth decisions documented, so that I can assess full-stack discipline.
31. As a technical evaluator, I want the site to avoid a stack-first hero, so that the message proves product judgment rather than tool familiarity.
32. As a visitor, I want the visual design to feel polished and authored, so that the site itself supports the claim of quality.
33. As a visitor, I want the site to avoid generic card grids and template patterns, so that it feels credible instead of AI-generated.
34. As a visitor, I want strong typography and high contrast, so that the site is comfortable to read.
35. As a visitor using a phone, I want text and layout to adapt cleanly, so that I can evaluate the site on mobile.
36. As a keyboard user, I want visible focus and reachable controls, so that I can navigate without a mouse.
37. As a motion-sensitive visitor, I want reduced-motion support, so that animation does not block or overwhelm content.
38. As a privacy-conscious visitor, I want a clear privacy page, so that I know what is captured and why.
39. As a privacy-conscious visitor, I want analytics to avoid unnecessary PII, so that contact form content is not captured casually.
40. As Alejandro, I want PostHog pageviews and explicit events, so that I can evaluate site performance without overinstrumenting private data.
41. As Alejandro, I want PostHog error capture, so that production failures are visible.
42. As Alejandro, I want autocapture disabled initially, so that analytics stay intentional.
43. As Alejandro, I want Cloudflare media storage/optimization, so that screenshots and generated images load quickly and are managed professionally.
44. As Alejandro, I want Convex to store media metadata rather than image originals, so that backend data stays lightweight and structured.
45. As Alejandro, I want generated imagery to be limited and purposeful, so that the site relies on proof rather than decorative AI art.
46. As a visitor, I want sanitized screenshots as evidence, so that I can inspect real work without exposing private data.
47. As a visitor, I want Casa Roca presented as production proof, so that I can see a real public project.
48. As a visitor, I want The Barber Central presented as an active build, so that I can see current product work.
49. As a visitor, I want Nutri Plan presented as an active private build, so that I can understand the range of systems Alejandro builds.
50. As a visitor, I want enterprise work summarized with confidentiality, so that I can understand scale without exposing private details.
51. As a visitor, I want Engineering Practice content, so that I can understand Alejandro's modern agent-assisted workflow.
52. As a visitor, I want AI/agent-assisted engineering framed as current practice, so that it is credible and not overstated as invented LLM product work.
53. As a recruiter, I want the resume PDF to be single-column and text-based, so that ATS parsing works.
54. As a recruiter, I want the dynamic resume page linked from the PDF, so that I can inspect richer context.
55. As a founder, I want contact intent choices, so that I can identify whether I need hiring, product build, architecture help, or another conversation.
56. As Alejandro, I want leads categorized by intent, so that follow-up can be prioritized.
57. As Alejandro, I want lead status in the dashboard, so that inquiries can move from new to reviewed to contacted.
58. As Alejandro, I want spam resistance on the contact form, so that the site remains usable after launch.
59. As an admin, I want dashboard content changes to be safe, so that public pages do not break from bad content.
60. As an admin, I want media uploads to preserve alt text and usage metadata, so that public pages remain accessible.
61. As a future implementing agent, I want a clear PRD and issue breakdown, so that work can be picked up independently.
62. As a future implementing agent, I want vertical-slice issues, so that each task produces something demoable end-to-end.
63. As a future implementing agent, I want design tokens captured before implementation, so that the public shell does not drift visually.
64. As a future implementing agent, I want Impeccable craft to drive the public shell, so that visual quality is part of the build process.
65. As a future implementing agent, I want Impeccable slop detection and polish passes, so that default AI patterns are caught before shipping.
66. As a future implementing agent, I want Wrangler and Cloudflare assumptions captured, so that deploy work does not become an afterthought.
67. As Alejandro, I want the repo initialized under the organization, so that the public code sample does not live under a personal account.
68. As Alejandro, I want GitHub Issues available after repo creation, so that PRD and implementation work can be tracked publicly.
69. As Alejandro, I want no contribution workflow, so that the repo does not imply a community OSS project.
70. As a visitor, I want the site to feel joyful but professional, so that it reflects Alejandro's personality without losing senior credibility.

## Implementation Decisions

- Create a new public source monorepo owned by the `AO-HyS` GitHub organization and named for the canonical domain.
- Initialize Git before implementation work and publish the repository under the organization, not the personal account.
- Use a monorepo with separate surfaces for the public Astro site, the private dashboard, Convex backend code, shared configuration, and media helpers.
- Use Astro for the public SEO surface because the public pages need speed, prerendering, semantic HTML, metadata control, and excellent content performance.
- Use English as the default public language and Spanish under stable `/es/` routes.
- Use localized public slugs while keeping internal content identifiers stable.
- Use React with Vite and TanStack Router for the private dashboard.
- Keep the private dashboard in English only.
- Host all public and private surfaces under one domain, with the dashboard under `/dashboard`.
- Make `/dashboard` authenticated, noindexed, omitted from sitemap, and unavailable to anonymous users.
- Use Convex as the primary backend for leads, content metadata, media metadata, site settings, resume content, auth integration, and dashboard workflows.
- Use Better Auth with Convex and an initial allowlist for `alejandro.ortiz@aohys.com`.
- Use Cloudflare and Wrangler for deployment workflows and environment management.
- Use Cloudflare for DNS, canonical domain handling, redirects, media delivery, and performance.
- Redirect `aohys.net` to `aohys.com` with a permanent redirect.
- Decide between Cloudflare Images, R2, or a combined approach before implementing production media originals and variants.
- Store image/media metadata in Convex while allowing Cloudflare to own storage and optimization concerns.
- Use PostHog for controlled pageviews, explicit events, dashboards, and error capture.
- Start with PostHog autocapture disabled.
- Do not duplicate analytics dashboards inside the app; dashboard overview is operational, not analytics-heavy.
- Use Resend for lead notification email.
- Use `alejandro.ortiz@aohys.com` as the public contact email.
- Use `Alejandro Ortiz <contact@aohys.com>` as the system sender.
- Verify Resend DNS alignment in Cloudflare before production, especially SPF alignment.
- Add a large but discreet WhatsApp CTA using the temporary current number until the Meta business number is ready.
- Use a contact form that captures lead intent, identity, contact details, message, preferred contact path, and consent/privacy acknowledgement.
- Store leads in Convex and send email notifications through Resend.
- The public site should position Alejandro first and AOH&S second.
- The public source framing must say the site code is a working sample, not a collaborative open-source product.
- The repo should not include a contribution workflow or copy that invites community PRs.
- Code license should be MIT; content, brand, copy, CV, case-study material, images, and assets remain reserved.
- The hero should focus on business outcomes and reliable architecture, not stack names.
- Stack choices should appear as evidence in architecture, README, and implementation details.
- Case studies should follow the agreed structure: problem, business outcome, role, constraints, architecture decisions, execution highlights, quality/security/performance, public evidence, and confidentiality note.
- Case study ordering should start with Casa Roca, then The Barber Central, Nutri Plan, Enterprise Systems, and Engineering Practice.
- Enterprise work should mention Tala, Drift, Prenuvo, AutoZone/DataZone, Accenture, and CEMEX/NEORIS with appropriate confidentiality.
- Engineering Practice should describe modern agent-assisted engineering, QA, architecture, observability, deployment, and documentation as practice.
- The architecture page should explain the public code sample, system boundaries, deploy path, auth, media, analytics, email, privacy, and operations.
- The README should include local development, environment variables, Convex, Cloudflare, PostHog, Resend, media, privacy/security, deploy flow, and license boundaries.
- The visual system should use architecture-stage sections and proof-ledger sections, not generic card grids.
- The public shell should be built with Impeccable craft and then reviewed with Impeccable polish/detect patterns before deeper feature work.
- The design should use the honey/mint/sky/coral pastel-professional palette from the design context.
- Mona Sans variable should carry display, interface, navigation, CTAs, case-study titles, architecture labels, and proof-ledger headings.
- Atkinson Hyperlegible Next variable should carry paragraphs, case-study prose, resume content, privacy copy, and form help text.
- Monospace should not be the technical voice; ledgers and metrics should use tabular numerals in the primary families.
- Generated imagery should be purposeful and limited. Sanitized screenshots should carry most proof.
- Public content should never expose private code, secrets, private data, or accidental internal material.
- The first implementation slice should build the public site shell before dashboard/backend depth.
- Dashboard sections for V1 are Overview, Leads, Case studies, Media, Site settings, and Resume.
- Dashboard overview should be checklist-driven with quick links and operational status, not a PostHog replacement.

## Testing Decisions

- Tests should validate external behavior and user-visible outcomes, not internal implementation details.
- The primary high-level test seam for the public site is browser-level route verification: build or run the site, visit representative English and Spanish routes, verify content, navigation, metadata, accessibility basics, responsive layout, and console cleanliness.
- The primary high-level test seam for contact is end-to-end lead submission in a safe environment: submit the public form, verify the lead is stored, verify notification behavior, verify validation/errors, and verify analytics do not capture sensitive message content.
- The primary high-level test seam for dashboard access is authenticated browser behavior: unauthorized users cannot access dashboard content, the allowlisted admin can access it, and private routes are noindexed.
- The primary deployment seam is Cloudflare/Wrangler smoke testing: validate build output, environment wiring, canonical domain behavior, redirects, and production/preview smoke checks.
- The visual QA seam is Impeccable-backed browser review: use the approved design context, check typography, color, spatial rhythm, responsive behavior, motion, UX copy, and slop-pattern avoidance.
- Public page tests should cover the home page, case study index, one case study detail page, architecture page, resume page, contact page, and privacy page in both language trees where applicable.
- SEO tests should verify canonical URLs, localized alternates, page titles, meta descriptions, robots behavior, sitemap inclusion/exclusion, and dashboard noindex.
- Accessibility tests should verify semantic landmarks, keyboard navigation, visible focus, contrast, readable line lengths, reduced-motion support, alt text requirements, and no color-only meaning.
- Content tests should verify that public-source copy does not imply open-source community collaboration and does not imply private client code is public.
- Media tests should verify that images render, have alt text, are optimized through the chosen Cloudflare path, and do not expose private information.
- Resume tests should verify that the dynamic resume is readable and that the PDF remains text-based, single-column, and ATS-friendly.
- Analytics tests should verify explicit pageview/event behavior, environment separation, disabled autocapture, and error capture wiring.
- Email tests should verify sender configuration, notification content, SPF/DKIM/DMARC readiness, and safe handling of failed sends.
- There is no prior code test suite in this workspace yet. The first implementation should create the test seams alongside the app rather than retrofit them later.

## Out of Scope

- Rebuilding or migrating the old React portfolio.
- Publishing private client or product source code.
- Presenting this as a community open-source project.
- Adding a contribution workflow, contribution guide, or community PR process.
- Building a full CRM beyond lead capture/review status in V1.
- Duplicating PostHog dashboards inside the app.
- Adding newsletter functionality in V1.
- Building payment flows in V1.
- Completing Meta business-number verification inside this PRD.
- Finalizing all screenshots and generated imagery before the public shell exists.
- Implementing the private dashboard before the public shell and visual system are proven.
- Treating AI-generated art as the main proof source.
- Creating fake metrics, fake testimonials, or exaggerated business claims.
- Shipping visual work without Impeccable craft/polish review once implementation begins.

## Further Notes

- This PRD has been published as the parent issue: https://github.com/AO-HyS/aohys.com/issues/1
- The approved vertical-slice issues have been published under the parent issue.
- The first implementation issue is repository/monorepo foundation because every later issue depends on having Git, package management, workspace structure, and local commands.
- The first implementation command after issue planning should be `$impeccable craft AOHYS public site shell`.
- The implementation phase must account for Git initialization, GitHub organization repo creation, Convex setup, Wrangler setup, Cloudflare domain/redirect work, PostHog setup, Resend DNS verification, and later dashboard/auth work.
