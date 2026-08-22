import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { deriveBackendEnvelopes, measurePerformance } from "./measure-lib.mjs";

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
    backendEnvelopes: {},
    backendEnvelopeRevision: "fixture-sha",
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
    backendEnvelopes: {},
    backendEnvelopeRevision: "fixture-sha",
  });

  assert.equal(report.result.violations.length, 1);
  assert.equal(report.result.exitCode, 0);
  assert.equal(report.budgets.dashboardBundles.numericBudget, null);
  assert.equal(report.budgets.publicSite.webglRuntime.numericBudget, null);
});

test("derives the post-IM-08 read and write envelopes from source contracts", () => {
  const overviewSource = `
    async function listForDashboardHandler() {
      await Promise.all([
        q.take(101), q.take(201), q.take(11), q.take(100),
        q.take(100), q.take(50), q.take(51)
      ]);
    }
    async function getDashboardOverviewHandler() {
      await Promise.all([
        q.take(101), q.take(201), q.take(11), q.take(101),
        q.take(101), q.take(101), q.take(1)
      ]);
    }
  `;
  const durablePublicationSource = `
    async function readPublicationSource() {
      db.query("projectDrafts").take(3); db.query("projectDrafts").take(201);
      db.query("mediaMetadata").take(101); db.query("mediaMetadata").take(501);
      db.query("resumeDrafts").take(2); db.query("resumeDrafts").take(11);
      db.query("siteSettings").take(101);
    }
  `;
  const localPublicationSource = `
    async function publishContentHandler() {
      db.query("projectDrafts").take(3); db.query("projectDrafts").take(201);
      db.query("mediaMetadata").take(101); db.query("mediaMetadata").take(501);
      db.query("resumeDrafts").take(2); db.query("resumeDrafts").take(11);
    }
  `;
  const mediaSource = `
    async function listSiblingMedia() { q.take(101); }
    async function createMediaMetadataHandler() {}
  `;

  const result = deriveBackendEnvelopes({
    overviewSource,
    durablePublicationSource,
    localPublicationSource,
    mediaSource,
  });

  assert.deepEqual(result.listForDashboard, {
    maximumDocumentsRequested: 614,
    maximumDocumentsAccepted: 610,
  });
  assert.deepEqual(result.dashboardOverview, {
    maximumDocumentsRequested: 617,
    maximumDocumentsAccepted: 611,
  });
  assert.deepEqual(result.publication.identitySource, {
    maximumDocumentsRequested: 814,
    maximumDocumentsAccepted: 810,
  });
  assert.deepEqual(result.publication.localPublication, {
    maximumDocumentsRequested: 713,
    maximumDocumentsAccepted: 710,
  });
  assert.deepEqual(result.publication.combinedSourceReads, {
    maximumDocumentsRequested: 1527,
    maximumDocumentsAccepted: 1520,
  });
  assert.equal(
    result.publication.initialProviderConfiguredWrites.maximumDatabaseWrites,
    714,
  );
  assert.equal(result.mediaSelection.maximumDatabaseWrites, 101);
});

test("keeps the Browser QA harness and schema aligned on required metrics", () => {
  const harness = readFileSync(
    new URL("./browser-harness.js", import.meta.url),
    "utf8",
  );
  const schema = JSON.parse(
    readFileSync(
      new URL("./browser-capture.schema.json", import.meta.url),
      "utf8",
    ),
  );

  assert.deepEqual(schema.properties.scenario.enum, [
    "visible",
    "offscreen",
    "hidden",
    "reduced-motion",
  ]);
  for (const metric of [
    "routeLoad",
    "render",
    "longTasks",
    "webgl",
    "framesByContext",
    "droppedFrameEstimate",
  ]) {
    assert.match(harness, new RegExp(metric));
  }
  assert.match(harness, /__AOHYS_PERFORMANCE_CAPTURE__/);
});
