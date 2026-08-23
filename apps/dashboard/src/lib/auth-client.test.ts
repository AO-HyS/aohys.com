import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { describe, expect, it } from "vitest";
import { isAuthClient } from "./auth-client";

describe("Better Auth client boundary", () => {
  it("accepts the installed callable Proxy client without relying on own properties", () => {
    const client = createAuthClient({
      baseURL: "https://example.com",
      plugins: [convexClient()],
    });

    expect(typeof client).toBe("function");
    expect(Reflect.has(client, "$fetch")).toBe(false);
    expect(Reflect.has(client, "$store")).toBe(false);
    expect(Reflect.has(client, "useSession")).toBe(false);
    expect(isAuthClient(client)).toBe(true);
  });

  it("rejects candidates missing any required callable seam", () => {
    expect(isAuthClient({ $fetch() {}, $store() {} })).toBe(false);
  });
});
