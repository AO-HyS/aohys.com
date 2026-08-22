import type { EnvironmentName } from "@aohys/environment";

const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/;
const CONTACT_SOURCE_PATHS = new Set(["/contact", "/es/contacto"]);

export function resolveContactEnvironment(
  value: string | undefined,
): EnvironmentName {
  return value === "local" || value === "preview" || value === "production"
    ? value
    : "local";
}

export function shouldCaptureContactIntakeFailure(
  environment: EnvironmentName,
  publicPostHogKey: string | undefined,
): boolean {
  return environment === "production" && Boolean(publicPostHogKey?.trim());
}

export function normalizeContactReleaseSha(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return RELEASE_SHA_PATTERN.test(normalized) ? normalized : undefined;
}

export function normalizeContactSourcePath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) return undefined;

  try {
    const url = new URL(value, "https://aohys.invalid");
    if (url.origin !== "https://aohys.invalid") return undefined;
    const pathname =
      url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    return CONTACT_SOURCE_PATHS.has(pathname) ? pathname : undefined;
  } catch {
    return undefined;
  }
}
