export interface CloudflareImagesCustomIdValidation {
  isValid: boolean;
  message?: string;
  value: string;
}

const customIdMaxLength = 1024;
const customIdHelp = "Use a relative key like media/casa-roca-hero. Do not use URLs, dot-prefixed folders, .., or repeated slashes.";

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

  if (!rawValue || !normalizedValue) {
    return {
      isValid: false,
      message: customIdHelp,
      value: normalizedValue,
    };
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return {
      isValid: false,
      message: customIdHelp,
      value: normalizedValue,
    };
  }

  if (normalizedValue.length > customIdMaxLength) {
    return {
      isValid: false,
      message: "Cloudflare Images custom IDs must be 1024 characters or less.",
      value: normalizedValue,
    };
  }

  const invalidSegment = normalizedValue
    .split("/")
    .find((segment) => segment.startsWith(".") || segment.includes(".."));

  if (invalidSegment) {
    return {
      isValid: false,
      message: customIdHelp,
      value: normalizedValue,
    };
  }

  return {
    isValid: true,
    value: normalizedValue,
  };
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
  const normalizedBase = validateCloudflareImagesCustomId(baseKey).value || "media/project";
  return validateCloudflareImagesCustomId(`${normalizedBase}/${cloudflareImagesStorageKeySegment(fileName)}`).value;
}
