export type PublicContactErrorCode =
  | "validation_error"
  | "provider_configuration_error"
  | "email_delivery_failed"
  | "analytics_delivery_failed"
  | "backend_unavailable";

export interface PublicContactError {
  status: 400 | 502 | 503;
  body: {
    ok: false;
    code: PublicContactErrorCode;
    error: string;
  };
}

export function buildPublicContactError(error: unknown): PublicContactError {
  const message = error instanceof Error ? error.message : "";

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
