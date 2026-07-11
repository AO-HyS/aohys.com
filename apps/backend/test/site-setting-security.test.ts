import { describe, expect, it, vi } from "vitest";
import * as contentFunctions from "../convex/content.js";

interface SettingMutationHandler {
  _handler: (
    context: { db: unknown },
    args: {
      key: string;
      environment: "preview";
      value: string;
      classification: "public-build-value";
    },
  ) => Promise<{ key: string; updatedAt: number }>;
}

function settingHandler() {
  return (contentFunctions.upsertSiteSettingFromDashboard as unknown as SettingMutationHandler)._handler;
}

function createDatabase() {
  const first = vi.fn(async () => null);
  const eq = vi.fn(() => ({ eq, first }));
  const withIndex = vi.fn((_name: string, range: (query: { eq: typeof eq }) => unknown) => {
    range({ eq });
    return { first };
  });
  const query = vi.fn(() => ({ withIndex }));
  const insert = vi.fn(async () => "setting_1");

  return { db: { query, insert }, insert, query };
}

describe("public setting security boundary", () => {
  it("rejects alternate keys and unsafe URLs before database access", async () => {
    const database = createDatabase();

    await expect(settingHandler()({ db: database.db }, {
      key: "PUBLIC_WHATSAPP_URL",
      environment: "preview",
      value: "javascript:alert(1)",
      classification: "public-build-value",
    })).rejects.toThrow("Only a valid direct PUBLIC_WHATSAPP_URL");
    expect(database.query).not.toHaveBeenCalled();
  });

  it("stores only the normalized direct wa.me value", async () => {
    const database = createDatabase();

    await settingHandler()({ db: database.db }, {
      key: "PUBLIC_WHATSAPP_URL",
      environment: "preview",
      value: " https://wa.me/522299020825/ ",
      classification: "public-build-value",
    });

    expect(database.insert).toHaveBeenCalledWith("siteSettings", expect.objectContaining({
      key: "PUBLIC_WHATSAPP_URL",
      value: "https://wa.me/522299020825",
      classification: "public-build-value",
    }));
  });
});
