import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import {
  assertBuildOutputs,
  deriveBackendEnvelopes,
  measurePerformance,
} from "./measure-lib.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const outputFlagIndex = process.argv.indexOf("--output");
const outputPath = path.resolve(
  repositoryRoot,
  outputFlagIndex >= 0 && process.argv[outputFlagIndex + 1]
    ? process.argv[outputFlagIndex + 1]
    : "docs/research/im-12-performance-baseline.json",
);
const dashboardDist = path.join(repositoryRoot, "apps/dashboard/dist");
const siteDist = path.join(repositoryRoot, "apps/site/dist");
const durablePublicationPath = path.join(
  repositoryRoot,
  "apps/backend/convex/model/publication.ts",
);
const im08Reference = "56aa937";

assertBuildOutputs({ dashboardDist, siteDist });

const rootPackage = JSON.parse(
  readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
);
const dashboardPackage = JSON.parse(
  readFileSync(
    path.join(repositoryRoot, "apps/dashboard/node_modules/vite/package.json"),
    "utf8",
  ),
);
const sitePackage = JSON.parse(
  readFileSync(
    path.join(repositoryRoot, "apps/site/node_modules/astro/package.json"),
    "utf8",
  ),
);
const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim();

function localBackendSources() {
  return {
    overviewSource: readFileSync(
      path.join(
        repositoryRoot,
        "apps/backend/convex/model/content/overview.ts",
      ),
      "utf8",
    ),
    durablePublicationSource: existsSync(durablePublicationPath)
      ? readFileSync(durablePublicationPath, "utf8")
      : null,
    localPublicationSource: readFileSync(
      path.join(
        repositoryRoot,
        "apps/backend/convex/model/content/publication.ts",
      ),
      "utf8",
    ),
    mediaSource: readFileSync(
      path.join(repositoryRoot, "apps/backend/convex/model/content/media.ts"),
      "utf8",
    ),
  };
}

function referenceSource(filePath) {
  return execFileSync("git", ["show", `${im08Reference}:${filePath}`], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

const candidateBackendSources = localBackendSources();
const candidateBackendEnvelopes = deriveBackendEnvelopes(
  candidateBackendSources,
);
const needsIm08Reference =
  candidateBackendSources.durablePublicationSource === null;
const backendEnvelopeRevision = needsIm08Reference
  ? execFileSync("git", ["rev-parse", im08Reference], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim()
  : sourceRevision;
const backendEnvelopes = needsIm08Reference
  ? deriveBackendEnvelopes({
      overviewSource: referenceSource(
        "apps/backend/convex/model/content/overview.ts",
      ),
      durablePublicationSource: referenceSource(
        "apps/backend/convex/model/publication.ts",
      ),
      localPublicationSource: referenceSource(
        "apps/backend/convex/model/content/publication.ts",
      ),
      mediaSource: referenceSource(
        "apps/backend/convex/model/content/media.ts",
      ),
    })
  : candidateBackendEnvelopes;
const report = measurePerformance({
  dashboardDist,
  siteDist,
  sourceRevision,
  toolchain: {
    node: process.version,
    packageManager: rootPackage.packageManager,
    astro: sitePackage.version,
    vite: dashboardPackage.version,
  },
  backendEnvelopes,
  backendEnvelopeRevision,
  ...(needsIm08Reference
    ? { preIntegrationBackendEnvelopes: candidateBackendEnvelopes }
    : {}),
});

mkdirSync(path.dirname(outputPath), { recursive: true });
const formattedReport = await format(JSON.stringify(report), {
  parser: "json",
});
writeFileSync(outputPath, formattedReport);
console.log(formattedReport.trim());
process.exitCode = 0;
