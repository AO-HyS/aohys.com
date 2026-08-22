export type PostHogServerProperty = string | number | boolean;

export interface PostHogServerEnvironment {
  AOHYS_ENV?: string;
  PUBLIC_SITE_URL?: string;
  PUBLIC_POSTHOG_KEY?: string;
  PUBLIC_RELEASE_SHA?: string;
}

const RELEASE_SHA_PATTERN = /^[0-9a-f]{40}$/;

export function normalizePostHogReleaseSha(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return RELEASE_SHA_PATTERN.test(normalized) ? normalized : undefined;
}

export interface PostHogServerEvent {
  event: string;
  distinctId: string;
  properties: Record<string, PostHogServerProperty | undefined>;
}

export type PostHogServerTransport = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export interface PostHogServerCaptureResult {
  captured: boolean;
  skippedReason?: "missing-key" | "non-production";
}

function definedProperties(
  properties: PostHogServerEvent["properties"],
): Record<string, PostHogServerProperty> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, PostHogServerProperty] => {
        return entry[1] !== undefined;
      },
    ),
  );
}

export async function capturePostHogServerEvent(
  environment: PostHogServerEnvironment,
  event: PostHogServerEvent,
  transport: PostHogServerTransport = fetch,
): Promise<PostHogServerCaptureResult> {
  const apiKey = environment.PUBLIC_POSTHOG_KEY?.trim();

  if (environment.AOHYS_ENV !== "production") {
    return { captured: false, skippedReason: "non-production" };
  }

  if (!apiKey) {
    return { captured: false, skippedReason: "missing-key" };
  }

  const siteUrl = environment.PUBLIC_SITE_URL?.trim() || "https://aohys.com";
  const release = normalizePostHogReleaseSha(environment.PUBLIC_RELEASE_SHA);

  const response = await transport(
    `${siteUrl.replace(/\/+$/, "")}/ingest/capture/`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        event: event.event,
        distinct_id: event.distinctId,
        properties: {
          $geoip_disable: true,
          ...definedProperties(event.properties),
          ...(release ? { release } : {}),
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `PostHog server capture failed with status ${response.status}.`,
    );
  }

  return { captured: true };
}
