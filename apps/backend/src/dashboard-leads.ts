import { assertOneOf } from "@aohys/core";
import { LEAD_STATUSES, type LeadStatus } from "./lead-intake.js";

export interface DashboardLeadStatusPayload {
  leadId: string;
  status: LeadStatus;
}

export function assertDashboardApiToken(
  request: Request,
  expectedToken: string | undefined,
): void {
  if (!expectedToken) {
    throw new Error("Dashboard API token is not configured.");
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";

  if (!token || token !== expectedToken) {
    throw new Error("Dashboard API token is invalid.");
  }
}

export async function parseDashboardLeadStatusPayload(
  request: Request,
): Promise<DashboardLeadStatusPayload> {
  const payload = await request.json() as {
    leadId?: unknown;
    status?: unknown;
  };

  if (typeof payload.leadId !== "string" || !payload.leadId.trim()) {
    throw new Error("leadId is required.");
  }

  if (typeof payload.status !== "string") {
    throw new Error("status is required.");
  }

  assertOneOf(payload.status, LEAD_STATUSES, "status");

  return {
    leadId: payload.leadId.trim(),
    status: payload.status,
  };
}
