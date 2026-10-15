// The single source of the AOHYS palette. `pnpm brand:generate` writes the
// site and dashboard theme variables and the Horizonte `:root` from it, and
// `pnpm brand:check` (part of `pnpm lint`) rejects drift and brand color
// literals anywhere else in apps/*/src. DESIGN.md documents the intent.
//
// OKLCH values keep the exact numerals the themes have always used, so the
// generated CSS is byte-identical. Pastels are distinct tokens, not tints
// derived from the full colors.

export type Oklch = `oklch(${string})`;
export type Hex = `#${string}`;

/** Full brand colors (OKLCH), from the July 2026 palette reference. */
export const brandColors = {
  ink: "oklch(0.3649 0.0215 61.4)",
  honey: "oklch(0.8623 0.129 80)",
  olive: "oklch(0.7779 0.1104 121.8)",
  apricot: "oklch(0.8008 0.1283 55.5)",
} as const satisfies Record<string, Oklch>;

/** Horizonte pastels: page washes, orbs and project tints. */
export const brandPastels = {
  honey: "#fce3a6",
  olive: "#d6e2b4",
  apricot: "#fdd2b1",
  lime: "#e7e6b0",
  sand: "#fdddaa",
} as const satisfies Record<string, Hex>;

export type BrandPastel = keyof typeof brandPastels;

/** Hex forms the Horizonte stylesheet and SVG art use. */
export const brandHex = {
  ink: "#473c33",
  inkSoft: "#6a6058",
  paper: "#ffffff",
  paperWarm: "#fbf8f3",
  honeyFull: "#fec868",
} as const satisfies Record<string, Hex>;

const white = "oklch(1 0 0)" satisfies Oklch;

/** Public site theme (`themeVars` color variables). */
export const siteTheme = {
  "--color-bg": white,
  "--color-surface": "oklch(0.975 0.008 122)",
  "--color-ink": brandColors.ink,
  "--color-muted": "oklch(0.50 0.025 61.4)",
  "--color-rule": "oklch(0.86 0.025 80)",
  "--color-primary": brandColors.honey,
  "--color-primary-ink": brandColors.ink,
  "--color-secondary": brandColors.olive,
  "--color-secondary-ink": "oklch(0.30 0.025 61.4)",
  "--color-accent": brandColors.apricot,
  "--color-accent-ink": "oklch(0.30 0.025 61.4)",
  "--color-dark": brandColors.ink,
  "--color-dark-surface": "oklch(0.31 0.022 61.4)",
  "--color-dark-ink": "oklch(0.98 0.006 80)",
  "--color-focus": brandColors.ink,
} as const satisfies Record<`--${string}`, Oklch>;

/** Dashboard shadcn theme (`dashboardThemeVars`). */
export const dashboardTheme = {
  "--background": white,
  "--foreground": brandColors.ink,
  "--card": white,
  "--card-foreground": brandColors.ink,
  "--popover": white,
  "--popover-foreground": brandColors.ink,
  "--primary": brandColors.honey,
  "--primary-foreground": "oklch(0.275 0.024 61.4)",
  "--secondary": "oklch(0.94 0.035 121.8)",
  "--secondary-foreground": "oklch(0.315 0.028 61.4)",
  "--muted": "oklch(0.965 0.006 61.4)",
  "--muted-foreground": "oklch(0.475 0.026 61.4)",
  "--accent": "oklch(0.91 0.062 55.5)",
  "--accent-foreground": "oklch(0.3 0.03 61.4)",
  "--destructive": "oklch(0.53 0.19 27)",
  "--border": "oklch(0.84 0.025 80)",
  "--input": "oklch(0.78 0.022 80)",
  "--ring": "oklch(0.56 0.155 48)",
  "--success": "oklch(0.48 0.09 121.8)",
  "--success-foreground": "oklch(0.285 0.035 121.8)",
  "--attention": "oklch(0.68 0.13 55.5)",
  "--attention-foreground": "oklch(0.315 0.04 55.5)",
  "--sidebar": brandColors.ink,
  "--sidebar-foreground": "oklch(0.975 0.006 80)",
  "--sidebar-primary": brandColors.honey,
  "--sidebar-primary-foreground": "oklch(0.275 0.024 61.4)",
  "--sidebar-accent": "oklch(0.45 0.028 61.4)",
  "--sidebar-accent-foreground": "oklch(0.99 0.003 80)",
  "--sidebar-border": "oklch(0.53 0.028 61.4)",
  "--sidebar-ring": brandColors.honey,
} as const satisfies Record<`--${string}`, Oklch>;

/** The dashboard theme subset the server-rendered sign-in and error pages use. */
export const dashboardAccessThemeKeys = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--primary",
  "--primary-foreground",
  "--muted",
  "--muted-foreground",
  "--border",
  "--ring",
] as const satisfies readonly (keyof typeof dashboardTheme)[];

/** `"71, 60, 51"` for a `#rrggbb` token, for `rgba()` alpha variants. */
export function rgbChannels(hex: Hex): string {
  return [1, 3, 5]
    .map((start) => Number.parseInt(hex.slice(start, start + 2), 16))
    .join(", ");
}

/** Horizonte `:root` color variables; `--wash` also seeds `@property --wash`. */
export const horizonteRoot = {
  "--ink": brandHex.ink,
  "--ink-soft": brandHex.inkSoft,
  "--paper": brandHex.paper,
  "--paper-warm": brandHex.paperWarm,
  "--honey": brandPastels.honey,
  "--olive": brandPastels.olive,
  "--apricot": brandPastels.apricot,
  "--honey-full": brandHex.honeyFull,
  "--wash": brandPastels.apricot,
} as const satisfies Record<`--${string}`, Hex>;

/** Space-separated channels for `rgb(var(--ink-rgb) / <alpha>)` in CSS. */
export const horizonteRootChannels = {
  "--ink-rgb": rgbChannels(brandHex.ink).replaceAll(",", ""),
} as const;

/** Neutral values that are not brand colors (white and black). */
export const neutralColors: readonly string[] = [white, brandHex.paper];
