import { execFileSync, spawnSync } from "node:child_process";
import process from "node:process";

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function resolveChangedFiles({
  baseRef = process.env.QUALITY_BASE_REF ?? "origin/develop",
  cwd = process.cwd(),
} = {}) {
  if (process.env.CHANGED_FILES) {
    return [
      ...new Set(
        process.env.CHANGED_FILES.split(",")
          .map((filePath) => normalizePath(filePath.trim()))
          .filter(Boolean),
      ),
    ].sort();
  }

  const files = new Set();
  const commands = [
    ["diff", "--name-only", "--diff-filter=ACMRD"],
    ["diff", "--name-only", "--cached", "--diff-filter=ACMRD"],
    ["diff", "--name-only", "--diff-filter=ACMRD", `${baseRef}...HEAD`],
  ];

  for (const args of commands) {
    try {
      const output = execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      for (const line of output.split("\n")) {
        const filePath = normalizePath(line.trim());
        if (filePath) files.add(filePath);
      }
    } catch {
      // A missing base ref must not hide local or staged changes.
    }
  }

  return [...files].sort();
}

function isDocumentationOnly(filePath) {
  return (
    filePath.startsWith("docs/") ||
    filePath.startsWith(".development-system/") ||
    filePath.startsWith(".codex/development-system/") ||
    filePath.startsWith(".factory/development-system/") ||
    /^(?:AGENTS|CONTEXT|README|CONTRIBUTING|CHANGELOG)\.md$/i.test(filePath)
  );
}

function isGlobalQualityChange(filePath) {
  return (
    /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig(?:\.[^/]+)?\.json)$/.test(
      filePath,
    ) ||
    filePath.startsWith("scripts/") ||
    filePath.startsWith(".github/workflows/") ||
    filePath.startsWith(".husky/")
  );
}

function matchesSourcePrefix(filePath, prefixes) {
  return prefixes.some(
    (prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`),
  );
}

export function buildChangedValidationPlan({
  changedFiles,
  baseRef = "origin/develop",
  baseCommands = [],
  documentationCommands = baseCommands,
  fullCommands = [],
  affectedScripts = ["lint", "typecheck", "test", "build"],
  affectedPackageSelectors = [],
  affectedExcludes = [],
  uiPrefixes = [],
  uiCommandPrefix = null,
  nativePrefixes = [],
  nativeCommands = [],
} = {}) {
  const files = [...new Set(changedFiles ?? [])].sort();
  const documentationOnly =
    files.length > 0 &&
    files.every((filePath) => isDocumentationOnly(filePath));
  const plan = [...(documentationOnly ? documentationCommands : baseCommands)];
  const globalQualityChange = files.some((filePath) =>
    isGlobalQualityChange(filePath),
  );
  const uiChanged = files.some((filePath) =>
    matchesSourcePrefix(filePath, uiPrefixes),
  );
  const nativeChanged = files.some((filePath) =>
    matchesSourcePrefix(filePath, nativePrefixes),
  );

  if (!documentationOnly && files.length > 0) {
    if (globalQualityChange) {
      plan.push(...fullCommands);
    } else if (affectedPackageSelectors.length > 0) {
      const selectors = [
        ...new Set(
          files.flatMap((filePath) =>
            affectedPackageSelectors
              .filter(
                ({ prefix }) =>
                  filePath === prefix || filePath.startsWith(`${prefix}/`),
              )
              .map(({ selector }) => selector),
          ),
        ),
      ].sort();
      if (selectors.length === 0 && !nativeChanged) {
        plan.push(...fullCommands);
      } else {
        for (const script of affectedScripts) {
          for (const selector of selectors) {
            plan.push(["pnpm", ["--filter", selector, "--if-present", script]]);
          }
        }
      }
    } else {
      for (const script of affectedScripts) {
        const args = ["--filter", `...[${baseRef}]`];
        for (const excludedPackage of affectedExcludes) {
          args.push("--filter", `!${excludedPackage}`);
        }
        args.push("--if-present", script);
        plan.push(["pnpm", args]);
      }
    }
  }

  if (nativeChanged) plan.push(...nativeCommands);
  if (uiChanged) {
    const uiFiles = files.filter((filePath) =>
      matchesSourcePrefix(filePath, uiPrefixes),
    );
    plan.push(
      uiCommandPrefix
        ? [uiCommandPrefix[0], [...uiCommandPrefix[1], ...uiFiles]]
        : ["pnpm", ["run", "quality:impeccable"]],
    );
  }

  return {
    changedFiles: files,
    documentationOnly,
    globalQualityChange,
    uiChanged,
    nativeChanged,
    commands: plan,
  };
}

export function runChangedValidationPlan(plan, { cwd = process.cwd() } = {}) {
  for (const [command, args] of plan.commands) {
    console.log(`Running: ${command} ${args.join(" ")}`);
    const result = spawnSync(command, args, {
      cwd,
      env: process.env,
      stdio: "inherit",
    });
    if ((result.status ?? 1) !== 0) return result.status ?? 1;
  }
  return 0;
}
