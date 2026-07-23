#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";

const stagedFiles = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
  { encoding: "utf8" },
)
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

const sourceFiles = stagedFiles.filter((file) =>
  /^(?:apps|packages)\/.+\.[cm]?[jt]sx?$/.test(file),
);

if (sourceFiles.length === 0) {
  console.log("[react-doctor] skipped: no staged JS/TS source files");
  process.exit(0);
}

const configurationChanged = stagedFiles.some((file) =>
  /(?:^|\/)(?:package\.json|pnpm-(?:lock|workspace)\.yaml|tsconfig(?:\.[^/]+)?\.json|eslint\.config\.[cm]?[jt]s|vite\.config\.[cm]?[jt]s|doctor\.config\.[cm]?[jt]s)$/.test(
    file,
  ),
);

if (configurationChanged) {
  console.log(
    "[react-doctor] deferred: staged configuration changed; react:doctor:changed will verify the candidate at pre-push",
  );
  process.exit(0);
}

const result = spawnSync(
  "pnpm",
  [
    "--filter",
    "./apps/**",
    "--filter",
    "./packages/**",
    "--workspace-concurrency=1",
    "exec",
    "react-doctor",
    ".",
    "--staged",
    "--scope",
    "lines",
    "--no-dead-code",
    "--no-supply-chain",
    "--no-score",
    "--blocking",
    "warning",
  ],
  { stdio: "inherit" },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
