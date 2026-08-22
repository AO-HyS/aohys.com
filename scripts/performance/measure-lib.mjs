import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const JOURNEYS = ["overview", "projects", "leads", "resume", "settings"];
const STATIC_IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*)["'](\.\/[^"']+)["']/g;

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function byteMeasurement(filePath) {
  const bytes = readFileSync(filePath);
  return { rawBytes: bytes.byteLength, gzipBytes: gzipSync(bytes).byteLength };
}

function staticImports(filePath) {
  const source = readFileSync(filePath, "utf8");
  return [...source.matchAll(STATIC_IMPORT_PATTERN)].map((match) =>
    path.resolve(path.dirname(filePath), match[1]),
  );
}

function collectStaticGraph(seedFiles) {
  const pending = [...seedFiles];
  const visited = new Set();
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    pending.push(...staticImports(current));
  }
  return [...visited].sort();
}

function measureFiles(files, root) {
  return files.reduce(
    (result, filePath) => {
      const measurement = byteMeasurement(filePath);
      result.files.push(path.relative(root, filePath));
      result.rawBytes += measurement.rawBytes;
      result.gzipBytes += measurement.gzipBytes;
      return result;
    },
    { files: [], rawBytes: 0, gzipBytes: 0 },
  );
}

function measureExtensionGroup(root, extensions) {
  const files = listFiles(root).filter((filePath) =>
    extensions.includes(path.extname(filePath).toLowerCase()),
  );
  return measureFiles(files.sort(), root);
}

export function measurePerformance({
  dashboardDist,
  siteDist,
  sourceRevision,
  toolchain,
}) {
  const dashboardAssets = path.join(dashboardDist, "assets");
  const dashboardEntry = path.join(dashboardAssets, "dashboard.js");
  const journeys = Object.fromEntries(
    JOURNEYS.map((journey) => {
      const journeyEntry = path.join(dashboardAssets, `${journey}.js`);
      const graph = collectStaticGraph([dashboardEntry, journeyEntry]);
      return [journey, measureFiles(graph, dashboardDist)];
    }),
  );
  const archiveHtml = readFileSync(
    path.join(siteDist, "case-studies", "index.html"),
    "utf8",
  );
  const archiveEagerImages = (archiveHtml.match(/\bloading="eager"/g) ?? [])
    .length;
  const eagerBudget = 1;
  const violations =
    archiveEagerImages === eagerBudget
      ? []
      : [
          {
            metric: "publicSite.workArchiveEagerImages",
            expected: eagerBudget,
            actual: archiveEagerImages,
          },
        ];

  return {
    version: 1,
    mode: "observe",
    source: {
      revision: sourceRevision,
      toolchain,
      measurementMethod:
        "Production build artifacts, recursive static JavaScript import graph, and deterministic raw/gzip byte counts.",
      regenerationNote:
        "Regenerate after integrating IM-08 because backend source envelopes and the source revision will change.",
    },
    observations: {
      dashboardJourneys: journeys,
      dashboardAssets: {
        css: measureExtensionGroup(dashboardAssets, [".css"]),
        fonts: measureExtensionGroup(dashboardAssets, [".woff", ".woff2"]),
      },
      publicSite: {
        css: measureExtensionGroup(siteDist, [".css"]),
        fonts: measureExtensionGroup(siteDist, [".woff", ".woff2"]),
        images: measureExtensionGroup(siteDist, [
          ".avif",
          ".gif",
          ".jpeg",
          ".jpg",
          ".png",
          ".svg",
          ".webp",
        ]),
        workArchiveEagerImages: archiveEagerImages,
        workArchiveEagerCorrection: {
          before: 6,
          after: archiveEagerImages,
          evidence:
            "The six archive cards previously used eager loading; the production archive build now keeps only its first card eager.",
        },
        webglRuntime: {
          status: "unproven",
          note: "Requires browser and RUM evidence; no numeric budget is inferred from build output.",
        },
      },
      backendStaticEnvelopes: {
        listForDashboard: {
          maximumDocumentsRequested: 563,
          maximumDocumentsAccepted: 560,
          source: "apps/backend/convex/model/content/overview.ts",
        },
        dashboardOverview: {
          maximumDocumentsRequested: 616,
          maximumDocumentsAccepted: 610,
          source: "apps/backend/convex/model/content/overview.ts",
        },
        publicationAll: {
          maximumDocumentsRequested: 713,
          maximumDocumentsAccepted: 710,
          source: "apps/backend/convex/model/content/publication.ts",
        },
        mediaSelection: {
          maximumSiblingDocumentsRequested: 101,
          maximumSiblingDocumentsAccepted: 100,
          siblingPatches: "selected rows only",
          source: "apps/backend/convex/model/content/media.ts",
        },
        runtimeFanoutAndContention: {
          status: "unproven",
          note: "Static bounds are not runtime fanout or contention measurements.",
        },
      },
    },
    budgets: {
      publicSite: {
        workArchiveEagerImages: {
          expected: eagerBudget,
          enforcement: "semantic",
        },
        webglRuntime: { enforcement: "report-only", numericBudget: null },
      },
      dashboardBundles: { enforcement: "report-only", numericBudget: null },
      backendRuntime: { enforcement: "report-only", numericBudget: null },
    },
    result: {
      violations,
      exitCode: 0,
      note: "Observe mode always exits 0; semantic violations remain visible in this report.",
    },
  };
}

export function assertBuildOutputs({ dashboardDist, siteDist }) {
  for (const requiredPath of [
    path.join(dashboardDist, "assets", "dashboard.js"),
    path.join(siteDist, "case-studies", "index.html"),
  ]) {
    if (!statSync(requiredPath).isFile()) {
      throw new Error(`Missing build output: ${requiredPath}`);
    }
  }
}
