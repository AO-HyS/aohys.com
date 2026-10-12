#!/usr/bin/env node
// PostToolUse hook for Codex and Claude Code: lints the files an agent just
// edited with the same Oxlint config the CLI and editor use, and hands any
// diagnostics back to the agent as additional context in the same turn.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

// This file lives at <repo>/scripts/agent/, whatever directory the session
// started in.
const root = realpathSync(path.resolve(import.meta.dirname, "../.."));
const oxlint = path.join(root, "node_modules/.bin/oxlint");
const lintable = /\.(?:[cm]?[jt]sx?)$/;
const diagnostic = /:\d+:\d+: /;

let event;
try {
  event = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
if (!event || typeof event !== "object" || !existsSync(oxlint)) process.exit(0);

const base = typeof event.cwd === "string" ? event.cwd : process.cwd();

// Claude Code sends tool_input.file_path; Codex apply_patch sends the patch
// text, whose headers name each touched file.
const candidates = new Set();
function collect(value) {
  if (typeof value === "string") {
    for (const match of value.matchAll(
      /^\*\*\* (?:Add|Update) File: (.+)$/gm,
    )) {
      candidates.add(match[1].trim());
    }
  } else if (Array.isArray(value)) {
    value.forEach(collect);
  } else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (key === "file_path" && typeof nested === "string")
        candidates.add(nested);
      else collect(nested);
    }
  }
}
collect(event.tool_input);

function inside(file) {
  const relative = path.relative(root, file);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
}

function configDirFor(file) {
  let dir = path.dirname(file);
  while (dir === root || inside(dir)) {
    if (existsSync(path.join(dir, ".oxlintrc.json"))) return dir;
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
  return null;
}

const reports = [];
for (const candidate of candidates) {
  const resolved = path.resolve(base, candidate);
  if (!lintable.test(resolved) || !existsSync(resolved)) continue;
  const file = realpathSync(resolved);
  if (!inside(file)) continue;
  const dir = configDirFor(file);
  if (!dir) continue;
  let output;
  try {
    output = execFileSync(
      oxlint,
      ["--format", "unix", "--", path.relative(dir, file)],
      {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    output = String(error.stdout ?? "");
  }
  if (diagnostic.test(output)) {
    reports.push(`${path.relative(root, dir) || "."}:\n${output.trim()}`);
  }
}

if (reports.length > 0) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `Oxlint diagnostics for the files you just edited. Fix every error before continuing; fix warnings too unless the file is a documented exception:\n${reports.join("\n")}`,
      },
    }),
  );
}
