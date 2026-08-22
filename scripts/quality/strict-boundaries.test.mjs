import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  inspectStrictBoundaries,
  requiredBoundaryMarkers,
} from "./strict-boundaries.mjs";

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), "aohys-strict-boundaries-"));
  for (const directory of ["apps", "packages", "scripts", "functions"])
    mkdirSync(path.join(root, directory));
  const markersByPath = new Map();
  for (const [relativePath, marker] of requiredBoundaryMarkers) {
    markersByPath.set(relativePath, [
      ...(markersByPath.get(relativePath) ?? []),
      marker,
    ]);
  }
  for (const [relativePath, markers] of markersByPath) {
    mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
    writeFileSync(
      path.join(root, relativePath),
      markers.map((marker) => `${marker}();`).join("\n"),
    );
  }
  return root;
}

test("AST inventory blocks adversarial unsafe types and casts across every production root", () => {
  const root = fixtureRoot();
  mkdirSync(path.join(root, "apps/example"));
  writeFileSync(
    path.join(root, "apps/example/source.ts"),
    "const value = (input as unknown) as string;\n",
  );
  writeFileSync(
    path.join(root, "apps/example/source.test.ts"),
    "const allowedFixture: any = value;\n",
  );
  mkdirSync(path.join(root, "packages/example"));
  writeFileSync(
    path.join(root, "packages/example/source.ts"),
    'const id = input as GenericId<"leads">;\n',
  );
  writeFileSync(
    path.join(root, "functions/runtime.ts"),
    "type Unsafe = Array<any>;\n",
  );
  const findings = inspectStrictBoundaries(root);
  assert(findings.includes("apps/example/source.ts:1: double cast"));
  assert(
    findings.includes("packages/example/source.ts:1: manual Convex ID cast"),
  );
  assert(findings.includes("functions/runtime.ts:1: production any"));
  assert(!findings.some((finding) => finding.includes("source.test.ts")));
});

test("validator coverage requires a CallExpression rather than an import or comment", () => {
  const root = fixtureRoot();
  const [relativePath, marker] = requiredBoundaryMarkers[0];
  writeFileSync(
    path.join(root, relativePath),
    `// ${marker}()\nconst imported = ${JSON.stringify(marker)};\n`,
  );
  assert(
    inspectStrictBoundaries(root).includes(
      `${relativePath}: missing validator invocation ${marker}`,
    ),
  );
});
