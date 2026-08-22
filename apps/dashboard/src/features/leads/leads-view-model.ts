import type { DashboardLeadStatus } from "./leads-types";

export function formatLeadStatus(value: DashboardLeadStatus): string {
  return { new: "New", reviewing: "Reviewing", closed: "Closed" }[value];
}

export function leadStatusTone(
  value: DashboardLeadStatus,
): "neutral" | "attention" | "success" {
  return { new: "attention", reviewing: "neutral", closed: "success" }[
    value
  ] as "neutral" | "attention" | "success";
}

export function formatLeadIntent(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
