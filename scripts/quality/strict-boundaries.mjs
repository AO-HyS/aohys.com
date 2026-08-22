import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const roots = ["apps", "packages", "scripts"];
const sourceExtensions = new Set([".astro", ".mjs", ".ts", ".tsx"]);
const ignoredSegments = new Set([
  ".astro",
  "_generated",
  "dist",
  "node_modules",
  "test",
  "tests",
]);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory())
      return ignoredSegments.has(entry.name) ? [] : sourceFiles(filePath);
    // The scanner owns the banned-pattern regexes; its focused test proves those
    // literals remain executable policy rather than a production exception.
    if (
      entry.name === "strict-boundaries.mjs" ||
      !entry.isFile() ||
      !sourceExtensions.has(path.extname(entry.name)) ||
      /\.test\.[^.]+$/.test(entry.name)
    )
      return [];
    return [filePath];
  });
}

const bannedPatterns = [
  { label: "production any", pattern: /(?:\bas\s+any\b|:\s*any\b|<any>)/g },
  { label: "double cast", pattern: /\bas\s+unknown\s+as\b/g },
  { label: "manual Convex ID cast", pattern: /\bas\s+Id\s*</g },
];

export const requiredBoundaryMarkers = [
  ["apps/backend/src/contact-providers.ts", "parseResendNotificationResponse"],
  [
    "apps/backend/src/dashboard-providers.ts",
    "parseCloudflareImagesUploadResponse",
  ],
  ["apps/backend/src/dashboard-providers.ts", "parseGitHubErrorResponse"],
  ["apps/site/src/posthog-client.ts", "parseAnalyticsBootstrapPayload"],
  ["apps/site/src/posthog-client.ts", "parseAnalyticsEventDetail"],
  ["apps/site/src/csp-reporting.ts", "parseCspReportPayload"],
  ["apps/site/src/dashboard-access.ts", "parseBetterAuthRedirect"],
  ["apps/site/src/dashboard-access.ts", "parseBetterAuthSession"],
  [
    "packages/release-train/src/cloudflare-pages-domain.ts",
    "parseCloudflareApiEnvelope",
  ],
  ["scripts/apply-dashboard-published-content.ts", "parseLocaleDictionary"],
  ["scripts/apply-dashboard-published-content.ts", "parseResumeContent"],
];

export function inspectStrictBoundaries(repoRoot = process.cwd()) {
  const findings = [];
  for (const root of roots) {
    const absoluteRoot = path.join(repoRoot, root);
    if (!statSync(absoluteRoot).isDirectory()) continue;
    for (const absolutePath of sourceFiles(absoluteRoot)) {
      const source = readFileSync(absolutePath, "utf8");
      const relativePath = path
        .relative(repoRoot, absolutePath)
        .replaceAll("\\", "/");
      for (const { label, pattern } of bannedPatterns) {
        pattern.lastIndex = 0;
        for (const match of source.matchAll(pattern)) {
          const line = source.slice(0, match.index).split("\n").length;
          findings.push(`${relativePath}:${line}: ${label}`);
        }
      }
    }
  }
  for (const [relativePath, marker] of requiredBoundaryMarkers) {
    const source = readFileSync(path.join(repoRoot, relativePath), "utf8");
    if (!source.includes(marker))
      findings.push(`${relativePath}: missing validator ${marker}`);
  }
  return findings.sort();
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  const findings = inspectStrictBoundaries();
  if (findings.length > 0) {
    console.error(
      [
        "Strict boundary inventory failed:",
        ...findings.map((item) => `- ${item}`),
      ].join("\n"),
    );
    process.exitCode = 1;
  } else {
    console.log(
      "Strict boundary inventory passed: no production any, double casts, or manual Convex ID casts; owned validators are connected.",
    );
  }
}
