import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzeArchitecture,
  extractImportSpecifiers,
  formatFitnessReport,
} from "./fitness-lib.mjs";
import { discoverArchitectureTests } from "./run-tests.mjs";

function fixture(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), "aohys-fitness-"));
  for (const [filePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(root, filePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents);
  }
  return root;
}

test("derives an acyclic source graph, public exports, and generated producers from the repository", () => {
  const report = analyzeArchitecture();

  assert.equal(report.ok, true);
  assert.doesNotMatch(formatFitnessReport(report), /BASELINE|dependency-cycle/);
  assert.deepEqual(
    report.graph.fileEdges.filter(
      ([from]) => from === "apps/dashboard/src/navigation.ts",
    ),
    [],
  );

  const backendExports = report.publicExports.find(
    (item) => item.package === "@aohys/backend",
  );
  assert.deepEqual(
    backendExports.exports.map((item) => item.subpath),
    ["./convex/_generated/api", "./convex/_generated/dataModel"],
  );

  const producerSets = report.generatedArtifacts.map((item) => item.producers);
  assert.ok(
    producerSets.some((producers) =>
      producers.includes("scripts/apply-dashboard-published-content.ts"),
    ),
  );
  assert.ok(
    producerSets.some((producers) =>
      producers.includes("apps/backend/package.json#scripts.codegen"),
    ),
  );
});

test("blocks every source cycle without a baseline edge exemption", (context) => {
  const root = fixture({
    "apps/dashboard/package.json": JSON.stringify({
      name: "@fixture/dashboard",
      private: true,
    }),
    "apps/dashboard/src/navigation.ts":
      'import { screen } from "@/screens/projects-screen";\nexport const navigation = screen;\n',
    "apps/dashboard/src/screens/projects-screen.ts":
      'import { capture } from "@/lib/analytics";\nexport const screen = capture;\n',
    "apps/dashboard/src/lib/analytics.ts":
      'import { navigation } from "@/navigation";\nexport const capture = navigation;\n',
  });
  context.after(() => rmSync(root, { force: true, recursive: true }));

  const report = analyzeArchitecture({ root });
  assert.equal(report.ok, false);
  assert.ok(
    report.blockingViolations.some(
      (violation) => violation.kind === "dependency-cycle",
    ),
  );
});

test("blocks a source file that imports itself", (context) => {
  const selfCycle = "apps/dashboard/src/lib/self-cycle.ts";
  const root = fixture({
    "apps/dashboard/package.json": JSON.stringify({
      name: "@fixture/dashboard",
      private: true,
    }),
    [selfCycle]: 'import { value } from "./self-cycle";\nexport { value };\n',
  });
  context.after(() => rmSync(root, { force: true, recursive: true }));

  const report = analyzeArchitecture({ root });
  assert.equal(report.ok, false);
  assert.deepEqual(report.blockingViolations, [
    {
      id: `dependency-cycle:${selfCycle}`,
      kind: "dependency-cycle",
      files: [selfCycle],
      message: `Dependency cycle detected: ${selfCycle} -> ${selfCycle}`,
    },
  ]);
});

test("blocks a new feature import into dashboard app composition", (context) => {
  const root = fixture({
    "apps/dashboard/package.json": JSON.stringify({
      name: "@fixture/dashboard",
      private: true,
    }),
    "apps/dashboard/src/app/router.ts": "export const router = {};\n",
    "apps/dashboard/src/lib/new-feature.ts":
      'import { router } from "@/app/router";\nexport { router };\n',
  });
  context.after(() => rmSync(root, { force: true, recursive: true }));

  const report = analyzeArchitecture({ root });
  assert.equal(report.ok, false);
  assert.deepEqual(
    report.blockingViolations.map((violation) => violation.kind),
    ["dashboard-feature-to-app"],
  );
});

test("blocks workspace deep imports that are absent from public exports", (context) => {
  const root = fixture({
    "apps/consumer/package.json": JSON.stringify({
      name: "@fixture/consumer",
      private: true,
      dependencies: { "@fixture/library": "workspace:*" },
    }),
    "apps/consumer/src/index.ts":
      'import { hidden } from "@fixture/library/src/hidden";\nexport { hidden };\n',
    "packages/library/package.json": JSON.stringify({
      name: "@fixture/library",
      private: true,
      exports: { ".": "./src/index.ts" },
    }),
    "packages/library/src/hidden.ts": "export const hidden = true;\n",
    "packages/library/src/index.ts": "export const visible = true;\n",
  });
  context.after(() => rmSync(root, { force: true, recursive: true }));

  const report = analyzeArchitecture({ root });
  assert.equal(report.ok, false);
  assert.equal(report.blockingViolations[0].kind, "workspace-deep-import");
});

test("blocks workspace dependency cycles deterministically", (context) => {
  const root = fixture({
    "apps/consumer/package.json": JSON.stringify({
      name: "@fixture/consumer",
      private: true,
      dependencies: { "@fixture/library": "workspace:*" },
    }),
    "packages/library/package.json": JSON.stringify({
      name: "@fixture/library",
      private: true,
      dependencies: { "@fixture/consumer": "workspace:*" },
    }),
  });
  context.after(() => rmSync(root, { force: true, recursive: true }));

  const report = analyzeArchitecture({ root });
  assert.equal(report.ok, false);
  assert.deepEqual(report.blockingViolations, [
    {
      id: "workspace-dependency-cycle:@fixture/consumer|@fixture/library",
      kind: "workspace-dependency-cycle",
      packages: ["@fixture/consumer", "@fixture/library"],
      message:
        "Workspace dependency cycle detected: @fixture/consumer -> @fixture/library",
    },
  ]);
});

test("blocks a workspace manifest that depends on itself", (context) => {
  const root = fixture({
    "packages/self/package.json": JSON.stringify({
      name: "@fixture/self",
      private: true,
      dependencies: { "@fixture/self": "workspace:*" },
    }),
  });
  context.after(() => rmSync(root, { force: true, recursive: true }));

  const report = analyzeArchitecture({ root });
  assert.equal(report.ok, false);
  assert.deepEqual(report.blockingViolations, [
    {
      id: "workspace-dependency-cycle:@fixture/self",
      kind: "workspace-dependency-cycle",
      packages: ["@fixture/self"],
      message:
        "Workspace dependency cycle detected: @fixture/self -> @fixture/self",
    },
  ]);
});

test("parses imports only, ignoring cross-app paths read by tests and CSS @source", () => {
  const source = [
    'const fixture = readFileSync("../../apps/dashboard/src/app/router.ts");',
    'const css = "@source ../../apps/dashboard/src";',
    'import { visible } from "@fixture/library";',
  ].join("\n");

  assert.deepEqual(extractImportSpecifiers(source), ["@fixture/library"]);
});

test("the architecture gate discovers every architecture test deterministically", () => {
  const discovered = discoverArchitectureTests();

  assert.deepEqual(discovered, [...discovered].sort());
  assert.ok(
    discovered.includes("scripts/architecture/compatibility-registry.test.mjs"),
  );
  assert.ok(discovered.includes("scripts/architecture/fitness.test.mjs"));
});
