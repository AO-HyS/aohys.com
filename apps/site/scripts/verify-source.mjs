import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const siteRoot = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(siteRoot, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath} is missing`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

const globalCss = read("src/styles/global.css");
const home = read("src/pages/index.astro");
const routePage = read("src/pages/[...path].astro");
const layout = read("src/layouts/BaseLayout.astro");
const header = read("src/components/SiteHeader.astro");
const footer = read("src/components/SiteFooter.astro");
const publicContentPage = read("src/components/PublicContentPage.astro");
const source = [globalCss, home, routePage, layout, header, footer, publicContentPage].join("\n");

check(globalCss.includes("@fontsource-variable/mona-sans"), "Mona Sans must be self-hosted through package assets");
check(
  globalCss.includes("@fontsource-variable/atkinson-hyperlegible-next"),
  "Atkinson Hyperlegible Next must be self-hosted through package assets",
);
check(globalCss.includes("--color-primary: oklch("), "global CSS must define OKLCH primary token");
check(globalCss.includes("--color-mint: oklch("), "global CSS must define OKLCH mint token");
check(globalCss.includes("--text-hero:"), "global CSS must define hero type token");
check(globalCss.includes("prefers-reduced-motion"), "global CSS must include reduced-motion handling");
check(layout.includes('data-site-shell="public"'), "layout must expose public shell marker");
check(header.includes("getLocalizedPath"), "header routes must come from the Public Content Graph");
check(routePage.includes("getPublicRouteMap"), "catch-all routes must come from the Public Content Graph");
check(layout.includes('rel="alternate"'), "layout must emit language alternate metadata");
check(footer.includes("client and product code stays private"), "footer must state private-work boundary");

const bannedPatterns = [
  ["background-clip:\\s*text", "gradient text is banned"],
  ["repeating-linear-gradient", "repeating stripe backgrounds are banned"],
  ["border-radius:\\s*(3[2-9]|[4-9][0-9])px", "over-rounded cards are banned"],
  ["lorem", "lorem copy is banned"],
];

for (const [pattern, message] of bannedPatterns) {
  check(!new RegExp(pattern, "i").test(source), message);
}

if (failures.length > 0) {
  console.error("Public shell source verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public shell source verification passed.");
