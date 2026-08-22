import { describe, expect, it, vi } from "vitest";
import { handlePostHogProxyRequest } from "../src/posthog-proxy.js";

describe("production PostHog ingest proxy", () => {
  it("forwards production ingestion without visitor credentials", async () => {
    const requests: Array<[URL | RequestInfo, RequestInit | undefined]> = [];
    const transport = vi.fn(
      async (url: URL | RequestInfo, init?: RequestInit) => {
        requests.push([url, init]);
        return new Response("ok", {
          status: 200,
          headers: {
            "content-type": "application/json",
            "set-cookie": "unsafe=1",
          },
        });
      },
    );
    const response = await handlePostHogProxyRequest(
      new Request("https://aohys.com/ingest/capture/?ip=0", {
        method: "POST",
        headers: {
          cookie: "private=session",
          authorization: "Bearer private",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      { AOHYS_ENV: "production" },
      transport,
    );

    expect(response.status).toBe(200);
    expect(transport).toHaveBeenCalledOnce();
    const [url, init] = requests[0]!;
    expect(init).toBeDefined();
    expect(String(url)).toBe("https://us.i.posthog.com/capture/?ip=0");
    expect(new Headers(init!.headers).has("cookie")).toBe(false);
    expect(new Headers(init!.headers).has("authorization")).toBe(false);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each([
    ["preview", "https://aohys.com/ingest/capture/"],
    ["production", "https://preview.aohys.com/ingest/capture/"],
    ["production", "https://deployment.aohys-com.pages.dev/ingest/capture/"],
  ])("returns 404 for %s at %s", async (environment, url) => {
    const transport = vi.fn();
    const response = await handlePostHogProxyRequest(
      new Request(url, { method: "POST" }),
      { AOHYS_ENV: environment },
      transport,
    );
    expect(response.status).toBe(404);
    expect(transport).not.toHaveBeenCalled();
  });

  it("routes SDK assets through the first-party path", async () => {
    const requests: Array<URL | RequestInfo> = [];
    const transport = vi.fn(async (url: URL | RequestInfo) => {
      requests.push(url);
      return new Response("script", {
        status: 200,
        headers: { "content-type": "application/javascript" },
      });
    });
    await handlePostHogProxyRequest(
      new Request("https://aohys.com/ingest/static/array.js"),
      { AOHYS_ENV: "production" },
      transport,
    );
    expect(String(requests[0])).toBe(
      "https://us-assets.i.posthog.com/static/array.js",
    );
  });

  it("keeps batch telemetry on the exact ingest origin", async () => {
    const requests: Array<URL | RequestInfo> = [];
    const transport = vi.fn(async (url: URL | RequestInfo) => {
      requests.push(url);
      return new Response("{}", {
        headers: { "content-type": "application/json" },
      });
    });
    const response = await handlePostHogProxyRequest(
      new Request("https://aohys.com/ingest/batch/?ip=0", {
        method: "POST",
        body: "{}",
      }),
      { AOHYS_ENV: "production" },
      transport,
    );
    expect(response.status).toBe(200);
    expect(String(requests[0])).toBe("https://us.i.posthog.com/batch/?ip=0");
  });

  it("never treats a scheme-relative stripped path as an external origin", async () => {
    const transport = vi.fn();
    const response = await handlePostHogProxyRequest(
      new Request("https://aohys.com/ingest//example.com/probe"),
      { AOHYS_ENV: "production" },
      transport,
    );
    expect(response.status).toBe(400);
    expect(transport).not.toHaveBeenCalled();
  });

  it("fails closed instead of reflecting executable upstream content", async () => {
    const transport = vi.fn(
      async () =>
        new Response("<script>alert(1)</script>", {
          status: 200,
          headers: {
            "content-type": "text/html",
            "content-security-policy": "unsafe",
          },
        }),
    );
    const response = await handlePostHogProxyRequest(
      new Request("https://aohys.com/ingest/static/sdk.js"),
      { AOHYS_ENV: "production" },
      transport,
    );
    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.text()).not.toContain("<script>");
  });
});
