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
  return [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(
    (match) => match[1],
  );
}

function localLinkTarget(link) {
  const withoutTitle = link.trim().split(/\s+["']/u, 1)[0];
  return decodeURIComponent(withoutTitle.split("#", 1)[0]);
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

  const guideDirectory = dirname(resolve(repositoryRoot, workspaceGuidePath));
  const repositoryPrefix = `${resolve(repositoryRoot)}${sep}`;

  for (const link of links) {
    if (/^(?:https?:|mailto:|#)/u.test(link)) {
      continue;
    }

    const target = resolve(guideDirectory, localLinkTarget(link));
    if (
      target !== resolve(repositoryRoot) &&
      !target.startsWith(repositoryPrefix)
    ) {
      issues.push(`local link escapes the repository: ${link}`);
    } else if (!existsSync(target)) {
      issues.push(`stale or broken local link: ${link}`);
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
