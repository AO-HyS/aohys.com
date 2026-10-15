import type { api } from "@aohys/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type DashboardLead = FunctionReturnType<
  typeof api.leads.listForDashboard
>["page"][number];
