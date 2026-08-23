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
import * as contentActions from "../convex/contentActions.js";
import { contentContract } from "./content-contract-fixture.js";

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
  isAction?: boolean;
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

  it("preserves exact visibility, argument, and return contracts for all functions", () => {
    for (const [name, contract] of Object.entries(contentContract)) {
      const registeredFunction = contentFunctions[
        name as keyof typeof contentFunctions
      ] as unknown as RegisteredFunction;

      expect({
        isPublic: registeredFunction.isPublic === true,
        isInternal: registeredFunction.isInternal === true,
        args: JSON.parse(registeredFunction.exportArgs()),
        returns: JSON.parse(registeredFunction.exportReturns()),
      }).toEqual({
        isPublic: contract.visibility === "public",
        isInternal: contract.visibility === "internal",
        args: contract.args,
        returns: contract.returns,
      });
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

  it("keeps both content actions public and auth-first", async () => {
    const inaccessibleContext = {
      get runMutation(): never {
        throw new Error("mutation accessed before authz");
      },
    };
    const actions = [
      contentActions.createMediaUploadUrl,
      contentActions.publishContent,
    ] as unknown as RegisteredFunction[];

    for (const registeredAction of actions) {
      expect(registeredAction.isPublic).toBe(true);
      expect(registeredAction.isAction).toBe(true);
      await expect(
        registeredAction._handler(inaccessibleContext, {}),
      ).rejects.toThrow("authz gate reached");
    }
    expect(requireAdmin).toHaveBeenCalledTimes(actions.length);
  });
});
