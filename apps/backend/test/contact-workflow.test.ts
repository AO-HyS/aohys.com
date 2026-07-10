import { describe, expect, it, vi } from "vitest";
import { submitContactLead } from "../src/contact-workflow.js";

const validProviderValues = {
  AOHYS_ENV: "preview",
  PUBLIC_SITE_URL: "https://preview.aohys.com",
  PUBLIC_CONTACT_ENDPOINT: "https://patient-bird-955.convex.site/contact",
  CONVEX_URL: "https://patient-bird-955.convex.cloud",
  CONVEX_DEPLOYMENT: "preview:aohys-preview",
  CONVEX_SITE_URL: "https://patient-bird-955.convex.site",
  CONVEX_DEPLOY_KEY: "preview-deploy-key",
  PUBLIC_POSTHOG_KEY: "phc_preview",
  PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  PUBLIC_POSTHOG_AUTOCAPTURE: "false",
  RESEND_API_KEY: "re_preview",
  RESEND_FROM: "Alejandro Ortiz <contact@aohys.com>",
  LEAD_NOTIFICATION_EMAIL: "alejandro.ortiz@aohys.com",
  BETTER_AUTH_SECRET: "preview-secret",
  BETTER_AUTH_URL: "https://preview.aohys.com",
  BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.aohys.com,http://localhost:4321",
  ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
  GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  CLOUDFLARE_ACCOUNT_ID: "cloudflare-account",
  CLOUDFLARE_PROJECT_NAME: "aohys-com",
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: "images-hash",
  PUBLIC_CONTACT_EMAIL: "alejandro.ortiz@aohys.com",
  PUBLIC_WHATSAPP_URL: "https://wa.me/522299020825",
};

describe("contact lead workflow", () => {
  it("requires a phone number when WhatsApp is the preferred contact path", async () => {
    const persistLead = vi.fn();

    await expect(submitContactLead(
      {
        name: "Alejandro Ortiz",
        email: "alejandro.ortiz@aohys.com",
        preferredContactPath: "whatsapp",
        intent: "project",
        message: "I need help shipping a product workflow.",
        sourcePath: "/contact",
        locale: "en",
        consentToContact: true,
      },
      {
        environment: "preview",
        values: validProviderValues,
        adapters: {
          persistLead,
          sendNotification: vi.fn(),
          captureAnalyticsEvent: vi.fn(),
        },
      },
    )).rejects.toThrow("phone is required.");
    expect(persistLead).not.toHaveBeenCalled();
  });

  it("stores a valid lead, sends a notification, and captures only safe analytics metadata", async () => {
    const persistedLeads: unknown[] = [];
    const notifications: unknown[] = [];
    const analyticsEvents: unknown[] = [];

    const result = await submitContactLead(
      {
        name: "  Alejandro Ortiz  ",
        email: "  ALEJANDRO.ORTIZ@AOHYS.COM ",
        company: " AOHYS ",
        phone: " +52 229 902 0825 ",
        preferredContactPath: "whatsapp",
        intent: "project",
        message: "I need a bilingual product site with a private dashboard.",
        sourcePath: "/contact",
        locale: "en",
        referrer: "https://aohys.com/resume",
        consentToContact: true,
        website: "",
        formStartedAt: 1_788_000_000_000,
      },
      {
        environment: "preview",
        values: validProviderValues,
        now: 1_788_000_003_500,
        adapters: {
          persistLead: async (lead) => {
            persistedLeads.push(lead);
            return { leadId: "lead_123" };
          },
          sendNotification: async (notification) => {
            notifications.push(notification);
            return { notificationId: "email_123" };
          },
          captureAnalyticsEvent: async (event) => {
            analyticsEvents.push(event);
          },
        },
      },
    );

    expect(result).toEqual({
      leadId: "lead_123",
      notificationId: "email_123",
      notificationStatus: "sent",
      analyticsStatus: "captured",
      status: "new",
    });
    expect(persistedLeads).toHaveLength(1);
    expect(persistedLeads[0]).toMatchObject({
      name: "Alejandro Ortiz",
      email: "alejandro.ortiz@aohys.com",
      company: "AOHYS",
      phone: "+52 229 902 0825",
      preferredContactPath: "whatsapp",
      consentToContact: true,
      status: "new",
    });
    expect(notifications[0]).toMatchObject({
      leadId: "lead_123",
      to: "alejandro.ortiz@aohys.com",
      from: "Alejandro Ortiz <contact@aohys.com>",
      replyTo: "alejandro.ortiz@aohys.com",
    });
    expect(JSON.stringify(notifications[0])).toContain("Open lead inbox");
    expect(JSON.stringify(notifications[0])).toContain("New project request");
    expect(JSON.stringify(notifications[0])).toContain("https://preview.aohys.com/dashboard/leads");
    expect(analyticsEvents[0]).toMatchObject({
      event: "lead_submitted",
      distinctId: "lead:lead_123",
      properties: {
        environment: "preview",
        intent: "project",
        preferredContactPath: "whatsapp",
        locale: "en",
        sourcePath: "/contact",
        hasCompany: true,
        hasPhone: true,
      },
    });
    expect(JSON.stringify(analyticsEvents[0])).not.toContain(
      "I need a bilingual product site",
    );
    expect(JSON.stringify(analyticsEvents[0])).not.toContain(
      "alejandro.ortiz@aohys.com",
    );
  });

  it("stores a lead even when optional contact provider settings are missing", async () => {
    const persistLead = vi.fn(async () => ({ leadId: "lead_123" }));
    const sendNotification = vi.fn(async () => ({ notificationId: "email_123" }));
    const captureAnalyticsEvent = vi.fn(async () => undefined);

    const result = await submitContactLead(
      {
        name: "Alejandro Ortiz",
        email: "alejandro.ortiz@aohys.com",
        preferredContactPath: "email",
        intent: "project",
        message: "I need help shipping a product workflow.",
        sourcePath: "/contact",
        locale: "en",
        consentToContact: true,
      },
      {
        environment: "preview",
        values: {
          ...validProviderValues,
          RESEND_API_KEY: undefined,
          PUBLIC_POSTHOG_KEY: undefined,
        },
        adapters: {
          persistLead,
          sendNotification,
          captureAnalyticsEvent,
        },
      },
    );

    expect(result).toEqual({
      leadId: "lead_123",
      notificationStatus: "skipped",
      analyticsStatus: "skipped",
      status: "new",
    });
    expect(persistLead).toHaveBeenCalledTimes(1);
    expect(sendNotification).not.toHaveBeenCalled();
    expect(captureAnalyticsEvent).not.toHaveBeenCalled();
  });

  it("captures a sanitized operational event when Resend notification fails after persistence", async () => {
    const analyticsEvents: unknown[] = [];

    const result = await submitContactLead(
      {
        name: "Alejandro Ortiz",
        email: "alejandro.ortiz@aohys.com",
        preferredContactPath: "email",
        intent: "project",
        message: "I need help shipping a product workflow.",
        sourcePath: "/contact",
        locale: "en",
        consentToContact: true,
      },
      {
        environment: "preview",
        values: validProviderValues,
        adapters: {
          persistLead: async () => ({ leadId: "lead_123" }),
          sendNotification: async () => {
            throw new Error("Resend notification failed with status 500.");
          },
          captureAnalyticsEvent: async (event) => {
            analyticsEvents.push(event);
          },
        },
      },
    );

    expect(result).toMatchObject({
      leadId: "lead_123",
      notificationStatus: "failed",
      analyticsStatus: "captured",
      status: "new",
    });
    expect(analyticsEvents).toHaveLength(2);
    expect(analyticsEvents[1]).toMatchObject({
      event: "lead_provider_failed",
      distinctId: "lead:lead_123",
      properties: {
        leadId: "lead_123",
        environment: "preview",
        provider: "resend",
        operation: "lead_notification",
        errorType: "Error",
      },
    });
    expect(JSON.stringify(analyticsEvents[1])).not.toContain("alejandro.ortiz@aohys.com");
  });
});
