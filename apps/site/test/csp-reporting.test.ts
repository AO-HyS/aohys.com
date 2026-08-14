import { describe, expect, it, vi } from "vitest";
import { handleCspReportRequest } from "../src/csp-reporting.js";
import { CONTENT_SECURITY_POLICY } from "../src/security-headers.js";

describe("CSP reporting boundary", () => {
  it("captures sanitized CSP violation reports through PostHog", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const transport = vi.fn(async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ ok: true }));
    });

    const response = await handleCspReportRequest(
      new Request("https://aohys.com/observability/csp", {
        method: "POST",
        headers: {
          "content-type": "application/csp-report",
        },
        body: JSON.stringify({
          "csp-report": {
            "document-uri": "https://aohys.com/contact/?lead=private",
            "violated-directive": "script-src-elem",
            "effective-directive": "script-src-elem",
            "blocked-uri": "https://us-assets.i.posthog.com/array/phc_private/config.js?t=1",
            disposition: "enforce",
          },
        }),
      }),
      {
        AOHYS_ENV: "production",
        PUBLIC_SITE_URL: "https://aohys.com",
        PUBLIC_POSTHOG_KEY: "phc_production",
      },
      transport,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(requests[0]?.url).toBe("https://aohys.com/ingest/capture/");
    expect(JSON.parse(String(requests[0]?.init.body))).toEqual({
      api_key: "phc_production",
      event: "csp_violation_reported",
      distinct_id: "csp:production",
      properties: {
        $geoip_disable: true,
        environment: "production",
        source: "cloudflare_pages_csp_report",
        path: "/observability/csp",
        documentPath: "/contact/",
        violatedDirective: "script-src-elem",
        effectiveDirective: "script-src-elem",
        blockedHost: "us-assets.i.posthog.com",
        disposition: "enforce",
      },
    });
    expect(JSON.stringify(requests)).not.toContain("phc_private");
    expect(JSON.stringify(requests)).not.toContain("lead=private");
  });

  it("returns no-content when PostHog is not configured", async () => {
    const transport = vi.fn();
    const response = await handleCspReportRequest(
      new Request("https://develop.aohys-com.pages.dev/observability/csp", {
        method: "POST",
        body: "{}",
      }),
      { AOHYS_ENV: "preview" },
      transport,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(transport).not.toHaveBeenCalled();
  });

  it("emits no CSP telemetry in preview even if a stale key exists", async () => {
    const transport = vi.fn();
    const response = await handleCspReportRequest(
      new Request("https://preview.aohys.com/observability/csp", { method: "POST", body: "{}" }),
      { AOHYS_ENV: "preview", PUBLIC_POSTHOG_KEY: "phc_stale" },
      transport,
    );
    expect(response.status).toBe(204);
    expect(transport).not.toHaveBeenCalled();
  });

  it("accepts preflight checks without creating analytics noise", async () => {
    const transport = vi.fn();
    const response = await handleCspReportRequest(
      new Request("https://develop.aohys-com.pages.dev/observability/csp", {
        method: "OPTIONS",
      }),
      {
        AOHYS_ENV: "preview",
        PUBLIC_POSTHOG_KEY: "phc_preview",
      },
      transport,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("allow")).toBe("POST, OPTIONS");
    expect(response.headers.get("content-security-policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(transport).not.toHaveBeenCalled();
  });
});
