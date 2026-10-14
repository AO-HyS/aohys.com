import { type LeadStatus } from "@aohys/core/domain";

export function formatLeadStatus(value: LeadStatus): string {
  return { new: "New", reviewing: "Reviewing", closed: "Closed" }[value];
}

export function leadStatusTone(
  value: LeadStatus,
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
