import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { measurePerformance } from "./measure-lib.mjs";

function fixture(eagerCount) {
  const root = mkdtempSync(path.join(tmpdir(), "aohys-performance-"));
  const dashboardDist = path.join(root, "dashboard");
  const assets = path.join(dashboardDist, "assets");
  const siteDist = path.join(root, "site");
  mkdirSync(assets, { recursive: true });
  mkdirSync(path.join(siteDist, "case-studies"), { recursive: true });
  writeFileSync(path.join(assets, "dashboard.js"), 'import "./shared.js";');
  writeFileSync(path.join(assets, "shared.js"), "export const shared = true;");
  for (const journey of [
    "overview",
    "projects",
    "leads",
    "resume",
    "settings",
  ]) {
    writeFileSync(
      path.join(assets, `${journey}.js`),
      'import "./shared.js"; export default true;',
    );
  }
  writeFileSync(path.join(assets, "dashboard.css"), "body{color:#000}");
  writeFileSync(path.join(assets, "font.woff2"), "font");
  writeFileSync(path.join(siteDist, "proof.svg"), "<svg></svg>");
  writeFileSync(
    path.join(siteDist, "case-studies", "index.html"),
    `<main>${'<img loading="eager">'.repeat(eagerCount)}</main>`,
  );
  return { dashboardDist, siteDist };
}

test("measures deterministic journey graphs and asset groups", () => {
  const inputs = {
    ...fixture(1),
    sourceRevision: "fixture-sha",
    toolchain: {
      node: "fixture",
      packageManager: "fixture",
      astro: "fixture",
      vite: "fixture",
    },
  };
  const first = measurePerformance(inputs);
  const second = measurePerformance(inputs);

  assert.deepEqual(first, second);
  assert.deepEqual(first.observations.dashboardJourneys.overview.files, [
    "assets/dashboard.js",
    "assets/overview.js",
    "assets/shared.js",
  ]);
  assert.equal(first.observations.publicSite.workArchiveEagerImages, 1);
  assert.deepEqual(first.result.violations, []);
});

test("observe mode reports the semantic eager violation but remains exit zero", () => {
  const report = measurePerformance({
    ...fixture(6),
    sourceRevision: "fixture-sha",
    toolchain: {},
  });

  assert.equal(report.result.violations.length, 1);
  assert.equal(report.result.exitCode, 0);
  assert.equal(report.budgets.dashboardBundles.numericBudget, null);
  assert.equal(report.budgets.publicSite.webglRuntime.numericBudget, null);
});
