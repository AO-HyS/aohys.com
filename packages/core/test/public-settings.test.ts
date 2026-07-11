import { describe, expect, it } from "vitest";
import { normalizePublicWhatsappUrl, validatePublicWhatsappUrl } from "../src/public-settings.js";

describe("public settings policy", () => {
  it("normalizes a direct WhatsApp contact URL", () => {
    expect(normalizePublicWhatsappUrl(" https://wa.me/522299020825/ ")).toBe("https://wa.me/522299020825");
  });

  it.each([
    "javascript:alert(1)",
    "http://wa.me/522299020825",
    "https://wa.me.evil.example/522299020825",
    "https://user:secret@wa.me/522299020825",
    "https://wa.me/522299020825?text=private",
    "https://wa.me/+52-229-902-0825",
  ])("rejects unsafe or non-canonical public values: %s", (value) => {
    expect(validatePublicWhatsappUrl(value).ok).toBe(false);
  });
});
