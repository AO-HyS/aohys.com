import { proxyAuthRequest, type AuthProxyEnvironment } from "../../../apps/site/src/auth-proxy.js";

export async function onRequest(context: {
  request: Request;
  env: AuthProxyEnvironment;
  params: { path?: string | string[] };
}): Promise<Response> {
  return proxyAuthRequest(context.request, context.env, context.params.path);
}
