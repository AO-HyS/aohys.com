#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const args = parseArgs(process.argv.slice(2));
const cwd = process.cwd();

function main() {
  requireCommand("npx");

  const repoRoot = readGitValue(["rev-parse", "--show-toplevel"]) || cwd;
  const repoName = sanitize(basename(repoRoot));
  const branchName = sanitize(
    readGitValue(["rev-parse", "--abbrev-ref", "HEAD"]) || "no-git",
  );
  const title = args.title || "Local visual plan";
  const brief = readBrief();
  const slug = sanitize(args.slug || title);
  const stamp = timestamp();

  const rootDir = resolve(
    args["out-dir"] ||
      join(tmpdir(), "agent-native-plans", `${repoName}-${slug}-${stamp}`),
  );
  const localDir = resolve(args["local-dir"] || join(rootDir, "local-plan"));
  mkdirSync(rootDir, { recursive: true });
  mkdirSync(localDir, { recursive: true });

  const blocksPath = join(rootDir, "plan-blocks.md");
  const promptPath = join(rootDir, "visual-plan-prompt.md");
  const manifestPath = join(rootDir, "visual-plan-manifest.json");

  run(
    "npx",
    ["@agent-native/core@latest", "plan", "blocks", "--out", blocksPath],
    { stdio: "inherit" },
  );

  const initArgs = [
    "@agent-native/core@latest",
    "plan",
    "local",
    "init",
    "--title",
    title,
    "--brief",
    brief,
    "--kind",
    "plan",
    "--dir",
    localDir,
  ];
  if (args.force === "true" || args.force === "1" || args.force === "yes") {
    initArgs.push("--force");
  }
  run("npx", initArgs, { stdio: "inherit" });

  const manifest = {
    title,
    brief,
    repoRoot,
    repoName,
    branchName,
    rootDir,
    localDir,
    blocksPath,
    promptPath,
    checkCommand: `npx @agent-native/core@latest plan local check --dir ${shellQuote(localDir)}`,
    verifyCommand: `npx @agent-native/core@latest plan local verify --dir ${shellQuote(localDir)} --kind plan`,
    serveCommand: `npx @agent-native/core@latest plan local serve --dir ${shellQuote(localDir)} --kind plan --open`,
  };

  writeFileSync(promptPath, buildPrompt(manifest));
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log("");
  console.log("Local visual plan workspace is ready.");
  console.log(`Title: ${title}`);
  console.log(`Repo: ${repoRoot}`);
  console.log(`Prompt: ${promptPath}`);
  console.log(`Block catalog: ${blocksPath}`);
  console.log(`Local dir: ${localDir}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log("");
  console.log("Next:");
  console.log(`1. Read ${promptPath}`);
  console.log("2. Inspect the repo and write the plan MDX.");
  console.log(`3. Run: ${manifest.checkCommand}`);
  console.log(`4. Run: ${manifest.serveCommand}`);
}

function parseArgs(raw) {
  const parsed = {};
  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];
    if (!token.startsWith("--")) {
      fail(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const value = raw[i + 1];
    if (!value || value.startsWith("--")) {
      fail(`Missing value for --${key}`);
    }
    parsed[key] = value;
    i += 1;
  }
  return parsed;
}

function readBrief() {
  if (args["brief-file"]) {
    const path = resolve(args["brief-file"]);
    if (!existsSync(path)) {
      fail(`Brief file not found: ${path}`);
    }
    const text = readFileSync(path, "utf8").trim();
    if (!text) {
      fail(`Brief file is empty: ${path}`);
    }
    return text;
  }
  if (args.brief?.trim()) {
    return args.brief.trim();
  }
  fail("Pass --brief <text> or --brief-file <path>.");
}

function buildPrompt(manifest) {
  return `# Local Visual Plan Prompt

You are authoring an Agent-Native visual plan in local-files mode.

## Inputs

- Title: ${manifest.title}
- Repo root: ${manifest.repoRoot}
- Current branch: ${manifest.branchName}
- Local Plan directory: ${manifest.localDir}
- Plan block catalog: ${manifest.blocksPath}

## Brief

${manifest.brief}

## Required Process

1. Read this prompt and the Plan block catalog completely.
2. Inspect the repo before writing the plan. Prefer package scripts, README/docs, route files, schemas, API handlers, tests, design docs, and nearby components that actually define the current system.
3. Do not edit implementation files. This is a planning pass before approval.
4. Rewrite ${manifest.localDir}/plan.mdx into a grounded visual implementation plan.
5. Add canvas.mdx only if UI flow, screen comparison, storyboard, or wireframe review is central to the plan.
6. Add prototype.mdx only if interactive behavior needs a lightweight prototype before implementation.

## Plan Content Requirements

Include:

- goal and non-goals;
- current system map grounded in files;
- proposed implementation order;
- affected file map;
- UI states/routes and VAR/browser QA checklist when UI changes are involved;
- API, schema, environment, or release implications when relevant;
- risks and rollback/recovery notes;
- validation commands and expected evidence;
- open questions that must be answered before implementation.

Use Agent-Native Plan MDX blocks where they improve review: FileTree for file maps, Diagram for architecture, WireframeBlock/canvas for UI states, DataModel for schemas, Endpoint/OpenApi for API contracts, AnnotatedCode for important code paths, Checklist for validation, and QuestionForm for approval questions.

After writing, run:

\`\`\`sh
${manifest.checkCommand}
${manifest.serveCommand}
\`\`\`
`;
}

function requireCommand(name) {
  if (spawnSync("which", [name], { encoding: "utf8" }).status !== 0) {
    fail(`${name} is required but was not found on PATH.`);
  }
}

function readGitValue(gitArgs) {
  const result = spawnSync("git", gitArgs, { cwd, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd || cwd,
    encoding: "utf8",
    stdio: options.stdio || "pipe",
  });
  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout]
      .filter(Boolean)
      .join("\n")
      .trim();
    fail(detail || `${command} ${commandArgs.join(" ")} failed.`);
  }
  return result;
}

function sanitize(value) {
  return (
    String(value)
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "local"
  );
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
}

function fail(message) {
  console.error(`local-visual-plan: ${message}`);
  process.exit(1);
}

main();
