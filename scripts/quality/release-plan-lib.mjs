const DEVELOPMENT_SYSTEM_FILES = new Set([
  ".development-system/repository.json",
  ".codex/development-system/repository.md",
  ".factory/development-system/repository.md",
]);

const RUNTIME_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "turbo.json",
]);

const RUNTIME_PREFIXES = [
  "apps/",
  "packages/",
  "scripts/apply-",
  "scripts/audit-",
  "scripts/deploy",
  "scripts/ensure-",
  "scripts/extract-",
  "scripts/seed-",
  "scripts/smoke-",
  "scripts/sync-",
  "scripts/validate-release-",
  ".github/workflows/release-train.yml",
];

function normalizeFiles(changedFiles) {
  return [
    ...new Set(
      changedFiles
        .map((file) => file.trim().replaceAll("\\", "/"))
        .filter(Boolean),
    ),
  ].sort();
}

function isNeutral(file) {
  const name = file.split("/").at(-1) ?? file;
  return (
    DEVELOPMENT_SYSTEM_FILES.has(file) ||
    file.startsWith("docs/") ||
    file.startsWith("test/") ||
    file.startsWith("tests/") ||
    file.includes("/test/") ||
    file.includes("/tests/") ||
    file.includes("/__tests__/") ||
    /(?:^|\.)(?:test|spec)\.[cm]?[jt]sx?$/.test(name) ||
    /^(?:AGENTS|CONTEXT|README|CONTRIBUTING|CHANGELOG)\.md$/i.test(file)
  );
}

function isRuntime(file) {
  return (
    RUNTIME_FILES.has(file) ||
    RUNTIME_PREFIXES.some((prefix) => file.startsWith(prefix))
  );
}

export function createReleasePlan({
  changedFiles = [],
  eventName = "push",
} = {}) {
  const files = normalizeFiles(changedFiles);
  if (eventName === "workflow_dispatch") {
    return {
      deployRuntime: true,
      fallback: false,
      changedFiles: files,
      reasons: ["manual-dispatch"],
    };
  }

  if (files.length === 0) {
    return {
      deployRuntime: true,
      fallback: true,
      changedFiles: files,
      reasons: ["fallback:missing-diff"],
    };
  }

  let deployRuntime = false;
  let fallback = false;
  const reasons = new Set();
  for (const file of files) {
    if (isNeutral(file)) {
      reasons.add(
        DEVELOPMENT_SYSTEM_FILES.has(file)
          ? "development-system-metadata"
          : "verification-only",
      );
    } else if (isRuntime(file)) {
      deployRuntime = true;
      reasons.add("runtime");
    } else {
      deployRuntime = true;
      fallback = true;
      reasons.add(`fallback:${file}`);
    }
  }

  return {
    deployRuntime,
    fallback,
    changedFiles: files,
    reasons: [...reasons].sort(),
  };
}
