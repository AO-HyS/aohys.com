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
  event: "lead_submitted" | "lead_provider_failed";
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
): LeadNotification {
  const to = values.LEAD_NOTIFICATION_EMAIL;
  const from = values.RESEND_FROM;

  if (!to || !from) {
    throw new Error("Contact notification email settings are missing.");
  }

  const subject = `New AOHYS lead: ${lead.intent}`;
  const text = [
    `Lead: ${lead.name}`,
    `Email: ${lead.email}`,
    `Preferred contact: ${lead.preferredContactPath}`,
    lead.phone ? `Phone: ${lead.phone}` : undefined,
    lead.company ? `Company: ${lead.company}` : undefined,
    `Source: ${lead.sourcePath}`,
    "",
    lead.message,
  ]
    .filter(Boolean)
    .join("\n");

  const html = [
    `<p><strong>Lead:</strong> ${escapeHtml(lead.name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>`,
    `<p><strong>Preferred contact:</strong> ${escapeHtml(lead.preferredContactPath)}</p>`,
    `<p>${escapeHtml(lead.message)}</p>`,
  ].join("");

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

function buildLeadAnalyticsEvent(
  leadId: string,
  lead: PreparedContactLead,
): LeadAnalyticsEvent {
  return {
    event: "lead_submitted",
    distinctId: `lead:${leadId}`,
    properties: {
      leadId,
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
      await context.adapters.captureAnalyticsEvent(buildLeadAnalyticsEvent(leadId, lead));
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
        buildLeadNotification(leadId, lead, context.values),
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
