import {
  handleDashboardRequest,
  type DashboardAccessEnvironment,
} from "../../apps/site/src/dashboard-access.js";

export async function onRequest(context: {
  request: Request;
  env: DashboardAccessEnvironment;
}): Promise<Response> {
  return handleDashboardRequest(context.request, context.env);
}
