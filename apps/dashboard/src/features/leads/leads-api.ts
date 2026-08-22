import { useCallback } from "react";
import { api as convexApi } from "@aohys/backend/convex/_generated/api";
import type { Id } from "@aohys/backend/convex/_generated/dataModel";
import { useMutation, usePaginatedQuery } from "convex/react";
import type { DashboardLeadStatus } from "./leads-types";

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
    (leadId: string, status: DashboardLeadStatus) =>
      mutation({ leadId: leadId as Id<"leads">, status }),
    [mutation],
  );
}
