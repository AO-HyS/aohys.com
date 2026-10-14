import { Badge } from "@/components/ui/badge";

export type MetaBadgeEmphasis = "quiet" | "filled";

// Filled stays off the olive secondary hue, which reads as a success state.
const classByEmphasis = {
  quiet: "",
  filled: "border-transparent bg-muted text-foreground",
} as const satisfies Record<MetaBadgeEmphasis, string>;

export interface MetaBadgeProps {
  children: string | number;
  emphasis?: MetaBadgeEmphasis;
}

// Counts and descriptive labels. A state the operator acts on is a StatusBadge.
export function MetaBadge({ children, emphasis = "quiet" }: MetaBadgeProps) {
  return (
    <Badge
      data-slot="meta-badge"
      variant="outline"
      className={classByEmphasis[emphasis]}
    >
      {children}
    </Badge>
  );
}
