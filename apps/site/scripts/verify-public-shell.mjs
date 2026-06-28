import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const siteRoot = process.cwd();
const distRoot = path.join(siteRoot, "dist");
const indexPath = path.join(distRoot, "index.html");
const failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function read(relativePath) {
  return readFileSync(path.join(siteRoot, relativePath), "utf8");
}

function listFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listFiles(entryPath);
    }
    return entryPath;
  });
}

check(existsSync(indexPath), "dist/index.html must exist after build");

const html = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
const css = listFiles(path.join(distRoot, "_astro"))
  .filter((filePath) => filePath.endsWith(".css"))
  .map((filePath) => readFileSync(filePath, "utf8"))
  .join("\n");

check(html.includes('<html lang="en"'), "home document must declare lang=en");
check(
  html.includes("<title>Alejandro Ortiz Corro") ||
    html.includes("<title>AOHYS"),
  "home document must include a meaningful title",
);
check(
  html.includes('name="description"') &&
    html.includes("business outcomes") &&
    html.includes("software architecture"),
  "home document must include outcome-led SEO description",
);
check(html.includes('data-site-shell="public"'), "home must use the public shell");
check(html.includes('href="/case-studies"'), "navigation must link selected work");
check(html.includes('href="/architecture"'), "navigation must link architecture");
check(html.includes('href="/resume"'), "navigation must link resume");
check(html.includes('href="/contact"'), "navigation must link contact");
check(html.includes("Start a conversation"), "home must include primary CTA");
check(html.includes("View selected work"), "home must include secondary CTA");
check(html.includes("public source"), "footer must explain public-source framing");
check(html.includes("client and product code stays private"), "footer must protect private-work boundary");
check(!/lorem|todo|placeholder/i.test(html), "home HTML must not contain placeholder copy");

check(css.includes("--color-primary"), "built CSS must include color tokens");
check(css.includes("--color-mint"), "built CSS must include mint token");
check(css.includes("--font-display"), "built CSS must include display font token");
check(css.includes("--font-body"), "built CSS must include body font token");
check(css.includes("prefers-reduced-motion"), "built CSS must include reduced-motion handling");

const sourceCss = existsSync(path.join(siteRoot, "src/styles/global.css"))
  ? read("src/styles/global.css")
  : "";
check(sourceCss.includes("oklch("), "global source CSS must use OKLCH tokens");
check(
  sourceCss.includes("@fontsource-variable/mona-sans") ||
    sourceCss.includes("Mona Sans"),
  "global source CSS must load Mona Sans",
);
check(
  sourceCss.includes("@fontsource-variable/atkinson-hyperlegible-next") ||
    sourceCss.includes("Atkinson Hyperlegible Next"),
  "global source CSS must load Atkinson Hyperlegible Next",
);

if (failures.length > 0) {
  console.error("Public shell verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public shell verification passed.");
