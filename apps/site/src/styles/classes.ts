type ClassValue = false | null | string | undefined;

export function cx(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

const displayFont = "[font-family:'Mona_Sans_Variable','Mona_Sans',ui-sans-serif,system-ui,sans-serif]";
const bodyFont = "[font-family:'Atkinson_Hyperlegible_Next_Variable','Atkinson_Hyperlegible_Next',ui-sans-serif,system-ui,sans-serif]";

export const themeVars = cx(
  "[color-scheme:light]",
  "[--color-bg:oklch(1_0_0)]",
  "[--color-surface:oklch(0.975_0.008_122)]",
  "[--color-ink:oklch(0.3649_0.0215_61.4)]",
  "[--color-muted:oklch(0.50_0.025_61.4)]",
  "[--color-rule:oklch(0.86_0.025_80)]",
  "[--color-primary:oklch(0.8623_0.129_80)]",
  "[--color-primary-ink:oklch(0.3649_0.0215_61.4)]",
  "[--color-secondary:oklch(0.7779_0.1104_121.8)]",
  "[--color-secondary-ink:oklch(0.30_0.025_61.4)]",
  "[--color-accent:oklch(0.8008_0.1283_55.5)]",
  "[--color-accent-ink:oklch(0.30_0.025_61.4)]",
  "[--color-dark:oklch(0.3649_0.0215_61.4)]",
  "[--color-dark-surface:oklch(0.31_0.022_61.4)]",
  "[--color-dark-ink:oklch(0.98_0.006_80)]",
  "[--color-focus:oklch(0.3649_0.0215_61.4)]",
  "[--container:min(calc(100%_-_2rem),72rem)]",
  "[--narrow:min(calc(100%_-_2rem),52rem)]",
  "[--text-body:1rem]",
  "[--text-small:0.875rem]",
  "[--text-lead:1.25rem]",
  "[--text-h3:2rem]",
  "[--text-h2:4rem]",
  "[--text-hero:5.75rem]",
  "max-[900px]:[--text-h2:3rem]",
  "max-[900px]:[--text-hero:4.35rem]",
  "max-[560px]:[--text-h2:2.35rem]",
  "max-[560px]:[--text-hero:3.1rem]",
);

export const bodyClass = cx(
  themeVars,
  bodyFont,
  "m-0 overflow-x-clip bg-[var(--color-bg)] text-[color:var(--color-ink)] text-[length:var(--text-body)] leading-[1.62] [overflow-wrap:break-word] [text-rendering:optimizeLegibility]",
);

export const ui = {
  siteShell: cx(
    displayFont,
    "min-h-screen overflow-x-clip bg-[var(--color-bg)] text-[color:var(--color-ink)]",
    "[&_main]:min-w-0 [&_section]:min-w-0 [&_figure]:min-w-0",
    "[&_a]:text-inherit",
    "[&_h1]:[font-family:'Mona_Sans_Variable','Mona_Sans',ui-sans-serif,system-ui,sans-serif]",
    "[&_h2]:[font-family:'Mona_Sans_Variable','Mona_Sans',ui-sans-serif,system-ui,sans-serif]",
    "[&_h3]:[font-family:'Mona_Sans_Variable','Mona_Sans',ui-sans-serif,system-ui,sans-serif]",
    "[&_p]:[font-family:'Atkinson_Hyperlegible_Next_Variable','Atkinson_Hyperlegible_Next',ui-sans-serif,system-ui,sans-serif]",
    "[&_a:focus-visible]:[outline:3px_solid_var(--color-focus)] [&_a:focus-visible]:outline-offset-4",
    "[&_button:focus-visible]:[outline:3px_solid_var(--color-focus)] [&_button:focus-visible]:outline-offset-4",
    "[&_input:focus-visible]:[outline:3px_solid_var(--color-focus)] [&_input:focus-visible]:outline-offset-2",
    "[&_select:focus-visible]:[outline:3px_solid_var(--color-focus)] [&_select:focus-visible]:outline-offset-2",
    "[&_textarea:focus-visible]:[outline:3px_solid_var(--color-focus)] [&_textarea:focus-visible]:outline-offset-2",
    "motion-reduce:[scroll-behavior:auto]",
  ),
};
