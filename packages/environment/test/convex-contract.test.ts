import { describe, expect, it } from "vitest";
import {
  getEnvironmentVariableDefinitions,
  validateEnvironmentContract,
} from "../src/index.js";

const validPreviewValues = {
  AOHYS_ENV: "preview",
  PUBLIC_SITE_URL: "https://preview.aohys.com",
  PUBLIC_CONTACT_ENDPOINT: "https://aohys-preview.convex.site/contact",
  CONVEX_URL: "https://aohys-preview.convex.cloud",
  CONVEX_DEPLOYMENT: "preview:aohys-preview",
  CONVEX_SITE_URL: "https://aohys-preview.convex.site",
  CONVEX_DEPLOY_KEY: "preview-deploy-key",
  PUBLIC_POSTHOG_KEY: "phc_preview",
  PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  PUBLIC_POSTHOG_AUTOCAPTURE: "false",
  RESEND_API_KEY: "re_preview",
  RESEND_FROM: "Alejandro Ortiz <contact@aohys.com>",
  LEAD_NOTIFICATION_EMAIL: "alejandro.ortiz@aohys.com",
  BETTER_AUTH_SECRET: "preview-secret",
  BETTER_AUTH_URL: "https://preview.aohys.com",
  ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
  CLOUDFLARE_ACCOUNT_ID: "cloudflare-account",
  CLOUDFLARE_PROJECT_NAME: "aohys-com",
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: "images-hash",
  PUBLIC_CONTACT_EMAIL: "alejandro.ortiz@aohys.com",
  PUBLIC_WHATSAPP_URL: "https://wa.me/522299020825",
};

describe("Convex Environment Contract", () => {
  it("classifies Convex variables and validates provider outputs without exposing secrets publicly", () => {
    const definitions = getEnvironmentVariableDefinitions().filter(
      (definition) => definition.provider === "convex",
    );
    const byName = new Map(definitions.map((definition) => [definition.name, definition]));

    expect(byName.get("CONVEX_URL")).toMatchObject({
      classification: "provider-output",
      exposure: "server-only",
    });
    expect(byName.get("CONVEX_DEPLOYMENT")).toMatchObject({
      classification: "provider-output",
      exposure: "server-only",
    });
    expect(byName.get("CONVEX_SITE_URL")).toMatchObject({
      classification: "provider-output",
      exposure: "server-only",
    });
    expect(byName.get("CONVEX_DEPLOY_KEY")).toMatchObject({
      classification: "server-secret",
      exposure: "server-only",
    });
    expect(definitions.every((definition) => !definition.name.startsWith("PUBLIC_"))).toBe(true);

    expect(getEnvironmentVariableDefinitions()).toContainEqual(
      expect.objectContaining({
        name: "PUBLIC_CONTACT_ENDPOINT",
        classification: "public-build-value",
        exposure: "public-browser",
      }),
    );

    const missingPreview = validateEnvironmentContract("preview", {
      ...validPreviewValues,
      CONVEX_URL: undefined,
    });

    expect(missingPreview.ok).toBe(false);
    expect(missingPreview.errors).toContain("CONVEX_URL is required for preview.");

    const validPreview = validateEnvironmentContract("preview", validPreviewValues);

    expect(validPreview).toEqual({ ok: true, errors: [] });
  });

  it("classifies PostHog browser values as public and keeps autocapture explicit", () => {
    const definitions = getEnvironmentVariableDefinitions().filter(
      (definition) => definition.provider === "posthog",
    );

    expect(definitions).toEqual([
      expect.objectContaining({
        name: "PUBLIC_POSTHOG_KEY",
        classification: "public-build-value",
        exposure: "public-browser",
        requiredIn: ["preview", "production"],
      }),
      expect.objectContaining({
        name: "PUBLIC_POSTHOG_HOST",
        classification: "public-build-value",
        exposure: "public-browser",
        requiredIn: ["local", "preview", "production"],
      }),
      expect.objectContaining({
        name: "PUBLIC_POSTHOG_AUTOCAPTURE",
        classification: "policy-value",
        exposure: "public-browser",
        requiredIn: ["local", "preview", "production"],
      }),
    ]);

    const missingPostHog = validateEnvironmentContract("production", {
      ...validPreviewValues,
      AOHYS_ENV: "production",
      PUBLIC_SITE_URL: "https://aohys.com",
      PUBLIC_POSTHOG_KEY: undefined,
    });

    expect(missingPostHog.ok).toBe(false);
    expect(missingPostHog.errors).toContain("PUBLIC_POSTHOG_KEY is required for production.");
  });
});
