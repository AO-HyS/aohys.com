#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

function parseArgs(argv) {
  const options = { repo: ".", json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repo") options.repo = argv[++index];
    else if (argument === "--json") options.json = true;
    else if (argument === "--help") {
      console.log("Usage: verify-release-train.mjs [--repo PATH] [--json]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function run(command, args, cwd, fallback = "") {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return fallback;
  }
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function readJson(path) {
  try {
    return JSON.parse(readText(path));
  } catch {
    return null;
  }
}

function splitJobs(workflow) {
  const jobsIndex = workflow.search(/^jobs:\s*$/m);
  if (jobsIndex < 0) return [];
  const section = workflow.slice(jobsIndex);
  const matches = [...section.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)];
  return matches.map((match, index) => ({
    id: match[1],
    body: section.slice(
      match.index,
      matches[index + 1]?.index ?? section.length,
    ),
  }));
}

function parseNeeds(body) {
  const inline = body.match(/^ {4}needs:[ \t]*\[([^\]]+)\][ \t]*$/m)?.[1];
  if (inline)
    return inline
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  const single = body.match(/^ {4}needs:[ \t]*([A-Za-z0-9_-]+)[ \t]*$/m)?.[1];
  if (single) return [single];
  const lines = body.split("\n");
  const start = lines.findIndex((line) => /^ {4}needs:[ \t]*$/.test(line));
  if (start < 0) return [];
  const needs = [];
  for (const line of lines.slice(start + 1)) {
    const match = line.match(/^ {6}-[ \t]*([A-Za-z0-9_-]+)[ \t]*$/);
    if (!match) break;
    needs.push(match[1]);
  }
  return needs;
}

function jobRunsOnEvent(job, jobsById, eventName, memo = new Map()) {
  const key = `${job.id}:${eventName}`;
  if (memo.has(key)) return memo.get(key);
  memo.set(key, false);

  const condition = job.body.match(/^ {4}if:\s*(.+)$/m)?.[1] ?? "";
  const positiveEvents = [
    ...condition.matchAll(/github\.event_name\s*==\s*['"]([^'"]+)['"]/g),
  ].map((match) => match[1]);
  const negativeEvents = [
    ...condition.matchAll(/github\.event_name\s*!=\s*['"]([^'"]+)['"]/g),
  ].map((match) => match[1]);
  if (positiveEvents.length && !positiveEvents.includes(eventName))
    return false;
  if (negativeEvents.includes(eventName)) return false;

  const needs = parseNeeds(job.body);
  let reachable = true;
  if (needs.length && !/\balways\(\)/.test(condition)) {
    reachable = needs.every((dependency) => {
      const dependencyJob = jobsById.get(dependency);
      return dependencyJob
        ? jobRunsOnEvent(dependencyJob, jobsById, eventName, memo)
        : true;
    });
  }
  memo.set(key, reachable);
  return reachable;
}

function add(results, level, code, message, file = null) {
  results.push({ level, code, message, file });
}

function isExecutable(path) {
  return existsSync(path) && Boolean(statSync(path).mode & 0o111);
}

function expandScriptReferences(command, scripts) {
  let expanded = command;
  const visited = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, body] of Object.entries(scripts)) {
      if (visited.has(name) || !expanded.includes(name)) continue;
      visited.add(name);
      expanded += `\n${body}`;
      changed = true;
    }
  }
  return expanded;
}

function invokesInstalledReactDoctor(command, root) {
  if (typeof command !== "string") return false;
  if (/^react-doctor\b/.test(command)) return true;
  if (
    /^pnpm\b/.test(command) &&
    /\s(?:--filter|-F)\s/.test(command) &&
    /\sexec\s+react-doctor\b/.test(command)
  )
    return true;

  const wrapper = command.match(/^node\s+([^\s]+\.mjs)\s*$/)?.[1];
  if (!wrapper || wrapper.startsWith("/") || wrapper.split("/").includes(".."))
    return false;
  const wrapperBody = readText(join(root, wrapper));
  return (
    /spawnSync\(/.test(wrapperBody) &&
    /['"]pnpm['"]/.test(wrapperBody) &&
    /['"]exec['"]/.test(wrapperBody) &&
    /['"]react-doctor['"]/.test(wrapperBody) &&
    !/\b(?:npx|pnpm\s+dlx)\b/.test(wrapperBody)
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const requestedRoot = resolve(options.repo);
  const root = run("git", ["rev-parse", "--show-toplevel"], requestedRoot);
  if (!root) {
    console.error(`Not a Git repository: ${requestedRoot}`);
    process.exit(2);
  }

  const results = [];
  const packageJson = readJson(join(root, "package.json"));
  const scripts = packageJson?.scripts ?? {};
  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
  };
  const trackedFiles = run("git", ["ls-files"], root)
    .split("\n")
    .filter(Boolean);
  const react =
    Boolean(dependencies.react) ||
    trackedFiles.some((file) => /\.(?:jsx|tsx)$/.test(file));
  const rootHasReactDependency = Boolean(dependencies.react);
  const workspaceReactPackages = trackedFiles.filter((file) => {
    if (file === "package.json" || !file.endsWith("/package.json"))
      return false;
    const workspacePackage = readJson(join(root, file));
    return Boolean(
      workspacePackage?.dependencies?.react ??
      workspacePackage?.devDependencies?.react ??
      workspacePackage?.peerDependencies?.react,
    );
  });
  const requiresWorkspaceDoctor =
    !rootHasReactDependency && workspaceReactPackages.length > 0;

  if (!packageJson)
    add(results, "error", "package-json", "Root package.json is missing.");
  for (const script of ["quality:commit", "quality:push"]) {
    if (!scripts[script])
      add(
        results,
        "error",
        `script-${script}`,
        `Missing package script: ${script}.`,
        "package.json",
      );
  }

  if (react) {
    if (!scripts.doctor || !/\breact-doctor\b/.test(scripts.doctor)) {
      add(
        results,
        "error",
        "doctor-entrypoint",
        "React repository must expose a direct doctor script.",
        "package.json",
      );
    }
    for (const script of ["react:doctor:staged", "react:doctor:changed"]) {
      if (
        !invokesInstalledReactDoctor(scripts[script], root) ||
        (requiresWorkspaceDoctor && /^react-doctor\b/.test(scripts[script]))
      ) {
        add(
          results,
          "error",
          `script-${script}`,
          requiresWorkspaceDoctor
            ? `${script} must route through React workspaces; a direct root scan would be false-green because React is installed only below the workspace root.`
            : `${script} must invoke the installed React Doctor CLI directly, through a filtered pnpm workspace exec, or through a checked-in local selector that does so.`,
          "package.json",
        );
      }
    }
    const doctorVersion = dependencies["react-doctor"];
    if (!doctorVersion) {
      add(
        results,
        "error",
        "react-doctor-dependency",
        "React Doctor is not installed.",
        "package.json",
      );
    } else if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(doctorVersion)) {
      add(
        results,
        "error",
        "react-doctor-pin",
        `React Doctor must use an exact version, found ${doctorVersion}.`,
        "package.json",
      );
    }
    if (
      /\b(?:npx|pnpm\s+dlx)\b/.test(
        `${scripts["react:doctor:staged"]}\n${scripts["react:doctor:changed"]}`,
      )
    ) {
      add(
        results,
        "error",
        "react-doctor-runtime-install",
        "React Doctor hooks must not inject packages at runtime.",
        "package.json",
      );
    }
  }

  const preCommitPath = join(root, ".husky", "pre-commit");
  const prePushPath = join(root, ".husky", "pre-push");
  const preCommit = readText(preCommitPath);
  const prePush = readText(prePushPath);
  const expandedPreCommit = expandScriptReferences(preCommit, scripts);
  const expandedPrePush = expandScriptReferences(prePush, scripts);
  if (!isExecutable(preCommitPath))
    add(
      results,
      "error",
      "pre-commit-executable",
      "Husky pre-commit is missing or not executable.",
      ".husky/pre-commit",
    );
  if (!isExecutable(prePushPath))
    add(
      results,
      "error",
      "pre-push-executable",
      "Husky pre-push is missing or not executable.",
      ".husky/pre-push",
    );
  if (
    !/lint-staged/.test(expandedPreCommit) ||
    !/quality:commit/.test(expandedPreCommit)
  ) {
    add(
      results,
      "error",
      "pre-commit-contract",
      "pre-commit must run lint-staged and quality:commit.",
      ".husky/pre-commit",
    );
  }
  if (
    !/status\s+--porcelain/.test(expandedPrePush) ||
    !/quality:push/.test(expandedPrePush)
  ) {
    add(
      results,
      "error",
      "pre-push-contract",
      "pre-push must reject a dirty tree and run quality:push.",
      ".husky/pre-push",
    );
  }
  const lintStagedFiles = [
    "lint-staged.config.js",
    "lint-staged.config.mjs",
    "lint-staged.config.cjs",
    ".lintstagedrc",
    ".lintstagedrc.json",
    ".lintstagedrc.js",
  ];
  if (
    !lintStagedFiles.some((file) => existsSync(join(root, file))) &&
    !packageJson?.["lint-staged"]
  ) {
    add(
      results,
      "error",
      "lint-staged-config",
      "No lint-staged configuration was found.",
    );
  }
  const hooksPath = run("git", ["config", "--get", "core.hooksPath"], root);
  if (hooksPath !== ".husky/_") {
    add(
      results,
      "warning",
      "hooks-path",
      `core.hooksPath is ${hooksPath || "unset"}; run the normal package installation and Husky prepare step.`,
    );
  }
  if (!existsSync(join(root, ".husky", "_", "h"))) {
    add(
      results,
      "warning",
      "husky-shim",
      "Generated Husky shim .husky/_/h is absent in this checkout; run the normal package installation.",
    );
  }

  const workflowDirectory = join(root, ".github", "workflows");
  const workflowFiles = existsSync(workflowDirectory)
    ? readdirSync(workflowDirectory)
        .filter((file) => /\.ya?ml$/.test(file))
        .map((file) => join(workflowDirectory, file))
    : [];
  const workflows = workflowFiles.map((path) => ({
    path,
    content: readText(path),
  }));
  const policyWorkflows = workflows.filter(({ content }) =>
    /^\s{2}pull_request:/m.test(content),
  );
  const releaseWorkflows = workflows.filter(({ content }) =>
    /^\s{2}push:/m.test(content),
  );
  if (!policyWorkflows.length)
    add(
      results,
      "error",
      "policy-workflow",
      "No pull-request policy workflow was found.",
      ".github/workflows",
    );
  if (!releaseWorkflows.length)
    add(
      results,
      "error",
      "release-workflow",
      "No protected-branch release workflow was found.",
      ".github/workflows",
    );

  const heavyPattern =
    /(?:actions\/checkout@|actions\/setup-node@|pnpm\/action-setup@|\b(?:pnpm|npm|yarn|bun)\s+(?:install|ci)\b|playwright\s+install|chromium|quality:push|verify:ci|typecheck|test:unit|\bvitest\b|\bjest\b)/i;
  let policyFound = false;
  for (const workflow of policyWorkflows) {
    const relative = workflow.path.slice(root.length + 1);
    if (/^\s{2}pull_request_target:/m.test(workflow.content)) {
      add(
        results,
        "error",
        "pull-request-target",
        "Do not execute this release policy through pull_request_target.",
        relative,
      );
    }
    const jobs = splitJobs(workflow.content);
    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    const prJobs = jobs.filter((job) =>
      jobRunsOnEvent(job, jobsById, "pull_request"),
    );
    for (const job of prJobs) {
      if (heavyPattern.test(job.body)) {
        add(
          results,
          "error",
          "heavy-pr-job",
          `PR job ${job.id} repeats repository quality or installation.`,
          relative,
        );
      }
    }
    const policyJobs = prJobs.filter(
      ({ body }) =>
        (/actions\/github-script@/.test(body) &&
          /pullRequest\.(?:base|head)\.ref/.test(body)) ||
        (/PR_BASE/.test(body) && /PR_HEAD/.test(body)),
    );
    for (const job of policyJobs) {
      policyFound = true;
      if (
        (/head\.ref|pullRequest\.head\.ref/.test(job.body) &&
          /repo\.full_name/.test(job.body)) ||
        (/PR_BASE/.test(job.body) && /PR_HEAD/.test(job.body))
      ) {
        // Canonical source validation is present.
      } else {
        add(
          results,
          "error",
          "canonical-promotion",
          `PR policy job ${job.id} does not reject non-canonical production sources.`,
          relative,
        );
      }
      if (
        /head_sha|listWorkflowRuns|actions\/runs|candidate_tree|promoted_tree|git\/commits\//.test(
          job.body,
        )
      ) {
        add(
          results,
          "error",
          "manual-sha-continuity",
          `PR policy job ${job.id} reimplements Git continuity with SHA or workflow-history comparisons.`,
          relative,
        );
      }
    }
  }
  const releaseText = releaseWorkflows.map(({ content }) => content).join("\n");
  if (
    !/refs\/heads\/develop|\bdevelop\b/.test(releaseText) ||
    !/refs\/heads\/main|\bmain\b/.test(releaseText)
  ) {
    add(
      results,
      "error",
      "branch-map",
      "Release workflows must represent preview and production branches.",
      ".github/workflows",
    );
  }
  const remoteQualityPattern =
    /(?:\b(?:pnpm|npm|yarn|bun)(?:\s+run)?\s+(?:lint|typecheck|test(?::(?:unit|e2e))?|verify(?::(?:ci|release))?|quality:push|react:doctor)|playwright\s+install|chromium)/i;
  for (const workflow of releaseWorkflows) {
    const relative = workflow.path.slice(root.length + 1);
    const jobs = splitJobs(workflow.content);
    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    for (const job of jobs.filter((candidate) =>
      jobRunsOnEvent(candidate, jobsById, "push"),
    )) {
      if (remoteQualityPattern.test(job.body)) {
        add(
          results,
          "error",
          "remote-quality",
          `Push job ${job.id} repeats repository quality instead of focusing on deployment.`,
          relative,
        );
      }
    }
  }
  for (const workflow of [
    ...new Map(
      [...policyWorkflows, ...releaseWorkflows].map((item) => [
        item.path,
        item,
      ]),
    ).values(),
  ]) {
    const relative = workflow.path.slice(root.length + 1);
    const yamlResult = run(
      "ruby",
      [
        "-e",
        'require "yaml"; YAML.load_file(ARGV[0]); puts "ok"',
        workflow.path,
      ],
      root,
    );
    if (yamlResult !== "ok")
      add(
        results,
        "error",
        "workflow-yaml",
        "Workflow YAML did not parse.",
        relative,
      );
  }
  if (!policyFound)
    add(
      results,
      "error",
      "policy-job",
      "No explicit lightweight pull_request policy job was found.",
    );
  if (
    !existsSync(join(root, "docs", "release-train.md")) &&
    !existsSync(join(root, "docs", "context", "deployment_cloudflare.md"))
  ) {
    add(
      results,
      "warning",
      "release-docs",
      "No canonical release-train documentation file was found.",
    );
  }
  if (run("git", ["diff", "--check"], root, "failed") === "failed") {
    add(results, "error", "diff-check", "git diff --check failed.");
  }

  const errors = results.filter((result) => result.level === "error");
  const warnings = results.filter((result) => result.level === "warning");
  const report = {
    repository: root,
    valid: errors.length === 0,
    summary: { errors: errors.length, warnings: warnings.length },
    results,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(
      `# Release Train Verification: ${report.valid ? "PASS" : "FAIL"}`,
    );
    console.log(`- Errors: ${errors.length}`);
    console.log(`- Warnings: ${warnings.length}`);
    for (const result of results) {
      console.log(
        `- ${result.level.toUpperCase()} [${result.code}] ${result.message}${result.file ? ` (${result.file})` : ""}`,
      );
    }
  }
  process.exit(errors.length ? 1 : 0);
}

main();
