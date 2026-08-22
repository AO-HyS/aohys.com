import { describe, expect, it } from "vitest";
import {
  normalizeContactReleaseSha,
  resolveContactEnvironment,
  shouldCaptureContactIntakeFailure,
} from "../src/contact-environment.js";

describe("contact environment telemetry gate", () => {
  it.each([undefined, "", "staging", "PRODUCTION"])(
    "fails closed for invalid AOHYS_ENV=%s even with an inherited PostHog key",
    (value) => {
      const environment = resolveContactEnvironment(value);

      expect(environment).toBe("local");
      expect(
        shouldCaptureContactIntakeFailure(environment, "phc_inherited"),
      ).toBe(false);
    },
  );

  it("allows intake-failure telemetry only for explicit production with a key", () => {
    expect(
      shouldCaptureContactIntakeFailure("production", "phc_production"),
    ).toBe(true);
    expect(shouldCaptureContactIntakeFailure("production", " ")).toBe(false);
    expect(shouldCaptureContactIntakeFailure("preview", "phc_inherited")).toBe(
      false,
    );
  });

  it("accepts only complete git SHAs as backend release context", () => {
    expect(
      normalizeContactReleaseSha("0123456789ABCDEF0123456789ABCDEF01234567"),
    ).toBe("0123456789abcdef0123456789abcdef01234567");
    expect(normalizeContactReleaseSha("main")).toBeUndefined();
  });
});
