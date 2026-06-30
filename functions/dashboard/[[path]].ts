import {
  safeHandleDashboardRequest,
  type DashboardAccessEnvironment,
} from "../../apps/site/src/dashboard-access.js";

export async function onRequest(context: {
  request: Request;
  env: DashboardAccessEnvironment;
}): Promise<Response> {
  return safeHandleDashboardRequest(context.request, context.env);
}
