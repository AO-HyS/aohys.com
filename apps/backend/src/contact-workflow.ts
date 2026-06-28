import { assertOneOf, escapeHtml, trimToUndefined } from "@aohys/core";
import {
  validateEnvironmentContract,
  type EnvironmentName,
} from "@aohys/environment";
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
  event: "lead_submitted";
  distinctId: string;
  properties: {
    leadId: string;
    intent: LeadIntent;
    preferredContactPath: PreferredContactPath;
    locale: LeadLocale;
    sourcePath: string;
    hasCompany: boolean;
    hasPhone: boolean;
  };
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
  status: "new";
}

const REQUIRED_CONTACT_SETTINGS = [
  "CONVEX_URL",
  "CONVEX_SITE_URL",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "LEAD_NOTIFICATION_EMAIL",
  "PUBLIC_POSTHOG_KEY",
  "PUBLIC_POSTHOG_HOST",
] as const;

function assertContactProviderSettings(
  environment: EnvironmentName,
  values: Record<string, string | undefined>,
): void {
  const contract = validateEnvironmentContract(environment, values);
  const errors = [...contract.errors];

  for (const settingName of REQUIRED_CONTACT_SETTINGS) {
    if (!values[settingName]) {
      errors.push(`${settingName} is required for contact submissions.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Contact providers are not configured: ${errors.join(" ")}`);
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
  assertContactProviderSettings(context.environment, context.values);
  const lead = prepareContactLead(input, now);
  const { leadId } = await context.adapters.persistLead(lead);
  const notification = await context.adapters.sendNotification(
    buildLeadNotification(leadId, lead, context.values),
  );

  await context.adapters.captureAnalyticsEvent(buildLeadAnalyticsEvent(leadId, lead));

  return {
    leadId,
    notificationId: notification.notificationId,
    status: lead.status,
  };
}
