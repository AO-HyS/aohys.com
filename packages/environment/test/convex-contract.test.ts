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
  BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.aohys.com,http://localhost:4321",
  ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
  GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  CLOUDFLARE_ACCOUNT_ID: "cloudflare-account",
  CLOUDFLARE_API_TOKEN: "cloudflare-api-token",
  CLOUDFLARE_PROJECT_NAME: "aohys-com",
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: "images-hash",
  CLOUDFLARE_IMAGES_API_TOKEN: "cloudflare-images-token",
  PUBLISH_GITHUB_TOKEN: "github-publish-token",
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
      exposure: "public-browser",
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
    expect(missingPreview.errors).toContain("CONVEX_URL is required for preview release.");

    const validPreview = validateEnvironmentContract("preview", validPreviewValues);

    expect(validPreview).toEqual({ ok: true, errors: [] });
  });

  it("separates runtime settings from deploy-only release secrets", () => {
    const runtimePreview = validateEnvironmentContract(
      "preview",
      {
        ...validPreviewValues,
        CONVEX_DEPLOY_KEY: undefined,
        CLOUDFLARE_API_TOKEN: undefined,
      },
      { target: "runtime" },
    );

    expect(runtimePreview).toEqual({ ok: true, errors: [] });

    const releasePreview = validateEnvironmentContract(
      "preview",
      {
        ...validPreviewValues,
        CONVEX_DEPLOY_KEY: undefined,
        CLOUDFLARE_API_TOKEN: undefined,
      },
      { target: "release" },
    );

    expect(releasePreview.ok).toBe(false);
    expect(releasePreview.errors).toContain("CONVEX_DEPLOY_KEY is required for preview release.");
    expect(releasePreview.errors).toContain("CLOUDFLARE_API_TOKEN is required for preview release.");
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

  it("validates Better Auth origins and admin allowlist for dashboard access", () => {
    const definitions = getEnvironmentVariableDefinitions().filter(
      (definition) => definition.provider === "better-auth",
    );

    expect(definitions.map((definition) => definition.name)).toEqual([
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "BETTER_AUTH_TRUSTED_ORIGINS",
      "ADMIN_EMAIL",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
    ]);
    expect(definitions).toContainEqual(
      expect.objectContaining({
        name: "BETTER_AUTH_URL",
        classification: "provider-output",
        exposure: "public-browser",
      }),
    );

    const missingTrustedOrigins = validateEnvironmentContract("preview", {
      ...validPreviewValues,
      BETTER_AUTH_TRUSTED_ORIGINS: undefined,
    });

    expect(missingTrustedOrigins.ok).toBe(false);
    expect(missingTrustedOrigins.errors).toContain(
      "BETTER_AUTH_TRUSTED_ORIGINS is required for preview release.",
    );

    const driftedTrustedOrigins = validateEnvironmentContract("preview", {
      ...validPreviewValues,
      BETTER_AUTH_TRUSTED_ORIGINS: "https://not-aohys.example",
    });

    expect(driftedTrustedOrigins.ok).toBe(false);
    expect(driftedTrustedOrigins.errors).toContain(
      "BETTER_AUTH_TRUSTED_ORIGINS must include BETTER_AUTH_URL.",
    );
    expect(driftedTrustedOrigins.errors).toContain(
      "BETTER_AUTH_TRUSTED_ORIGINS must include PUBLIC_SITE_URL.",
    );

    const invalidAdminEmail = validateEnvironmentContract("preview", {
      ...validPreviewValues,
      ADMIN_EMAIL: "alejandro.ortiz@aohys.com,not-an-email",
    });

    expect(invalidAdminEmail.ok).toBe(false);
    expect(invalidAdminEmail.errors).toContain(
      "ADMIN_EMAIL must contain valid email addresses.",
    );

    const multipleAdminEmails = validateEnvironmentContract("preview", {
      ...validPreviewValues,
      ADMIN_EMAIL: "a.ortizcrr@gmail.com,alejandro.ortiz@aohys.com",
    });

    expect(multipleAdminEmails).toEqual({ ok: true, errors: [] });

    expect(
      getEnvironmentVariableDefinitions().some(
        (definition) => definition.name === "DASHBOARD_API_TOKEN",
      ),
    ).toBe(false);
  });

  it("validates dashboard runtime without requiring contact or release-only provider secrets", () => {
    const dashboardRuntime = validateEnvironmentContract(
      "preview",
      {
        AOHYS_ENV: "preview",
        PUBLIC_SITE_URL: "https://preview.aohys.com",
        CONVEX_URL: "https://aohys-preview.convex.cloud",
        CONVEX_SITE_URL: "https://aohys-preview.convex.site",
        BETTER_AUTH_URL: "https://preview.aohys.com",
        BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.aohys.com,http://localhost:4321",
        ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
        CLOUDFLARE_ACCOUNT_ID: "cloudflare-account",
        CLOUDFLARE_IMAGES_ACCOUNT_HASH: "images-hash",
        CLOUDFLARE_IMAGES_API_TOKEN: "cloudflare-images-token",
        PUBLISH_GITHUB_TOKEN: "github-publish-token",
      },
      { target: "dashboard-runtime" },
    );

    expect(dashboardRuntime).toEqual({ ok: true, errors: [] });

    const dashboardRuntimeWithoutImages = validateEnvironmentContract(
      "preview",
      {
        AOHYS_ENV: "preview",
        PUBLIC_SITE_URL: "https://preview.aohys.com",
        CONVEX_URL: "https://aohys-preview.convex.cloud",
        CONVEX_SITE_URL: "https://aohys-preview.convex.site",
        BETTER_AUTH_URL: "https://preview.aohys.com",
        BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.aohys.com,http://localhost:4321",
        ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
      },
      { target: "dashboard-runtime" },
    );

    expect(dashboardRuntimeWithoutImages).toEqual({ ok: true, errors: [] });

    const missingDashboardAuthTarget = validateEnvironmentContract(
      "preview",
      {
        AOHYS_ENV: "preview",
        PUBLIC_SITE_URL: "https://preview.aohys.com",
        CONVEX_URL: "https://aohys-preview.convex.cloud",
        BETTER_AUTH_URL: "https://preview.aohys.com",
        BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.aohys.com,http://localhost:4321",
        ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
      },
      { target: "dashboard-runtime" },
    );

    expect(missingDashboardAuthTarget.ok).toBe(false);
    expect(missingDashboardAuthTarget.errors).toContain(
      "CONVEX_SITE_URL is required for preview dashboard-runtime.",
    );

    const missingConvexUrl = validateEnvironmentContract(
      "preview",
      {
        AOHYS_ENV: "preview",
        PUBLIC_SITE_URL: "https://preview.aohys.com",
        CONVEX_SITE_URL: "https://aohys-preview.convex.site",
        BETTER_AUTH_URL: "https://preview.aohys.com",
        BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.aohys.com,http://localhost:4321",
        ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
      },
      { target: "dashboard-runtime" },
    );

    expect(missingConvexUrl.ok).toBe(false);
    expect(missingConvexUrl.errors).toContain(
      "CONVEX_URL is required for preview dashboard-runtime.",
    );

    const missingAuthRuntimeOauth = validateEnvironmentContract(
      "preview",
      {
        AOHYS_ENV: "preview",
        PUBLIC_SITE_URL: "https://preview.aohys.com",
        CONVEX_SITE_URL: "https://aohys-preview.convex.site",
        BETTER_AUTH_SECRET: "preview-secret",
        BETTER_AUTH_URL: "https://preview.aohys.com",
        BETTER_AUTH_TRUSTED_ORIGINS: "https://preview.aohys.com,http://localhost:4321",
        ADMIN_EMAIL: "alejandro.ortiz@aohys.com",
      },
      { target: "auth-runtime" },
    );

    expect(missingAuthRuntimeOauth.ok).toBe(false);
    expect(missingAuthRuntimeOauth.errors).toContain(
      "GOOGLE_CLIENT_ID is required for preview auth-runtime.",
    );
    expect(missingAuthRuntimeOauth.errors).toContain(
      "GOOGLE_CLIENT_SECRET is required for preview auth-runtime.",
    );
  });
});
