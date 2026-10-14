import { cn } from "@/lib/utils";

export { cn };

export const dashboardThemeVars = cn(
  "[--background:oklch(1_0_0)] [--foreground:oklch(0.3649_0.0215_61.4)]",
  "[--card:oklch(1_0_0)] [--card-foreground:oklch(0.3649_0.0215_61.4)]",
  "[--popover:oklch(1_0_0)] [--popover-foreground:oklch(0.3649_0.0215_61.4)]",
  "[--primary:oklch(0.8623_0.129_80)] [--primary-foreground:oklch(0.275_0.024_61.4)]",
  "[--secondary:oklch(0.94_0.035_121.8)] [--secondary-foreground:oklch(0.315_0.028_61.4)]",
  "[--muted:oklch(0.965_0.006_61.4)] [--muted-foreground:oklch(0.475_0.026_61.4)]",
  "[--accent:oklch(0.91_0.062_55.5)] [--accent-foreground:oklch(0.3_0.03_61.4)]",
  "[--destructive:oklch(0.53_0.19_27)] [--border:oklch(0.84_0.025_80)]",
  "[--input:oklch(0.78_0.022_80)] [--ring:oklch(0.56_0.155_48)]",
  "[--success:oklch(0.48_0.09_121.8)] [--success-foreground:oklch(0.285_0.035_121.8)]",
  "[--attention:oklch(0.68_0.13_55.5)] [--attention-foreground:oklch(0.315_0.04_55.5)]",
  "[--radius:0.625rem]",
  "[--sidebar:oklch(0.3649_0.0215_61.4)] [--sidebar-foreground:oklch(0.975_0.006_80)]",
  "[--sidebar-primary:oklch(0.8623_0.129_80)] [--sidebar-primary-foreground:oklch(0.275_0.024_61.4)]",
  "[--sidebar-accent:oklch(0.45_0.028_61.4)] [--sidebar-accent-foreground:oklch(0.99_0.003_80)]",
  "[--sidebar-border:oklch(0.53_0.028_61.4)] [--sidebar-ring:oklch(0.8623_0.129_80)]",
);

export const dashboardClass = {
  appRoot: cn(
    dashboardThemeVars,
    "min-h-screen min-w-80 bg-background font-sans text-foreground",
    "[&_h1]:text-balance [&_h2]:text-balance [&_h3]:text-balance [&_h4]:text-balance [&_p]:text-pretty",
  ),
  localeTabsList: cn(
    "h-auto w-fit !flex-row border bg-muted/40 p-1 shadow-none",
    "[&_[data-slot=tabs-trigger]]:w-auto [&_[data-slot=tabs-trigger]]:justify-center [&_[data-slot=tabs-trigger]]:px-3 [&_[data-slot=tabs-trigger]]:py-1",
  ),
  editForm: "flex flex-col gap-6",
  formGrid2: "grid gap-4 md:grid-cols-2",
  formGrid3: "grid gap-4 md:grid-cols-3",
};
