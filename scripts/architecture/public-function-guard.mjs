import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

// Guards the Convex authorization contract: every public function is built
// with adminQuery/adminMutation/adminAction from convex/lib/functions.ts, whose
// closed form runs requireAdmin before the handler. Raw public builders, other
// export shapes and new HTTP routes fail architecture fitness.

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
const INTERNAL_BUILDERS = new Set([
  "internalQuery",
  "internalMutation",
  "internalAction",
]);

// Exports that are not Convex function registrations, by file and name.
const EXPORT_EXCEPTIONS = {
  "auth.ts": new Set([
    "authComponent",
    "createAuth",
    "requireAdmin",
    "createBetterAuthBaseUrl",
  ]),
  "http.ts": new Set(["default"]),
  "schema.ts": new Set(["default"]),
  "convex.config.ts": new Set(["default"]),
  "auth.config.ts": new Set(["default"]),
};

// The only public HTTP routes besides the Better Auth registration.
const HTTP_ROUTES = new Set(["POST /contact", "OPTIONS /contact"]);

function parse(filePath) {
  return ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function convexFiles(root) {
  const directory = path.join(root, CONVEX_DIR);
  if (!existsSync(directory)) return [];
  const files = [];
  const walk = (relative) => {
    for (const entry of readdirSync(path.join(root, relative), {
      withFileTypes: true,
    })) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== "_generated" && entry.name !== "node_modules")
          walk(child);
      } else if (/\.tsx?$/u.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        files.push(child);
      }
    }
  };
  walk(CONVEX_DIR);
  return files.sort();
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

// Every export of a top-level convex module is a registration through an
// admin builder or an internal builder, or a named exception.
function exportViolations(relative, sourceFile) {
  if (path.dirname(relative) !== CONVEX_DIR) return [];
  const fileName = path.basename(relative);
  const exceptions = EXPORT_EXCEPTIONS[fileName] ?? new Set();
  const admin = namedImports(sourceFile, (specifier) =>
    /^\.\/lib\/functions(?:\.js)?$/u.test(specifier),
  );
  const internal = namedImports(sourceFile, (specifier) =>
    /^\.\/_generated\/server(?:\.js)?$/u.test(specifier),
  );
  const violations = [];
  const registered = (initializer) =>
    initializer &&
    ts.isCallExpression(initializer) &&
    ts.isIdentifier(initializer.expression) &&
    (Object.hasOwn(
      ADMIN_BUILDERS,
      admin.get(initializer.expression.text) ?? "",
    ) ||
      INTERNAL_BUILDERS.has(internal.get(initializer.expression.text) ?? ""));

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      if (!exceptions.has("default"))
        violations.push(`${relative}: unexpected default export`);
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      violations.push(
        `${relative}: re-exports are not allowed in Convex modules; export each function with a builder`,
      );
      continue;
    }
    if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        const names = ts.isIdentifier(declaration.name)
          ? [declaration.name.text]
          : declaration.name.elements.map((element) =>
              element.name.getText(sourceFile),
            );
        if (names.every((name) => exceptions.has(name))) continue;
        if (
          (statement.declarationList.flags & ts.NodeFlags.Const) === 0 ||
          !ts.isIdentifier(declaration.name) ||
          !registered(declaration.initializer)
        ) {
          violations.push(
            `${relative}: ${names.join(", ")} must be built with adminQuery/adminMutation/adminAction or an internal builder`,
          );
        }
      }
      continue;
    }
    const name = statement.name?.text ?? "default";
    if (hasModifier(statement, ts.SyntaxKind.DefaultKeyword)) {
      if (!exceptions.has("default"))
        violations.push(`${relative}: unexpected default export`);
    } else if (!exceptions.has(name)) {
      violations.push(
        `${relative}: exported ${name} is not a Convex registration; move helpers out of the Convex module root`,
      );
    }
  }
  return violations;
}

// http.ts may only register the listed routes and the Better Auth routes.
function httpViolations(relative, sourceFile) {
  if (relative !== `${CONVEX_DIR}/http.ts`) return [];
  const violations = [];
  let authRoutes = 0;
  const routes = new Set();
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text;
      if (method === "registerRoutesLazy" || method === "registerRoutes")
        authRoutes += 1;
      if (method === "route") {
        const config = node.arguments[0];
        const property = (key) =>
          config && ts.isObjectLiteralExpression(config)
            ? config.properties.find(
                (item) =>
                  ts.isPropertyAssignment(item) &&
                  item.name.getText(sourceFile) === key,
              )
            : undefined;
        const routePath = property("path")?.initializer;
        const routeMethod = property("method")?.initializer;
        const key =
          routePath &&
          routeMethod &&
          ts.isStringLiteral(routePath) &&
          ts.isStringLiteral(routeMethod)
            ? `${routeMethod.text} ${routePath.text}`
            : undefined;
        if (!key) {
          violations.push(
            `${relative}: http routes must use literal path and method`,
          );
        } else {
          routes.add(key);
          if (!HTTP_ROUTES.has(key))
            violations.push(
              `${relative}: public HTTP route ${key} is not in the authorization contract`,
            );
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (authRoutes !== 1)
    violations.push(
      `${relative}: expected exactly one Better Auth route registration`,
    );
  for (const key of HTTP_ROUTES)
    if (!routes.has(key)) violations.push(`${relative}: missing route ${key}`);
  return violations;
}

export function publicFunctionGuardViolations(root) {
  const violations = [];
  for (const relative of convexFiles(root)) {
    const sourceFile = parse(path.join(root, relative));
    if (relative !== BUILDERS_FILE)
      violations.push(...rawBuilderViolations(relative, sourceFile));
    violations.push(...exportViolations(relative, sourceFile));
    violations.push(...httpViolations(relative, sourceFile));
  }
  violations.push(...builderViolations(root));
  return violations;
}
