import type { EnvironmentName } from "@aohys/environment";
import { CONTACT_SUBMISSION_RATE_LIMIT_MESSAGE } from "./contact-abuse.js";
import type { ContactLeadInput, LeadAnalyticsEvent } from "./contact-workflow.js";

export type PublicContactErrorCode =
  | "validation_error"
  | "rate_limited"
  | "provider_configuration_error"
  | "email_delivery_failed"
  | "analytics_delivery_failed"
  | "backend_unavailable";

export interface PublicContactError {
  status: 400 | 429 | 502 | 503;
  body: {
    ok: false;
    code: PublicContactErrorCode;
    error: string;
  };
}

export interface ContactIntakeFailureEventInput {
  environment: EnvironmentName;
  input?: Partial<ContactLeadInput>;
  publicError: PublicContactError;
  error: unknown;
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function errorTypeFor(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export function buildContactIntakeFailureEvent({
  environment,
  input,
  publicError,
  error,
}: ContactIntakeFailureEventInput): LeadAnalyticsEvent {
  const sourcePath = safeString(input?.sourcePath);
  const locale = safeString(input?.locale);
  const intent = safeString(input?.intent);
  const preferredContactPath = safeString(input?.preferredContactPath);

  return {
    event: "lead_intake_failed",
    distinctId: `lead-intake:${environment}`,
    properties: {
      environment,
      code: publicError.body.code,
      status: publicError.status,
      error_type: errorTypeFor(error),
      ...(sourcePath ? { source_path: sourcePath } : {}),
      ...(locale ? { locale } : {}),
      ...(intent ? { intent } : {}),
      ...(preferredContactPath ? { preferred_contact_path: preferredContactPath } : {}),
      has_company: Boolean(input?.company),
      has_phone: Boolean(input?.phone),
    },
  };
}

export function buildPublicContactError(error: unknown): PublicContactError {
  const message = error instanceof Error ? error.message : "";

  if (message.includes(CONTACT_SUBMISSION_RATE_LIMIT_MESSAGE)) {
    return {
      status: 429,
      body: {
        ok: false,
        code: "rate_limited",
        error: "Please wait before sending another contact request.",
      },
    };
  }

  if (message.startsWith("Contact providers are not configured")) {
    return {
      status: 503,
      body: {
        ok: false,
        code: "provider_configuration_error",
        error: "Contact providers are not configured.",
      },
    };
  }

  if (message.startsWith("Resend notification failed")) {
    return {
      status: 502,
      body: {
        ok: false,
        code: "email_delivery_failed",
        error: "Contact notification could not be sent.",
      },
    };
  }

  if (message.startsWith("PostHog capture failed")) {
    return {
      status: 502,
      body: {
        ok: false,
        code: "analytics_delivery_failed",
        error: "Contact analytics could not be recorded.",
      },
    };
  }

  if (isValidationMessage(message)) {
    return {
      status: 400,
      body: {
        ok: false,
        code: "validation_error",
        error: "Contact submission is invalid.",
      },
    };
  }

  return {
    status: 502,
    body: {
      ok: false,
      code: "backend_unavailable",
      error: "Contact backend is temporarily unavailable.",
    },
  };
}

function isValidationMessage(message: string): boolean {
  return (
    message.endsWith(" is required.") ||
    message.endsWith(" must be valid.") ||
    message.includes(" is not supported.") ||
    message === "consentToContact must be true." ||
    message === "Invalid contact payload."
  );
}
