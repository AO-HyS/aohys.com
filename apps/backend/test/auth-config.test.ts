import { describe, expect, it } from "vitest";
import { createBetterAuthBaseUrl } from "../convex/auth.js";

describe("Better Auth base URL config", () => {
  it("allows Cloudflare Pages branch hosts in preview without changing the production fallback", () => {
    expect(createBetterAuthBaseUrl(
      "https://preview.aohys.com",
      "https://preview.aohys.com",
      "preview",
    )).toEqual({
      allowedHosts: [
        "preview.aohys.com",
        "localhost",
        "127.0.0.1",
        "*.aohys-com.pages.dev",
      ],
      fallback: "https://preview.aohys.com",
      protocol: "auto",
    });
  });

  it("keeps production auth pinned to the canonical host", () => {
    expect(createBetterAuthBaseUrl(
      "https://aohys.com",
      "https://aohys.com",
      "production",
    )).toBe("https://aohys.com");
  });
});
