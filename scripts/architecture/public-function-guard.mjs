import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { readDomainVocabularies } from "./domain-vocabulary.mjs";

// Guards the Convex authorization contract: every public function is built
// with adminQuery/adminMutation/adminAction from convex/lib/functions.ts, whose
// closed form runs requireAdmin before the handler. The export check is
// semantic: the TypeScript checker classifies every export of every Convex
// module, so aliases, re-exports, nested modules and library-made functions
// are judged by what they are, not by how they are written. Because a type can
// be widened and registrations replaced, the modules are also evaluated as a
// Convex push would: every export that is public at runtime must be one of
// those admin registrations, and invoking it anonymously through the Convex
// entry point, anonymously and as a signed-in caller outside the allowlist,
// must be refused by requireAdmin before any other syscall or network call.
// The evaluation runs once per AOHYS_ENV value without provider credentials.
//
// Threat model: this catches the bypasses a contributor or agent writes by
// copying a pattern or by mistake. Code written to defeat the guard, such as
// exports chosen from other runtime state, is left to review.

const CONVEX_DIR = "apps/backend/convex";
const BUILDERS_FILE = `${CONVEX_DIR}/lib/functions.ts`;
const PUBLIC_BUILDERS = new Set([
  "query",
  "mutation",
  "action",
  "httpAction",
  "queryGeneric",
  "mutationGeneric",
  "actionGeneric",
  "httpActionGeneric",
]);
const SERVER_MODULE = /(?:^|\/)_generated\/server(?:\.js)?$|^convex\/server$/u;
const ADMIN_BUILDERS = {
  adminQuery: { custom: "customQuery", base: "query" },
  adminMutation: { custom: "customMutation", base: "mutation" },
  adminAction: { custom: "customAction", base: "action" },
};
// Extensions Convex bundles as function modules; only .ts is allowed so every
// deployable module goes through the checker.
const CONVEX_SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/u;

// The only public HTTP routes besides the Better Auth registration.
const HTTP_ROUTES = new Set(["POST /contact", "OPTIONS /contact"]);
// Every route the evaluated router serves: the contact routes plus what
// authComponent.registerRoutesLazy adds. A Better Auth upgrade that changes
// this set needs a reviewed edit here.
const RUNTIME_HTTP_ROUTES = [
  "GET /.well-known/openid-configuration",
  "GET /api/auth/*",
  "OPTIONS /api/auth/*",
  "OPTIONS /contact",
  "POST /api/auth/*",
  "POST /contact",
];

function parse(filePath) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

// Every file Convex could bundle, split into checked .ts modules and
// rejected other source extensions.
function convexFiles(root) {
  const directory = path.join(root, CONVEX_DIR);
  const files = { sources: [], rejected: [] };
  if (!existsSync(directory)) return files;
  const walk = (relative) => {
    for (const entry of readdirSync(path.join(root, relative), {
      withFileTypes: true,
    })) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        // Convex skips only the root _generated directory.
        if (
          relative !== CONVEX_DIR ||
          (entry.name !== "_generated" && entry.name !== "node_modules")
        )
          walk(child);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        files.sources.push(child);
      } else if (CONVEX_SOURCE_EXTENSION.test(entry.name)) {
        files.rejected.push(child);
      }
    }
  };
  walk(CONVEX_DIR);
  files.sources.sort();
  files.rejected.sort();
  return files;
}

function createConvexProgram(root, sources) {
  const configPath = path.join(root, CONVEX_DIR, "tsconfig.json");
  const config = ts.readConfigFile(configPath, (file) => ts.sys.readFile(file));
  const parsed = ts.parseJsonConfigFileContent(
    config.config ?? {},
    ts.sys,
    path.dirname(configPath),
  );
  return ts.createProgram({
    rootNames: sources.map((relative) => path.join(root, relative)),
    options: { ...parsed.options, noEmit: true },
  });
}

function hasModifier(node, kind) {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === kind)
  );
}

// Local name -> imported name for each named import of `moduleTest`.
function namedImports(sourceFile, moduleTest) {
  const names = new Map();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !moduleTest(statement.moduleSpecifier.text)
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        names.set(
          element.name.text,
          (element.propertyName ?? element.name).text,
        );
      }
    }
  }
  return names;
}

function rawBuilderViolations(relative, sourceFile) {
  const violations = [];
  const isHttp = relative === `${CONVEX_DIR}/http.ts`;
  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      SERVER_MODULE.test(statement.moduleSpecifier.text)
    ) {
      violations.push(
        `${relative}: re-exports from ${statement.moduleSpecifier.text} would hand out public builders; import what you need instead`,
      );
      continue;
    }
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !SERVER_MODULE.test(statement.moduleSpecifier.text)
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      violations.push(
        `${relative}: namespace import of ${statement.moduleSpecifier.text} hides public builders; import named internal builders instead`,
      );
      continue;
    }
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if (element.isTypeOnly || statement.importClause?.isTypeOnly) continue;
      const imported = (element.propertyName ?? element.name).text;
      if (!PUBLIC_BUILDERS.has(imported)) continue;
      if (isHttp && imported === "httpAction") continue;
      violations.push(
        `${relative}: imports public builder ${imported}; use adminQuery/adminMutation/adminAction from convex/lib/functions.ts`,
      );
    }
  }
  return violations;
}

// Each builder must be exactly
// customX(x, customCtx(async (ctx) => { const admin = await requireAdmin(ctx); return { admin }; }))
function builderViolations(root) {
  const filePath = path.join(root, BUILDERS_FILE);
  if (!existsSync(filePath)) return [`${BUILDERS_FILE} is missing`];
  const sourceFile = parse(filePath);
  const helpers = namedImports(
    sourceFile,
    (specifier) => specifier === "convex-helpers/server/customFunctions",
  );
  const server = namedImports(sourceFile, (specifier) =>
    /^\.\.\/_generated\/server(?:\.js)?$/u.test(specifier),
  );
  const auth = namedImports(sourceFile, (specifier) =>
    /^\.\.\/auth(?:\.js)?$/u.test(specifier),
  );
  const isImported = (map, node, name) =>
    ts.isIdentifier(node) && map.get(node.text) === name;
  const violations = [];
  const seen = new Set();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) continue;
    const exported =
      ts.isExportDeclaration(statement) ||
      ts.isExportAssignment(statement) ||
      hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (
      !ts.isVariableStatement(statement) ||
      (statement.declarationList.flags & ts.NodeFlags.Const) === 0
    ) {
      violations.push(`${BUILDERS_FILE}: only export const admin builders`);
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      const name = declaration.name.getText(sourceFile);
      const spec = ADMIN_BUILDERS[name];
      if (!spec) {
        violations.push(`${BUILDERS_FILE}: unexpected export ${name}`);
        continue;
      }
      seen.add(name);
      const call = declaration.initializer;
      const contextCall = call?.arguments?.[1];
      const arrow = contextCall?.arguments?.[0];
      const parameter = arrow?.parameters?.[0];
      const body = arrow?.body;
      const first = body && ts.isBlock(body) ? body.statements[0] : undefined;
      const second = body && ts.isBlock(body) ? body.statements[1] : undefined;
      const guardDeclaration =
        first && ts.isVariableStatement(first)
          ? first.declarationList.declarations[0]
          : undefined;
      const awaited = guardDeclaration?.initializer;
      const guardCall =
        awaited && ts.isAwaitExpression(awaited)
          ? awaited.expression
          : undefined;
      const returned =
        second && ts.isReturnStatement(second) ? second.expression : undefined;
      const ok =
        call &&
        ts.isCallExpression(call) &&
        isImported(helpers, call.expression, spec.custom) &&
        call.arguments.length === 2 &&
        isImported(server, call.arguments[0], spec.base) &&
        contextCall &&
        ts.isCallExpression(contextCall) &&
        isImported(helpers, contextCall.expression, "customCtx") &&
        contextCall.arguments.length === 1 &&
        arrow &&
        ts.isArrowFunction(arrow) &&
        hasModifier(arrow, ts.SyntaxKind.AsyncKeyword) &&
        arrow.parameters.length === 1 &&
        parameter &&
        ts.isIdentifier(parameter.name) &&
        !parameter.dotDotDotToken &&
        !parameter.initializer &&
        body &&
        ts.isBlock(body) &&
        body.statements.length === 2 &&
        first &&
        ts.isVariableStatement(first) &&
        (first.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
        first.declarationList.declarations.length === 1 &&
        guardDeclaration &&
        ts.isIdentifier(guardDeclaration.name) &&
        guardDeclaration.name.text === "admin" &&
        guardCall &&
        ts.isCallExpression(guardCall) &&
        isImported(auth, guardCall.expression, "requireAdmin") &&
        guardCall.arguments.length === 1 &&
        ts.isIdentifier(guardCall.arguments[0]) &&
        guardCall.arguments[0].text === parameter.name.text &&
        returned &&
        ts.isObjectLiteralExpression(returned) &&
        returned.properties.length === 1 &&
        ts.isShorthandPropertyAssignment(returned.properties[0]) &&
        returned.properties[0].name.text === "admin" &&
        !server.has(parameter.name.text) &&
        !auth.has(parameter.name.text) &&
        !helpers.has(parameter.name.text);
      if (!ok) {
        violations.push(
          `${BUILDERS_FILE}: ${name} must be ${spec.custom}(${spec.base}, customCtx(async (ctx) => { const admin = await requireAdmin(ctx); return { admin }; }))`,
        );
      }
    }
  }
  for (const name of Object.keys(ADMIN_BUILDERS))
    if (!seen.has(name))
      violations.push(`${BUILDERS_FILE}: ${name} is missing`);
  return violations;
}

function resolveAlias(checker, symbol) {
  return symbol && symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}

// "public" for a public Convex function or HTTP action, "internal" for an
// internal one, "opaque" when the type hides what the value is.
function registrationKind(checker, type) {
  let kind;
  for (const part of type.isUnion() ? type.types : [type]) {
    if (part.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return "opaque";
    const has = (name) => checker.getPropertyOfType(part, name) !== undefined;
    if (has("isHttp")) return "public";
    if (!has("isConvexFunction")) continue;
    if (!has("isInternal") || has("isPublic")) return "public";
    kind = "internal";
  }
  return kind;
}

// A public function must be declared as `const x = adminQuery(...)` (or
// adminMutation/adminAction) with the builder resolved from lib/functions.ts.
function isAdminRegistration(checker, root, declaration) {
  if (
    !declaration ||
    !ts.isVariableDeclaration(declaration) ||
    !ts.isIdentifier(declaration.name) ||
    (declaration.parent.flags & ts.NodeFlags.Const) === 0 ||
    !declaration.initializer ||
    !ts.isCallExpression(declaration.initializer) ||
    !ts.isIdentifier(declaration.initializer.expression)
  )
    return false;
  const builder = resolveAlias(
    checker,
    checker.getSymbolAtLocation(declaration.initializer.expression),
  );
  const builderDeclaration = builder?.valueDeclaration;
  return (
    Boolean(builderDeclaration) &&
    path.resolve(builderDeclaration.getSourceFile().fileName) ===
      path.resolve(root, BUILDERS_FILE) &&
    Object.hasOwn(ADMIN_BUILDERS, builder.name)
  );
}

function exportViolations(checker, root, relative, sourceFile, adminExports) {
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return [];
  const violations = [];
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol = resolveAlias(checker, exported);
    if (!symbol || (symbol.flags & ts.SymbolFlags.Value) === 0) continue;
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
    if (isAdminRegistration(checker, root, declaration))
      adminExports.add(`${relative}#${exported.name}`);
    const kind = declaration
      ? registrationKind(
          checker,
          checker.getTypeOfSymbolAtLocation(symbol, declaration),
        )
      : "opaque";
    if (kind === "opaque") {
      violations.push(
        `${relative}: export ${exported.name} has an opaque type; give it a concrete type so it can be classified`,
      );
    } else if (
      kind === "public" &&
      !isAdminRegistration(checker, root, declaration)
    ) {
      violations.push(
        `${relative}: export ${exported.name} is a public Convex function not built with adminQuery/adminMutation/adminAction`,
      );
    }
  }
  return violations;
}

// True when the identifier is httpRouter imported from convex/server.
function isConvexHttpRouter(checker, identifier) {
  const specifier = checker.getSymbolAtLocation(identifier)?.declarations?.[0];
  const importDeclaration = specifier?.parent?.parent?.parent;
  return (
    specifier !== undefined &&
    ts.isImportSpecifier(specifier) &&
    (specifier.propertyName ?? specifier.name).text === "httpRouter" &&
    importDeclaration !== undefined &&
    ts.isImportDeclaration(importDeclaration) &&
    ts.isStringLiteral(importDeclaration.moduleSpecifier) &&
    importDeclaration.moduleSpecifier.text === "convex/server"
  );
}

// http.ts declares one router with httpRouter() and uses it only as
// http.route({ path, method, handler }) with literals, as the argument of
// authComponent.registerRoutesLazy and as the default export.
function httpViolations(checker, relative, sourceFile) {
  if (relative !== `${CONVEX_DIR}/http.ts`) return [];
  const violations = [];
  const routes = new Set();
  let routerSymbol;
  let routerCalls = 0;
  let authRoutes = 0;
  let exportedRouter = false;
  const fail = (message) => violations.push(`${relative}: ${message}`);

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (
        init &&
        ts.isCallExpression(init) &&
        ts.isIdentifier(init.expression) &&
        isConvexHttpRouter(checker, init.expression) &&
        ts.isIdentifier(declaration.name) &&
        (statement.declarationList.flags & ts.NodeFlags.Const) !== 0
      )
        routerSymbol = checker.getSymbolAtLocation(declaration.name);
    }
  }
  if (!routerSymbol) {
    fail(
      "expected `const http = httpRouter()` at module level, with httpRouter imported from convex/server",
    );
    return violations;
  }

  const routeKey = (config) => {
    if (!config || !ts.isObjectLiteralExpression(config)) return undefined;
    const values = {};
    for (const property of config.properties) {
      if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name))
        return undefined;
      values[property.name.text] = property.initializer;
    }
    const names = Object.keys(values).sort().join(",");
    const { path: routePath, method } = values;
    return names === "handler,method,path" &&
      ts.isStringLiteral(routePath) &&
      ts.isStringLiteral(method)
      ? `${method.text} ${routePath.text}`
      : undefined;
  };

  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "httpRouter"
    )
      routerCalls += 1;
    if (
      ts.isIdentifier(node) &&
      checker.getSymbolAtLocation(node) === routerSymbol &&
      !(ts.isVariableDeclaration(node.parent) && node.parent.name === node)
    ) {
      const parent = node.parent;
      if (
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node &&
        parent.name.text === "route" &&
        ts.isCallExpression(parent.parent) &&
        parent.parent.expression === parent
      ) {
        const key =
          parent.parent.arguments.length === 1
            ? routeKey(parent.parent.arguments[0])
            : undefined;
        if (!key) {
          fail(
            "http.route takes one object literal with exactly literal path, literal method and handler",
          );
        } else if (!HTTP_ROUTES.has(key)) {
          fail(`public HTTP route ${key} is not in the authorization contract`);
        } else {
          routes.add(key);
        }
      } else if (
        ts.isCallExpression(parent) &&
        parent.arguments[0] === node &&
        ts.isPropertyAccessExpression(parent.expression) &&
        parent.expression.name.text === "registerRoutesLazy" &&
        ts.isIdentifier(parent.expression.expression) &&
        parent.expression.expression.text === "authComponent"
      ) {
        authRoutes += 1;
      } else if (ts.isExportAssignment(parent) && !parent.isExportEquals) {
        exportedRouter = true;
      } else {
        fail(
          "the router may only be used as http.route({ path, method, handler }), passed to authComponent.registerRoutesLazy or exported as default",
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (routerCalls !== 1) fail("expected exactly one httpRouter() call");
  if (authRoutes !== 1)
    fail("expected exactly one Better Auth route registration");
  if (!exportedRouter) fail("the router must be the default export");
  for (const key of HTTP_ROUTES)
    if (!routes.has(key)) fail(`missing route ${key}`);
  return violations;
}

// The app definition is bundled apart from function modules and only
// evaluates inside the Convex runtime; the static checks still cover it.
const APP_DEFINITION = `${CONVEX_DIR}/convex.config.ts`;
// requireAdmin's refusals (convex/auth.ts) for a caller without a session and
// for a signed-in caller outside ADMIN_EMAIL.
const EXPECTED_REJECTIONS = {
  anonymous: "Authentication is required for dashboard access.",
  outsider: "This account is not allowed to use the dashboard.",
};
// The evaluation never sees provider credentials; ADMIN_EMAIL holds an
// address no caller in the evaluation uses.
const EVALUATION_ADMIN_EMAIL = "admin@guard.invalid";
// Work still pending after this long fails closed.
const EVALUATION_TIMEOUT_MS = 60_000;
const RUNTIME_EXPORTS_SCRIPT = fileURLToPath(
  new URL("./convex-runtime-exports.mts", import.meta.url),
);

// True when the directive prologue (comments allowed) holds "use node".
// Those modules are never evaluated; nodeModuleViolations checks them.
function usesNodeRuntime(sourceFile) {
  for (const statement of sourceFile.statements) {
    if (!ts.isPrologueDirective(statement)) return false;
    if (statement.expression.text === "use node") return true;
  }
  return false;
}

// A "use node" module may only export consts declared by a direct
// internalAction(...) call imported from the root _generated/server.
function nodeModuleViolations(checker, root, relative, sourceFile) {
  const generatedServer = path.resolve(root, CONVEX_DIR, "_generated/server");
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return [];
  const violations = [];
  for (const exported of checker.getExportsOfModule(moduleSymbol)) {
    const symbol = resolveAlias(checker, exported);
    if (!symbol || (symbol.flags & ts.SymbolFlags.Value) === 0) continue;
    const declaration = symbol.valueDeclaration;
    const callee =
      declaration &&
      ts.isVariableDeclaration(declaration) &&
      declaration.getSourceFile() === sourceFile &&
      (declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
      declaration.initializer &&
      ts.isCallExpression(declaration.initializer) &&
      ts.isIdentifier(declaration.initializer.expression)
        ? declaration.initializer.expression
        : undefined;
    const specifier = callee
      ? checker.getSymbolAtLocation(callee)?.declarations?.[0]
      : undefined;
    const importDeclaration = specifier?.parent?.parent?.parent;
    const ok =
      specifier !== undefined &&
      ts.isImportSpecifier(specifier) &&
      (specifier.propertyName ?? specifier.name).text === "internalAction" &&
      importDeclaration !== undefined &&
      ts.isImportDeclaration(importDeclaration) &&
      ts.isStringLiteral(importDeclaration.moduleSpecifier) &&
      path
        .resolve(
          path.dirname(sourceFile.fileName),
          importDeclaration.moduleSpecifier.text,
        )
        .replace(/\.js$/u, "") === generatedServer;
    if (!ok)
      violations.push(
        `${relative}: "use node" modules may only export consts built with internalAction from _generated/server; ${exported.name} is not`,
      );
  }
  return violations;
}

// Evaluates the modules once per deployment environment (AOHYS_ENV), since
// a module can choose its exports from deployment configuration.
function runtimeViolations(root, sources, adminExports, nodeModules) {
  const environments = [
    ...(readDomainVocabularies(root).find(({ name }) => name === "ENVIRONMENTS")
      ?.members ?? []),
  ];
  if (environments.length === 0)
    return ["packages/core/src/domain.ts: ENVIRONMENTS is missing"];
  const violations = new Set();
  for (const environment of environments)
    for (const violation of evaluatedViolations(
      root,
      sources,
      adminExports,
      nodeModules,
      environment,
    ))
      violations.add(`${violation} (AOHYS_ENV=${environment})`);
  return [...violations];
}

function evaluatedViolations(
  root,
  sources,
  adminExports,
  nodeModules,
  environment,
) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", RUNTIME_EXPORTS_SCRIPT, root, ...sources],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        GUARD_NODE_MODULES: JSON.stringify(
          nodeModules.map((relative) => path.join(root, relative)),
        ),
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        TMPDIR: process.env.TMPDIR ?? "",
        AOHYS_ENV: environment,
        ADMIN_EMAIL: EVALUATION_ADMIN_EMAIL,
      },
      maxBuffer: 16 * 1024 * 1024,
      timeout: EVALUATION_TIMEOUT_MS,
    },
  );
  if (result.status !== 0) {
    const lines = (result.stderr || result.error?.message || "")
      .trim()
      .split("\n");
    const reason =
      lines.find((line) => /\bguard: /u.test(line) && !/throw /u.test(line)) ??
      lines.slice(0, 3).join(" ");
    return [
      `${CONVEX_DIR}: could not evaluate Convex modules to read runtime exports: ${reason}`,
    ];
  }
  const violations = [];
  const { publicExports, httpRoutes, strayRefusals } = JSON.parse(
    result.stdout.trim().split("\n").at(-1),
  );
  if (strayRefusals?.length)
    violations.push(
      `${CONVEX_DIR}: evaluating the Convex modules attempted ${[...new Set(strayRefusals)].join(", ")} outside any function call; module scope and background work must not perform syscalls or network calls`,
    );
  const served = (httpRoutes ?? []).slice().sort();
  if (served.join("\n") !== RUNTIME_HTTP_ROUTES.join("\n"))
    violations.push(
      `${CONVEX_DIR}/http.ts: the evaluated router serves [${served.join(", ")}], expected exactly [${RUNTIME_HTTP_ROUTES.join(", ")}]`,
    );
  for (const [relative, entries] of Object.entries(publicExports))
    for (const entry of entries) {
      const { name } = entry;
      if (!adminExports.has(`${relative}#${name}`)) {
        violations.push(
          `${relative}: export ${name} is a public Convex function at runtime but not a direct adminQuery/adminMutation/adminAction call`,
        );
        continue;
      }
      for (const [caller, expected] of Object.entries(EXPECTED_REJECTIONS)) {
        const { rejection, touched } = entry[caller] ?? {};
        if (rejection !== expected || touched?.length)
          violations.push(
            `${relative}: export ${name} invoked by an ${caller} caller must be refused by requireAdmin with ${JSON.stringify(expected)} before any other syscall or network call; got ${rejection === null || rejection === undefined ? "a result" : JSON.stringify(rejection)}${touched?.length ? ` after ${touched.join(", ")}` : ""}`,
          );
      }
    }
  return violations;
}

export function publicFunctionGuardViolations(root) {
  const { sources, rejected } = convexFiles(root);
  const violations = rejected.map(
    (relative) =>
      `${relative}: Convex modules must be .ts so the authorization guard can check them`,
  );
  const program = createConvexProgram(root, sources);
  const checker = program.getTypeChecker();
  const adminExports = new Set();
  const nodeModules = [];
  for (const relative of sources) {
    const sourceFile = program.getSourceFile(path.join(root, relative));
    if (!sourceFile) {
      violations.push(`${relative}: not part of the Convex TypeScript program`);
      continue;
    }
    if (relative !== BUILDERS_FILE)
      violations.push(...rawBuilderViolations(relative, sourceFile));
    if (usesNodeRuntime(sourceFile)) {
      nodeModules.push(relative);
      violations.push(
        ...nodeModuleViolations(checker, root, relative, sourceFile),
      );
    }
    violations.push(
      ...exportViolations(checker, root, relative, sourceFile, adminExports),
    );
    violations.push(...httpViolations(checker, relative, sourceFile));
  }
  violations.push(...builderViolations(root));
  violations.push(
    ...runtimeViolations(
      root,
      sources.filter(
        (relative) =>
          relative !== APP_DEFINITION && !nodeModules.includes(relative),
      ),
      adminExports,
      nodeModules,
    ),
  );
  return violations;
}
