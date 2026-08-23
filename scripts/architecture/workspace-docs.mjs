import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const workspaceGuidePath = "docs/workspace.md";

const durableReferences = [
  "../CONTEXT.md",
  "agents/domain.md",
  "agents/issue-tracker.md",
  "adr/",
  "environment-contract.md",
  "public-content-graph.md",
  "dashboard-ui-kit.md",
  "release-train.md",
  "launch-hardening.md",
];

const snapshotPatterns = [
  {
    pattern: /^## Workspace Layout$/im,
    message: "remove the synchronized workspace-layout inventory",
  },
  {
    pattern: /^\|\s*Path\s*\|\s*Role\s*\|$/im,
    message: "replace the path/role inventory with directional guidance",
  },
  {
    pattern:
      /(?:last updated|current as of|tree snapshot)\s*:?\s*\d{4}-\d{2}-\d{2}/i,
    message:
      "remove date-based freshness claims; source is current-state truth",
  },
];

function markdownLinks(markdown) {
  const links = [];
  const pattern =
    /\[[^\]]+\]\(\s*(?:<([^>\n]+)>|([^\s)\n]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/gu;

  for (const match of markdown.matchAll(pattern)) {
    links.push(match[1] ?? match[2]);
  }

  return links;
}

function decoded(value) {
  try {
    return { value: decodeURIComponent(value), error: undefined };
  } catch {
    return {
      value: undefined,
      error: `malformed local link encoding: ${value}`,
    };
  }
}

function localLinkTarget(link) {
  const hashIndex = link.indexOf("#");
  const rawPath = hashIndex === -1 ? link : link.slice(0, hashIndex);
  const rawFragment = hashIndex === -1 ? "" : link.slice(hashIndex + 1);
  const pathResult = decoded(rawPath);
  const fragmentResult = decoded(rawFragment);

  return {
    path: pathResult.value,
    fragment: fragmentResult.value,
    error: pathResult.error ?? fragmentResult.error,
  };
}

function githubHeadingSlug(heading) {
  return heading
    .replace(/<[^>]+>/gu, "")
    .replace(/[`*_~]/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-");
}

function markdownFragments(markdown) {
  const fragments = new Set();
  const duplicates = new Map();

  for (const match of markdown.matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gmu)) {
    const base = githubHeadingSlug(match[1]);
    const duplicate = duplicates.get(base) ?? 0;
    fragments.add(duplicate === 0 ? base : `${base}-${duplicate}`);
    duplicates.set(base, duplicate + 1);
  }

  for (const match of markdown.matchAll(/\bid=["']([^"']+)["']/gu)) {
    fragments.add(match[1]);
  }

  return fragments;
}

export function validateWorkspaceGuide(markdown, repositoryRoot) {
  const issues = [];
  const links = markdownLinks(markdown);

  if (!/^## Placement Decision Tree$/m.test(markdown)) {
    issues.push("missing the stable Placement Decision Tree");
  }

  if (!/^## Illustrative, Non-Exhaustive Example$/m.test(markdown)) {
    issues.push(
      "the organizational example must be explicitly illustrative and non-exhaustive",
    );
  }

  for (const reference of durableReferences) {
    if (!links.includes(reference)) {
      issues.push(`missing durable reference: ${reference}`);
    }
  }

  for (const { pattern, message } of snapshotPatterns) {
    if (pattern.test(markdown)) {
      issues.push(message);
    }
  }

  const absoluteGuidePath = resolve(repositoryRoot, workspaceGuidePath);
  const guideDirectory = dirname(absoluteGuidePath);
  const repositoryPrefix = `${resolve(repositoryRoot)}${sep}`;

  for (const link of links) {
    if (/^(?:https?:|mailto:)/u.test(link)) {
      continue;
    }

    const local = localLinkTarget(link);
    if (local.error) {
      issues.push(local.error);
      continue;
    }

    const target = local.path
      ? resolve(guideDirectory, local.path)
      : absoluteGuidePath;
    if (
      target !== resolve(repositoryRoot) &&
      !target.startsWith(repositoryPrefix)
    ) {
      issues.push(`local link escapes the repository: ${link}`);
    } else if (!existsSync(target)) {
      issues.push(`stale or broken local link: ${link}`);
    } else if (local.fragment) {
      const targetMarkdown = readFileSync(target, "utf8");
      if (!markdownFragments(targetMarkdown).has(local.fragment)) {
        issues.push(`stale or broken local link fragment: ${link}`);
      }
    }
  }

  return issues;
}

export function checkWorkspaceGuide(repositoryRoot) {
  const absoluteGuidePath = resolve(repositoryRoot, workspaceGuidePath);
  const markdown = readFileSync(absoluteGuidePath, "utf8");
  return validateWorkspaceGuide(markdown, repositoryRoot);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const repositoryRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const issues = checkWorkspaceGuide(repositoryRoot);

  if (issues.length > 0) {
    console.error(`Workspace guide check failed:\n- ${issues.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Workspace guide references and freshness contract are valid.");
  }
}
