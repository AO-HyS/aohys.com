import type { EnvironmentName } from "@aohys/environment";
import { CONTACT_SUBMISSION_RATE_LIMIT_MESSAGE } from "./contact-abuse.js";
import type {
  ContactLeadInput,
  LeadAnalyticsEvent,
} from "./contact-workflow.js";

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

type ContactIntakeRejectionReason =
  | "malformed_payload"
  | "invalid_fields"
  | "abuse_signal"
  | "rate_limited";

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function errorTypeFor(error: unknown): string {
  const name = error instanceof Error ? error.name : "UnknownError";
  return [
    "AggregateError",
    "Error",
    "RangeError",
    "ReferenceError",
    "SyntaxError",
    "TypeError",
    "URIError",
  ].includes(name)
    ? name
    : "UnknownError";
}

function rejectionReasonFor(
  input: Partial<ContactLeadInput> | undefined,
  publicError: PublicContactError,
  error: unknown,
): ContactIntakeRejectionReason | undefined {
  const message = error instanceof Error ? error.message : "";

  if (publicError.body.code === "rate_limited") return "rate_limited";
  if (message === "contact submission did not pass spam checks.")
    return "abuse_signal";
  if (!input && error instanceof SyntaxError) return "malformed_payload";
  if (publicError.body.code === "validation_error") return "invalid_fields";

  return undefined;
}

export function buildContactIntakeTelemetryEvent({
  environment,
  input,
  publicError,
  error,
}: ContactIntakeFailureEventInput): LeadAnalyticsEvent {
  const sourcePath = safeString(input?.sourcePath);
  const locale = safeString(input?.locale);
  const intent = safeString(input?.intent);
  const preferredContactPath = safeString(input?.preferredContactPath);
  const rejectionReason = rejectionReasonFor(input, publicError, error);

  return {
    event: rejectionReason ? "lead_intake_rejected" : "lead_intake_failed",
    distinctId: rejectionReason
      ? `lead-rejection:${environment}`
      : `lead-intake:${environment}`,
    properties: {
      environment,
      code: publicError.body.code,
      status: publicError.status,
      error_type: errorTypeFor(error),
      reason: rejectionReason ?? "backend_failure",
      ...(sourcePath ? { source_path: sourcePath } : {}),
      ...(locale ? { locale } : {}),
      ...(intent ? { intent } : {}),
      ...(preferredContactPath
        ? { preferred_contact_path: preferredContactPath }
        : {}),
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
    message === "Invalid contact payload." ||
    message === "contact submission did not pass spam checks."
  );
}

export async function parseContactInput(
  request: Request,
): Promise<ContactLeadInput> {
  const payload: unknown = await request.json();

  if (!isContactInputShape(payload)) {
    throw new Error("Invalid contact payload.");
  }

  return payload;
}

function isContactInputShape(payload: unknown): payload is ContactLeadInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const values = payload as Record<string, unknown>;
  const requiredStringFields = [
    "name",
    "email",
    "preferredContactPath",
    "intent",
    "message",
    "sourcePath",
    "locale",
  ];
  const optionalStringFields = ["company", "phone", "referrer", "website"];

  return (
    requiredStringFields.every((field) => typeof values[field] === "string") &&
    optionalStringFields.every(
      (field) =>
        values[field] === undefined || typeof values[field] === "string",
    ) &&
    typeof values.consentToContact === "boolean" &&
    (values.formStartedAt === undefined ||
      (typeof values.formStartedAt === "number" &&
        Number.isFinite(values.formStartedAt)))
  );
}
