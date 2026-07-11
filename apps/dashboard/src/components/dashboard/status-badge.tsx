import type { ComponentType } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleIcon,
  Clock3Icon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "success" | "attention" | "pending" | "danger";

const iconByTone = {
  neutral: CircleIcon,
  success: CheckCircle2Icon,
  attention: AlertTriangleIcon,
  pending: Clock3Icon,
  danger: XCircleIcon,
} as const satisfies Record<StatusTone, ComponentType>;

const classByTone = {
  neutral: "",
  success: "border-success/40 bg-success/10 text-success-foreground",
  attention: "border-attention/40 bg-attention/15 text-attention-foreground",
  pending: "border-primary/60 bg-primary/20 text-foreground",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
} as const satisfies Record<StatusTone, string>;

export interface StatusBadgeProps {
  tone: StatusTone;
  children: string;
  icon?: ComponentType;
}

export function StatusBadge({ tone, children, icon: IconOverride }: StatusBadgeProps) {
  const Icon = IconOverride ?? iconByTone[tone];

  return (
    <Badge
      data-slot="status-badge"
      data-tone={tone}
      variant="outline"
      className={cn("rounded-md", classByTone[tone])}
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      <span>{children}</span>
    </Badge>
  );
}
