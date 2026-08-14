import type { PostHogProxyEnvironment } from "../../apps/site/src/posthog-proxy.js";

export async function onRequest(context: {
  request: Request;
  env: PostHogProxyEnvironment;
}): Promise<Response> {
  const { handlePostHogProxyRequest } = await import("../../apps/site/src/posthog-proxy.js");
  return handlePostHogProxyRequest(context.request, context.env);
}
