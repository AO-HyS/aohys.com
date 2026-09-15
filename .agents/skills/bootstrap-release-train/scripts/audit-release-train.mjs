#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

function parseArgs(argv) {
  const options = { repo: ".", json: false, live: false, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--repo") options.repo = argv[++index];
    else if (argument === "--json") options.json = true;
    else if (argument === "--live") options.live = true;
    else if (argument === "--output") options.output = argv[++index];
    else if (argument === "--help") {
      console.log(
        "Usage: audit-release-train.mjs [--repo PATH] [--live] [--json] [--output FILE]",
      );
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

function commandSucceeds(command, args, cwd) {
  try {
    execFileSync(command, args, { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
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

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function remoteSlug(remote) {
  const match = remote.match(/github\.com[/:]([^/]+\/.+?)$/);
  return match?.[1]?.replace(/\.git$/, "") ?? null;
}

function detectPackageManager(root, packageJson) {
  if (typeof packageJson?.packageManager === "string") {
    const [name, version] = packageJson.packageManager.split("@");
    return {
      name,
      version: version || null,
      source: "package.json#packageManager",
    };
  }
  const candidates = [
    ["pnpm", "pnpm-lock.yaml"],
    ["npm", "package-lock.json"],
    ["yarn", "yarn.lock"],
    ["bun", "bun.lock"],
    ["bun", "bun.lockb"],
  ];
  const match = candidates.find(([, file]) => existsSync(join(root, file)));
  return match
    ? { name: match[0], version: null, source: match[1] }
    : { name: null, version: null, source: null };
}

function workflowSummary(path) {
  const content = readText(path);
  const names = [...content.matchAll(/^\s{4}name:\s*["']?([^\n"']+)/gm)].map(
    (match) => match[1].trim(),
  );
  return {
    file: basename(path),
    pullRequest: /^\s{2}pull_request:/m.test(content),
    pullRequestTarget: /^\s{2}pull_request_target:/m.test(content),
    push: /^\s{2}push:/m.test(content),
    workflowDispatch: /^\s{2}workflow_dispatch:/m.test(content),
    develop: /(?:refs\/heads\/develop|\bdevelop\b)/.test(content),
    main: /(?:refs\/heads\/main|\bmain\b)/.test(content),
    checkout: /actions\/checkout@/.test(content),
    install: /(?:pnpm|npm|yarn|bun)\s+(?:install|ci)\b/.test(content),
    browserInstall: /(?:playwright\s+install|chromium)/i.test(content),
    cloudflare: /(?:wrangler|cloudflare)/i.test(content),
    convex: /\bconvex\b/i.test(content),
    vercel: /\bvercel\b/i.test(content),
    artifact: /actions\/upload-artifact@/.test(content),
    mobileArtifact:
      /(?:gradlew?\s+.*(?:assemble|bundle)|xcodebuild\s+(?:archive|-exportArchive)|eas\s+build|\.apk\b|\.aab\b|\.ipa\b|mobile:apk)/i.test(
        content,
      ),
    runners: unique(
      [...content.matchAll(/^\s+runs-on:\s*(.+)$/gm)].map((match) =>
        match[1].trim(),
      ),
    ),
    stepNames: unique(names),
  };
}

function collectLiveGitHub(root, slug, previewBranch, productionBranch) {
  if (!slug || !commandSucceeds("gh", ["auth", "status"], root)) {
    return { available: false, reason: "Authenticated gh CLI is unavailable." };
  }

  const rulesetsText = run(
    "gh",
    ["api", `repos/${slug}/rulesets?includes_parents=true`, "--paginate"],
    root,
  );
  const protections = {};
  for (const branch of [previewBranch, productionBranch]) {
    const text = run(
      "gh",
      ["api", `repos/${slug}/branches/${branch}/protection`],
      root,
    );
    if (!text) {
      protections[branch] = { available: false };
      continue;
    }
    try {
      const parsed = JSON.parse(text);
      protections[branch] = {
        available: true,
        requiredChecks:
          parsed.required_status_checks?.contexts ??
          parsed.required_status_checks?.checks?.map(
            (check) => check.context,
          ) ??
          [],
        requiredReviews:
          parsed.required_pull_request_reviews
            ?.required_approving_review_count ?? null,
      };
    } catch {
      protections[branch] = { available: false };
    }
  }

  let rulesets = [];
  try {
    const parsed = JSON.parse(rulesetsText || "[]");
    rulesets = parsed.map((ruleset) => ({
      id: ruleset.id,
      name: ruleset.name,
      enforcement: ruleset.enforcement,
      target: ruleset.target,
    }));
  } catch {
    rulesets = [];
  }

  return { available: true, slug, protections, rulesets };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const requestedRoot = resolve(options.repo);
  const root = run("git", ["rev-parse", "--show-toplevel"], requestedRoot);
  if (!root) {
    console.error(`Not a Git repository: ${requestedRoot}`);
    process.exit(2);
  }

  const packageJson = readJson(join(root, "package.json"));
  const scripts = packageJson?.scripts ?? {};
  const allDependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
    ...(packageJson?.peerDependencies ?? {}),
  };
  const packageManager = detectPackageManager(root, packageJson);
  const trackedFiles = run("git", ["ls-files"], root)
    .split("\n")
    .filter(Boolean);
  const workflowDirectory = join(root, ".github", "workflows");
  const workflowFiles = existsSync(workflowDirectory)
    ? readdirSync(workflowDirectory)
        .filter((file) => /\.ya?ml$/.test(file))
        .map((file) => join(workflowDirectory, file))
    : [];
  const workflows = workflowFiles.map(workflowSummary);
  const workflowText = workflowFiles.map(readText).join("\n");
  const scriptText = Object.values(scripts).join("\n");
  const remote = run("git", ["remote", "get-url", "origin"], root);
  const slug = remoteSlug(remote);
  const previewBranch = "develop";
  const productionBranch = "main";

  const react =
    Boolean(allDependencies.react) ||
    trackedFiles.some((file) => /\.(?:jsx|tsx)$/.test(file));
  const playwright =
    Boolean(allDependencies["@playwright/test"]) ||
    trackedFiles.some((file) =>
      /(?:^|\/)playwright\.config\.[cm]?[jt]s$/.test(file),
    );
  const mobileFiles = trackedFiles.filter((file) =>
    /(?:^|\/)(?:android|ios|mobile)(?:\/|$)|\.(?:xcodeproj|xcworkspace)\//i.test(
      file,
    ),
  );
  const provider = {
    cloudflare:
      /(?:wrangler|cloudflare)/i.test(`${workflowText}\n${scriptText}`) ||
      trackedFiles.some((file) =>
        /(?:^|\/)wrangler\.(?:toml|jsonc?)$/.test(file),
      ),
    convex:
      Boolean(allDependencies.convex) ||
      trackedFiles.some((file) => /(?:^|\/)convex\//.test(file)) ||
      /\bconvex\b/i.test(`${workflowText}\n${scriptText}`),
    vercel:
      existsSync(join(root, "vercel.json")) ||
      /\bvercel\b/i.test(`${workflowText}\n${scriptText}`),
  };
  const existingMobileArtifact = workflows.some(
    (workflow) => workflow.mobileArtifact,
  );
  const qualityKeys = [
    "quality:commit",
    "quality:push",
    "verify",
    "verify:ci",
    "verify:release",
    "lint",
    "lint:architecture",
    "lint:convex",
    "typecheck",
    "test",
    "test:unit",
    "test:e2e",
    "test:e2e:changed",
    "build",
    "doctor",
    "react:doctor:staged",
    "react:doctor:changed",
  ];

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository: {
      root,
      branch: run("git", ["branch", "--show-current"], root) || "(detached)",
      head: run("git", ["rev-parse", "HEAD"], root),
      dirty: Boolean(
        run("git", ["status", "--porcelain=v1", "--untracked-files=all"], root),
      ),
      remote: remote || null,
      slug,
      previewBranch,
      productionBranch,
    },
    package: {
      manager: packageManager,
      hasPackageJson: Boolean(packageJson),
      scripts: Object.fromEntries(
        qualityKeys
          .filter((key) => scripts[key])
          .map((key) => [key, scripts[key]]),
      ),
      tooling: {
        husky: allDependencies.husky ?? null,
        lintStaged: allDependencies["lint-staged"] ?? null,
        prettier: allDependencies.prettier ?? null,
        reactDoctor: allDependencies["react-doctor"] ?? null,
      },
    },
    surfaces: {
      react,
      playwright,
      mobileFiles: mobileFiles.slice(0, 30),
      existingMobileArtifact,
    },
    hooks: {
      preCommit: existsSync(join(root, ".husky", "pre-commit")),
      prePush: existsSync(join(root, ".husky", "pre-push")),
      preCommitExecutable:
        existsSync(join(root, ".husky", "pre-commit")) &&
        Boolean(statSync(join(root, ".husky", "pre-commit")).mode & 0o111),
      prePushExecutable:
        existsSync(join(root, ".husky", "pre-push")) &&
        Boolean(statSync(join(root, ".husky", "pre-push")).mode & 0o111),
      configuredPath:
        run("git", ["config", "--get", "core.hooksPath"], root) || null,
    },
    provider,
    workflows,
    recommendations: {
      installLocalBoundary:
        !scripts["quality:commit"] ||
        !scripts["quality:push"] ||
        !existsSync(join(root, ".husky", "pre-push")),
      addReactDoctor: react && !allDependencies["react-doctor"],
      preserveMobileArtifact: existingMobileArtifact,
      deployOwner:
        provider.vercel && !provider.cloudflare
          ? "vercel-git-integration-or-existing-vercel-workflow"
          : provider.cloudflare || provider.convex
            ? "existing-github-actions-provider-adapter"
            : "unresolved",
      warnings: [
        ...(packageJson
          ? []
          : [
              "No root package.json was found; adapt local hooks to the repository toolchain.",
            ]),
        ...(workflowFiles.length
          ? []
          : ["No GitHub Actions workflows were found."]),
        ...(provider.cloudflare || provider.convex || provider.vercel
          ? []
          : [
              "No deployment provider was detected. Do not fabricate a deploy job.",
            ]),
        ...(mobileFiles.length && !existingMobileArtifact
          ? [
              "Mobile source exists, but no existing CI artifact build was detected. Preserve source checks only.",
            ]
          : []),
      ],
    },
    liveGitHub: options.live
      ? collectLiveGitHub(root, slug, previewBranch, productionBranch)
      : {
          available: false,
          reason: "Run with --live to inspect GitHub rules.",
        },
  };

  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (options.output) writeFileSync(resolve(options.output), serialized);

  if (options.json) {
    process.stdout.write(serialized);
    return;
  }

  console.log(`# Release Train Audit: ${slug ?? basename(root)}`);
  console.log(`- Root: ${root}`);
  console.log(
    `- Branch: ${manifest.repository.branch}; dirty: ${manifest.repository.dirty ? "yes" : "no"}`,
  );
  console.log(
    `- Package manager: ${packageManager.name ?? "unresolved"}${packageManager.version ? `@${packageManager.version}` : ""}`,
  );
  console.log(
    `- React: ${react ? "yes" : "no"}; Playwright: ${playwright ? "yes" : "no"}`,
  );
  console.log(
    `- Providers: ${
      Object.entries(provider)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
        .join(", ") || "unresolved"
    }`,
  );
  console.log(
    `- Existing mobile artifact: ${existingMobileArtifact ? "yes" : "no"}`,
  );
  console.log(
    `- Workflows: ${workflows.map((workflow) => workflow.file).join(", ") || "none"}`,
  );
  console.log(`- Deploy owner: ${manifest.recommendations.deployOwner}`);
  for (const warning of manifest.recommendations.warnings)
    console.log(`- Warning: ${warning}`);
  if (options.live) {
    console.log(
      `- GitHub rules available: ${manifest.liveGitHub.available ? "yes" : "no"}`,
    );
    if (manifest.liveGitHub.available) {
      for (const [branch, protection] of Object.entries(
        manifest.liveGitHub.protections,
      )) {
        console.log(
          `  - ${branch} required checks: ${protection.available ? protection.requiredChecks.join(", ") || "none" : "unavailable"}`,
        );
      }
    }
  }
  if (options.output) console.log(`- JSON audit: ${resolve(options.output)}`);
}

main();
