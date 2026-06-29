import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildCloudflarePagesDeployPlan,
  validateReleaseEnvironment,
} from "../src/index.js";

const validPreviewReleaseValues = {
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
  PUBLIC_CONTACT_EMAIL: "alejandro.ortiz@aohys.com",
  PUBLIC_WHATSAPP_URL: "https://wa.me/522299020825",
};

describe("Cloudflare Pages release plan", () => {
  it("maps preview and production to Wrangler Pages direct-upload commands", () => {
    expect(buildCloudflarePagesDeployPlan("preview")).toEqual({
      environment: "preview",
      githubEnvironment: "preview",
      branch: "develop",
      projectName: "aohys-com",
      directory: "apps/site/dist",
      command: [
        "wrangler",
        "pages",
        "deploy",
        "apps/site/dist",
        "--project-name",
        "aohys-com",
        "--branch",
        "develop",
      ],
      siteUrl: "https://preview.aohys.com",
      canonicalUrl: "https://aohys.com",
    });

    expect(buildCloudflarePagesDeployPlan("production")).toEqual({
      environment: "production",
      githubEnvironment: "production",
      branch: "main",
      projectName: "aohys-com",
      directory: "apps/site/dist",
      command: [
        "wrangler",
        "pages",
        "deploy",
        "apps/site/dist",
        "--project-name",
        "aohys-com",
        "--branch",
        "main",
      ],
      siteUrl: "https://aohys.com",
      canonicalUrl: "https://aohys.com",
    });
  });

  it("validates deploy-time environment values before Wrangler runs", () => {
    expect(validateReleaseEnvironment("preview", validPreviewReleaseValues)).toEqual({
      ok: true,
      errors: [],
    });

    const missingCloudflareToken = validateReleaseEnvironment("preview", {
      ...validPreviewReleaseValues,
      CLOUDFLARE_API_TOKEN: undefined,
    });

    expect(missingCloudflareToken.ok).toBe(false);
    expect(missingCloudflareToken.errors).toContain(
      "CLOUDFLARE_API_TOKEN is required for preview release.",
    );

    const productionWithPreviewTargets = validateReleaseEnvironment("production", {
      ...validPreviewReleaseValues,
      AOHYS_ENV: "production",
      PUBLIC_SITE_URL: "https://preview.aohys.com",
    });

    expect(productionWithPreviewTargets.ok).toBe(false);
    expect(productionWithPreviewTargets.errors).toContain(
      "PUBLIC_SITE_URL must point to https://aohys.com in production.",
    );
    expect(productionWithPreviewTargets.errors).toContain(
      "CONVEX_DEPLOYMENT must not point to preview in production.",
    );
  });

  it("exposes repository release scripts and a protected GitHub Actions workflow", () => {
    const repoRoot = path.resolve(process.cwd(), "../..");
    const rootPackage = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const workflowPath = path.join(repoRoot, ".github", "workflows", "release-train.yml");

    expect(rootPackage.scripts["release:env:preview"]).toBe(
      "tsx scripts/validate-release-env.ts preview",
    );
    expect(rootPackage.scripts["release:env:production"]).toBe(
      "tsx scripts/validate-release-env.ts production",
    );
    expect(rootPackage.scripts["deploy:preview"]).toBe(
      "pnpm run release:env:preview && env -u CONVEX_DEPLOYMENT pnpm --filter @aohys/backend exec convex deploy --typecheck enable --codegen enable --message \"preview release\" && pnpm --filter @aohys/site build && pnpm exec wrangler pages deploy apps/site/dist --project-name aohys-com --branch develop",
    );
    expect(rootPackage.scripts["deploy:production"]).toBe(
      "pnpm run release:env:production && env -u CONVEX_DEPLOYMENT pnpm --filter @aohys/backend exec convex deploy --typecheck enable --codegen enable --message \"production release\" && pnpm --filter @aohys/site build && pnpm exec wrangler pages deploy apps/site/dist --project-name aohys-com --branch main",
    );

    expect(existsSync(workflowPath), "release-train.yml must exist").toBe(true);
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("environment: preview");
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("pnpm run deploy:preview");
    expect(workflow).toContain("pnpm run deploy:production");
    expect(workflow).toContain("CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}");
    expect(workflow).toContain("CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}");
    expect(workflow).toContain("BETTER_AUTH_TRUSTED_ORIGINS: ${{ vars.BETTER_AUTH_TRUSTED_ORIGINS }}");
    expect(workflow).toContain("GOOGLE_CLIENT_ID: ${{ vars.GOOGLE_CLIENT_ID }}");
    expect(workflow).toContain("GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}");
  });

  it("documents the Cloudflare redirect rule for aohys.net and www canonicalization", () => {
    const repoRoot = path.resolve(process.cwd(), "../..");
    const redirectsPath = path.join(repoRoot, "cloudflare", "redirect-rules.json");

    expect(existsSync(redirectsPath), "redirect-rules.json must exist").toBe(true);
    const redirects = JSON.parse(readFileSync(redirectsPath, "utf8")) as {
      phase: string;
      rules: Array<{
        ref: string;
        expression: string;
        action_parameters: {
          from_value: {
            status_code: number;
            target_url: { expression: string };
            preserve_query_string: boolean;
          };
        };
      }>;
    };
    const canonicalRule = redirects.rules.find(
      (rule) => rule.ref === "aohys_canonical_host_redirect",
    );

    expect(redirects.phase).toBe("http_request_dynamic_redirect");
    expect(canonicalRule).toBeDefined();
    expect(canonicalRule?.expression).toContain("aohys.net");
    expect(canonicalRule?.expression).toContain("www.aohys.net");
    expect(canonicalRule?.expression).toContain("www.aohys.com");
    expect(canonicalRule?.action_parameters.from_value.status_code).toBe(301);
    expect(canonicalRule?.action_parameters.from_value.target_url.expression).toBe(
      'concat("https://aohys.com", http.request.uri.path)',
    );
    expect(canonicalRule?.action_parameters.from_value.preserve_query_string).toBe(true);
  });
});
