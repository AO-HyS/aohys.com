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

function functionSection(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}`);
  if (start < 0) throw new Error(`Missing function contract: ${functionName}`);
  const end = nextFunctionName
    ? source.indexOf(`function ${nextFunctionName}`, start + 1)
    : source.length;
  return source.slice(start, end < 0 ? source.length : end);
}

function takeValues(source) {
  return [...source.matchAll(/\.take\((\d+)\)/g)].map((match) =>
    Number(match[1]),
  );
}

function acceptedCapacity(values) {
  return values.reduce(
    (total, value) =>
      total + (value > 1 && value % 10 === 1 ? value - 1 : value),
    0,
  );
}

function maximumTableTake(source, table) {
  const values = [
    ...source.matchAll(
      new RegExp(`query\\("${table}"\\)[\\s\\S]*?\\.take\\((\\d+)\\)`, "g"),
    ),
  ].map((match) => Number(match[1]));
  if (values.length === 0)
    throw new Error(`Missing read contract for ${table}`);
  return Math.max(...values);
}

function envelope(values) {
  return {
    maximumDocumentsRequested: values.reduce(
      (total, value) => total + value,
      0,
    ),
    maximumDocumentsAccepted: acceptedCapacity(values),
  };
}

export function deriveBackendEnvelopes({
  overviewSource,
  durablePublicationSource,
  localPublicationSource,
  mediaSource,
}) {
  const listForDashboard = envelope(
    takeValues(
      functionSection(
        overviewSource,
        "listForDashboardHandler",
        "getDashboardOverviewHandler",
      ),
    ),
  );
  const dashboardOverview = envelope(
    takeValues(functionSection(overviewSource, "getDashboardOverviewHandler")),
  );
  const localPublication = envelope(
    ["projectDrafts", "mediaMetadata", "resumeDrafts"].map((table) =>
      maximumTableTake(localPublicationSource, table),
    ),
  );
  const mediaSelection = envelope(
    takeValues(
      functionSection(
        mediaSource,
        "listSiblingMedia",
        "createMediaMetadataHandler",
      ),
    ),
  );
  const publicationIdentity = durablePublicationSource
    ? envelope(
        ["projectDrafts", "mediaMetadata", "resumeDrafts", "siteSettings"].map(
          (table) => maximumTableTake(durablePublicationSource, table),
        ),
      )
    : null;

  return {
    listForDashboard,
    dashboardOverview,
    publication: {
      identitySource: publicationIdentity,
      localPublication,
      combinedSourceReads: publicationIdentity
        ? {
            maximumDocumentsRequested:
              publicationIdentity.maximumDocumentsRequested +
              localPublication.maximumDocumentsRequested,
            maximumDocumentsAccepted:
              publicationIdentity.maximumDocumentsAccepted +
              localPublication.maximumDocumentsAccepted,
          }
        : null,
      initialProviderConfiguredWrites: durablePublicationSource
        ? {
            maximumContentPatches: localPublication.maximumDocumentsAccepted,
            requestInserts: 1,
            attemptInserts: 1,
            statePatches: 2,
            maximumDatabaseWrites:
              localPublication.maximumDocumentsAccepted + 4,
            scheduledJobs: 1,
          }
        : null,
    },
    mediaSelection: {
      ...mediaSelection,
      siblingPatches: "0..maximumDocumentsAccepted, selected rows only",
      maximumTargetPatches: 1,
      maximumDatabaseWrites: mediaSelection.maximumDocumentsAccepted + 1,
    },
  };
}

export function measurePerformance({
  dashboardDist,
  siteDist,
  sourceRevision,
  toolchain,
  backendEnvelopes,
  backendEnvelopeRevision,
  preIntegrationBackendEnvelopes,
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
          harness: "scripts/performance/browser-harness.js",
          schema: "scripts/performance/browser-capture.schema.json",
          protocol: "scripts/performance/browser-qa-protocol.md",
          note: "Requires browser and RUM evidence; no numeric budget is inferred from build output.",
        },
      },
      backendStaticEnvelopes: {
        sourceRevision: backendEnvelopeRevision,
        sourceFiles: [
          "apps/backend/convex/model/content/overview.ts",
          "apps/backend/convex/model/publication.ts",
          "apps/backend/convex/model/content/publication.ts",
          "apps/backend/convex/model/content/media.ts",
        ],
        derived: backendEnvelopes,
        ...(preIntegrationBackendEnvelopes
          ? {
              preIntegrationCandidate: {
                sourceRevision,
                derived: preIntegrationBackendEnvelopes,
              },
            }
          : {}),
        runtimeFanoutAndContention: {
          status: "unproven",
          previewGate: "scripts/performance/preview-insights-protocol.md",
          note: "Static read/write envelopes are not runtime subscription fanout or mutation contention measurements.",
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
