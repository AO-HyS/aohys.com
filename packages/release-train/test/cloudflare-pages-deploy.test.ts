import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildCloudflarePagesDeployPlan,
  ensureCloudflarePagesDomain,
  extractCloudflarePagesDeploymentUrl,
  parseCloudflareProductionDomainEnvironment,
  validateReleaseEnvironment,
} from "../src/index.js";

function cloudflareResponse<T>(result: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify({ success: init?.status ? init.status < 400 : true, result }), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

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
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: "cloudflare-images-hash",
  CLOUDFLARE_IMAGES_API_TOKEN: "cloudflare-images-token",
  PUBLISH_GITHUB_TOKEN: "github-publish-token",
  PUBLIC_CONTACT_EMAIL: "alejandro.ortiz@aohys.com",
  PUBLIC_WHATSAPP_URL: "https://wa.me/522299020825",
};

describe("Cloudflare Pages release plan", () => {
  it("leaves an active production domain unchanged", async () => {
    const requests: Array<{ input: string; init?: RequestInit }> = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input: String(input), init });
      return cloudflareResponse([{ name: "aohys.com", status: "active" }]);
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        fetchImpl,
      }),
    ).resolves.toEqual({
      created: false,
      domain: { name: "aohys.com", status: "active" },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.init?.method).toBe("GET");
    expect(requests[0]?.init?.headers).toMatchObject({ Authorization: "Bearer secret-token" });
  });

  it("still verifies apex DNS when Pages already reports the domain active", async () => {
    const responses = [
      cloudflareResponse([{ name: "aohys.com", status: "active" }]),
      cloudflareResponse([{ id: "zone-id", name: "aohys.com", status: "active" }]),
      cloudflareResponse([
        {
          id: "record-id",
          name: "aohys.com",
          type: "CNAME",
          content: "aohys-com.pages.dev",
          proxied: true,
        },
      ]),
    ];
    const fetchImpl = async () => {
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        reconcileDns: true,
        fetchImpl,
      }),
    ).resolves.toMatchObject({ domain: { status: "active" } });
    expect(responses).toHaveLength(0);
  });

  it("creates a missing domain once and polls until Cloudflare activates it", async () => {
    const responses = [
      cloudflareResponse([]),
      cloudflareResponse({ name: "aohys.com", status: "initializing" }),
      cloudflareResponse({ name: "aohys.com", status: "pending" }),
      cloudflareResponse({ name: "aohys.com", status: "active" }),
    ];
    const requests: RequestInit[] = [];
    const fetchImpl = async (_input: string | URL | Request, init?: RequestInit) => {
      requests.push(init ?? {});
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        fetchImpl,
        maxPollAttempts: 2,
        pollIntervalMs: 0,
        sleep: async () => undefined,
      }),
    ).resolves.toEqual({
      created: true,
      domain: { name: "aohys.com", status: "active" },
    });
    expect(requests.map((request) => request.method)).toEqual(["GET", "POST", "GET", "GET"]);
    expect(requests[1]?.body).toBe(JSON.stringify({ name: "aohys.com" }));
  });

  it("creates the proxied apex CNAME only when no routing record exists", async () => {
    const responses = [
      cloudflareResponse([{ name: "aohys.com", status: "pending" }]),
      cloudflareResponse([{ id: "zone-id", name: "aohys.com", status: "active" }]),
      cloudflareResponse([]),
      cloudflareResponse({
        id: "record-id",
        name: "aohys.com",
        type: "CNAME",
        content: "aohys-com.pages.dev",
        proxied: true,
      }),
      cloudflareResponse({ name: "aohys.com", status: "active" }),
    ];
    const requests: Array<{ input: string; init?: RequestInit }> = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input: String(input), init });
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        reconcileDns: true,
        fetchImpl,
        pollIntervalMs: 0,
        sleep: async () => undefined,
      }),
    ).resolves.toMatchObject({ domain: { status: "active" } });
    expect(requests.map((request) => request.init?.method)).toEqual([
      "GET",
      "GET",
      "GET",
      "POST",
      "GET",
    ]);
    expect(requests[3]?.init?.body).toBe(
      JSON.stringify({
        type: "CNAME",
        name: "aohys.com",
        content: "aohys-com.pages.dev",
        proxied: true,
        ttl: 1,
        comment: "Managed by the AOHYS production release train",
      }),
    );
  });

  it("retries Pages validation when DNS belongs to an external Cloudflare account", async () => {
    const responses = [
      cloudflareResponse([{ name: "aohys.com", status: "pending" }]),
      cloudflareResponse({ name: "aohys.com", status: "active" }),
    ];
    const methods: Array<string | undefined> = [];
    const urls: string[] = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      urls.push(String(input));
      methods.push(init?.method);
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "pages-account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        reconcileDns: true,
        dnsZoneAccount: "external",
        fetchImpl,
      }),
    ).resolves.toMatchObject({ domain: { status: "active" } });
    expect(methods).toEqual(["GET", "PATCH"]);
    expect(urls.every((url) => !url.includes("/zones"))).toBe(true);
  });

  it("fails closed when an explicitly same-account zone is missing", async () => {
    const responses = [
      cloudflareResponse([{ name: "aohys.com", status: "pending" }]),
      cloudflareResponse([]),
    ];
    const methods: Array<string | undefined> = [];
    const fetchImpl = async (_input: string | URL | Request, init?: RequestInit) => {
      methods.push(init?.method);
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "pages-account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        reconcileDns: true,
        dnsZoneAccount: "pages-account",
        fetchImpl,
      }),
    ).rejects.toThrow("not active in the Pages project account");
    expect(methods).toEqual(["GET", "GET"]);
  });

  it("refuses to overwrite conflicting apex DNS records", async () => {
    const responses = [
      cloudflareResponse([{ name: "aohys.com", status: "pending" }]),
      cloudflareResponse([{ id: "zone-id", name: "aohys.com", status: "active" }]),
      cloudflareResponse([
        { id: "record-id", name: "aohys.com", type: "A", content: "192.0.2.1", proxied: true },
      ]),
    ];
    const fetchImpl = async () => {
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        reconcileDns: true,
        fetchImpl,
      }),
    ).rejects.toThrow("refusing to overwrite");
  });

  it("recovers an ambiguous DNS create when the expected record now exists", async () => {
    const responses: Array<Response | Error> = [
      cloudflareResponse([{ name: "aohys.com", status: "pending" }]),
      cloudflareResponse([{ id: "zone-id", name: "aohys.com", status: "active" }]),
      cloudflareResponse([]),
      new Error("connection closed after upload"),
      cloudflareResponse([
        {
          id: "record-id",
          name: "aohys.com",
          type: "CNAME",
          content: "aohys-com.pages.dev",
          proxied: true,
        },
      ]),
      cloudflareResponse({ name: "aohys.com", status: "active" }),
    ];
    const fetchImpl = async () => {
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      if (response instanceof Error) throw response;
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        reconcileDns: true,
        fetchImpl,
        pollIntervalMs: 0,
        sleep: async () => undefined,
      }),
    ).resolves.toMatchObject({ domain: { status: "active" } });
    expect(responses).toHaveLength(0);
  });

  it("surfaces terminal validation errors without deleting or recreating the domain", async () => {
    const fetchImpl = async () =>
      cloudflareResponse([
        {
          name: "aohys.com",
          status: "blocked",
          validation_data: { status: "error", error_message: "DNS validation failed" },
        },
      ]);

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        fetchImpl,
      }),
    ).rejects.toThrow("DNS validation failed");
  });

  it("retries a stale validation once and then waits for activation", async () => {
    const responses = [
      cloudflareResponse([{ name: "aohys.com", status: "error" }]),
      cloudflareResponse({ name: "aohys.com", status: "pending" }),
      cloudflareResponse({ name: "aohys.com", status: "active" }),
    ];
    const methods: Array<string | undefined> = [];
    const fetchImpl = async (_input: string | URL | Request, init?: RequestInit) => {
      methods.push(init?.method);
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        fetchImpl,
        pollIntervalMs: 0,
        sleep: async () => undefined,
      }),
    ).resolves.toMatchObject({ domain: { status: "active" } });
    expect(methods).toEqual(["GET", "PATCH", "GET"]);
  });

  it("repairs missing DNS before retrying a stale Pages validation", async () => {
    const responses = [
      cloudflareResponse([{ name: "aohys.com", status: "error" }]),
      cloudflareResponse([{ id: "zone-id", name: "aohys.com", status: "active" }]),
      cloudflareResponse([]),
      cloudflareResponse({
        id: "record-id",
        name: "aohys.com",
        type: "CNAME",
        content: "aohys-com.pages.dev",
        proxied: true,
      }),
      cloudflareResponse({ name: "aohys.com", status: "pending" }),
      cloudflareResponse({ name: "aohys.com", status: "active" }),
    ];
    const methods: Array<string | undefined> = [];
    const fetchImpl = async (_input: string | URL | Request, init?: RequestInit) => {
      methods.push(init?.method);
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        reconcileDns: true,
        fetchImpl,
        pollIntervalMs: 0,
        sleep: async () => undefined,
      }),
    ).resolves.toMatchObject({ domain: { status: "active" } });
    expect(methods).toEqual(["GET", "GET", "GET", "POST", "PATCH", "GET"]);
  });

  it("retries transient API failures without exposing the token", async () => {
    const responses = [
      new Response("temporarily unavailable", { status: 503 }),
      cloudflareResponse([{ name: "aohys.com", status: "active" }]),
    ];
    const fetchImpl = async () => {
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        fetchImpl,
        retryDelayMs: 0,
        sleep: async () => undefined,
      }),
    ).resolves.toMatchObject({ domain: { status: "active" } });

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        fetchImpl: async () => {
          throw new Error("request secret-token failed");
        },
        maxRequestAttempts: 1,
      }),
    ).rejects.not.toThrow("secret-token");
  });

  it("bounds individual requests and reports malformed provider responses safely", async () => {
    const fetchImpl = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("request aborted")));
      });

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        fetchImpl,
        requestTimeoutMs: 1,
        maxRequestAttempts: 1,
      }),
    ).rejects.toThrow("could not complete");

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        fetchImpl: async () => new Response("not json", { status: 502 }),
        maxRequestAttempts: 1,
      }),
    ).rejects.toThrow("malformed JSON with HTTP 502");
  });

  it("parses only the production canonical-domain CLI contract", () => {
    expect(
      parseCloudflareProductionDomainEnvironment({
        AOHYS_ENV: "production",
        PUBLIC_SITE_URL: "https://aohys.com",
        CLOUDFLARE_ACCOUNT_ID: "account-id",
        CLOUDFLARE_API_TOKEN: "token",
        CLOUDFLARE_PROJECT_NAME: "aohys-com",
      }),
    ).toEqual({
      accountId: "account-id",
      apiToken: "token",
      projectName: "aohys-com",
      domainName: "aohys.com",
    });
    expect(() =>
      parseCloudflareProductionDomainEnvironment({
        AOHYS_ENV: "preview",
        PUBLIC_SITE_URL: "https://aohys.com",
      }),
    ).toThrow("only with AOHYS_ENV=production");
    expect(() =>
      parseCloudflareProductionDomainEnvironment({
        AOHYS_ENV: "production",
        PUBLIC_SITE_URL: "https://www.aohys.com",
      }),
    ).toThrow("PUBLIC_SITE_URL=https://aohys.com");
    expect(() =>
      parseCloudflareProductionDomainEnvironment({
        AOHYS_ENV: "production",
        PUBLIC_SITE_URL: "https://aohys.com",
        CLOUDFLARE_PROJECT_NAME: "wrong-project",
      }),
    ).toThrow("CLOUDFLARE_PROJECT_NAME=aohys-com");
  });

  it("recovers from a concurrent domain creation race by re-reading the domain", async () => {
    const responses = [
      cloudflareResponse([]),
      new Response(
        JSON.stringify({ success: false, result: null, errors: [{ message: "Domain already exists" }] }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
      cloudflareResponse([{ name: "aohys.com", status: "active" }]),
    ];
    const fetchImpl = async () => {
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request");
      return response;
    };

    await expect(
      ensureCloudflarePagesDomain({
        accountId: "account-id",
        apiToken: "secret-token",
        projectName: "aohys-com",
        domainName: "aohys.com",
        fetchImpl,
      }),
    ).resolves.toEqual({
      created: false,
      domain: { name: "aohys.com", status: "active" },
    });
  });

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

    const missingImagesConfig = validateReleaseEnvironment("preview", {
      ...validPreviewReleaseValues,
      CLOUDFLARE_IMAGES_ACCOUNT_HASH: undefined,
      CLOUDFLARE_IMAGES_API_TOKEN: undefined,
    });

    expect(missingImagesConfig.ok).toBe(false);
    expect(missingImagesConfig.errors).toContain(
      "CLOUDFLARE_IMAGES_ACCOUNT_HASH is required for preview release.",
    );
    expect(missingImagesConfig.errors).toContain(
      "CLOUDFLARE_IMAGES_API_TOKEN is required for preview release.",
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

  it("extracts the latest Cloudflare Pages deployment URL from Wrangler output", () => {
    expect(
      extractCloudflarePagesDeploymentUrl(`
        Deployment complete!
        Preview URL: https://older-release.aohys-com.pages.dev
        Deployment: https://ff7ed5fa.aohys-com.pages.dev
      `),
    ).toBe("https://ff7ed5fa.aohys-com.pages.dev");

    expect(extractCloudflarePagesDeploymentUrl("Deployment failed before Pages returned a URL.")).toBe(
      undefined,
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
    expect(rootPackage.scripts["audit:posthog-env"]).toBe(
      "tsx scripts/audit-posthog-env-separation.ts",
    );
    expect(rootPackage.scripts["audit:cloudflare-pages-runtime"]).toBe(
      "tsx scripts/audit-cloudflare-pages-runtime.ts",
    );
    expect(rootPackage.scripts["sync:convex-env:preview"]).toBe(
      "tsx scripts/sync-convex-env.ts preview",
    );
    expect(rootPackage.scripts["sync:convex-env:production"]).toBe(
      "tsx scripts/sync-convex-env.ts production",
    );
    expect(rootPackage.scripts["seed:dashboard:preview"]).toBe(
      "tsx scripts/seed-dashboard-preview.ts",
    );
    expect(rootPackage.scripts["publish:content:build"]).toBe(
      "tsx scripts/apply-dashboard-published-content.ts",
    );
    expect(rootPackage.scripts["deploy:preview"]).toBe(
      "pnpm run release:env:preview && pnpm run audit:posthog-env && pnpm run audit:cloudflare-pages-runtime && pnpm run sync:convex-env:preview && env -u CONVEX_DEPLOYMENT pnpm --filter @aohys/backend exec convex deploy --typecheck enable --codegen enable --message \"preview release\" && pnpm run seed:dashboard:preview && pnpm run publish:content:build && pnpm --filter @aohys/site build && pnpm exec wrangler pages deploy apps/site/dist --project-name aohys-com --branch develop",
    );
    expect(rootPackage.scripts["deploy:production"]).toBe(
      "pnpm run release:env:production && pnpm run audit:posthog-env && pnpm run audit:cloudflare-pages-runtime && pnpm run sync:convex-env:production && env -u CONVEX_DEPLOYMENT pnpm --filter @aohys/backend exec convex deploy --typecheck enable --codegen enable --message \"production release\" && pnpm run publish:content:build && pnpm --filter @aohys/site build && pnpm exec wrangler pages deploy apps/site/dist --project-name aohys-com --branch main && pnpm run ensure:cloudflare-production-domain",
    );
    expect(rootPackage.scripts["ensure:cloudflare-production-domain"]).toBe(
      "tsx scripts/ensure-cloudflare-pages-domain.ts",
    );

    expect(existsSync(workflowPath), "release-train.yml must exist").toBe(true);
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("environment: preview");
    expect(workflow).toContain("environment: production");
    expect(workflow).toContain("pnpm run deploy:preview");
    expect(workflow).toContain("pnpm run deploy:production");
    expect(workflow).toContain("pnpm run audit:cloudflare-pages-runtime");
    expect(workflow).toContain("sync:convex-env");
    expect(workflow).toContain("scripts/extract-cloudflare-pages-deployment-url.ts");
    expect(workflow).toContain("SMOKE_BASE_URL: ${{ steps.deploy-preview.outputs.smoke_base_url }}");
    expect(workflow).toContain("CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}");
    expect(workflow).toContain("CLOUDFLARE_IMAGES_ACCOUNT_HASH: ${{ vars.CLOUDFLARE_IMAGES_ACCOUNT_HASH }}");
    expect(workflow).toContain("CLOUDFLARE_IMAGES_API_TOKEN: ${{ secrets.CLOUDFLARE_IMAGES_API_TOKEN }}");
    expect(workflow).toContain("CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}");
    expect(workflow).toContain("BETTER_AUTH_TRUSTED_ORIGINS: ${{ vars.BETTER_AUTH_TRUSTED_ORIGINS }}");
    expect(workflow).not.toContain("DASHBOARD_API_TOKEN");
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
