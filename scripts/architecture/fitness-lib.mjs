import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".astro",
];
const IGNORED_DIRECTORIES = new Set([
  ".astro",
  ".git",
  "coverage",
  "dist",
  "node_modules",
]);

const DASHBOARD_ROUTE_METADATA = "apps/dashboard/src/app/navigation.ts";

function normalize(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "");
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function walkFiles(root, relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = normalize(path.join(relativeDirectory, entry.name));
      if (entry.isDirectory()) {
        return IGNORED_DIRECTORIES.has(entry.name)
          ? []
          : walkFiles(root, relativePath);
      }
      return entry.isFile() ? [relativePath] : [];
    })
    .sort();
}

function isTestFile(filePath) {
  return (
    /(?:^|\/)test(?:s)?\//.test(filePath) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(filePath)
  );
}

export function extractImportSpecifiers(source) {
  const specifiers = new Set();
  const staticImport =
    /^\s*(?:import|export)\s+(?:type\s+)?(?:[^"'();]*?\s+from\s*)?["']([^"']+)["']/gm;
  const dynamicImport = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

  for (const expression of [staticImport, dynamicImport]) {
    for (const match of source.matchAll(expression)) specifiers.add(match[1]);
  }
  return [...specifiers].sort();
}

function exportTargets(exportsField) {
  if (typeof exportsField === "string") return [exportsField];
  if (!exportsField || typeof exportsField !== "object") return [];
  return Object.values(exportsField).flatMap((value) => exportTargets(value));
}

function publicExports(manifest) {
  if (!manifest.exports) return [];
  if (typeof manifest.exports === "string" || Array.isArray(manifest.exports)) {
    return [{ subpath: ".", targets: exportTargets(manifest.exports) }];
  }

  const keys = Object.keys(manifest.exports);
  if (!keys.some((key) => key.startsWith("."))) {
    return [{ subpath: ".", targets: exportTargets(manifest.exports) }];
  }
  return keys.sort().map((subpath) => ({
    subpath,
    targets: exportTargets(manifest.exports[subpath]),
  }));
}

function discoverWorkspaces(root) {
  const manifests = walkFiles(root, "apps")
    .concat(walkFiles(root, "packages"))
    .filter((filePath) =>
      /^(?:apps|packages)\/[^/]+\/package\.json$/.test(filePath),
    )
    .map((manifestPath) => {
      const manifest = readJson(path.join(root, manifestPath));
      return {
        directory: path.dirname(manifestPath),
        manifestPath,
        manifest,
        name: manifest.name,
        publicExports: publicExports(manifest),
      };
    })
    .filter((workspace) => typeof workspace.name === "string")
    .sort((left, right) => left.name.localeCompare(right.name));

  return manifests;
}

function trySourcePath(root, candidate) {
  const normalizedCandidate = normalize(candidate);
  const extension = path.extname(normalizedCandidate);
  const candidates = [normalizedCandidate];

  if (extension === ".js" || extension === ".jsx") {
    const withoutExtension = normalizedCandidate.slice(0, -extension.length);
    candidates.push(`${withoutExtension}.ts`, `${withoutExtension}.tsx`);
  } else if (!SOURCE_EXTENSIONS.includes(extension)) {
    for (const sourceExtension of SOURCE_EXTENSIONS) {
      candidates.push(`${normalizedCandidate}${sourceExtension}`);
    }
    for (const sourceExtension of SOURCE_EXTENSIONS) {
      candidates.push(`${normalizedCandidate}/index${sourceExtension}`);
    }
  }

  return candidates.find((filePath) => existsSync(path.join(root, filePath)));
}

function workspaceForSpecifier(specifier, workspaces) {
  return workspaces
    .filter(
      (workspace) =>
        specifier === workspace.name ||
        specifier.startsWith(`${workspace.name}/`),
    )
    .sort((left, right) => right.name.length - left.name.length)[0];
}

function workspaceSubpath(specifier, workspace) {
  return specifier === workspace.name
    ? "."
    : `.${specifier.slice(workspace.name.length)}`;
}

function resolveSpecifier({ importer, root, specifier, workspaces }) {
  if (specifier.startsWith("@/") && importer.startsWith("apps/dashboard/")) {
    return trySourcePath(
      root,
      path.join("apps/dashboard/src", specifier.slice(2)),
    );
  }

  if (specifier.startsWith(".")) {
    return trySourcePath(root, path.join(path.dirname(importer), specifier));
  }

  const workspace = workspaceForSpecifier(specifier, workspaces);
  if (!workspace) return undefined;
  const subpath = workspaceSubpath(specifier, workspace);
  const exported = workspace.publicExports.find(
    (item) => item.subpath === subpath,
  );
  const target = exported?.targets[0];
  return target
    ? trySourcePath(root, path.join(workspace.directory, target))
    : undefined;
}

function stronglyConnectedComponents(nodes, edges) {
  const adjacency = new Map(nodes.map((node) => [node, []]));
  for (const [from, to] of edges) adjacency.get(from)?.push(to);
  for (const targets of adjacency.values()) targets.sort();

  let nextIndex = 0;
  const index = new Map();
  const lowLink = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(node) {
    index.set(node, nextIndex);
    lowLink.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const target of adjacency.get(node) ?? []) {
      if (!index.has(target)) {
        visit(target);
        lowLink.set(node, Math.min(lowLink.get(node), lowLink.get(target)));
      } else if (onStack.has(target)) {
        lowLink.set(node, Math.min(lowLink.get(node), index.get(target)));
      }
    }

    if (lowLink.get(node) !== index.get(node)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1) components.push(component.sort());
  }

  for (const node of [...nodes].sort()) {
    if (!index.has(node)) visit(node);
  }
  return components.sort((left, right) => left[0].localeCompare(right[0]));
}

function isDashboardFeature(filePath) {
  return (
    filePath.startsWith("apps/dashboard/src/") &&
    !filePath.startsWith("apps/dashboard/src/app/") &&
    filePath !== "apps/dashboard/src/main.tsx"
  );
}

function edgeId(from, to) {
  return `${from}->${to}`;
}

function generatedArtifactProducer({
  artifact,
  root,
  sourceFiles,
  workspaces,
}) {
  const artifactText = readFileSync(path.join(root, artifact), "utf8");
  const declaredProducer = artifactText.match(/Generated by ([\w./-]+)/)?.[1];
  const producers = new Set();
  if (declaredProducer && existsSync(path.join(root, declaredProducer))) {
    producers.add(declaredProducer);
  }

  const basename = path.basename(artifact);
  for (const sourceFile of sourceFiles.filter((filePath) =>
    filePath.startsWith("scripts/"),
  )) {
    const source = readFileSync(path.join(root, sourceFile), "utf8");
    if (source.includes(basename) && /\bwriteFile(?:Sync)?\b/.test(source)) {
      producers.add(sourceFile);
    }
  }

  const workspace = workspaces.find((candidate) =>
    artifact.startsWith(`${candidate.directory}/`),
  );
  if (workspace && /\/(?:_generated|generated)\//.test(artifact)) {
    for (const [scriptName, command] of Object.entries(
      workspace.manifest.scripts ?? {},
    )) {
      if (
        /codegen|generate/.test(scriptName) ||
        /\b(?:codegen|generate)\b/.test(command)
      ) {
        producers.add(`${workspace.manifestPath}#scripts.${scriptName}`);
      }
    }
  }
  return [...producers].sort();
}

export function analyzeArchitecture({ root = process.cwd() } = {}) {
  const workspaces = discoverWorkspaces(root);
  const sourceFiles = ["apps", "functions", "packages", "scripts"]
    .flatMap((directory) => walkFiles(root, directory))
    .filter((filePath) => SOURCE_EXTENSIONS.includes(path.extname(filePath)))
    .sort();
  const productionFiles = sourceFiles.filter(
    (filePath) => !isTestFile(filePath),
  );
  const sourceSet = new Set(productionFiles);
  const imports = [];
  const violations = [];

  for (const importer of productionFiles) {
    const source = readFileSync(path.join(root, importer), "utf8");
    for (const specifier of extractImportSpecifiers(source)) {
      const workspace = workspaceForSpecifier(specifier, workspaces);
      const target = resolveSpecifier({
        importer,
        root,
        specifier,
        workspaces,
      });
      imports.push({ importer, specifier, target });

      if (importer === DASHBOARD_ROUTE_METADATA) {
        violations.push({
          id: `dashboard-route-metadata-import:${specifier}`,
          kind: "dashboard-route-metadata-import",
          importer,
          specifier,
          message: `${DASHBOARD_ROUTE_METADATA} must remain pure route metadata without imports`,
        });
      }

      if (workspace) {
        const subpath = workspaceSubpath(specifier, workspace);
        if (!workspace.publicExports.some((item) => item.subpath === subpath)) {
          violations.push({
            id: `workspace-deep-import:${importer}:${specifier}`,
            kind: "workspace-deep-import",
            importer,
            specifier,
            message: `${importer} imports non-public workspace path ${specifier}`,
          });
        }
      }

      if (
        target?.startsWith("apps/dashboard/src/app/") &&
        target !== DASHBOARD_ROUTE_METADATA &&
        isDashboardFeature(importer)
      ) {
        violations.push({
          id: `dashboard-feature-to-app:${importer}:${target}`,
          kind: "dashboard-feature-to-app",
          importer,
          target,
          message: `${importer} imports dashboard composition ${target}`,
        });
      }

      if (
        !workspace &&
        target?.startsWith("apps/") &&
        importer.startsWith("apps/") &&
        importer.split("/")[1] !== target.split("/")[1]
      ) {
        violations.push({
          id: `cross-app-import:${importer}:${target}`,
          kind: "cross-app-import",
          importer,
          target,
          message: `${importer} imports another application source ${target}`,
        });
      }
    }
  }

  const fileEdges = imports
    .filter(
      ({ importer, target }) =>
        sourceSet.has(importer) && sourceSet.has(target),
    )
    .map(({ importer, target }) => [importer, target]);
  const fileCycles = stronglyConnectedComponents(productionFiles, fileEdges);
  for (const component of fileCycles) {
    violations.push({
      id: `dependency-cycle:${component.join("|")}`,
      kind: "dependency-cycle",
      files: component,
      message: `Dependency cycle detected: ${component.join(" -> ")}`,
    });
  }

  const generatedArtifacts = [
    ...new Set(
      imports
        .map(({ target }) => target)
        .filter(
          (target) => target && /\/(?:_generated|generated)\//.test(target),
        ),
    ),
  ]
    .sort()
    .map((artifact) => ({
      artifact,
      consumers: imports
        .filter((item) => item.target === artifact)
        .map((item) => item.importer)
        .sort(),
      producers: generatedArtifactProducer({
        artifact,
        root,
        sourceFiles,
        workspaces,
      }),
    }));

  for (const artifact of generatedArtifacts) {
    if (artifact.producers.length === 0) {
      violations.push({
        id: `generated-artifact-without-producer:${artifact.artifact}`,
        kind: "generated-artifact-without-producer",
        artifact: artifact.artifact,
        message: `${artifact.artifact} has consumers but no source-derived producer`,
      });
    }
  }

  const packageEdges = workspaces.flatMap((workspace) =>
    Object.keys({
      ...(workspace.manifest.dependencies ?? {}),
      ...(workspace.manifest.devDependencies ?? {}),
      ...(workspace.manifest.peerDependencies ?? {}),
    })
      .filter((dependency) =>
        workspaces.some((candidate) => candidate.name === dependency),
      )
      .sort()
      .map((dependency) => [workspace.name, dependency]),
  );

  const packageCycles = stronglyConnectedComponents(
    workspaces.map((workspace) => workspace.name),
    packageEdges,
  );
  for (const component of packageCycles) {
    violations.push({
      id: `workspace-dependency-cycle:${component.join("|")}`,
      kind: "workspace-dependency-cycle",
      packages: component,
      message: `Workspace dependency cycle detected: ${component.join(" -> ")}`,
    });
  }

  const blockingViolations = violations.filter(
    (violation) => violation.blocking !== false,
  );

  return {
    ok: blockingViolations.length === 0,
    blockingViolations,
    graph: {
      files: productionFiles,
      fileEdges: fileEdges.sort((left, right) =>
        edgeId(...left).localeCompare(edgeId(...right)),
      ),
      packages: workspaces.map((workspace) => workspace.name),
      packageEdges,
    },
    publicExports: workspaces.map((workspace) => ({
      package: workspace.name,
      manifest: workspace.manifestPath,
      exports: workspace.publicExports,
    })),
    generatedArtifacts,
  };
}

export function formatFitnessReport(report) {
  const lines = [
    `Architecture fitness: ${report.ok ? "PASS" : "FAIL"}`,
    `Graph: ${report.graph.files.length} source files, ${report.graph.fileEdges.length} file edges, ${report.graph.packageEdges.length} workspace edges`,
    `Public exports: ${report.publicExports.reduce((sum, item) => sum + item.exports.length, 0)} across ${report.publicExports.length} workspaces`,
    `Generated artifacts: ${report.generatedArtifacts.length} with source-derived producers`,
  ];

  for (const violation of report.blockingViolations) {
    lines.push(`BLOCKING ${violation.id}: ${violation.message}`);
  }
  return lines.join("\n");
}
