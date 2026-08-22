import { readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export function discoverArchitectureTests({ root = process.cwd() } = {}) {
  return readdirSync(path.join(root, "scripts/architecture"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
    .map((entry) => `scripts/architecture/${entry.name}`)
    .sort();
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const testFiles = discoverArchitectureTests();
  if (testFiles.length === 0) {
    console.error("No architecture tests were discovered.");
    process.exit(1);
  }

  const result = spawnSync(process.execPath, ["--test", ...testFiles], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
  process.exit(result.status ?? 1);
}
