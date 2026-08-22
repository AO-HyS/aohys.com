import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin } = vi.hoisted(() => ({
  requireAdmin: vi.fn(async () => {
    throw new Error("authz gate reached");
  }),
}));

vi.mock("../convex/auth.js", () => ({ requireAdmin }));

import { api, internal } from "../convex/_generated/api.js";
import * as contentFunctions from "../convex/content.js";

const publicNames = [
  "archiveMedia",
  "createMediaMetadata",
  "createProject",
  "createResumeVersion",
  "deleteMedia",
  "getDashboardOverview",
  "listForDashboard",
  "selectMediaForPublic",
  "upsertProjectDraft",
  "upsertResumeDraft",
  "upsertSiteSetting",
] as const;

const internalNames = [
  "listForDashboardInternal",
  "publishContentFromDashboard",
  "upsertProjectDraftFromDashboard",
  "upsertSiteSettingFromDashboard",
] as const;

interface RegisteredFunction {
  isPublic?: boolean;
  isInternal?: boolean;
  _handler: (ctx: unknown, args: unknown) => Promise<unknown>;
  exportArgs: () => string;
  exportReturns: () => string;
}

describe("content registered-function facade", () => {
  beforeEach(() => {
    requireAdmin.mockClear();
  });

  it("preserves every generated public and internal content function name", () => {
    const generatedPublicNames = publicNames.map((name) =>
      getFunctionName(api.content[name]),
    );
    const generatedInternalNames = internalNames.map((name) =>
      getFunctionName(internal.content[name]),
    );

    expect(generatedPublicNames).toEqual(
      publicNames.map((name) => `content:${name}`),
    );
    expect(generatedInternalNames).toEqual(
      internalNames.map((name) => `content:${name}`),
    );
    expect(Object.keys(contentFunctions).sort()).toEqual(
      [...publicNames, ...internalNames].sort(),
    );
    expect(getFunctionName(api.contentActions.createMediaUploadUrl)).toBe(
      "contentActions:createMediaUploadUrl",
    );
    expect(getFunctionName(api.contentActions.publishContent)).toBe(
      "contentActions:publishContent",
    );
  });

  it("keeps public and internal registration visibility exact", () => {
    for (const name of publicNames) {
      expect(
        (contentFunctions[name] as unknown as RegisteredFunction).isPublic,
      ).toBe(true);
    }
    for (const name of internalNames) {
      expect(
        (contentFunctions[name] as unknown as RegisteredFunction).isInternal,
      ).toBe(true);
    }
  });

  it("defines argument and return validators for every registered function", () => {
    for (const registeredFunction of Object.values(
      contentFunctions,
    ) as unknown as RegisteredFunction[]) {
      expect(JSON.parse(registeredFunction.exportArgs())).toHaveProperty(
        "type",
        "object",
      );
      expect(JSON.parse(registeredFunction.exportReturns())).toHaveProperty(
        "type",
      );
    }
  });

  it("runs requireAdmin before capability code for every public function", async () => {
    const inaccessibleContext = {
      get db(): never {
        throw new Error("database accessed before authz");
      },
    };

    for (const name of publicNames) {
      const registeredFunction = contentFunctions[
        name
      ] as unknown as RegisteredFunction;
      await expect(
        registeredFunction._handler(inaccessibleContext, {}),
      ).rejects.toThrow("authz gate reached");
    }
    expect(requireAdmin).toHaveBeenCalledTimes(publicNames.length);
  });

  it("keeps writable media providers bounded to supported upload paths", () => {
    const args = JSON.parse(
      (
        contentFunctions.createMediaMetadata as unknown as RegisteredFunction
      ).exportArgs(),
    ) as {
      value: {
        storageProvider: { fieldType: { value: Array<{ value: string }> } };
      };
    };

    expect(
      args.value.storageProvider.fieldType.value.map((item) => item.value),
    ).toEqual(["cloudflare-images", "external"]);
  });

  it("preserves the legacy listForDashboard result sections", () => {
    const returns = JSON.parse(
      (
        contentFunctions.listForDashboard as unknown as RegisteredFunction
      ).exportReturns(),
    ) as { value: Record<string, unknown> };

    expect(Object.keys(returns.value)).toEqual([
      "caseStudies",
      "projectDrafts",
      "resumeDrafts",
      "media",
      "settings",
      "resumeVersions",
    ]);
  });
});
