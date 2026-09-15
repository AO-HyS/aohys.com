#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const args = parseArgs(process.argv.slice(2));
const cwd = process.cwd();

function main() {
  requireCommand("git");
  requireGitRepo();

  const repoName = sanitize(
    basename(run("git", ["rev-parse", "--show-toplevel"]).stdout.trim()),
  );
  const branchName = sanitize(
    run("git", ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim(),
  );
  const pr = readPullRequest();
  const prLabel = pr?.number ? `pr-${pr.number}` : `branch-${branchName}`;

  const baseRef = chooseBaseRef(pr);
  const headRef = chooseHeadRef(pr);
  verifyCommit(baseRef, "base");
  verifyCommit(headRef, "head");

  const rootDir = resolve(
    args["out-dir"] ??
      join(tmpdir(), "agent-native-recaps", `${repoName}-${prLabel}`),
  );
  const localDir = resolve(args["local-dir"] ?? join(rootDir, "local-plan"));
  mkdirSync(rootDir, { recursive: true });
  mkdirSync(localDir, { recursive: true });

  const diffPath = join(rootDir, "recap.diff");
  const statPath = join(rootDir, "recap.stat");
  const manifestPath = join(rootDir, "recap-manifest.json");

  run(
    "npx",
    [
      "@agent-native/core@latest",
      "recap",
      "collect-diff",
      "--base",
      baseRef,
      "--head",
      headRef,
      "--out",
      diffPath,
      "--stat",
      statPath,
    ],
    { stdio: "inherit" },
  );

  run(
    "npx",
    ["@agent-native/core@latest", "recap", "scan", "--diff", diffPath],
    { stdio: "inherit" },
  );

  run(
    "npx",
    [
      "@agent-native/core@latest",
      "recap",
      "build-prompt",
      "--pr",
      pr?.number ? String(pr.number) : "0",
      "--diff",
      diffPath,
      "--stat",
      statPath,
      "--local-files",
      "--local-dir",
      localDir,
    ],
    { cwd: rootDir, stdio: "inherit" },
  );

  const promptPath = findPrompt(rootDir, localDir);
  const manifest = {
    repo: repoName,
    branch: branchName,
    pr: pr
      ? {
          number: pr.number,
          title: pr.title,
          state: pr.state,
          url: pr.url,
          baseRefName: pr.baseRefName,
          headRefName: pr.headRefName,
          baseRefOid: pr.baseRefOid,
          headRefOid: pr.headRefOid,
        }
      : null,
    baseRef,
    headRef,
    rootDir,
    localDir,
    diffPath,
    statPath,
    promptPath,
    verifyCommand: `npx @agent-native/core@latest plan local verify --dir ${shellQuote(localDir)} --kind recap`,
    serveCommand: `npx @agent-native/core@latest plan local serve --dir ${shellQuote(localDir)} --kind recap --open`,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log("");
  console.log("Local visual recap inputs are ready.");
  console.log(
    `PR: ${pr ? `#${pr.number} ${pr.title} (${pr.state})` : "none detected"}`,
  );
  console.log(`Range: ${baseRef}...${headRef}`);
  console.log(`Prompt: ${promptPath}`);
  console.log(`Local dir: ${localDir}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log("");
  console.log("Next:");
  console.log(`1. Read ${promptPath}`);
  console.log("2. Write the recap MDX into the local dir.");
  console.log(`3. Run: ${manifest.serveCommand}`);
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

function readPullRequest() {
  if (args.base && args.head && !args.pr) {
    return null;
  }
  if (!commandExists("gh")) {
    if (args.pr) {
      fail("gh is required when --pr is provided.");
    }
    return null;
  }
  const ghArgs = [
    "pr",
    "view",
    ...(args.pr ? [args.pr] : []),
    "--json",
    "number,title,state,baseRefName,headRefName,baseRefOid,headRefOid,url",
  ];
  const result = spawnSync("gh", ghArgs, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    if (args.pr) {
      fail(result.stderr.trim() || `Could not read PR ${args.pr}.`);
    }
    return null;
  }
  const pr = JSON.parse(result.stdout);
  return {
    ...pr,
    baseRefNameWithRemote: pr.baseRefName
      ? `origin/${pr.baseRefName}`
      : undefined,
  };
}

function chooseBaseRef(pr) {
  if (args.base) {
    return args.base;
  }
  if (pr?.baseRefOid && refExists(pr.baseRefOid)) {
    return pr.baseRefOid;
  }
  if (pr?.baseRefName) {
    run("git", [
      "fetch",
      "--no-tags",
      "origin",
      `${pr.baseRefName}:refs/remotes/origin/${pr.baseRefName}`,
    ]);
    if (pr.baseRefOid && refExists(pr.baseRefOid)) {
      return pr.baseRefOid;
    }
    return `origin/${pr.baseRefName}`;
  }
  return defaultBaseRef();
}

function chooseHeadRef(pr) {
  if (args.head) {
    return args.head;
  }
  if (pr?.number) {
    const ref = `refs/recap/pr-${pr.number}-head`;
    run("git", [
      "fetch",
      "--no-tags",
      "origin",
      `+pull/${pr.number}/head:${ref}`,
    ]);
    return ref;
  }
  return "HEAD";
}

function defaultBaseRef() {
  if (refExists("origin/develop")) {
    return "origin/develop";
  }
  const originHead = spawnSync(
    "git",
    ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"],
    {
      cwd,
      encoding: "utf8",
    },
  );
  if (originHead.status === 0) {
    return originHead.stdout.trim().replace("refs/remotes/", "");
  }
  if (refExists("origin/main")) {
    return "origin/main";
  }
  fail("No PR detected. Pass --base <ref> --head <ref>.");
}

function requireCommand(name) {
  if (!commandExists(name)) {
    fail(`${name} is required but was not found on PATH.`);
  }
}

function commandExists(name) {
  return spawnSync("which", [name], { encoding: "utf8" }).status === 0;
}

function requireGitRepo() {
  run("git", ["rev-parse", "--show-toplevel"]);
}

function verifyCommit(ref, label) {
  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", `${ref}^{commit}`],
    {
      cwd,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    fail(`Could not resolve ${label} ref '${ref}' to a commit.`);
  }
}

function refExists(ref) {
  return (
    spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
      cwd,
      encoding: "utf8",
    }).status === 0
  );
}

function findPrompt(...dirs) {
  const candidates = [];
  for (const dir of dirs) {
    candidates.push(join(dir, "recap-prompt.md"));
    candidates.push(join(dir, "prompt.md"));
  }
  for (const candidate of candidates) {
    if (existsSync(candidate) && readFileSync(candidate, "utf8").trim()) {
      return candidate;
    }
  }
  fail(`Agent-Native did not produce recap-prompt.md in: ${dirs.join(", ")}`);
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? cwd,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
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
    value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "local"
  );
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function fail(message) {
  console.error(`local-visual-recap: ${message}`);
  process.exit(1);
}

main();
