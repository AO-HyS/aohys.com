import { describe, expect, it } from "vitest";
import {
  resolveContactEnvironment,
  shouldCaptureContactIntakeFailure,
} from "../src/contact-environment.js";

describe("contact environment telemetry gate", () => {
  it.each([undefined, "", "staging", "PRODUCTION"])(
    "fails closed for invalid AOHYS_ENV=%s even with an inherited PostHog key",
    (value) => {
      const environment = resolveContactEnvironment(value);

      expect(environment).toBe("local");
      expect(shouldCaptureContactIntakeFailure(environment, "phc_inherited")).toBe(false);
    },
  );

  it("allows intake-failure telemetry only for explicit production with a key", () => {
    expect(shouldCaptureContactIntakeFailure("production", "phc_production")).toBe(true);
    expect(shouldCaptureContactIntakeFailure("production", " ")).toBe(false);
    expect(shouldCaptureContactIntakeFailure("preview", "phc_inherited")).toBe(false);
  });
});
