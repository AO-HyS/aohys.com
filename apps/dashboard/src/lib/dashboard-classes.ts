import { dashboardColorVars } from "@/lib/brand-theme.generated";
import { cn } from "@/lib/utils";

export { cn };

export const dashboardThemeVars = cn(dashboardColorVars, "[--radius:0.625rem]");

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
