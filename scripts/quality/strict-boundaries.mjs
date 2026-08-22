import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
const require = createRequire(
  new URL("../../apps/site/package.json", import.meta.url),
);
const ts = require("typescript");

const roots = ["apps", "packages", "scripts", "functions"];
const sourceExtensions = new Set([
  ".astro",
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);
const ignoredSegments = new Set([
  ".astro",
  "_generated",
  "dist",
  "node_modules",
  "test",
  "tests",
  "__tests__",
]);

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory())
      return ignoredSegments.has(entry.name) ? [] : sourceFiles(filePath);
    if (
      !entry.isFile() ||
      !sourceExtensions.has(path.extname(entry.name)) ||
      /\.(?:test|spec)\.[^.]+$/.test(entry.name)
    )
      return [];
    return [filePath];
  });
}

function sourceUnits(filePath, source) {
  if (path.extname(filePath) !== ".astro") return [{ source, lineOffset: 0 }];
  const units = [];
  if (source.startsWith("---")) {
    const end = source.indexOf("---", 3);
    if (end >= 0) units.push({ source: source.slice(3, end), lineOffset: 1 });
  }
  let cursor = 0;
  while ((cursor = source.indexOf("<script", cursor)) >= 0) {
    const bodyStart = source.indexOf(">", cursor);
    const bodyEnd =
      bodyStart >= 0 ? source.indexOf("</script>", bodyStart) : -1;
    if (bodyStart < 0 || bodyEnd < 0) break;
    units.push({
      source: source.slice(bodyStart + 1, bodyEnd),
      lineOffset: source.slice(0, bodyStart + 1).split("\n").length - 1,
    });
    cursor = bodyEnd + 9;
  }
  return units;
}

function unwrapParentheses(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function assertedTypeName(node) {
  if (!ts.isTypeReferenceNode(node)) return undefined;
  return ts.isIdentifier(node.typeName)
    ? node.typeName.text
    : node.typeName.right.text;
}

function calledName(expression) {
  const target = unwrapParentheses(expression);
  if (ts.isIdentifier(target)) return target.text;
  if (ts.isPropertyAccessExpression(target)) return target.name.text;
  return undefined;
}

function inspectUnit(relativePath, unit, calls) {
  const findings = [];
  const sourceFile = ts.createSourceFile(
    relativePath,
    unit.source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  function finding(node, label) {
    const position = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    findings.push(
      `${relativePath}:${position.line + 1 + unit.lineOffset}: ${label}`,
    );
  }
  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) finding(node, "production any");
    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      const inner = unwrapParentheses(node.expression);
      if (
        (ts.isAsExpression(inner) || ts.isTypeAssertionExpression(inner)) &&
        inner.type.kind === ts.SyntaxKind.UnknownKeyword
      )
        finding(node, "double cast");
      if (["Id", "GenericId"].includes(assertedTypeName(node.type) ?? ""))
        finding(node, "manual Convex ID cast");
    }
    if (ts.isCallExpression(node)) {
      const name = calledName(node.expression);
      if (name) calls.add(name);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return findings;
}

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
  [
    "scripts/apply-dashboard-published-content.ts",
    "parseDashboardContentPayload",
  ],
  ["scripts/apply-dashboard-published-content.ts", "parseLocaleDictionary"],
  ["scripts/apply-dashboard-published-content.ts", "parseResumeContent"],
];

export function inspectStrictBoundaries(repoRoot = process.cwd()) {
  const findings = [];
  const callsByPath = new Map();
  for (const root of roots) {
    for (const absolutePath of sourceFiles(path.join(repoRoot, root))) {
      const source = readFileSync(absolutePath, "utf8");
      const relativePath = path
        .relative(repoRoot, absolutePath)
        .replaceAll("\\", "/");
      const calls = new Set();
      for (const unit of sourceUnits(relativePath, source))
        findings.push(...inspectUnit(relativePath, unit, calls));
      callsByPath.set(relativePath, calls);
    }
  }
  for (const [relativePath, marker] of requiredBoundaryMarkers) {
    if (!callsByPath.get(relativePath)?.has(marker))
      findings.push(`${relativePath}: missing validator invocation ${marker}`);
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
      "Strict boundary inventory passed: AST found no production any, double casts, or manual Convex ID casts; owned validators are invoked.",
    );
  }
}
