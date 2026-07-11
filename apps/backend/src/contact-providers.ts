import type { LeadAnalyticsEvent, LeadNotification } from "./contact-workflow.js";

export type ProviderTransport = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export interface ResendNotificationSettings {
  apiKey: string;
  transport?: ProviderTransport;
}

export interface PostHogCaptureSettings {
  apiKey: string;
  host: string;
  transport?: ProviderTransport;
}

const defaultTransport: ProviderTransport = (url, init) => fetch(url, init);

export async function sendLeadNotificationWithResend(
  notification: LeadNotification,
  settings: ResendNotificationSettings,
): Promise<{ notificationId?: string }> {
  const transport = settings.transport ?? defaultTransport;
  const response = await transport("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `lead-notification/${notification.leadId}`,
    },
    body: JSON.stringify({
      from: notification.from,
      to: [notification.to],
      reply_to: [notification.replyTo],
      subject: notification.subject,
      text: notification.text,
      html: notification.html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend notification failed with status ${response.status}.`);
  }

  const payload = await response.json() as { id?: string };

  return { notificationId: payload.id };
}

export async function captureLeadAnalyticsWithPostHog(
  event: LeadAnalyticsEvent,
  settings: PostHogCaptureSettings,
): Promise<void> {
  const transport = settings.transport ?? defaultTransport;
  const host = settings.host.replace(/\/$/, "");
  const response = await transport(`${host}/capture/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: settings.apiKey,
      event: event.event,
      distinct_id: event.distinctId,
      properties: event.properties,
    }),
  });

  if (!response.ok) {
    throw new Error(`PostHog capture failed with status ${response.status}.`);
  }
}
