import { resolvePublicMediaUrl } from "@aohys/core";
import { v } from "convex/values";

export const localeValidator = v.union(v.literal("en"), v.literal("es"));

export const environmentValidator = v.union(
  v.literal("local"),
  v.literal("preview"),
  v.literal("production"),
);

export function withinLimit<T>(rows: T[], limit: number, label: string): T[] {
  if (rows.length > limit) {
    throw new Error(`${label} exceeds the safe dashboard operation limit.`);
  }

  return rows;
}

export function publicMediaUrl(media: {
  storageProvider: "cloudflare-images" | "cloudflare-r2" | "external";
  storageKey: string;
  publicUrl?: string;
}): string | undefined {
  const resolution = resolvePublicMediaUrl(media, {
    ...(process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH
      ? {
          cloudflareImagesAccountHash:
            process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH,
        }
      : {}),
  });
  return resolution.status === "resolved" ? resolution.url : undefined;
}
