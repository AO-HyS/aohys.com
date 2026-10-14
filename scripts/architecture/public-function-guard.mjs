import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

// Guards the Convex authorization contract: every public function is built
// with adminQuery/adminMutation/adminAction from convex/lib/functions.ts, whose
// closed form runs requireAdmin before the handler. The export check is
// semantic: the TypeScript checker classifies every export of every Convex
// module, so aliases, re-exports, nested modules and library-made functions
// are judged by what they are, not by how they are written. Because a type can
// be widened, the modules are also evaluated as a Convex push would, and every
// export that is public at runtime must be one of those admin registrations.

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
        if (entry.name !== "_generated" && entry.name !== "node_modules")
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
const RUNTIME_EXPORTS_SCRIPT = fileURLToPath(
  new URL("./convex-runtime-exports.mts", import.meta.url),
);

// Exports that are public functions when the modules are evaluated, by module.
function runtimeViolations(root, sources, adminExports) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", RUNTIME_EXPORTS_SCRIPT, root, ...sources],
    { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    const reason = (result.stderr || result.error?.message || "")
      .trim()
      .split("\n")
      .slice(0, 3)
      .join(" ");
    return [
      `${CONVEX_DIR}: could not evaluate Convex modules to read runtime exports: ${reason}`,
    ];
  }
  const violations = [];
  const { publicExports, httpRoutes } = JSON.parse(
    result.stdout.trim().split("\n").at(-1),
  );
  const served = (httpRoutes ?? []).slice().sort();
  if (served.join("\n") !== RUNTIME_HTTP_ROUTES.join("\n"))
    violations.push(
      `${CONVEX_DIR}/http.ts: the evaluated router serves [${served.join(", ")}], expected exactly [${RUNTIME_HTTP_ROUTES.join(", ")}]`,
    );
  for (const [relative, names] of Object.entries(publicExports))
    for (const name of names)
      if (!adminExports.has(`${relative}#${name}`))
        violations.push(
          `${relative}: export ${name} is a public Convex function at runtime but not a direct adminQuery/adminMutation/adminAction call`,
        );
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
  for (const relative of sources) {
    const sourceFile = program.getSourceFile(path.join(root, relative));
    if (!sourceFile) {
      violations.push(`${relative}: not part of the Convex TypeScript program`);
      continue;
    }
    if (relative !== BUILDERS_FILE)
      violations.push(...rawBuilderViolations(relative, sourceFile));
    violations.push(
      ...exportViolations(checker, root, relative, sourceFile, adminExports),
    );
    violations.push(...httpViolations(checker, relative, sourceFile));
  }
  violations.push(...builderViolations(root));
  violations.push(
    ...runtimeViolations(
      root,
      sources.filter((relative) => relative !== APP_DEFINITION),
      adminExports,
    ),
  );
  return violations;
}
