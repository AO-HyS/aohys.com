import { describe, expect, it, vi } from "vitest";
import { handlePostHogProxyRequest } from "../src/posthog-proxy.js";

describe("production PostHog ingest proxy", () => {
  it("forwards production ingestion without visitor credentials", async () => {
    const requests: Array<[URL | RequestInfo, RequestInit | undefined]> = [];
    const transport = vi.fn(async (url: URL | RequestInfo, init?: RequestInit) => {
      requests.push([url, init]);
      return new Response("ok", { status: 200 });
    });
    const response = await handlePostHogProxyRequest(new Request("https://aohys.com/ingest/capture/?ip=0", {
      method: "POST",
      headers: { cookie: "private=session", authorization: "Bearer private", "content-type": "application/json" },
      body: "{}",
    }), { AOHYS_ENV: "production" }, transport);

    expect(response.status).toBe(200);
    expect(transport).toHaveBeenCalledOnce();
    const [url, init] = requests[0]!;
    expect(init).toBeDefined();
    expect(String(url)).toBe("https://us.i.posthog.com/capture/?ip=0");
    expect(new Headers(init!.headers).has("cookie")).toBe(false);
    expect(new Headers(init!.headers).has("authorization")).toBe(false);
  });

  it.each([
    ["preview", "https://aohys.com/ingest/capture/"],
    ["production", "https://preview.aohys.com/ingest/capture/"],
    ["production", "https://deployment.aohys-com.pages.dev/ingest/capture/"],
  ])("returns 404 for %s at %s", async (environment, url) => {
    const transport = vi.fn();
    const response = await handlePostHogProxyRequest(new Request(url, { method: "POST" }), { AOHYS_ENV: environment }, transport);
    expect(response.status).toBe(404);
    expect(transport).not.toHaveBeenCalled();
  });

  it("routes SDK assets through the first-party path", async () => {
    const requests: Array<URL | RequestInfo> = [];
    const transport = vi.fn(async (url: URL | RequestInfo) => {
      requests.push(url);
      return new Response("script", { status: 200 });
    });
    await handlePostHogProxyRequest(new Request("https://aohys.com/ingest/static/array.js"), { AOHYS_ENV: "production" }, transport);
    expect(String(requests[0])).toBe("https://us-assets.i.posthog.com/static/array.js");
  });
});
