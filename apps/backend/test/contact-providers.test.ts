import { describe, expect, it } from "vitest";
import {
  captureLeadAnalyticsWithPostHog,
  sendLeadNotificationWithResend,
} from "../src/contact-providers.js";

describe("contact provider adapters", () => {
  it("sends lead notifications through Resend with an idempotency key", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const transport = async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
    };

    const result = await sendLeadNotificationWithResend(
      {
        leadId: "lead_123",
        from: "Alejandro Ortiz <contact@aohys.com>",
        to: "alejandro.ortiz@aohys.com",
        replyTo: "client@example.com",
        subject: "New AOHYS lead: project",
        text: "Lead details",
        html: "<p>Lead details</p>",
      },
      {
        apiKey: "re_preview",
        transport,
      },
    );

    expect(result).toEqual({ notificationId: "email_123" });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://api.resend.com/emails");
    expect(requests[0]?.init.headers).toMatchObject({
      Authorization: "Bearer re_preview",
      "Idempotency-Key": "lead-notification/lead_123",
    });
    expect(JSON.parse(String(requests[0]?.init.body))).toMatchObject({
      from: "Alejandro Ortiz <contact@aohys.com>",
      to: ["alejandro.ortiz@aohys.com"],
      reply_to: ["client@example.com"],
      subject: "New AOHYS lead: project",
      text: "Lead details",
      html: "<p>Lead details</p>",
    });
  });

  it("captures PostHog conversion metadata without contact message text or email", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const transport = async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ status: 1 }), { status: 200 });
    };

    await captureLeadAnalyticsWithPostHog(
      {
        event: "lead_submitted",
        distinctId: "lead:lead_123",
        properties: {
          leadId: "lead_123",
          intent: "project",
          preferredContactPath: "email",
          locale: "en",
          sourcePath: "/contact",
          hasCompany: true,
          hasPhone: false,
        },
      },
      {
        apiKey: "phc_preview",
        host: "https://us.i.posthog.com/",
        transport,
      },
    );

    const payload = JSON.parse(String(requests[0]?.init.body));

    expect(requests[0]?.url).toBe("https://us.i.posthog.com/capture/");
    expect(payload).toMatchObject({
      api_key: "phc_preview",
      event: "lead_submitted",
      distinct_id: "lead:lead_123",
      properties: {
        leadId: "lead_123",
        intent: "project",
        preferredContactPath: "email",
        locale: "en",
        sourcePath: "/contact",
        hasCompany: true,
        hasPhone: false,
      },
    });
    expect(JSON.stringify(payload)).not.toContain("client@example.com");
    expect(JSON.stringify(payload)).not.toContain("Lead details");
  });
});
