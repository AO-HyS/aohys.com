import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectCleanupEvidence,
  prepareBackup,
  verifyBackup,
} from "./im13-cleanup-evidence.mjs";

test("IM-13 keeps every destructive approval closed and proves only the empty surface ready for review", () => {
  const evidence = collectCleanupEvidence();

  assert.equal(evidence.ok, true);
  assert.equal(evidence.destructiveExecutionAuthorized, false);
  assert.equal(evidence.eligibleForHumanReview, true);
  assert.equal(evidence.emptySurface.approval, "not-granted");
  assert.deepEqual(evidence.emptySurface.trackedFiles, [
    "packages/dashboard-ui/tsconfig.json",
  ]);
  assert.deepEqual(evidence.emptySurface.worktreeFiles, [
    "packages/dashboard-ui/tsconfig.json",
  ]);
  assert.deepEqual(evidence.emptySurface.productionReferences, []);
  assert.equal(evidence.activeOrUnprovenCandidates.length, 15);
});

test("IM-13 backup is content-addressed and independently verifiable", () => {
  const backupDirectory = mkdtempSync(
    path.join(tmpdir(), "aohys-im13-backup-test-"),
  );

  try {
    const manifest = prepareBackup({ backupDirectory });
    assert.equal(manifest.destructiveExecutionAuthorized, false);
    assert.deepEqual(
      manifest.entries.map((entry) => entry.path),
      ["packages/dashboard-ui/tsconfig.json"],
    );
    assert.deepEqual(verifyBackup({ backupDirectory }), {
      ok: true,
      failures: [],
      manifest,
    });
  } finally {
    rmSync(backupDirectory, { recursive: true, force: true });
  }
});
