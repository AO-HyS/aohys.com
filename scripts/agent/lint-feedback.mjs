#!/usr/bin/env node
// PostToolUse hook for Codex and Claude Code: lints the files an agent just
// edited with the same Oxlint config the CLI and editor use, and hands any
// diagnostics back to the agent as additional context in the same turn.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const oxlint = path.join(root, "node_modules/.bin/oxlint");
const lintable = /\.(?:[cm]?[jt]sx?)$/;

let input = "";
try {
  input = readFileSync(0, "utf8");
} catch {
  process.exit(0);
}

// Claude Code sends tool_input.file_path; Codex apply_patch sends the patch
// text, whose headers name each touched file.
const candidates = new Set();
for (const match of input.matchAll(/"file_path"\s*:\s*"([^"]+)"/g)) {
  candidates.add(match[1]);
}
for (const match of input.matchAll(
  /\*\*\* (?:Add|Update) File: ([^\\\n"]+)/g,
)) {
  candidates.add(match[1].trim());
}

function configDirFor(file) {
  let dir = path.dirname(file);
  while (dir.startsWith(root)) {
    if (existsSync(path.join(dir, ".oxlintrc.json"))) return dir;
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
  return null;
}

const reports = [];
for (const candidate of candidates) {
  const file = path.resolve(root, candidate);
  if (!lintable.test(file) || !existsSync(file) || !existsSync(oxlint))
    continue;
  const dir = configDirFor(file);
  if (!dir) continue;
  try {
    execFileSync(oxlint, ["--format", "unix", path.relative(dir, file)], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const output = String(error.stdout ?? "").trim();
    if (output) reports.push(`${path.relative(root, dir) || "."}:\n${output}`);
  }
}

if (reports.length > 0) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `Oxlint found errors in the files you just edited. Fix them before continuing:\n${reports.join("\n")}`,
      },
    }),
  );
}
