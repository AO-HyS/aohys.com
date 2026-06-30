export type PostHogServerProperty = string | number | boolean;

export interface PostHogServerEnvironment {
  PUBLIC_POSTHOG_KEY?: string;
  PUBLIC_POSTHOG_HOST?: string;
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
  skippedReason?: "missing-key";
}

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

function normalizePostHogHost(value: string | undefined): string {
  return (value?.trim() || DEFAULT_POSTHOG_HOST).replace(/\/+$/, "");
}

function definedProperties(
  properties: PostHogServerEvent["properties"],
): Record<string, PostHogServerProperty> {
  return Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, PostHogServerProperty] => {
      return entry[1] !== undefined;
    }),
  );
}

export async function capturePostHogServerEvent(
  environment: PostHogServerEnvironment,
  event: PostHogServerEvent,
  transport: PostHogServerTransport = fetch,
): Promise<PostHogServerCaptureResult> {
  const apiKey = environment.PUBLIC_POSTHOG_KEY?.trim();

  if (!apiKey) {
    return { captured: false, skippedReason: "missing-key" };
  }

  const response = await transport(`${normalizePostHogHost(environment.PUBLIC_POSTHOG_HOST)}/capture/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      event: event.event,
      distinct_id: event.distinctId,
      properties: definedProperties(event.properties),
    }),
  });

  if (!response.ok) {
    throw new Error(`PostHog server capture failed with status ${response.status}.`);
  }

  return { captured: true };
}
