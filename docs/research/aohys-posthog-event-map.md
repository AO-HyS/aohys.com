# AOHYS PostHog Event Map and Verification Plan

Date: 2026-07-11  
Issue: AOH-75  
Status: code contract implemented and locally verified; provider dashboard and deployed-event proof remain pending.

## Observability decision

PostHog is an explicit, anonymous signal boundary for the public site and private dashboard. It is not a duplicate application dashboard and it is not a store for contact records or private operational payloads.

The browser contract now enforces:

- autocapture off;
- explicit pageviews only;
- pageleave capture off;
- browser persistence off;
- session recording off;
- person profiles never processed;
- Do Not Track respected;
- fixed event names and typed dashboard actions;
- runtime removal of identity, contact, secret, URL, and private-record keys.

Preview and production must continue to use separate PostHog projects and public keys. The `environment` property is a secondary guard, not a substitute for project isolation.

## Privacy classes

| Class | Allowed examples | Never allowed |
| --- | --- | --- |
| Public content context | content ID, locale, normalized route path, CTA target | query strings, form values, referrer URLs |
| Conversion state | intent category, preferred contact category, failure reason, provider delivery status | name, email, phone, company, message, lead ID |
| Dashboard workflow state | surface, typed action, locale, generic status transition, workflow queued/skipped | admin email, content body, setting value, media URL, private record ID |
| Error state | fixed source, error class/type, safe public status code | exception message, stack carrying private values, provider response body, token |

## Public browser events

| Event | Trigger | Properties | Verification |
| --- | --- | --- | --- |
| `$pageview` | one explicit capture after PostHog boot on every public route | `content_id`, `locale`, `path`, `canonical_url`, `environment` | source test, built payload, preview network, PostHog live events |
| `contact_form_viewed` | contact form present on route | base properties, `target=contact_form` | source test and preview view |
| `contact_form_submit_attempted` | valid or invalid submit attempt begins | base properties, target only | unit/source test; do not submit synthetic production leads |
| `contact_form_submit_succeeded` | persisted contact request returns success | notification/analytics delivery status and degraded boolean | deterministic workflow/browser tests; live proof only with an explicitly authorized real submission |
| `contact_form_submit_failed` | validation, rate limit, endpoint, provider, or backend failure | fixed `failure_reason` | deterministic tests; never force provider failure in production |
| `whatsapp_cta_clicked` | public WhatsApp CTA activation | target name | preview click/network proof without sending a message |
| `email_cta_clicked` | public email CTA activation | target name | preview click/network proof without sending an email |
| `$exception` | public window error or unhandled rejection | base context, fixed source and error type | deterministic client contract; no deliberate production exception |

## Server/edge events

| Event | Trigger | Properties | Privacy correction |
| --- | --- | --- | --- |
| `lead_submitted` | contact lead persisted | environment, intent, preferred contact category, locale, source path, boolean company/phone presence | distinct ID is now `contact:<environment>`; lead ID removed from property and identity |
| `lead_provider_failed` | PostHog or Resend adapter failure after persistence | environment, provider, operation, error type | lead ID removed from property and distinct ID |
| `lead_intake_failed` | public contact HTTP boundary returns a safe failure | environment, code/status, source path, locale, intent, preferred path, boolean presence flags, error type | no identity or submitted values |
| `dashboard_runtime_exception` | Cloudflare dashboard guard catches an unexpected error | environment, source, normalized path, error type | no cookies, message, stack, admin identity, or provider body |
| `csp_violation_reported` | CSP report endpoint receives a browser report | environment, safe paths, directives, blocked host, disposition | query strings and PostHog keys stripped before capture |

## Private dashboard browser events

The dashboard uses four stable event names and an action property instead of producing a new event name for every button.

| Event | Trigger | Required properties | Optional safe properties |
| --- | --- | --- | --- |
| `dashboard_surface_viewed` | initial dashboard render and resolved path change | `environment`, `surface`, normalized `path` | none |
| `dashboard_action_succeeded` | an explicit mutation/publish workflow succeeds | `environment`, `surface`, `action` | locale, from/to status, workflow status |
| `dashboard_action_failed` | an explicit mutation/publish workflow rejects | `environment`, `surface`, `action`, `error_type` | locale, from/to status |
| `dashboard_client_exception` | window error or unhandled rejection | `environment`, `surface`, fixed `source`, `error_type` | none |

Typed action values:

- `create_project`
- `save_project`
- `publish_project`
- `upload_media`
- `save_external_media`
- `select_media`
- `archive_media`
- `delete_media`
- `update_lead_status`
- `save_resume`
- `publish_resume`
- `save_resume_artifact`
- `save_setting`

No action receives a lead ID, media ID, setting value, project content, admin email, URL, error message, or token.

## PostHog dashboard specification

Create the following dashboard separately in Preview and Production. Every insight should also filter on the matching `environment` as defense in depth.

Dashboard name: `AOHYS Product and Operations`

1. **Public route demand** — `$pageview`, total events, broken down by `path`, with locale filter.
2. **Contact conversion funnel** — contact `$pageview` → `contact_form_viewed` → `contact_form_submit_attempted` → `contact_form_submit_succeeded`.
3. **Contact outcome health** — succeeded vs failed, with failure reason and delivery-degraded breakdown.
4. **Direct-contact demand** — WhatsApp and email CTA events, broken down by target.
5. **Dashboard surface usage** — `dashboard_surface_viewed` broken down by surface.
6. **Dashboard action reliability** — succeeded and failed action events, broken down by action and surface.
7. **Publish workflow outcome** — successful publish actions filtered to `publish_project`/`publish_resume`, broken down by workflow status.
8. **Error and policy health** — `$exception`, dashboard client/runtime exceptions, lead provider/intake failures, and CSP violations.

Do not embed these analytics in the AOHYS dashboard. PostHog remains the analytics/error product; AOHYS Overview consumes only operational readiness from its own domain data.

## Local verification completed

- Backend: 23 tests passed, including contact analytics privacy and provider failure events.
- Dashboard: 17 tests passed, including persistence-free PostHog configuration, route normalization, sensitive-key removal, and fixed-shape capture.
- Site: 41 tests passed across analytics, CSP reporting, dashboard guard, public shell, and public routes; 24 Astro pages built.
- Dashboard runtime config now receives only the public PostHog key/host in addition to existing public runtime values.
- The lead ID no longer appears in PostHog payload expectations.

## Remaining deployed/provider proof

After the preview branch is deployed:

1. Use Browser on the preview public site to verify PostHog script/config requests have no CSP errors.
2. Navigate ordinary public routes and private dashboard routes; do not mutate production or submit synthetic contacts.
3. Inspect request payloads for event name, environment, surface/path, and absence of prohibited keys.
4. Use Computer Use in the signed-in PostHog app to create/verify the Preview dashboard insights above.
5. Confirm the preview events appear only in the preview project.
6. After explicit merge approval and production promotion, repeat read-only page/surface verification in the Production project.

No deliberate exception, provider failure, contact submission, or private-record mutation is required to prove the contract.
