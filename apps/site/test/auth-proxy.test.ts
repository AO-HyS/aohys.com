import { describe, expect, it, vi } from "vitest";
import { proxyAuthRequest } from "../src/auth-proxy.js";

describe("Better Auth proxy", () => {
  it("forwards auth requests to Convex while preserving the public host for Better Auth", async () => {
    const proxyFetch = vi.fn(async (
      _input: Parameters<typeof fetch>[0],
      _init?: Parameters<typeof fetch>[1],
    ) =>
      new Response(JSON.stringify({ status: "ok" }))
    );

    const response = await proxyAuthRequest(
      new Request("https://preview.aohys.com/api/auth/callback/google?code=abc", {
        headers: {
          cookie: "better-auth.session_token=valid",
        },
      }),
      { CONVEX_SITE_URL: "https://effervescent-minnow-483.convex.site" },
      ["callback", "google"],
      proxyFetch,
    );

    expect(response.status).toBe(200);
    expect(proxyFetch).toHaveBeenCalledOnce();

    const forwardedRequest = proxyFetch.mock.calls[0]?.[0] as Request;
    expect(forwardedRequest.url).toBe(
      "https://effervescent-minnow-483.convex.site/api/auth/callback/google?code=abc",
    );
    expect(forwardedRequest.headers.get("cookie")).toBe("better-auth.session_token=valid");
    expect(forwardedRequest.headers.get("x-forwarded-host")).toBe("preview.aohys.com");
    expect(forwardedRequest.headers.get("x-forwarded-proto")).toBe("https");
    expect(forwardedRequest.headers.get("x-better-auth-forwarded-host")).toBe(
      "preview.aohys.com",
    );
    expect(forwardedRequest.headers.get("x-better-auth-forwarded-proto")).toBe("https");
  });

  it("fails closed when the Convex auth provider URL is not configured", async () => {
    const response = await proxyAuthRequest(
      new Request("https://preview.aohys.com/api/auth/ok"),
      {},
      "ok",
      vi.fn(),
    );
    const body = await response.json() as { error: string };

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error).toBe("Auth provider is not configured.");
  });
});
