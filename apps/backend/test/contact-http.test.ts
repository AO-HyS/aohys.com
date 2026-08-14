import { describe, expect, it } from "vitest";
import {
  buildContactIntakeTelemetryEvent,
  buildPublicContactError,
  parseContactInput,
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

    expect(
      buildPublicContactError(
        new Error("Uncaught Error: Contact submission rate limit exceeded."),
      ),
    ).toEqual({
      status: 429,
      body: {
        ok: false,
        code: "rate_limited",
        error: "Please wait before sending another contact request.",
      },
    });

    expect(
      buildPublicContactError(
        new Error("Resend notification failed with status 500."),
      ),
    ).toEqual({
      status: 502,
      body: {
        ok: false,
        code: "email_delivery_failed",
        error: "Contact notification could not be sent.",
      },
    });

    expect(
      buildPublicContactError(
        new Error("database timeout with client@example.com"),
      ),
    ).toEqual({
      status: 502,
      body: {
        ok: false,
        code: "backend_unavailable",
        error: "Contact backend is temporarily unavailable.",
      },
    });

    expect(
      buildPublicContactError(
        new Error("contact submission did not pass spam checks."),
      ),
    ).toEqual({
      status: 400,
      body: {
        ok: false,
        code: "validation_error",
        error: "Contact submission is invalid.",
      },
    });
  });

  it("parses the real request boundary and rejects malformed JSON", async () => {
    const request = new Request("https://example.test/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    await expect(parseContactInput(request)).rejects.toBeInstanceOf(
      SyntaxError,
    );
  });

  it.each(["null", '{"website":42}', '{"consentToContact":"true"}'])(
    "rejects valid JSON with an invalid contact shape: %s",
    async (body) => {
      const request = new Request("https://example.test/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });

      await expect(parseContactInput(request)).rejects.toThrow(
        "Invalid contact payload.",
      );
    },
  );

  it("separates expected malformed automation from real intake failures", () => {
    const malformedError = new SyntaxError("Unexpected end of JSON input");
    const malformedPublicError = buildPublicContactError(
      new Error("Invalid contact payload."),
    );
    const rejectedEvent = buildContactIntakeTelemetryEvent({
      environment: "production",
      publicError: malformedPublicError,
      error: malformedError,
    });

    expect(rejectedEvent).toEqual({
      event: "lead_intake_rejected",
      distinctId: "lead-rejection:production",
      properties: {
        environment: "production",
        code: "validation_error",
        status: 400,
        error_type: "SyntaxError",
        reason: "malformed_payload",
        has_company: false,
        has_phone: false,
      },
    });

    const invalidShapeError = new Error("Invalid contact payload.");
    expect(
      buildContactIntakeTelemetryEvent({
        environment: "production",
        publicError: buildPublicContactError(invalidShapeError),
        error: invalidShapeError,
      }),
    ).toMatchObject({
      event: "lead_intake_rejected",
      properties: { reason: "invalid_fields", status: 400 },
    });

    const publicError = buildPublicContactError(
      new Error("database timeout with client@example.com"),
    );
    const event = buildContactIntakeTelemetryEvent({
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
        error_type: "Error",
        reason: "backend_failure",
        source_path: "/contact",
        locale: "en",
        intent: "project",
        preferred_contact_path: "whatsapp",
        has_company: true,
        has_phone: true,
      },
    });
    expect(JSON.stringify(event)).not.toContain("client@example.com");
    expect(JSON.stringify(event)).not.toContain("Private project details");
    expect(JSON.stringify(event)).not.toContain("Private Person");
  });
});
