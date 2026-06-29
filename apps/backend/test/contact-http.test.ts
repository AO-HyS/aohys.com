import { describe, expect, it } from "vitest";
import { buildPublicContactError } from "../src/contact-http.js";

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
});
