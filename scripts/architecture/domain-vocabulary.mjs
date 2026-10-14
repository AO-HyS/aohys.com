import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

// Guards the single domain vocabulary in packages/core/src/domain.ts:
// literal copies anywhere in the source, and symbol derivation for the Convex
// validators and the vocabulary fields of the Convex schema.

export const DOMAIN_VOCABULARY = "packages/core/src/domain.ts";
const CONVEX_VALIDATORS = "apps/backend/convex/lib/validators.ts";
const CONVEX_SCHEMA = "apps/backend/convex/schema.ts";
const EXEMPTION = "// domain-vocabulary-ok";

// Each exported Convex validator and the domain array it must wrap.
const VALIDATOR_VOCABULARIES = {
  localeValidator: "LOCALES",
  environmentValidator: "ENVIRONMENTS",
  releaseEnvironmentValidator: "RELEASE_ENVIRONMENTS",
  leadIntentValidator: "LEAD_INTENTS",
  leadStatusValidator: "LEAD_STATUSES",
  preferredContactPathValidator: "PREFERRED_CONTACT_PATHS",
  publicationScopeValidator: "PUBLICATION_SCOPES",
  publicationRequestStateValidator: "PUBLICATION_REQUEST_STATES",
  publicationAttemptStateValidator: "PUBLICATION_ATTEMPT_STATES",
  publicationWorkflowOutcomeValidator: "PUBLICATION_WORKFLOW_OUTCOMES",
  publicationProviderStatusValidator: "PUBLICATION_PROVIDER_STATUSES",
  retryablePublicationProviderStatusValidator:
    "RETRYABLE_PUBLICATION_PROVIDER_STATUSES",
  mediaStorageProviderValidator: "MEDIA_STORAGE_PROVIDERS",
  writableMediaStorageProviderValidator: "WRITABLE_MEDIA_STORAGE_PROVIDERS",
  mediaUsageValidator: "MEDIA_USAGES",
  mediaStatusValidator: "MEDIA_STATUSES",
  siteSettingKeyValidator: "SITE_SETTING_KEYS",
  siteSettingClassificationValidator: "SITE_SETTING_CLASSIFICATIONS",
  caseStudyStatusValidator: "CASE_STUDY_STATUSES",
  caseStudyEvidenceStatusValidator: "CASE_STUDY_EVIDENCE_STATUSES",
};

// Every schema field that holds a domain vocabulary, and the validator it must
// reference. A new vocabulary field is added here in the same change.
const SCHEMA_VOCABULARY_FIELDS = {
  "leads.preferredContactPath": "preferredContactPathValidator",
  "leads.intent": "leadIntentValidator",
  "leads.locale": "localeValidator",
  "leads.status": "leadStatusValidator",
  "mediaMetadata.storageProvider": "mediaStorageProviderValidator",
  "mediaMetadata.usage": "mediaUsageValidator",
  "mediaMetadata.status": "mediaStatusValidator",
  "mediaMetadata.locale": "localeValidator",
  "siteSettings.environment": "environmentValidator",
  "siteSettings.classification": "siteSettingClassificationValidator",
  "caseStudyMetadata.status": "caseStudyStatusValidator",
  "caseStudyMetadata.evidenceStatus": "caseStudyEvidenceStatusValidator",
  "projectDrafts.locale": "localeValidator",
  "resumeDrafts.locale": "localeValidator",
  "resumeVersions.locale": "localeValidator",
  "publicationRequests.scope": "publicationScopeValidator",
  "publicationRequests.locale": "localeValidator",
  "publicationRequests.targetEnvironment": "releaseEnvironmentValidator",
  "publicationRequests.state": "publicationRequestStateValidator",
  "publicationAttempts.state": "publicationAttemptStateValidator",
  "publicationAttempts.workflowOutcome": "publicationWorkflowOutcomeValidator",
  "publicationReceipts.targetEnvironment": "releaseEnvironmentValidator",
};

// Astro: the frontmatter plus every non-JSON <script> block.
function astroCode(source) {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(
      (match) => !/type=["']application\/(?:ld\+)?json["']/.test(match[1]),
    )
    .map((match) => match[2]);
  return [frontmatter, ...scripts].join("\n;\n");
}

function parseSource(source, extension) {
  const code = extension === ".astro" ? astroCode(source) : source;
  return ts.createSourceFile(
    `source${extension === ".astro" ? ".ts" : extension}`,
    code,
    ts.ScriptTarget.Latest,
    true,
    [".tsx", ".jsx"].includes(extension)
      ? ts.ScriptKind.TSX
      : [".js", ".mjs", ".cjs"].includes(extension)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS,
  );
}

function unwrapExpression(node) {
  while (
    node &&
    (ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node))
  ) {
    node = node.expression;
  }
  return node;
}

function importedNames(sourceFile, moduleSpecifier) {
  const named = new Map();
  const namespaces = new Set();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== moduleSpecifier
    ) {
      continue;
    }
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) {
      namespaces.add(bindings.name.text);
    } else if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        named.set(
          element.name.text,
          (element.propertyName ?? element.name).text,
        );
      }
    }
  }
  return { named, namespaces };
}

// Domain vocabularies declared as `export const NAME = [...] as const`.
export function readDomainVocabularies(root) {
  const filePath = path.join(root, DOMAIN_VOCABULARY);
  if (!existsSync(filePath)) return [];
  const sourceFile = parseSource(readFileSync(filePath, "utf8"), ".ts");
  const vocabularies = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const initializer = unwrapExpression(declaration.initializer);
      if (!initializer || !ts.isArrayLiteralExpression(initializer)) continue;
      const members = initializer.elements
        .filter(ts.isStringLiteral)
        .map((element) => element.text);
      if (members.length > 0) {
        vocabularies.push({
          name: declaration.name.getText(sourceFile),
          members: new Set(members),
        });
      }
    }
  }
  return vocabularies;
}

// Recognizes the Convex `v` object whether it is a named, aliased or
// namespace import of convex/values.
function validatorObjectMatcher(sourceFile) {
  const { named, namespaces } = importedNames(sourceFile, "convex/values");
  const validatorNames = new Set(
    [...named]
      .filter(([, imported]) => imported === "v")
      .map(([local]) => local),
  );
  const isValidatorObject = (node) =>
    (ts.isIdentifier(node) && validatorNames.has(node.text)) ||
    (ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      namespaces.has(node.expression.text) &&
      node.name.text === "v");
  return isValidatorObject;
}

// String literal groups from the syntax tree: union types (nested unions and
// parentheses flattened), string array literals, and `v.union(v.literal(...))`
// or `v.literal(...)` validators (nested validator unions flattened).
// Comments, template text and element access are never groups.
function literalGroups(sourceFile) {
  const isValidatorObject = validatorObjectMatcher(sourceFile);
  const isValidatorCall = (node, method) =>
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    isValidatorObject(node.expression.expression) &&
    node.expression.name.text === method;
  const literalArgument = (node) =>
    isValidatorCall(node, "literal") &&
    node.arguments.length === 1 &&
    ts.isStringLiteral(node.arguments[0])
      ? node.arguments[0].text
      : undefined;
  const validatorUnionMembers = (node) => {
    if (literalArgument(node) !== undefined) return [literalArgument(node)];
    if (!isValidatorCall(node, "union")) return undefined;
    const members = node.arguments.map(validatorUnionMembers);
    return members.every((member) => member !== undefined)
      ? members.flat()
      : undefined;
  };
  const unionConstituents = (type) => {
    while (ts.isParenthesizedTypeNode(type)) type = type.type;
    return ts.isUnionTypeNode(type)
      ? type.types.flatMap(unionConstituents)
      : [type];
  };
  const unionMembers = (type) => {
    while (ts.isParenthesizedTypeNode(type)) type = type.type;
    if (ts.isUnionTypeNode(type)) return type.types.flatMap(unionMembers);
    return ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)
      ? [type.literal.text]
      : [];
  };

  const groups = [];
  const visit = (node) => {
    if (ts.isUnionTypeNode(node)) {
      const members = unionMembers(node);
      if (members.length > 0) groups.push({ members, node, validator: false });
      for (const constituent of unionConstituents(node)) {
        if (!ts.isLiteralTypeNode(constituent)) visit(constituent);
      }
      return;
    }
    if (
      ts.isArrayLiteralExpression(node) &&
      node.elements.length > 0 &&
      node.elements.every(ts.isStringLiteral)
    ) {
      groups.push({
        members: node.elements.map((item) => item.text),
        node,
        validator: false,
      });
    } else if (isValidatorCall(node, "union")) {
      const members = validatorUnionMembers(node);
      if (members && members.length > 0) {
        groups.push({ members, node, validator: true });
        return;
      }
    } else if (literalArgument(node) !== undefined) {
      groups.push({ members: [literalArgument(node)], node, validator: true });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return groups;
}

// A `// domain-vocabulary-ok` comment trailing the group, or its enclosing
// property or statement (after an optional comma or semicolon), marks a
// different concept that shares values. The lookup stops at that boundary.
function isExempt(node, sourceFile) {
  const text = sourceFile.text;
  const hasExemption = (position) =>
    (ts.getTrailingCommentRanges(text, position) ?? []).some(
      (range) => text.slice(range.pos, range.end).trim() === EXEMPTION,
    );
  for (
    let current = node;
    current && !ts.isSourceFile(current);
    current = current.parent
  ) {
    let end = current.end;
    if (hasExemption(end)) return true;
    while (text[end] === " " || text[end] === "\t") end += 1;
    if ((text[end] === "," || text[end] === ";") && hasExemption(end + 1)) {
      return true;
    }
    if (
      ts.isStatement(current) ||
      ts.isPropertyAssignment(current) ||
      ts.isPropertySignature(current) ||
      ts.isShorthandPropertyAssignment(current)
    ) {
      break;
    }
  }
  return false;
}

// A literal group copies a vocabulary when most of its own members belong to
// it and it covers at least 60% of it, so stale copies (a value missing) and
// drifted copies (a value added) fail too. For one- and two-member
// vocabularies a group holding all of their members, or made only of their
// members, is a copy.
function copiedVocabulary(members, vocabulary) {
  const shared = [...members].filter((member) =>
    vocabulary.members.has(member),
  ).length;
  if (vocabulary.members.size <= 2) {
    return (
      shared === vocabulary.members.size ||
      (shared > 0 && shared === members.size)
    );
  }
  return (
    shared >= 2 &&
    shared * 2 > members.size &&
    shared >= Math.ceil(vocabulary.members.size * 0.6)
  );
}

export function literalCopyViolations(importer, source, vocabularies) {
  if (importer === DOMAIN_VOCABULARY) return [];
  const sourceFile = parseSource(source, path.extname(importer));
  const found = new Set();
  for (const group of literalGroups(sourceFile)) {
    if (
      (importer === CONVEX_SCHEMA || importer === CONVEX_VALIDATORS) &&
      group.validator
    ) {
      found.add("a string v.literal (derive it in convex/lib/validators.ts)");
      continue;
    }
    if (isExempt(group.node, sourceFile)) continue;
    const members = new Set(group.members);
    for (const vocabulary of vocabularies) {
      if (copiedVocabulary(members, vocabulary)) found.add(vocabulary.name);
    }
  }
  return [...found].sort();
}

// The literals helper must be exactly
// `return v.union(...values.map((value) => v.literal(value))) as …;`
// over its single parameter, so a derived validator keeps every member.
function literalsHelperIsCanonical(statement, isValidatorObject) {
  const parameter = statement.parameters[0];
  const body = statement.body?.statements ?? [];
  if (
    statement.parameters.length !== 1 ||
    !parameter ||
    !ts.isIdentifier(parameter.name) ||
    body.length !== 1 ||
    !ts.isReturnStatement(body[0])
  ) {
    return false;
  }
  const values = parameter.name.text;
  const union = unwrapExpression(body[0].expression);
  const isMember = (node, object, name) =>
    ts.isPropertyAccessExpression(node) &&
    object(node.expression) &&
    node.name.text === name;
  if (
    !union ||
    !ts.isCallExpression(union) ||
    !isMember(union.expression, isValidatorObject, "union") ||
    union.arguments.length !== 1 ||
    !ts.isSpreadElement(union.arguments[0])
  ) {
    return false;
  }
  const map = union.arguments[0].expression;
  if (
    !ts.isCallExpression(map) ||
    !isMember(
      map.expression,
      (node) => ts.isIdentifier(node) && node.text === values,
      "map",
    ) ||
    map.arguments.length !== 1 ||
    !ts.isArrowFunction(map.arguments[0])
  ) {
    return false;
  }
  const arrow = map.arguments[0];
  const item = arrow.parameters[0];
  const literal = unwrapExpression(arrow.body);
  return (
    arrow.parameters.length === 1 &&
    item &&
    ts.isIdentifier(item.name) &&
    literal &&
    ts.isCallExpression(literal) &&
    isMember(literal.expression, isValidatorObject, "literal") &&
    literal.arguments.length === 1 &&
    ts.isIdentifier(literal.arguments[0]) &&
    literal.arguments[0].text === item.name.text
  );
}

// Symbol derivation: every exported validator in convex/lib/validators.ts is
// `literals(<domain array>)`, and every inventoried schema field references
// its validator imported from ./lib/validators.js (optionally in v.optional).
export function derivationViolations(root) {
  const violations = [];
  const validatorsPath = path.join(root, CONVEX_VALIDATORS);
  const schemaPath = path.join(root, CONVEX_SCHEMA);
  if (!existsSync(validatorsPath) || !existsSync(schemaPath)) return violations;

  const validators = parseSource(readFileSync(validatorsPath, "utf8"), ".ts");
  const domainImports = importedNames(validators, "@aohys/core/domain").named;
  const derived = new Set();
  const isValidatorsValidatorObject = validatorObjectMatcher(validators);
  let literalsVerified = false;
  for (const statement of validators.statements) {
    const hasModifier = (kind) =>
      ts.canHaveModifiers(statement) &&
      (ts.getModifiers(statement) ?? []).some(
        (modifier) => modifier.kind === kind,
      );
    const exported =
      ts.isExportDeclaration(statement) ||
      ts.isExportAssignment(statement) ||
      hasModifier(ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    const literalsHelper =
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "literals" &&
      !hasModifier(ts.SyntaxKind.DefaultKeyword);
    if (literalsHelper) {
      if (literalsHelperIsCanonical(statement, isValidatorsValidatorObject)) {
        literalsVerified = true;
      } else {
        violations.push(
          `${CONVEX_VALIDATORS}: literals must be \`return v.union(...values.map((value) => v.literal(value))) as …\``,
        );
      }
      continue;
    }
    if (
      !ts.isVariableStatement(statement) ||
      (statement.declarationList.flags & ts.NodeFlags.Const) === 0
    ) {
      violations.push(
        `${CONVEX_VALIDATORS}: export validators only as \`export const name = literals(<domain array>)\``,
      );
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      const name = declaration.name.getText(validators);
      const initializer = unwrapExpression(declaration.initializer);
      const ok =
        initializer &&
        ts.isCallExpression(initializer) &&
        ts.isIdentifier(initializer.expression) &&
        initializer.expression.text === "literals" &&
        initializer.arguments.length === 1 &&
        ts.isIdentifier(initializer.arguments[0]) &&
        VALIDATOR_VOCABULARIES[name] !== undefined &&
        domainImports.has(initializer.arguments[0].text) &&
        domainImports.get(initializer.arguments[0].text) ===
          VALIDATOR_VOCABULARIES[name];
      if (ok) derived.add(name);
      else {
        violations.push(
          `${CONVEX_VALIDATORS}: ${name} must be literals(${VALIDATOR_VOCABULARIES[name] ?? "<add it to VALIDATOR_VOCABULARIES>"}) imported from @aohys/core/domain`,
        );
      }
    }
  }

  if (!literalsVerified) {
    violations.push(
      `${CONVEX_VALIDATORS}: the exported literals helper is missing or not canonical`,
    );
    derived.clear();
  }

  const schema = parseSource(readFileSync(schemaPath, "utf8"), ".ts");
  const isSchemaValidatorObject = validatorObjectMatcher(schema);
  const validatorImports = importedNames(schema, "./lib/validators.js").named;
  const seen = new Set();
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "defineTable" &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      let owner = node.parent;
      while (
        owner &&
        (ts.isPropertyAccessExpression(owner) || ts.isCallExpression(owner))
      ) {
        owner = owner.parent;
      }
      if (!owner || !ts.isPropertyAssignment(owner)) {
        ts.forEachChild(node, visit);
        return;
      }
      const table = owner.name.getText(schema);
      const fieldNames = new Set();
      for (const property of node.arguments[0].properties) {
        if (
          !ts.isPropertyAssignment(property) ||
          ts.isComputedPropertyName(property.name)
        ) {
          violations.push(
            `${CONVEX_SCHEMA}: ${table} must declare fields as plain \`name: validator\` properties (no spreads, shorthand or computed keys)`,
          );
          continue;
        }
        const fieldName =
          ts.isIdentifier(property.name) ||
          ts.isStringLiteral(property.name) ||
          ts.isNumericLiteral(property.name)
            ? property.name.text
            : property.name.getText(schema);
        if (fieldNames.has(fieldName)) {
          violations.push(
            `${CONVEX_SCHEMA}: ${table}.${fieldName} is declared twice`,
          );
        }
        fieldNames.add(fieldName);
        const field = `${table}.${fieldName}`;
        const expected = SCHEMA_VOCABULARY_FIELDS[field];
        if (!expected) continue;
        seen.add(field);
        let value = property.initializer;
        if (
          ts.isCallExpression(value) &&
          ts.isPropertyAccessExpression(value.expression) &&
          isSchemaValidatorObject(value.expression.expression) &&
          value.expression.name.text === "optional" &&
          value.arguments.length === 1
        ) {
          value = value.arguments[0];
        }
        const local = ts.isIdentifier(value) ? value.text : undefined;
        if (
          !local ||
          validatorImports.get(local) !== expected ||
          !derived.has(expected)
        ) {
          violations.push(
            `${CONVEX_SCHEMA}: ${field} must reference ${expected} from ./lib/validators.js`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(schema);
  for (const field of Object.keys(SCHEMA_VOCABULARY_FIELDS)) {
    if (!seen.has(field)) {
      violations.push(
        `${CONVEX_SCHEMA}: inventoried vocabulary field ${field} not found`,
      );
    }
  }
  return violations;
}
