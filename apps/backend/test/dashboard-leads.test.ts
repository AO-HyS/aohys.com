import { describe, expect, it } from "vitest";
import {
  assertDashboardApiToken,
  parseDashboardLeadStatusPayload,
} from "../src/dashboard-leads.js";

describe("dashboard lead HTTP boundary", () => {
  it("accepts matching server-to-server bearer tokens", () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/leads", {
      headers: {
        authorization: "Bearer dashboard-api-token",
      },
    });

    expect(() => assertDashboardApiToken(request, "dashboard-api-token")).not.toThrow();
  });

  it("rejects missing configuration and invalid bearer tokens", () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/leads", {
      headers: {
        authorization: "Bearer wrong-token",
      },
    });

    expect(() => assertDashboardApiToken(request, undefined)).toThrow(
      "Dashboard API token is not configured.",
    );
    expect(() => assertDashboardApiToken(request, "dashboard-api-token")).toThrow(
      "Dashboard API token is invalid.",
    );
  });

  it("parses and validates lead status update payloads", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/leads/status", {
      method: "POST",
      body: JSON.stringify({
        leadId: "lead_123",
        status: "reviewing",
      }),
    });

    await expect(parseDashboardLeadStatusPayload(request)).resolves.toEqual({
      leadId: "lead_123",
      status: "reviewing",
    });
  });

  it("rejects unsupported lead status update payloads", async () => {
    const request = new Request("https://aohys-preview.convex.site/dashboard/leads/status", {
      method: "POST",
      body: JSON.stringify({
        leadId: "lead_123",
        status: "done",
      }),
    });

    await expect(parseDashboardLeadStatusPayload(request)).rejects.toThrow(
      "status is not supported.",
    );
  });
});
