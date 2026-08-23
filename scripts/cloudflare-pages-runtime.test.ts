import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getEnvironmentVariableDefinitions } from "@aohys/environment";

import { auditRuntimeBindings } from "./audit-cloudflare-pages-runtime.ts";
import {
  collectCanonicalRuntimeValues,
  RUNTIME_BINDING_NAMES,
  synchronizeCloudflarePagesRuntime,
  type CloudflarePagesProject,
} from "./sync-cloudflare-pages-runtime.ts";

const previewValues = {
  ADMIN_EMAIL: "preview-admin@example.com",
  AOHYS_ENV: "preview",
  BETTER_AUTH_TRUSTED_ORIGINS: "https://develop.aohys-com.pages.dev",
  BETTER_AUTH_URL: "https://preview.aohys.com",
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: "preview-images",
  CONVEX_SITE_URL: "https://preview.convex.site",
  CONVEX_URL: "https://preview.convex.cloud",
  PUBLIC_RELEASE_SHA: "preview-release-sha",
  PUBLIC_SITE_URL: "https://preview.aohys.com",
};

const productionValues = {
  ADMIN_EMAIL: "production-admin@example.com",
  AOHYS_ENV: "production",
  BETTER_AUTH_TRUSTED_ORIGINS: "https://aohys.com",
  BETTER_AUTH_URL: "https://aohys.com",
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: "production-images",
  CONVEX_SITE_URL: "https://production.convex.site",
  CONVEX_URL: "https://production.convex.cloud",
  PUBLIC_POSTHOG_KEY: "phc_production",
  PUBLIC_RELEASE_SHA: "production-release-sha",
  PUBLIC_SITE_URL: "https://aohys.com",
};

function variableMap(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      { type: "plain_text", value },
    ]),
  );
}

function pagesProject(
  preview = previewValues,
  production = productionValues,
): CloudflarePagesProject {
  return {
    deployment_configs: {
      preview: {
        env_vars: variableMap(preview),
        secrets: { PRESERVED_SECRET: { type: "secret_text", value: "hidden" } },
        wrangler_config_hash: "preview-hash",
      },
      production: {
        env_vars: variableMap(production),
        secrets: { PRESERVED_SECRET: { type: "secret_text", value: "hidden" } },
        wrangler_config_hash: "production-hash",
      },
    },
  };
}

test("synchronizes every shared dashboard-runtime binding from the Environment Contract", () => {
  const expectedBindings = getEnvironmentVariableDefinitions()
    .filter(
      (definition) =>
        definition.requiredIn.includes("preview") &&
        definition.requiredIn.includes("production") &&
        definition.requiredTargets?.includes("dashboard-runtime"),
    )
    .map(({ name }) => name)
    .sort();

  assert.deepEqual([...RUNTIME_BINDING_NAMES].sort(), expectedBindings);
});

test("collects only the canonical plaintext bindings for the selected target", () => {
  assert.deepEqual(
    collectCanonicalRuntimeValues("preview", {
      ...previewValues,
      PUBLIC_POSTHOG_KEY: "must-not-reach-preview",
      CLOUDFLARE_API_TOKEN: "must-not-be-synchronized",
    }),
    previewValues,
  );
  assert.deepEqual(
    collectCanonicalRuntimeValues("production", productionValues),
    productionValues,
  );
});

test("skips PATCH when the selected target already matches", async () => {
  const requests: Array<{ method: string; body?: string }> = [];
  const fetchImplementation: typeof fetch = async (_input, init) => {
    requests.push({
      method: init?.method ?? "GET",
      ...(typeof init?.body === "string" ? { body: init.body } : {}),
    });
    return Response.json({ success: true, result: pagesProject() });
  };

  const result = await synchronizeCloudflarePagesRuntime({
    environment: "preview",
    accountId: "account",
    apiToken: "token",
    projectName: "aohys-com",
    values: previewValues,
    fetchImplementation,
  });

  assert.deepEqual(result, { changed: false, bindingCount: 9 });
  assert.deepEqual(requests, [{ method: "GET" }]);
});

test("PATCHes only target plaintext env vars, preserves hash, and verifies the write", async () => {
  const driftedPreview = {
    ...previewValues,
    CONVEX_SITE_URL: "https://stale.invalid",
  };
  const responses = [pagesProject(driftedPreview), pagesProject()];
  const requests: Array<{ method: string; body?: unknown }> = [];
  const fetchImplementation: typeof fetch = async (_input, init) => {
    const method = init?.method ?? "GET";
    requests.push({
      method,
      ...(typeof init?.body === "string"
        ? { body: JSON.parse(init.body) as unknown }
        : {}),
    });
    if (method === "PATCH") {
      return Response.json({ success: true, result: pagesProject() });
    }
    const project = responses.shift();
    return Response.json({ success: true, result: project });
  };

  const result = await synchronizeCloudflarePagesRuntime({
    environment: "preview",
    accountId: "account",
    apiToken: "token",
    projectName: "aohys-com",
    values: previewValues,
    fetchImplementation,
  });

  assert.deepEqual(result, { changed: true, bindingCount: 9 });
  assert.deepEqual(
    requests.map(({ method }) => method),
    ["GET", "PATCH", "GET"],
  );
  assert.deepEqual(requests[1]?.body, {
    deployment_configs: {
      preview: {
        env_vars: variableMap(previewValues),
        wrangler_config_hash: "preview-hash",
      },
    },
  });
  assert.equal(JSON.stringify(requests[1]?.body).includes("hidden"), false);
  assert.equal(JSON.stringify(requests[1]?.body).includes("production"), false);
});

test("audit requires exact equality for the active target", () => {
  const project = pagesProject({
    ...previewValues,
    CONVEX_SITE_URL: "https://stale.invalid",
  });

  const errors = auditRuntimeBindings(project, "preview", previewValues);

  assert.ok(
    errors.includes(
      "Cloudflare Pages preview runtime CONVEX_SITE_URL does not match the active Environment Contract.",
    ),
  );
  assert.equal(
    errors.some((error) => error.includes("stale.invalid")),
    false,
  );
  assert.deepEqual(
    auditRuntimeBindings(pagesProject(), "preview", previewValues),
    [],
  );
});

test("audit scopes release identity to the active deployment target", () => {
  const project = pagesProject();
  delete project.deployment_configs?.production?.env_vars?.PUBLIC_RELEASE_SHA;

  assert.deepEqual(auditRuntimeBindings(project, "preview", previewValues), []);

  delete project.deployment_configs?.preview?.env_vars?.PUBLIC_RELEASE_SHA;
  assert.ok(
    auditRuntimeBindings(project, "preview", previewValues).includes(
      "Cloudflare Pages preview runtime PUBLIC_RELEASE_SHA does not match the active Environment Contract.",
    ),
  );
});

test("fails closed when the provider does not retain the requested values", async () => {
  const driftedPreview = {
    ...previewValues,
    CONVEX_SITE_URL: "https://stale.invalid",
  };
  const fetchImplementation: typeof fetch = async (_input, init) =>
    Response.json({
      success: true,
      result:
        init?.method === "PATCH"
          ? pagesProject()
          : pagesProject(driftedPreview),
    });

  await assert.rejects(
    synchronizeCloudflarePagesRuntime({
      environment: "preview",
      accountId: "account",
      apiToken: "token",
      projectName: "aohys-com",
      values: previewValues,
      fetchImplementation,
    }),
    /verification failed after update/,
  );
});

test("release commands synchronize the selected Pages runtime before auditing it", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { scripts: Record<string, string> };

  for (const environment of ["preview", "production"] as const) {
    const command = packageJson.scripts[`deploy:${environment}`] ?? "";
    const syncIndex = command.indexOf(
      `pnpm run sync:cloudflare-pages-runtime:${environment}`,
    );
    const auditIndex = command.indexOf(
      "pnpm run audit:cloudflare-pages-runtime",
    );

    assert.ok(syncIndex >= 0, `${environment} release must synchronize Pages`);
    assert.ok(auditIndex > syncIndex, `${environment} audit must follow sync`);
  }
});
