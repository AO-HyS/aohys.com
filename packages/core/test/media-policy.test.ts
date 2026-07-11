import { describe, expect, it } from "vitest";
import {
  resolvePublicMediaUrl,
  selectPublicationMedia,
  validateCloudflareImagesCustomId,
} from "../src/media-policy.js";

describe("shared AOHYS media policy", () => {
  it("normalizes safe custom IDs and rejects traversal encodings", () => {
    expect(validateCloudflareImagesCustomId(" /media//casa-roca//hero image ")).toMatchObject({
      isValid: true,
      value: "media/casa-roca/hero-image",
    });
    expect(validateCloudflareImagesCustomId("media/../hero").isValid).toBe(false);
    expect(validateCloudflareImagesCustomId("media/%2e%2e/hero").isValid).toBe(false);
    expect(validateCloudflareImagesCustomId("media/%2Fadmin/hero").isValid).toBe(false);
    expect(validateCloudflareImagesCustomId("media/hero?token=secret").isValid).toBe(false);
  });

  it("resolves only safe repository, HTTPS, and Cloudflare Images references", () => {
    expect(resolvePublicMediaUrl({
      storageProvider: "external",
      storageKey: "images/projects/aohys-proof.webp",
    })).toEqual({
      status: "resolved",
      source: "repository-asset",
      url: "/images/projects/aohys-proof.webp",
    });
    expect(resolvePublicMediaUrl({
      storageProvider: "external",
      storageKey: "https://cdn.example.com/aohys-proof.webp",
    })).toMatchObject({ status: "resolved", source: "external-url" });
    expect(resolvePublicMediaUrl({
      storageProvider: "cloudflare-images",
      storageKey: "media/aohys-proof",
    }, { cloudflareImagesAccountHash: "account_hash" })).toEqual({
      status: "resolved",
      source: "cloudflare-images",
      url: "https://imagedelivery.net/account_hash/media/aohys-proof/public",
    });
    expect(resolvePublicMediaUrl({
      storageProvider: "external",
      storageKey: "javascript:alert(1)",
    }).status).toBe("invalid");
    expect(resolvePublicMediaUrl({
      storageProvider: "external",
      storageKey: "/images/%2e%2e/private.png",
    }).status).toBe("invalid");
    expect(resolvePublicMediaUrl({
      storageProvider: "cloudflare-r2",
      storageKey: "media/aohys-proof",
    }).status).toBe("unsupported-provider");
  });

  it("uses one deterministic selected-first, newest-second publication decision", () => {
    const media = [
      { id: "older-selected", contentId: "case-study:aohys", usage: "case-study", status: "draft", selectedForPublic: true, updatedAt: 10 },
      { id: "newer-fallback", contentId: "case-study:aohys", usage: "case-study", status: "draft", updatedAt: 20 },
      { id: "other", contentId: "case-study:other", usage: "case-study", status: "draft", updatedAt: 30 },
    ] as const;

    expect(selectPublicationMedia([...media], "publication-request").selected.map((item) => item.id)).toEqual([
      "older-selected",
      "other",
    ]);
  });
});
