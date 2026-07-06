import { describe, expect, it } from "vitest";
import {
  cloudflareImagesStorageKeyForFile,
  cloudflareImagesStorageKeySegment,
  defaultProjectMediaStorageKey,
  validateCloudflareImagesCustomId,
} from "./media-upload";

describe("dashboard media upload helpers", () => {
  it("creates stable Cloudflare Images storage keys from project and file names", () => {
    expect(defaultProjectMediaStorageKey("case-study:casa-roca")).toBe("media/casa-roca");
    expect(cloudflareImagesStorageKeySegment("Captura de pantalla 2026-07-03 a la(s) 5.35.10 p.m..png")).toBe(
      "captura-de-pantalla-2026-07-03-a-la-s-5-35-10-p-m",
    );
    expect(
      cloudflareImagesStorageKeyForFile(
        "media/casa-roca",
        "Captura de pantalla 2026-07-03 a la(s) 5.35.10 p.m..png",
      ),
    ).toBe("media/casa-roca/captura-de-pantalla-2026-07-03-a-la-s-5-35-10-p-m");
  });

  it("normalizes harmless path separators before upload", () => {
    expect(validateCloudflareImagesCustomId(" /media//casa-roca//hero image ").value).toBe(
      "media/casa-roca/hero-image",
    );
  });

  it("rejects custom IDs Cloudflare Images will not accept", () => {
    expect(validateCloudflareImagesCustomId("media/../hero").isValid).toBe(false);
    expect(validateCloudflareImagesCustomId("media/.draft/hero").isValid).toBe(false);
    expect(validateCloudflareImagesCustomId("https://example.com/hero.png").isValid).toBe(false);
  });
});
