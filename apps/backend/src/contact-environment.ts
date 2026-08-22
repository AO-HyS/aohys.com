import type { EnvironmentName } from "@aohys/environment";

const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/;

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
