import { describe, expect, it } from "vitest";
import {
  buildContactIntakeFailureEvent,
  buildPublicContactError,
} from "../src/contact-http.js";

describe("contact HTTP error boundary", () => {
  it("maps validation, email provider, and backend failures to safe public codes", () => {
    expect(buildPublicContactError(new Error("email must be valid."))).toEqual({
      status: 400,
      body: {
        ok: false,
        code: "validation_error",
        error: "Contact submission is invalid.",
      },
    });

    expect(buildPublicContactError(new Error("phone is required."))).toEqual({
      status: 400,
      body: {
        ok: false,
        code: "validation_error",
        error: "Contact submission is invalid.",
      },
    });

    expect(buildPublicContactError(new Error("Resend notification failed with status 500."))).toEqual({
      status: 502,
      body: {
        ok: false,
        code: "email_delivery_failed",
        error: "Contact notification could not be sent.",
      },
    });

    expect(buildPublicContactError(new Error("database timeout with client@example.com"))).toEqual({
      status: 502,
      body: {
        ok: false,
        code: "backend_unavailable",
        error: "Contact backend is temporarily unavailable.",
      },
    });
  });

  it("builds sanitized PostHog intake failure events without contact identity", () => {
    const publicError = buildPublicContactError(new Error("database timeout with client@example.com"));
    const event = buildContactIntakeFailureEvent({
      environment: "preview",
      input: {
        name: "Private Person",
        email: "client@example.com",
        company: "Private Company",
        phone: "+52 229 000 0000",
        preferredContactPath: "whatsapp",
        intent: "project",
        message: "Private project details.",
        sourcePath: "/contact",
        locale: "en",
      },
      publicError,
      error: new Error("database timeout with client@example.com"),
    });

    expect(event).toEqual({
      event: "lead_intake_failed",
      distinctId: "lead-intake:preview",
      properties: {
        environment: "preview",
        code: "backend_unavailable",
        status: 502,
        errorType: "Error",
        sourcePath: "/contact",
        locale: "en",
        intent: "project",
        preferredContactPath: "whatsapp",
        hasCompany: true,
        hasPhone: true,
      },
    });
    expect(JSON.stringify(event)).not.toContain("client@example.com");
    expect(JSON.stringify(event)).not.toContain("Private project details");
    expect(JSON.stringify(event)).not.toContain("Private Person");
  });
});
