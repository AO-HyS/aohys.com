import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { assertBuildOutputs, measurePerformance } from "./measure-lib.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const outputFlagIndex = process.argv.indexOf("--output");
const outputPath = path.resolve(
  repositoryRoot,
  outputFlagIndex >= 0 && process.argv[outputFlagIndex + 1]
    ? process.argv[outputFlagIndex + 1]
    : "docs/research/im-12-performance-baseline.json",
);
const dashboardDist = path.join(repositoryRoot, "apps/dashboard/dist");
const siteDist = path.join(repositoryRoot, "apps/site/dist");

assertBuildOutputs({ dashboardDist, siteDist });

const rootPackage = JSON.parse(
  readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
);
const dashboardPackage = JSON.parse(
  readFileSync(
    path.join(repositoryRoot, "apps/dashboard/node_modules/vite/package.json"),
    "utf8",
  ),
);
const sitePackage = JSON.parse(
  readFileSync(
    path.join(repositoryRoot, "apps/site/node_modules/astro/package.json"),
    "utf8",
  ),
);
const report = measurePerformance({
  dashboardDist,
  siteDist,
  sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim(),
  toolchain: {
    node: process.version,
    packageManager: rootPackage.packageManager,
    astro: sitePackage.version,
    vite: dashboardPackage.version,
  },
});

mkdirSync(path.dirname(outputPath), { recursive: true });
const formattedReport = await format(JSON.stringify(report), {
  parser: "json",
});
writeFileSync(outputPath, formattedReport);
console.log(formattedReport.trim());
process.exitCode = 0;
