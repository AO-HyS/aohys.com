import assert from "node:assert/strict";
import test from "node:test";
import { auditObservabilityEnvironment } from "./audit-environment.mjs";

const release = "0123456789abcdef0123456789abcdef01234567";

test("accepts one validated release identity across production runtimes", () => {
  assert.deepEqual(
    auditObservabilityEnvironment({
      AOHYS_ENV: "production",
      PUBLIC_SITE_URL: "https://aohys.com",
      PUBLIC_POSTHOG_KEY: "phc_production",
      PUBLIC_RELEASE_SHA: release,
      VITE_RELEASE_SHA: release,
    }),
    [],
  );
});

test("rejects mismatched or malformed production release context", () => {
  const errors = auditObservabilityEnvironment({
    AOHYS_ENV: "production",
    PUBLIC_SITE_URL: "https://aohys.com",
    PUBLIC_POSTHOG_KEY: "phc_production",
    PUBLIC_RELEASE_SHA: release,
    VITE_RELEASE_SHA: "abcdefabcdefabcdefabcdefabcdefabcdefabcd",
  });
  assert.ok(errors.some((error) => error.includes("must match")));
});

test("fails closed when non-production capture is requested", () => {
  assert.deepEqual(
    auditObservabilityEnvironment({
      AOHYS_ENV: "preview",
      ANALYTICS_CAPTURE_ENABLED: "true",
    }),
    ["analytics capture must remain disabled outside production"],
  );
});
