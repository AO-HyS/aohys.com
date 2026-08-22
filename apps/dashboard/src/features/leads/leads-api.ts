import { useCallback } from "react";
import { api as convexApi } from "@aohys/backend/convex/_generated/api";
import { useMutation, usePaginatedQuery } from "convex/react";
import type { FunctionArgs } from "convex/server";

type UpdateLeadStatusArgs = FunctionArgs<typeof convexApi.leads.updateStatus>;

export function useDashboardLeads() {
  return usePaginatedQuery(
    convexApi.leads.listForDashboard,
    {},
    { initialNumItems: 12 },
  );
}

export function useSaveLeadStatus() {
  const mutation = useMutation(convexApi.leads.updateStatus);
  return useCallback(
    (
      leadId: UpdateLeadStatusArgs["leadId"],
      status: UpdateLeadStatusArgs["status"],
    ) => mutation({ leadId, status }),
    [mutation],
  );
}
