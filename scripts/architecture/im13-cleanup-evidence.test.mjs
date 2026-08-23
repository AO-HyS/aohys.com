import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectCleanupEvidence,
  prepareBackup,
} from "./im13-cleanup-evidence.mjs";

test("IM-13 proves the one approved empty surface was removed and keeps every other approval closed", () => {
  const evidence = collectCleanupEvidence();

  assert.equal(evidence.ok, true);
  assert.equal(evidence.destructiveExecutionAuthorized, false);
  assert.equal(evidence.checks.blanketDestructiveExecutionClosed, true);
  assert.equal(evidence.checks.removedCandidateIsExact, true);
  assert.equal(evidence.checks.removedApprovalIsExact, true);
  assert.equal(evidence.eligibleForHumanReview, false);
  assert.equal(evidence.removalVerified, true);
  assert.equal(evidence.emptySurface.status, "removed");
  assert.equal(evidence.emptySurface.approval, "granted");
  assert.deepEqual(evidence.emptySurface.trackedFiles, []);
  assert.deepEqual(evidence.emptySurface.worktreeFiles, []);
  assert.deepEqual(evidence.emptySurface.productionReferences, []);
  assert.equal(evidence.activeOrUnprovenCandidates.length, 15);
});

test("IM-13 refuses to prepare another backup after the approved removal", () => {
  const backupDirectory = mkdtempSync(
    path.join(tmpdir(), "aohys-im13-backup-test-"),
  );
  try {
    assert.throws(
      () => prepareBackup({ backupDirectory }),
      /current evidence does not permit backup preparation/,
    );
  } finally {
    rmSync(backupDirectory, { recursive: true, force: true });
  }
});
