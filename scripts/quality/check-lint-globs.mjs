#!/usr/bin/env node
// Lint gates must cover every file they claim to. An unquoted glob such as
// src/**/*.{ts,tsx} is expanded by sh, which has no globstar, so nested files
// are silently skipped. Pass directories or quote the glob.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tools = /\b(?:eslint|oxlint|prettier|biome)\b/;
const manifests = execFileSync("git", ["ls-files", "*package.json"], {
  encoding: "utf8",
})
  .split("\n")
  .filter((file) => file && !file.includes("node_modules"));

const failures = [];
for (const manifest of manifests) {
  const { scripts = {} } = JSON.parse(readFileSync(manifest, "utf8"));
  for (const [name, command] of Object.entries(scripts)) {
    if (!tools.test(command)) continue;
    const unquoted = command.replace(/'[^']*'|"[^"]*"/g, "");
    if (unquoted.includes("*"))
      failures.push(`${manifest} scripts.${name}: ${command}`);
  }
}

if (failures.length > 0) {
  console.error(
    "Lint scripts pass unquoted globs; sh skips nested files. Quote the glob or pass a directory:",
  );
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`Lint globs OK (${manifests.length} package.json files).`);
