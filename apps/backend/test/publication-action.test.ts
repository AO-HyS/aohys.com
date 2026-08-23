import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin } = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => ({
    _id: "admin_1",
    email: "admin@aohys.com",
  })),
}));
vi.mock("../convex/auth.js", () => ({ requireAdmin }));

import { publishContent } from "../convex/contentActions.js";

const publication = {
  requestKey: "a".repeat(64),
  publicationAttemptId: `${"a".repeat(64)}.1`,
  scope: "project" as const,
  contentId: "case-study:aohys",
  targetEnvironment: "preview" as const,
  state: "release-requested" as const,
  retryable: false,
  updatedAt: 1,
};

describe("publishContent action boundary", () => {
  beforeEach(() => {
    process.env.AOHYS_ENV = "preview";
    process.env.PUBLISH_GITHUB_TOKEN = "provider-token";
    requireAdmin.mockClear();
  });
  afterEach(() => {
    delete process.env.AOHYS_ENV;
    delete process.env.PUBLISH_GITHUB_TOKEN;
  });

  it("authenticates first and passes only user id, target, and provider presence to one mutation", async () => {
    const runMutation = vi.fn(async () => ({
      publishedAt: 1,
      projectDraftsPublished: 2,
      resumeDraftsPublished: 0,
      mediaPublished: 1,
      workflowPending: true,
      publication,
    }));
    const result = await (
      publishContent as never as { _handler: Function }
    )._handler(
      { runMutation },
      { scope: "project", contentId: "case-study:aohys" },
    );
    expect(requireAdmin).toHaveBeenCalledBefore(runMutation);
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      scope: "project",
      contentId: "case-study:aohys",
      targetEnvironment: "preview",
      requestedBy: "admin_1",
      providerConfigured: true,
    });
    expect(result.workflow).toMatchObject({ status: "queued", ref: "develop" });
    expect(JSON.stringify(runMutation.mock.calls)).not.toContain(
      "provider-token",
    );
  });

  it("fails closed outside preview/production before any mutation", async () => {
    process.env.AOHYS_ENV = "local";
    const runMutation = vi.fn();
    await expect(
      (publishContent as never as { _handler: Function })._handler(
        { runMutation },
        { scope: "all" },
      ),
    ).rejects.toThrow("must be preview or production");
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(runMutation).not.toHaveBeenCalled();
  });

  it("returns published-locally without creating provider work when token is absent", async () => {
    delete process.env.PUBLISH_GITHUB_TOKEN;
    const runMutation = vi.fn(async (_reference, args) => ({
      publishedAt: 1,
      projectDraftsPublished: 0,
      resumeDraftsPublished: 1,
      mediaPublished: 0,
      workflowPending: false,
      publication: {
        ...publication,
        scope: "resume" as const,
        contentId: undefined,
        publicationAttemptId: undefined,
        state: "published-locally" as const,
      },
      args,
    }));
    const result = await (
      publishContent as never as { _handler: Function }
    )._handler({ runMutation }, { scope: "resume", locale: "en" });
    expect(runMutation.mock.calls[0]?.[1]).toMatchObject({
      providerConfigured: false,
    });
    expect(result.workflow).toEqual({
      status: "not-configured",
      reason: "PUBLISH_GITHUB_TOKEN is missing.",
    });
  });

  it.each(["release-acknowledged", "deployed", "rollback-needed"] as const)(
    "does not report deduped %s work as queued",
    async (state) => {
      const runMutation = vi.fn(async () => ({
        publishedAt: 1,
        projectDraftsPublished: 1,
        resumeDraftsPublished: 0,
        mediaPublished: 0,
        workflowPending: false,
        publication: { ...publication, state },
      }));
      const result = await (
        publishContent as never as { _handler: Function }
      )._handler(
        { runMutation },
        { scope: "project", contentId: "case-study:aohys" },
      );

      expect(result.workflow).toEqual({
        status: "not-configured",
        reason:
          "No new workflow dispatch is pending for this publication request.",
      });
      expect(result).not.toHaveProperty("workflowPending");
    },
  );
});
