import { useCallback } from "react";
import { api as convexApi } from "@aohys/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { dashboardRuntimeConfig } from "@/runtime-config";

export function useSettingsContent() {
  const content = useQuery(convexApi.content.listForDashboard, {});
  return content ? (content.settings ?? []) : undefined;
}

export function useSaveSiteSetting() {
  const mutation = useMutation(convexApi.content.upsertSiteSetting);
  return useCallback(
    (payload: {
      key: string;
      value: string;
      classification: "public-build-value";
    }) =>
      mutation({ ...payload, environment: dashboardRuntimeConfig.environment }),
    [mutation],
  );
}
