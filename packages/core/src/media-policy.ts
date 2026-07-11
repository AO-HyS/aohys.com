export type MediaStorageProvider = "cloudflare-images" | "cloudflare-r2" | "external";
export type MediaUsage = "case-study" | "resume" | "architecture" | "site";
export type MediaStatus = "draft" | "published" | "archived";

export interface CloudflareImagesCustomIdValidation {
  isValid: boolean;
  message?: string;
  value: string;
}

export interface PublicMediaReference {
  storageProvider: MediaStorageProvider;
  storageKey: string;
  publicUrl?: string;
}

export type PublicMediaResolution =
  | {
    status: "resolved";
    url: string;
    source: "repository-asset" | "external-url" | "cloudflare-images";
  }
  | {
    status: "invalid" | "unsupported-provider" | "provider-unavailable";
    reason: string;
  };

export interface PublicationMediaItem {
  id: string;
  contentId?: string;
  usage: MediaUsage;
  status: MediaStatus;
  selectedForPublic?: boolean;
  updatedAt: number;
}

export interface PublicationMediaSelection<T extends PublicationMediaItem> {
  selected: T[];
  displaced: T[];
}

const customIdMaxLength = 1024;
const customIdHelp = "Use a relative key like media/casa-roca-hero. Do not use URLs, dot-prefixed folders, traversal segments, encoded slashes, or query fragments.";
const publicAssetPattern = /^(?:\/)?images\/.+\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

export function normalizeCloudflareImagesCustomId(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.trim().replace(/\s+/g, "-"))
    .filter(Boolean)
    .join("/");
}

export function validateCloudflareImagesCustomId(value: string): CloudflareImagesCustomIdValidation {
  const rawValue = value.trim();
  const normalizedValue = normalizeCloudflareImagesCustomId(value);

  if (!rawValue || !normalizedValue || /^https?:\/\//i.test(rawValue)) {
    return invalidCustomId(normalizedValue);
  }

  if (normalizedValue.length > customIdMaxLength) {
    return {
      isValid: false,
      message: "Cloudflare Images custom IDs must be 1024 characters or less.",
      value: normalizedValue,
    };
  }

  const segmentsAreSafe = normalizedValue.split("/").every((segment) => {
    const decoded = safelyDecode(segment);
    return decoded !== undefined
      && decoded === segment
      && !decoded.startsWith(".")
      && decoded !== ".."
      && !decoded.includes("/")
      && !decoded.includes("\\")
      && /^[A-Za-z0-9._-]+$/.test(decoded);
  });

  return segmentsAreSafe
    ? { isValid: true, value: normalizedValue }
    : invalidCustomId(normalizedValue);
}

export function defaultProjectMediaStorageKey(contentId: string): string {
  const projectSlug = contentId.replace(/^case-study:/, "");
  return validateCloudflareImagesCustomId(`media/${projectSlug}`).value || "media/project";
}

export function cloudflareImagesStorageKeySegment(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const segment = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return segment || "image";
}

export function cloudflareImagesStorageKeyForFile(baseKey: string, fileName: string): string {
  const baseValidation = validateCloudflareImagesCustomId(baseKey);
  const normalizedBase = baseValidation.isValid ? baseValidation.value : "media/project";
  const segment = cloudflareImagesStorageKeySegment(fileName);
  const candidate = validateCloudflareImagesCustomId(`${normalizedBase}/${segment}`);
  return candidate.isValid ? candidate.value : `media/project/${segment}`;
}

export function resolvePublicMediaUrl(
  media: PublicMediaReference,
  options: { cloudflareImagesAccountHash?: string } = {},
): PublicMediaResolution {
  if (media.publicUrl) {
    return resolvePublicCandidate(media.publicUrl);
  }

  const storageCandidate = resolvePublicCandidate(media.storageKey);
  if (storageCandidate.status === "resolved") {
    return storageCandidate;
  }

  if (media.storageProvider === "cloudflare-r2") {
    return {
      status: "unsupported-provider",
      reason: "Cloudflare R2 has no public delivery adapter in the AOHYS media policy.",
    };
  }

  if (media.storageProvider !== "cloudflare-images") {
    return {
      status: "invalid",
      reason: "External media must provide a safe /images asset path or an HTTPS URL.",
    };
  }

  const accountHash = options.cloudflareImagesAccountHash?.trim();
  if (!accountHash || !/^[A-Za-z0-9_-]+$/.test(accountHash)) {
    return {
      status: "provider-unavailable",
      reason: "Cloudflare Images delivery requires a valid account hash.",
    };
  }

  const customId = validateCloudflareImagesCustomId(media.storageKey);
  if (!customId.isValid) {
    return { status: "invalid", reason: customId.message ?? customIdHelp };
  }

  return {
    status: "resolved",
    source: "cloudflare-images",
    url: `https://imagedelivery.net/${accountHash}/${customId.value}/public`,
  };
}

export function selectPublicationMedia<T extends PublicationMediaItem>(
  mediaItems: T[],
  stage: "publication-request" | "public-build",
): PublicationMediaSelection<T> {
  const eligible = mediaItems.filter((item) => stage === "publication-request"
    ? item.status !== "archived"
    : item.status === "published" && isPublicBuildUsage(item.usage));
  const grouped = new Map<string, T[]>();

  for (const item of eligible) {
    const key = item.contentId ?? item.id;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  const selected = [...grouped.values()].map((items) =>
    [...items].sort(comparePublicationMedia)[0]
  ).filter((item): item is T => item !== undefined);
  const selectedIds = new Set(selected.map((item) => item.id));
  const selectedSlots = new Set(selected.map((item) => item.contentId ?? item.id));
  const displaced = mediaItems.filter((item) =>
    item.status === "published"
    && selectedSlots.has(item.contentId ?? item.id)
    && !selectedIds.has(item.id)
  );

  return { selected, displaced };
}

function resolvePublicCandidate(value: string): PublicMediaResolution {
  if (isSafePublicAssetPath(value)) {
    return {
      status: "resolved",
      source: "repository-asset",
      url: value.startsWith("/") ? value : `/${value}`,
    };
  }

  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password) {
      return { status: "resolved", source: "external-url", url: url.toString() };
    }
  } catch {
    // The caller receives the fixed invalid result below.
  }

  return {
    status: "invalid",
    reason: "Public media must use a safe /images asset path or an HTTPS URL without credentials.",
  };
}

function isSafePublicAssetPath(value: string): boolean {
  const path = value.split(/[?#]/, 1)[0] ?? "";
  if (!publicAssetPattern.test(path)) return false;

  return (path.startsWith("/") ? path.slice(1) : path)
    .split("/")
    .every((segment) => {
      const decoded = safelyDecode(segment);
      return decoded !== undefined
        && decoded.length > 0
        && decoded !== "."
        && decoded !== ".."
        && !decoded.includes("/")
        && !decoded.includes("\\");
    });
}

function comparePublicationMedia(left: PublicationMediaItem, right: PublicationMediaItem): number {
  const selectionDifference = Number(right.selectedForPublic === true) - Number(left.selectedForPublic === true);
  if (selectionDifference !== 0) return selectionDifference;

  const updatedDifference = right.updatedAt - left.updatedAt;
  return updatedDifference !== 0 ? updatedDifference : left.id.localeCompare(right.id);
}

function isPublicBuildUsage(usage: MediaUsage): boolean {
  return usage === "case-study" || usage === "site" || usage === "architecture";
}

function invalidCustomId(value: string): CloudflareImagesCustomIdValidation {
  return { isValid: false, message: customIdHelp, value };
}

function safelyDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
