#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";

const baseRef = "origin/develop";
const reactProjects = ["apps/dashboard"];
const changedFiles = execFileSync(
  "git",
  ["diff", "--name-only", "--diff-filter=ACMR", `${baseRef}...HEAD`],
  { encoding: "utf8" },
)
  .split("\n")
  .map((file) => file.trim())
  .filter((file) => /^(?:apps|packages)\/.+\.[cm]?[jt]sx?$/.test(file));

const impactedProjects = reactProjects.filter((project) =>
  changedFiles.some((file) => file.startsWith(`${project}/`)),
);

if (impactedProjects.length === 0) {
  console.log("[react-doctor] skipped: no changed React project source files");
  process.exit(0);
}

for (const project of impactedProjects) {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "react-doctor",
      ".",
      "--scope",
      "changed",
      "--base",
      baseRef,
      "--no-dead-code",
      "--no-supply-chain",
      "--no-score",
      "--blocking",
      "warning",
    ],
    { cwd: project, stdio: "inherit" },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
