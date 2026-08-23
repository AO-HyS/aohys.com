import { describe, expect, it } from "vitest";
import { buildAnalyticsBootstrapPayload } from "../src/analytics.js";
import {
  parseAnalyticsBootstrapPayload,
  parseAnalyticsEventDetail,
  parseBetterAuthRedirect,
  parseBetterAuthRedirectLocation,
  parseBetterAuthSession,
  parseCspReportPayload,
} from "../src/runtime-boundaries.js";

describe("site runtime boundaries", () => {
  it("validates the serialized analytics bootstrap contract", () => {
    const payload = buildAnalyticsBootstrapPayload(
      {
        key: undefined,
        environment: "preview",
        canonicalUrl: "https://preview.aohys.com/",
      },
      {
        contentId: "home",
        locale: "en",
        path: "/",
        canonicalUrl: "https://preview.aohys.com/",
        environment: "preview",
      },
    );
    expect(parseAnalyticsBootstrapPayload(JSON.stringify(payload))).toEqual(
      payload,
    );
    expect(() => parseAnalyticsBootstrapPayload('{"context":{}}')).toThrow(
      "runtime shape",
    );
  });

  it("narrows browser and Better Auth payloads", () => {
    expect(
      parseAnalyticsEventDetail({
        event: "contact_form_viewed",
        properties: { target: "form" },
      }),
    ).toEqual({
      event: "contact_form_viewed",
      properties: { target: "form" },
    });
    expect(
      parseBetterAuthRedirect({ url: "https://accounts.google.com/auth" }),
    ).toBe("https://accounts.google.com/auth");
    expect(parseBetterAuthRedirectLocation("javascript:alert(1)")).toBeNull();
    expect(
      parseBetterAuthSession({ user: { email: "admin@example.com" } }),
    ).toEqual({ user: { email: "admin@example.com" } });
    expect(parseBetterAuthSession({ user: { email: 42 } })).toBeNull();
    expect(parseCspReportPayload({ "csp-report": "invalid" })).toEqual({});
  });
});
