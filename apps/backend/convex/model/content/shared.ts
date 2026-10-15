import { resolvePublicMediaUrl } from "@aohys/core";
import type { MediaStorageProvider } from "@aohys/core/domain";

export function withinLimit<T>(rows: T[], limit: number, label: string): T[] {
  if (rows.length > limit) {
    throw new Error(`${label} exceeds the safe dashboard operation limit.`);
  }

  return rows;
}

export function publicMediaUrl(media: {
  storageProvider: MediaStorageProvider;
  storageKey: string;
  publicUrl?: string;
}): string | undefined {
  const resolution = resolvePublicMediaUrl(
    media,
    process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH
      ? {
          cloudflareImagesAccountHash:
            process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH,
        }
      : {},
  );
  return resolution.status === "resolved" ? resolution.url : undefined;
}
