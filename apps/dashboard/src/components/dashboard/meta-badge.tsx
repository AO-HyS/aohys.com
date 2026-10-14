import { Badge } from "@/components/ui/badge";

export type MetaBadgeEmphasis = "quiet" | "filled";

const variantByEmphasis = {
  quiet: "outline",
  filled: "secondary",
} as const satisfies Record<MetaBadgeEmphasis, "outline" | "secondary">;

export interface MetaBadgeProps {
  children: string | number;
  emphasis?: MetaBadgeEmphasis;
}

// Counts and descriptive labels. A state the operator acts on is a StatusBadge.
export function MetaBadge({ children, emphasis = "quiet" }: MetaBadgeProps) {
  return (
    <Badge data-slot="meta-badge" variant={variantByEmphasis[emphasis]}>
      {children}
    </Badge>
  );
}
