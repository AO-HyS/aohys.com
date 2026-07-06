import { describe, expect, it, vi } from "vitest";
import {
  createCloudflareImagesDirectUpload,
  triggerGitHubPublishWorkflow,
} from "../src/dashboard-providers.js";

describe("dashboard provider adapters", () => {
  it("creates Cloudflare Images direct upload URLs with server-side credentials", async () => {
    const providerFetch = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
      success: true,
      result: {
        id: "media/casa-roca/home",
        uploadURL: "https://upload.imagedelivery.net/direct",
      },
    })));

    await expect(createCloudflareImagesDirectUpload({
      storageKey: "media/casa-roca/home",
      altText: "Casa Roca homepage.",
      contentId: "case-study:casa-roca",
      usage: "case-study",
      locale: "en",
    }, {
      accountHash: "hash",
      accountId: "account-id",
      apiToken: "images-token",
    }, providerFetch)).resolves.toEqual({
      imageId: "media/casa-roca/home",
      publicUrl: "https://imagedelivery.net/hash/media/casa-roca/home/public",
      uploadURL: "https://upload.imagedelivery.net/direct",
    });

    expect(providerFetch).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/accounts/account-id/images/v2/direct_upload",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer images-token",
        }),
      }),
    );
  });

  it("normalizes Cloudflare Images custom IDs before creating upload URLs", async () => {
    let request: RequestInit | undefined;
    const providerFetch = vi.fn(async (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      request = init;
      return new Response(JSON.stringify({
        success: true,
        result: {
          id: "media/casa-roca/hero-image",
          uploadURL: "https://upload.imagedelivery.net/direct",
        },
      }));
    });

    await createCloudflareImagesDirectUpload({
      storageKey: " /media//casa-roca//hero image ",
      altText: "Casa Roca homepage.",
      contentId: "case-study:casa-roca",
      usage: "case-study",
      locale: "en",
    }, {
      accountHash: "hash",
      accountId: "account-id",
      apiToken: "images-token",
    }, providerFetch);

    expect(request).toBeDefined();
    expect((request?.body as FormData).get("id")).toBe("media/casa-roca/hero-image");
  });

  it("rejects invalid Cloudflare Images custom IDs before calling the provider", async () => {
    const providerFetch = vi.fn();

    await expect(createCloudflareImagesDirectUpload({
      storageKey: "media/../hero",
      altText: "Casa Roca homepage.",
      contentId: "case-study:casa-roca",
      usage: "case-study",
      locale: "en",
    }, {
      accountHash: "hash",
      accountId: "account-id",
      apiToken: "images-token",
    }, providerFetch)).rejects.toThrow("Cloudflare Images custom ID is invalid");

    expect(providerFetch).not.toHaveBeenCalled();
  });

  it("dispatches the GitHub release workflow for preview publishes", async () => {
    const providerFetch = vi.fn(async () => new Response(null, { status: 204 }));

    await expect(triggerGitHubPublishWorkflow({
      environment: "preview",
      repository: "AO-HyS/aohys.com",
      token: "github-token",
      workflowId: "release-train.yml",
    }, providerFetch)).resolves.toEqual({
      status: "queued",
      repository: "AO-HyS/aohys.com",
      workflowId: "release-train.yml",
      ref: "develop",
    });

    expect(providerFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/AO-HyS/aohys.com/actions/workflows/release-train.yml/dispatches",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          ref: "develop",
          inputs: {
            target_environment: "preview",
          },
        }),
      }),
    );
  });

  it("reports publish as not configured when the token is absent", async () => {
    const providerFetch = vi.fn();

    await expect(triggerGitHubPublishWorkflow({
      environment: "preview",
    }, providerFetch)).resolves.toEqual({
      status: "not-configured",
      reason: "PUBLISH_GITHUB_TOKEN is missing.",
    });
    expect(providerFetch).not.toHaveBeenCalled();
  });
});
