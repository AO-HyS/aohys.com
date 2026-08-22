import { describe, expect, it, vi } from "vitest";
import {
  createPublicationIdentity,
  parseCanonicalJson,
  sha256,
} from "../src/publication-contract.js";
import { dispatchGitHubPublication } from "../src/publication-provider.js";

const source = {
  projects: [
    { contentId: "case-study:aohys", locale: "es", updatedAt: 2 },
    { contentId: "case-study:aohys", locale: "en", updatedAt: 1 },
  ],
  resume: [],
  media: [{ storageKey: "hero", selectedForPublic: true }],
  settings: [],
};

describe("publication request identity", () => {
  it("uses Web Crypto SHA-256 and canonical sorted source values", async () => {
    expect(await sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    const first = await createPublicationIdentity({
      scope: "project",
      contentId: "case-study:aohys",
      targetEnvironment: "preview",
      source,
    });
    const reordered = await createPublicationIdentity({
      scope: "project",
      contentId: "case-study:aohys",
      targetEnvironment: "preview",
      source: { ...source, projects: [...source.projects].reverse() },
    });
    expect(reordered).toEqual(first);
    expect(first.requestKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes identity for source revision, scope, or target changes", async () => {
    const base = await createPublicationIdentity({
      scope: "project",
      contentId: "case-study:aohys",
      targetEnvironment: "preview",
      source,
    });
    const changed = await Promise.all([
      createPublicationIdentity({
        scope: "project",
        contentId: "case-study:aohys",
        targetEnvironment: "preview",
        source: { ...source, media: [{ storageKey: "other" }] },
      }),
      createPublicationIdentity({
        scope: "all",
        targetEnvironment: "preview",
        source,
      }),
      createPublicationIdentity({
        scope: "project",
        contentId: "case-study:aohys",
        targetEnvironment: "production",
        source,
      }),
    ]);
    expect(new Set(changed.map((item) => item.requestKey))).toHaveLength(3);
    expect(changed.every((item) => item.requestKey !== base.requestKey)).toBe(
      true,
    );
  });

  it("requires resume contentJson to contain an object", () => {
    expect(parseCanonicalJson('{"summary":["ok"]}')).toEqual({
      summary: ["ok"],
    });
    expect(() => parseCanonicalJson("[]")).toThrow("JSON object");
    expect(() => parseCanonicalJson("not-json")).toThrow();
  });
});

describe("GitHub durable publication adapter", () => {
  const input = {
    targetEnvironment: "preview" as const,
    publicationRequestKey: "a".repeat(64),
    publicationAttemptId: `${"a".repeat(64)}.1`,
    token: "secret",
  };

  it("sends exact correlation and accepts current 200 run details", async () => {
    let body: unknown;
    const providerFetch = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        body = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            workflow_run_id: 123,
            run_url: "https://github.com/AO-HyS/aohys.com/actions/runs/123",
            html_url: "https://github.com/AO-HyS/aohys.com/actions/runs/123",
          }),
          { status: 200 },
        );
      },
    );
    await expect(
      dispatchGitHubPublication(input, providerFetch),
    ).resolves.toMatchObject({
      status: "acknowledged",
      runId: "123",
    });
    expect(body).toEqual({
      ref: "develop",
      return_run_details: true,
      inputs: {
        target_environment: "preview",
        publication_request_key: input.publicationRequestKey,
        publication_attempt_id: input.publicationAttemptId,
      },
    });
  });

  it("accepts legacy 204 without pretending run details exist", async () => {
    await expect(
      dispatchGitHubPublication(
        input,
        vi.fn(async () => new Response(null, { status: 204 })),
      ),
    ).resolves.toEqual({
      status: "acknowledged",
      repository: "AO-HyS/aohys.com",
      workflowId: "release-train.yml",
      ref: "develop",
    });
  });

  it("classifies response-lost and 5xx as non-retryable ambiguity", async () => {
    await expect(
      dispatchGitHubPublication(
        input,
        vi.fn(async () => {
          throw new Error("secret body");
        }),
      ),
    ).resolves.toMatchObject({ status: "ambiguous", retryable: false });
    await expect(
      dispatchGitHubPublication(
        input,
        vi.fn(async () => new Response("raw secret", { status: 503 })),
      ),
    ).resolves.toMatchObject({ status: "ambiguous", retryable: false });
  });

  it("distinguishes retryable throttling from permanent rejection", async () => {
    await expect(
      dispatchGitHubPublication(
        input,
        vi.fn(async () => new Response(null, { status: 429 })),
      ),
    ).resolves.toMatchObject({ status: "failed", retryable: true });
    await expect(
      dispatchGitHubPublication(
        input,
        vi.fn(async () => new Response("token", { status: 401 })),
      ),
    ).resolves.toMatchObject({ status: "failed", retryable: false });
  });
});
