import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type ActionVariant = "primary" | "secondary" | "quiet" | "destructive";

const buttonVariantByAction = {
  primary: "default",
  secondary: "link",
  quiet: "ghost",
  destructive: "destructive",
} as const satisfies Record<ActionVariant, VariantProps<typeof buttonVariants>["variant"]>;

const actionClassByVariant = {
  primary: "border-2 border-foreground bg-primary text-primary-foreground shadow-[0_3px_0_var(--foreground)] hover:bg-accent active:not-aria-[haspopup]:translate-y-0.5 active:shadow-[0_1px_0_var(--foreground)]",
  secondary: "h-auto min-h-11 px-1 text-current underline decoration-2 underline-offset-[0.22em] sm:min-h-8",
  quiet: "",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
} as const satisfies Record<ActionVariant, string>;

export interface ActionProps extends Omit<React.ComponentProps<typeof Button>, "variant"> {
  variant?: ActionVariant;
  pending?: boolean;
  pendingLabel?: string;
}

export function Action({
  variant = "primary",
  pending = false,
  pendingLabel = "Working…",
  disabled,
  children,
  className,
  ...props
}: ActionProps) {
  const actionProps = {
    "data-slot": "action",
    "data-intent": variant,
    variant: buttonVariantByAction[variant],
    "aria-busy": pending || undefined,
    disabled: disabled || pending,
    className: cn(
      "min-h-11 transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out sm:min-h-8",
      actionClassByVariant[variant],
      className,
    ),
    ...props,
  } as const;

  if (actionProps.asChild) {
    return <Button {...actionProps}>{children}</Button>;
  }

  return (
    <Button {...actionProps}>
      {pending ? <Spinner data-icon="inline-start" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
