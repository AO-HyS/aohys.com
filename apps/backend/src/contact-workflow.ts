import { assertOneOf, escapeHtml, trimToUndefined } from "@aohys/core";
import type { EnvironmentName } from "@aohys/environment";
import {
  LEAD_INTENTS,
  LEAD_LOCALES,
  prepareLeadIntake,
  type LeadIntent,
  type LeadLocale,
  type PreparedLeadIntake,
} from "./lead-intake.js";

export const PREFERRED_CONTACT_PATHS = ["email", "whatsapp"] as const;

export type PreferredContactPath = (typeof PREFERRED_CONTACT_PATHS)[number];

export interface ContactLeadInput {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  preferredContactPath: PreferredContactPath;
  intent: LeadIntent;
  message: string;
  sourcePath: string;
  locale: LeadLocale;
  referrer?: string;
  consentToContact: boolean;
  website?: string;
  formStartedAt?: number;
}

export interface PreparedContactLead extends PreparedLeadIntake {
  phone?: string;
  preferredContactPath: PreferredContactPath;
  consentToContact: true;
  spamSignals: {
    elapsedMs?: number;
  };
}

export interface LeadNotification {
  leadId: string;
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}

export interface LeadAnalyticsEvent {
  event: "lead_submitted" | "lead_provider_failed" | "lead_intake_failed";
  distinctId: string;
  properties: Record<string, string | number | boolean>;
}

export interface ContactWorkflowAdapters {
  persistLead: (lead: PreparedContactLead) => Promise<{ leadId: string }>;
  sendNotification: (
    notification: LeadNotification,
  ) => Promise<{ notificationId?: string }>;
  captureAnalyticsEvent: (event: LeadAnalyticsEvent) => Promise<void>;
}

export interface ContactWorkflowContext {
  environment: EnvironmentName;
  values: Record<string, string | undefined>;
  adapters: ContactWorkflowAdapters;
  now?: number;
}

export interface ContactLeadResult {
  leadId: string;
  notificationId?: string;
  notificationStatus: "sent" | "skipped" | "failed";
  analyticsStatus: "captured" | "skipped" | "failed";
  status: "new";
}

const REQUIRED_NOTIFICATION_SETTINGS = [
  "RESEND_API_KEY",
  "RESEND_FROM",
  "LEAD_NOTIFICATION_EMAIL",
] as const;

const REQUIRED_ANALYTICS_SETTINGS = [
  "PUBLIC_POSTHOG_KEY",
] as const;

function hasAllSettings(
  values: Record<string, string | undefined>,
  settingNames: readonly string[],
): boolean {
  return settingNames.every((settingName) => Boolean(values[settingName]?.trim()));
}

function hasNotificationSettings(values: Record<string, string | undefined>): boolean {
  return hasAllSettings(values, REQUIRED_NOTIFICATION_SETTINGS);
}

function hasAnalyticsSettings(values: Record<string, string | undefined>): boolean {
  return hasAllSettings(values, REQUIRED_ANALYTICS_SETTINGS);
}

function buildProviderFailureEvent(
  leadId: string,
  environment: EnvironmentName,
  provider: "posthog" | "resend",
  operation: "lead_analytics" | "lead_notification",
  error: unknown,
): LeadAnalyticsEvent {
  const errorType = error instanceof Error ? error.name : "UnknownError";

  return {
    event: "lead_provider_failed",
    distinctId: `lead:${leadId}`,
    properties: {
      leadId,
      environment,
      provider,
      operation,
      errorType,
    },
  };
}

async function captureProviderFailure(
  event: LeadAnalyticsEvent,
  context: ContactWorkflowContext,
): Promise<void> {
  if (!hasAnalyticsSettings(context.values)) {
    return;
  }

  try {
    await context.adapters.captureAnalyticsEvent(event);
  } catch {
    // Operational error reporting is best-effort and must not block lead intake.
  }
}

function prepareContactLead(
  input: ContactLeadInput,
  now: number,
): PreparedContactLead {
  if (input.website?.trim()) {
    throw new Error("contact submission did not pass spam checks.");
  }

  if (!input.consentToContact) {
    throw new Error("consentToContact is required.");
  }

  assertOneOf(input.intent, LEAD_INTENTS, "intent");
  assertOneOf(input.locale, LEAD_LOCALES, "locale");
  assertOneOf(
    input.preferredContactPath,
    PREFERRED_CONTACT_PATHS,
    "preferredContactPath",
  );

  const phone = trimToUndefined(input.phone);
  if (input.preferredContactPath === "whatsapp" && !phone) {
    throw new Error("phone is required.");
  }
  if (phone && phone.length > 60) {
    throw new Error("phone must be 60 characters or less.");
  }

  const preparedLead = prepareLeadIntake(input, { now });

  return {
    ...preparedLead,
    ...(phone ? { phone } : {}),
    preferredContactPath: input.preferredContactPath,
    consentToContact: true,
    spamSignals: {
      elapsedMs: input.formStartedAt ? now - input.formStartedAt : undefined,
    },
  };
}

function buildLeadNotification(
  leadId: string,
  lead: PreparedContactLead,
  values: Record<string, string | undefined>,
  environment: EnvironmentName,
): LeadNotification {
  const to = values.LEAD_NOTIFICATION_EMAIL;
  const from = values.RESEND_FROM;

  if (!to || !from) {
    throw new Error("Contact notification email settings are missing.");
  }

  const subject = `New AOHYS lead: ${lead.intent}`;
  const dashboardUrl = values.PUBLIC_SITE_URL
    ? `${values.PUBLIC_SITE_URL.replace(/\/$/, "")}/dashboard/leads`
    : undefined;
  const text = [
    `Lead: ${lead.name}`,
    `Email: ${lead.email}`,
    `Preferred contact: ${lead.preferredContactPath}`,
    lead.phone ? `Phone: ${lead.phone}` : undefined,
    lead.company ? `Company: ${lead.company}` : undefined,
    `Intent: ${lead.intent}`,
    `Locale: ${lead.locale}`,
    `Environment: ${environment}`,
    `Source: ${lead.sourcePath}`,
    lead.referrer ? `Referrer: ${lead.referrer}` : undefined,
    dashboardUrl ? `Dashboard: ${dashboardUrl}` : undefined,
    "",
    lead.message,
  ]
    .filter(Boolean)
    .join("\n");

  const html = renderLeadNotificationEmail({
    leadId,
    lead,
    dashboardUrl,
    environment,
  });

  return {
    leadId,
    to,
    from,
    replyTo: lead.email,
    subject,
    text,
    html,
  };
}

function renderLeadNotificationEmail({
  leadId,
  lead,
  dashboardUrl,
  environment,
}: {
  leadId: string;
  lead: PreparedContactLead;
  dashboardUrl?: string;
  environment: EnvironmentName;
}): string {
  const escapedMessage = escapeHtml(lead.message).replace(/\n/g, "<br />");
  const rows = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Preferred contact", lead.preferredContactPath],
    ["Intent", lead.intent],
    ["Locale", lead.locale],
    ["Environment", environment],
    ["Source", lead.sourcePath],
    lead.company ? ["Company", lead.company] : undefined,
    lead.phone ? ["Phone", lead.phone] : undefined,
    lead.referrer ? ["Referrer", lead.referrer] : undefined,
  ].filter(Boolean) as Array<[string, string]>;

  const metadataRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding: 10px 0; color: #4b5f64; font-size: 12px; font-weight: 700; text-transform: uppercase;">${escapeHtml(label)}</td>
      <td style="padding: 10px 0; color: #102126; font-size: 14px;">${escapeHtml(value)}</td>
    </tr>
  `).join("");

  const dashboardLink = dashboardUrl
    ? `<a href="${escapeHtml(dashboardUrl)}" style="display: inline-block; padding: 12px 16px; background: #0f8a73; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none;">Open lead inbox</a>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin: 0; background: #edf8f5; color: #102126; font-family: Arial, Helvetica, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden;">New AOHYS lead from ${escapeHtml(lead.name)}.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #edf8f5; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #ffffff; border: 1px solid #cfe4df;">
            <tr>
              <td style="padding: 28px 28px 20px;">
                <p style="margin: 0 0 10px; color: #0f8a73; font-size: 12px; font-weight: 800; letter-spacing: .02em; text-transform: uppercase;">AOHYS contact</p>
                <h1 style="margin: 0; color: #102126; font-size: 28px; line-height: 1.12;">New ${escapeHtml(lead.intent)} request</h1>
                <p style="margin: 12px 0 0; color: #4b5f64; font-size: 15px; line-height: 1.6;">Reply directly to this email. The sender is already set as reply-to.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 28px 8px;">
                <div style="background: #fff7dc; border: 1px solid #efd083; padding: 16px 18px;">
                  <p style="margin: 0 0 8px; color: #6d4b00; font-size: 12px; font-weight: 800; text-transform: uppercase;">Message</p>
                  <p style="margin: 0; color: #102126; font-size: 16px; line-height: 1.65;">${escapedMessage}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 28px 4px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                  ${metadataRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 28px 30px;">
                ${dashboardLink}
                <p style="margin: 18px 0 0; color: #6b7c80; font-size: 12px; line-height: 1.5;">Lead ID: ${escapeHtml(leadId)}. This email intentionally avoids analytics payloads and only includes the submitted contact context.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildLeadAnalyticsEvent(
  leadId: string,
  lead: PreparedContactLead,
  environment: EnvironmentName,
): LeadAnalyticsEvent {
  return {
    event: "lead_submitted",
    distinctId: `lead:${leadId}`,
    properties: {
      leadId,
      environment,
      intent: lead.intent,
      preferredContactPath: lead.preferredContactPath,
      locale: lead.locale,
      sourcePath: lead.sourcePath,
      hasCompany: Boolean(lead.company),
      hasPhone: Boolean(lead.phone),
    },
  };
}

export async function submitContactLead(
  input: ContactLeadInput,
  context: ContactWorkflowContext,
): Promise<ContactLeadResult> {
  const now = context.now ?? Date.now();
  const lead = prepareContactLead(input, now);
  const { leadId } = await context.adapters.persistLead(lead);
  let notificationId: string | undefined;
  let notificationStatus: ContactLeadResult["notificationStatus"] = "skipped";
  let analyticsStatus: ContactLeadResult["analyticsStatus"] = "skipped";

  if (hasAnalyticsSettings(context.values)) {
    try {
      await context.adapters.captureAnalyticsEvent(buildLeadAnalyticsEvent(leadId, lead, context.environment));
      analyticsStatus = "captured";
    } catch (error) {
      analyticsStatus = "failed";
      await captureProviderFailure(
        buildProviderFailureEvent(
          leadId,
          context.environment,
          "posthog",
          "lead_analytics",
          error,
        ),
        context,
      );
    }
  }

  if (hasNotificationSettings(context.values)) {
    try {
      const notification = await context.adapters.sendNotification(
        buildLeadNotification(leadId, lead, context.values, context.environment),
      );
      notificationId = notification.notificationId;
      notificationStatus = "sent";
    } catch (error) {
      notificationStatus = "failed";
      await captureProviderFailure(
        buildProviderFailureEvent(
          leadId,
          context.environment,
          "resend",
          "lead_notification",
          error,
        ),
        context,
      );
    }
  }

  return {
    leadId,
    notificationId,
    notificationStatus,
    analyticsStatus,
    status: lead.status,
  };
}
