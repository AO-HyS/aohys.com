import { execFileSync } from "node:child_process";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const POLICY_PATH = "docs/architecture/im-13-cleanup-gate.json";
const REGISTRY_PATH = "docs/architecture/compatibility-registry.json";
const EVIDENCE_SCRIPT_PATH = "scripts/architecture/im13-cleanup-evidence.mjs";
const EMPTY_SURFACE_ID = "package-surface:dashboard-ui-empty";
const EMPTY_SURFACE_DIRECTORY = "packages/dashboard-ui";
const APPROVED_TARGET_PATH = "packages/dashboard-ui/tsconfig.json";
const REVIEWED_PRE_REMOVAL_SHA = "a7074783231871f69f972779245160633b411a7c";
const BACKUP_MANIFEST_PATH =
  "/Users/corrortiz/.development-system/private/backups/aohys-architecture-convergence/im-13/a7074783231871f69f972779245160633b411a7c/manifest.json";
const BACKUP_MANIFEST_SHA256 =
  "b5e3bd8613920dd34c81f2121c0e29e4cee0499336f00c996d9ce81e209df39b";
const BACKUP_ENTRY_SHA256 =
  "51cf1053c97d69ea5ce4da06990c8e92ccc519de3b305463609761430fc553fd";
const REFERENCE_NEEDLES = ["packages/dashboard-ui", "@aohys/dashboard-ui"];
const SEARCH_ROOTS = [
  "apps",
  "functions",
  "packages",
  "scripts",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
];

function normalize(filePath) {
  return filePath.replaceAll("\\", "/");
}

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function trackedFiles(root, pathspec) {
  const output = execFileSync("git", ["ls-files", "-z", "--", pathspec], {
    cwd: root,
    encoding: "utf8",
  });
  return output.split("\0").filter(Boolean).map(normalize).sort();
}

function worktreeFiles(root, pathspec) {
  const output = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      pathspec,
    ],
    { cwd: root, encoding: "utf8" },
  );
  return output.split("\0").filter(Boolean).map(normalize).sort();
}

function isProductionEvidencePath(filePath) {
  if (filePath.startsWith(`${EMPTY_SURFACE_DIRECTORY}/`)) return false;
  if (filePath === EVIDENCE_SCRIPT_PATH) return false;
  if (/(?:^|\/)test(?:s)?\//.test(filePath)) return false;
  if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filePath)) return false;
  if (filePath === POLICY_PATH || filePath === REGISTRY_PATH) return false;
  return true;
}

function findProductionReferences(root) {
  const files = SEARCH_ROOTS.flatMap((pathspec) =>
    worktreeFiles(root, pathspec),
  );
  return [...new Set(files)]
    .filter(isProductionEvidencePath)
    .flatMap((filePath) => {
      let text;
      try {
        text = readFileSync(path.join(root, filePath), "utf8");
      } catch {
        return [];
      }
      return REFERENCE_NEEDLES.some((needle) => text.includes(needle))
        ? [filePath]
        : [];
    })
    .sort();
}

export function collectCleanupEvidence({ root = process.cwd() } = {}) {
  const policy = readJson(root, POLICY_PATH);
  const registry = readJson(root, REGISTRY_PATH);
  const candidateIds = policy.candidates
    .filter((candidate) => candidate.status !== "removed")
    .map((candidate) => candidate.id);
  const registryIds = registry.entries.map((entry) => entry.id);
  const emptySurface = policy.candidates.find(
    (candidate) => candidate.id === EMPTY_SURFACE_ID,
  );
  const actualTrackedFiles = trackedFiles(root, EMPTY_SURFACE_DIRECTORY).filter(
    (filePath) => existsSync(path.join(root, filePath)),
  );
  const actualWorktreeFiles = worktreeFiles(
    root,
    EMPTY_SURFACE_DIRECTORY,
  ).filter((filePath) => existsSync(path.join(root, filePath)));
  const surfaceWasRemoved = emptySurface?.status === "removed";
  const removedCandidateIds = policy.candidates
    .filter((candidate) => candidate.status === "removed")
    .map((candidate) => candidate.id);
  const expectedTrackedFiles = surfaceWasRemoved
    ? []
    : (emptySurface?.targetPaths ?? []);
  const actualHashes = Object.fromEntries(
    actualTrackedFiles.map((filePath) => [
      filePath,
      sha256(path.join(root, filePath)),
    ]),
  );
  const productionReferences = findProductionReferences(root);
  const checks = {
    blanketDestructiveExecutionClosed:
      policy.destructiveExecutionAuthorized === false,
    removedCandidateIsExact:
      JSON.stringify(removedCandidateIds) ===
      JSON.stringify([EMPTY_SURFACE_ID]),
    registryCoverage:
      JSON.stringify(candidateIds) === JSON.stringify(registryIds),
    approvalsRemainClosed: policy.candidates.every(
      (candidate) =>
        candidate.status === "removed" || candidate.approval === "not-granted",
    ),
    removedApprovalIsExact:
      !surfaceWasRemoved ||
      (emptySurface?.approval === "granted" &&
        emptySurface?.destructiveExecutionAuthorized === true &&
        emptySurface?.authorization?.approvedStatement ===
          "Apruebo eliminar packages/dashboard-ui/tsconfig.json" &&
        emptySurface?.authorization?.targetPath === APPROVED_TARGET_PATH &&
        emptySurface?.authorization?.reviewedPreRemovalSha ===
          REVIEWED_PRE_REMOVAL_SHA &&
        emptySurface?.authorization?.backupManifestPath ===
          BACKUP_MANIFEST_PATH &&
        emptySurface?.authorization?.backupManifestSha256 ===
          BACKUP_MANIFEST_SHA256 &&
        emptySurface?.authorization?.backupEntrySha256 ===
          BACKUP_ENTRY_SHA256 &&
        emptySurface?.expectedSha256?.[APPROVED_TARGET_PATH] ===
          BACKUP_ENTRY_SHA256),
    blockedSourcesExist: policy.candidates
      .filter((candidate) => candidate.status === "blocked-active")
      .every((candidate) => {
        const source = registry.entries.find(
          (entry) => entry.id === candidate.id,
        )?.source;
        return (
          typeof source === "string" && existsSync(path.join(root, source))
        );
      }),
    emptySurfaceTrackedFiles:
      JSON.stringify(actualTrackedFiles) ===
      JSON.stringify(expectedTrackedFiles),
    emptySurfaceWorktreeFiles:
      JSON.stringify(actualWorktreeFiles) ===
      JSON.stringify(expectedTrackedFiles),
    emptySurfaceHasNoManifest: !existsSync(
      path.join(root, EMPTY_SURFACE_DIRECTORY, "package.json"),
    ),
    emptySurfaceHashes:
      JSON.stringify(actualHashes) ===
      JSON.stringify(
        surfaceWasRemoved ? {} : (emptySurface?.expectedSha256 ?? {}),
      ),
    emptySurfaceProductionReferences: productionReferences.length === 0,
  };

  return {
    ticket: policy.ticket,
    preparedFromCommit: policy.preparedFromCommit,
    repositoryHead: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim(),
    checks,
    ok: Object.values(checks).every(Boolean),
    eligibleForHumanReview:
      !surfaceWasRemoved &&
      checks.emptySurfaceTrackedFiles &&
      checks.emptySurfaceWorktreeFiles &&
      checks.emptySurfaceHasNoManifest &&
      checks.emptySurfaceHashes &&
      checks.emptySurfaceProductionReferences,
    removalVerified:
      surfaceWasRemoved &&
      checks.registryCoverage &&
      checks.approvalsRemainClosed &&
      checks.removedCandidateIsExact &&
      checks.removedApprovalIsExact &&
      checks.emptySurfaceTrackedFiles &&
      checks.emptySurfaceWorktreeFiles &&
      checks.emptySurfaceHashes &&
      checks.emptySurfaceProductionReferences,
    destructiveExecutionAuthorized: false,
    activeOrUnprovenCandidates: policy.candidates
      .filter((candidate) => candidate.status === "blocked-active")
      .map((candidate) => candidate.id),
    emptySurface: {
      id: EMPTY_SURFACE_ID,
      trackedFiles: actualTrackedFiles,
      worktreeFiles: actualWorktreeFiles,
      sha256: actualHashes,
      productionReferences,
      approval: emptySurface?.approval ?? "missing",
      status: emptySurface?.status ?? "missing",
      authorization: emptySurface?.authorization ?? null,
    },
  };
}

export function prepareBackup({ backupDirectory, root = process.cwd() }) {
  if (!path.isAbsolute(backupDirectory)) {
    throw new Error("backup directory must be an absolute path");
  }
  const relativeBackupDirectory = path.relative(root, backupDirectory);
  if (
    relativeBackupDirectory === "" ||
    (!relativeBackupDirectory.startsWith("..") &&
      !path.isAbsolute(relativeBackupDirectory))
  ) {
    throw new Error("backup directory must be outside the repository");
  }
  const evidence = collectCleanupEvidence({ root });
  if (!evidence.ok || !evidence.eligibleForHumanReview) {
    throw new Error("current evidence does not permit backup preparation");
  }
  mkdirSync(backupDirectory, { recursive: true });
  const entries = evidence.emptySurface.trackedFiles.map((relativePath) => {
    const destination = path.join(backupDirectory, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(
      path.join(root, relativePath),
      destination,
      constants.COPYFILE_EXCL,
    );
    return {
      path: relativePath,
      bytes: statSync(destination).size,
      sha256: sha256(destination),
    };
  });
  const manifest = {
    schemaVersion: 1,
    ticket: "IM-13",
    repositoryHead: evidence.repositoryHead,
    destructiveExecutionAuthorized: false,
    entries,
  };
  writeFileSync(
    path.join(backupDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: "wx" },
  );
  return manifest;
}

export function verifyBackup({ backupDirectory }) {
  const manifestPath = path.join(backupDirectory, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const failures = manifest.entries.flatMap((entry) => {
    const backupPath = path.join(backupDirectory, entry.path);
    if (!existsSync(backupPath)) return [`${entry.path}: missing`];
    if (statSync(backupPath).size !== entry.bytes) {
      return [`${entry.path}: byte count changed`];
    }
    return sha256(backupPath) === entry.sha256
      ? []
      : [`${entry.path}: sha256 changed`];
  });
  return { ok: failures.length === 0, failures, manifest };
}

function parseOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const backupDirectory = parseOption("--prepare-backup");
  const verifyDirectory = parseOption("--verify-backup");
  try {
    const result = backupDirectory
      ? prepareBackup({ backupDirectory })
      : verifyDirectory
        ? verifyBackup({ backupDirectory: verifyDirectory })
        : collectCleanupEvidence();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok === false ? 1 : 0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
