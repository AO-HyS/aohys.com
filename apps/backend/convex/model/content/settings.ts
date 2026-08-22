import { normalizePublicWhatsappUrl } from "@aohys/core";
import { v, type ObjectType } from "convex/values";
import type { MutationCtx } from "../../_generated/server.js";
import { environmentValidator } from "./shared.js";

export const settingClassificationValidator = v.union(
  v.literal("public-build-value"),
  v.literal("provider-output"),
  v.literal("policy-value"),
);

export const upsertSiteSettingArgs = {
  key: v.string(),
  environment: environmentValidator,
  value: v.string(),
  classification: settingClassificationValidator,
};

export const upsertSiteSettingReturns = v.object({
  key: v.string(),
  updatedAt: v.number(),
});

export async function upsertSiteSettingHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof upsertSiteSettingArgs>,
) {
  const normalizedValue =
    args.key === "PUBLIC_WHATSAPP_URL"
      ? normalizePublicWhatsappUrl(args.value)
      : undefined;

  if (args.key !== "PUBLIC_WHATSAPP_URL" || !normalizedValue) {
    throw new Error(
      "Only a valid direct PUBLIC_WHATSAPP_URL setting can be saved here.",
    );
  }

  const updatedAt = Date.now();
  const existing = await ctx.db
    .query("siteSettings")
    .withIndex("by_environment_and_key", (query) =>
      query.eq("environment", args.environment).eq("key", args.key),
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      value: normalizedValue,
      classification: args.classification,
      updatedAt,
    });
  } else {
    await ctx.db.insert("siteSettings", {
      ...args,
      value: normalizedValue,
      updatedAt,
    });
  }

  return { key: args.key, updatedAt };
}
