import { describe, expect, it } from "vitest";
import {
  SELECTED_CONVERSION_EVENTS,
  buildAnalyticsBootstrapPayload,
  buildExplicitConversionEvent,
  buildExplicitPageviewEvent,
  buildManualExceptionProperties,
  buildPostHogClientConfig,
  normalizeAnalyticsReleaseSha,
  sanitizePostHogEnvelopeProperties,
} from "../src/analytics";

const context = {
  contentId: "contact",
  locale: "en",
  path: "/contact",
  canonicalUrl: "https://aohys.com/contact/",
  environment: "production",
} as const;

describe("public site analytics contract", () => {
  it("builds explicit environment-aware pageviews with autocapture disabled", () => {
    const config = buildPostHogClientConfig({
      key: "phc_production",
      environment: "production",
      canonicalUrl: "https://aohys.com/contact/",
    });

    expect(config).toEqual({
      key: "phc_production",
      host: "/ingest",
      ui_host: "https://us.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_exceptions: false,
      capture_performance: {
        web_vitals: true,
        web_vitals_allowed_metrics: ["LCP", "INP", "CLS"],
      },
      persistence: "localStorage",
      disable_persistence: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_product_tours: true,
      capture_dead_clicks: false,
      advanced_disable_feature_flags: true,
      person_profiles: "never",
      respect_dnt: true,
      opt_out_useragent_filter: false,
    });

    expect(buildExplicitPageviewEvent(context)).toEqual({
      name: "$pageview",
      properties: {
        $current_url: "https://aohys.com/contact/",
        $host: "aohys.com",
        $pathname: "/contact/",
        content_id: "contact",
        locale: "en",
        path: "/contact",
        canonical_url: "https://aohys.com/contact/",
        environment: "production",
      },
    });
  });

  it("does not configure PostHog outside the production canonical domain", () => {
    expect(
      buildPostHogClientConfig({
        key: undefined,
        environment: "local",
        canonicalUrl: "http://localhost:4321",
      }),
    ).toBeUndefined();
    expect(
      buildPostHogClientConfig({
        key: undefined,
        environment: "preview",
        canonicalUrl: "https://preview.aohys.com",
      }),
    ).toBeUndefined();
    expect(
      buildPostHogClientConfig({
        key: "phc_production",
        environment: "production",
        canonicalUrl: "https://deployment.aohys-com.pages.dev",
      }),
    ).toBeUndefined();
  });

  it("allows only selected conversions and strips contact data from event properties", () => {
    expect(SELECTED_CONVERSION_EVENTS).toEqual([
      "contact_form_viewed",
      "contact_form_submit_attempted",
      "contact_form_submit_succeeded",
      "contact_form_submit_failed",
      "whatsapp_cta_clicked",
      "email_cta_clicked",
    ]);

    const event = buildExplicitConversionEvent(
      "contact_form_submit_failed",
      context,
      {
        failure_reason: "request_failed",
        intent: "project",
        message: "I need a private estimate.",
        email: "person@example.com",
        phone: "+52 229 000 0000",
        name: "Private Person",
        company: "Private Company",
      },
    );

    expect(event).toEqual({
      name: "contact_form_submit_failed",
      properties: {
        $current_url: "https://aohys.com/contact/",
        $host: "aohys.com",
        $pathname: "/contact/",
        content_id: "contact",
        locale: "en",
        path: "/contact",
        canonical_url: "https://aohys.com/contact/",
        environment: "production",
        failure_reason: "request_failed",
        intent: "project",
      },
    });

    expect(() =>
      buildExplicitConversionEvent("unsupported_event", context),
    ).toThrow("analytics event is not supported.");
  });

  it("captures manual exception metadata without contact message content", () => {
    const properties = buildManualExceptionProperties(context, {
      source: "contact_form",
      message: "Private form content must not be captured.",
      email: "person@example.com",
      error_message: "Contact request failed.",
      $current_url: "https://aohys.com/contact?email=person@example.com",
      error_type: "PrivateCustomerError",
    });

    expect(properties).toEqual({
      $current_url: "https://aohys.com/contact/",
      $host: "aohys.com",
      $pathname: "/contact/",
      content_id: "contact",
      locale: "en",
      path: "/contact",
      canonical_url: "https://aohys.com/contact/",
      environment: "production",
      source: "contact_form",
      error_type: "UnknownError",
    });
  });

  it("validates the release SHA and preserves only sanitized exception frames", () => {
    const release = "0123456789ABCDEF0123456789ABCDEF01234567";
    expect(normalizeAnalyticsReleaseSha(release)).toBe(release.toLowerCase());
    expect(normalizeAnalyticsReleaseSha("main")).toBeUndefined();

    expect(
      sanitizePostHogEnvelopeProperties({
        token: "phc_public_ingestion_key",
        message: "person@example.com sent private content",
        $exception_list: [
          {
            type: "TypeError",
            value: "person@example.com sent private content",
            stacktrace: {
              frames: [
                {
                  filename:
                    "https://aohys.com/assets/app.js?email=person@example.com",
                  function: "submitFor-person@example.com",
                  lineno: 42,
                  colno: 7,
                  in_app: true,
                  vars: { email: "person@example.com" },
                },
              ],
            },
          },
        ],
      }),
    ).toEqual({
      token: "phc_public_ingestion_key",
      $exception_list: [
        {
          type: "TypeError",
          stacktrace: {
            frames: [
              {
                filename: "https://aohys.com/assets/app.js",
                function: "[redacted-email]",
                lineno: 42,
                colno: 7,
                in_app: true,
              },
            ],
          },
        },
      ],
    });
  });

  it("adds one validated release identity to browser context", () => {
    const release = "0123456789abcdef0123456789abcdef01234567";
    const payload = buildAnalyticsBootstrapPayload(
      {
        key: "phc_production",
        environment: "production",
        canonicalUrl: "https://aohys.com/contact/",
        releaseSha: release,
      },
      context,
    );
    expect(payload.context.release).toBe(release);
    expect(payload.pageview.properties.release).toBe(release);
  });
});
