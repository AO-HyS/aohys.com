import type { EnvironmentName } from "@aohys/environment";

export function resolveContactEnvironment(value: string | undefined): EnvironmentName {
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
