import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  inspectStrictBoundaries,
  requiredBoundaryMarkers,
} from "./strict-boundaries.mjs";

test("strict boundary inventory blocks unsafe production casts", () => {
  const root = mkdtempSync(path.join(tmpdir(), "aohys-strict-boundaries-"));
  for (const directory of ["apps", "packages", "scripts"])
    mkdirSync(path.join(root, directory));
  mkdirSync(path.join(root, "apps/example"));
  writeFileSync(
    path.join(root, "apps/example/source.ts"),
    "const value = input as unknown as string;\n",
  );
  const markersByPath = new Map();
  for (const [relativePath, marker] of requiredBoundaryMarkers) {
    markersByPath.set(
      relativePath,
      `${markersByPath.get(relativePath) ?? ""} ${marker}`,
    );
  }
  for (const [relativePath, markers] of markersByPath) {
    mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
    writeFileSync(path.join(root, relativePath), markers);
  }
  assert.deepEqual(inspectStrictBoundaries(root), [
    "apps/example/source.ts:1: double cast",
  ]);
});
