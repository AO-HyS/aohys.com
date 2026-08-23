import { api as convexApi } from "@aohys/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { dashboardRuntimeConfig } from "@/runtime-config";

export function useDashboardOverview() {
  return useQuery(convexApi.content.getDashboardOverview, {
    environment: dashboardRuntimeConfig.environment,
  });
}
