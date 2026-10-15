import { siteColorVars } from "./brand-theme.generated";

type ClassValue = false | null | string | undefined;

export function cx(...values: ClassValue[]) {
  return values.filter(Boolean).join(" ");
}

const displayFont =
  "[font-family:'Jost_Variable','Jost','Avenir_Next','Segoe_UI',system-ui,sans-serif]";
const bodyFont = displayFont;

export const themeVars = cx(
  "[color-scheme:light]",
  siteColorVars,
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
    "[&_a:focus-visible]:[outline:2px_solid_var(--color-focus)] [&_a:focus-visible]:outline-offset-4",
    "[&_button:focus-visible]:[outline:2px_solid_var(--color-focus)] [&_button:focus-visible]:outline-offset-4",
    "[&_input:focus-visible]:[outline:3px_solid_var(--color-focus)] [&_input:focus-visible]:outline-offset-2",
    "[&_select:focus-visible]:[outline:3px_solid_var(--color-focus)] [&_select:focus-visible]:outline-offset-2",
    "[&_textarea:focus-visible]:[outline:3px_solid_var(--color-focus)] [&_textarea:focus-visible]:outline-offset-2",
    "motion-reduce:[scroll-behavior:auto]",
  ),
};
