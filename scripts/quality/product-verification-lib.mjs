import crypto from "node:crypto";

export const OBSERVATION_ONLY_ACTIONS = new Set([
  "navigate",
  "activate-link",
  "clear-input",
  "scroll",
  "wait",
  "capture-screenshot",
]);

const WRITE_CAPABLE_ACTIONS = new Set([
  "click",
  "type",
  "select",
  "submit-form",
]);

const ALL_ACTIONS = new Set([
  ...OBSERVATION_ONLY_ACTIONS,
  ...WRITE_CAPABLE_ACTIONS,
]);

const PLAN_KEYS = new Set([
  "version",
  "runId",
  "environment",
  "candidateSha",
  "surface",
  "allowedOrigins",
  "allowedPathPatterns",
  "allowedActions",
  "inputReferences",
  "fixtureNamespace",
  "authorizationReceiptRef",
  "beforeProbeRef",
  "afterProbeRef",
  "cleanupRef",
  "coverage",
  "rubricSha256",
  "steps",
  "sideEffectMode",
  "evidencePath",
  "sha256",
]);

const STEP_KEYS = new Set([
  "id",
  "action",
  "target",
  "expectedPath",
  "inputRef",
]);

const COVERAGE_KEYS = new Set([
  "app",
  "path",
  "role",
  "identityClass",
  "identityRef",
  "stepId",
]);

const ENVIRONMENTS = new Set(["local", "preview", "production"]);

export const LOCAL_APP_ORIGINS = {
  site: ["http://localhost:4321"],
  dashboard: ["http://127.0.0.1:5180"],
};

export const PRODUCTION_ORIGINS = [
  "https://aohys.com",
  "https://www.aohys.com",
];

const PAGES_DEV_SUFFIX = ".aohys-com.pages.dev";

const REF_PATTERN =
  /^(?:fixture|host|session|vault)\.[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const EVIDENCE_PATTERN =
  /^\$HOME\/\.development-system\/private\/verification\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9._/-]+)?$/u;
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SURFACE_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;
const ROLE_PATTERN = /^[a-z][a-z0-9-]*$/u;
const HEX_64_PATTERN = /^[0-9a-f]{64}$/u;

function trimmed(value) {
  return typeof value === "string" ? value.trim() : value;
}

function trimmedList(value) {
  return Array.isArray(value)
    ? value.map((entry) => (typeof entry === "string" ? entry.trim() : entry))
    : [];
}

function trimmedSteps(steps) {
  return (Array.isArray(steps) ? steps : []).map((step) => {
    const normalized = {
      id: trimmed(step?.id),
      action: trimmed(step?.action),
    };
    if (typeof step?.target === "string" && step.target.trim())
      normalized.target = step.target.trim();
    if (typeof step?.expectedPath === "string" && step.expectedPath.trim())
      normalized.expectedPath = step.expectedPath.trim();
    if (typeof step?.inputRef === "string" && step.inputRef.trim())
      normalized.inputRef = step.inputRef.trim();
    return normalized;
  });
}

function trimmedCoverage(coverage) {
  return (Array.isArray(coverage) ? coverage : []).map((entry) => ({
    app: trimmed(entry?.app),
    path: trimmed(entry?.path),
    role: trimmed(entry?.role),
    identityClass: trimmed(entry?.identityClass),
    identityRef: trimmed(entry?.identityRef),
    stepId: trimmed(entry?.stepId),
  }));
}

export function canonicalPlanWithoutHash(plan) {
  const normalized = {
    version: trimmed(plan.version),
    runId: trimmed(plan.runId),
    environment: trimmed(plan.environment),
    candidateSha: trimmed(plan.candidateSha),
    surface: trimmed(plan.surface),
    allowedOrigins: trimmedList(plan.allowedOrigins),
    allowedPathPatterns: trimmedList(plan.allowedPathPatterns),
    allowedActions: trimmedList(plan.allowedActions),
    inputReferences: trimmedList(plan.inputReferences),
    fixtureNamespace: trimmed(plan.fixtureNamespace),
    authorizationReceiptRef: trimmed(plan.authorizationReceiptRef),
    beforeProbeRef: trimmed(plan.beforeProbeRef),
    afterProbeRef: trimmed(plan.afterProbeRef),
    cleanupRef: trimmed(plan.cleanupRef),
    coverage: trimmedCoverage(plan.coverage),
    rubricSha256: trimmed(plan.rubricSha256),
    steps: trimmedSteps(plan.steps),
    sideEffectMode: plan.sideEffectMode,
    evidencePath: trimmed(plan.evidencePath),
  };
  return JSON.stringify(normalized);
}

export function computePlanSha256(plan) {
  return crypto
    .createHash("sha256")
    .update(canonicalPlanWithoutHash(plan ?? {}))
    .digest("hex");
}

function isVersionedPagesOrigin(origin) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(PAGES_DEV_SUFFIX) &&
      url.hostname !== `aohys-com${PAGES_DEV_SUFFIX}`
    );
  } catch {
    return false;
  }
}

function navigationAllowed(target, allowedOrigins, allowedPathPatterns) {
  const rawPath = target.split("?")[0];
  if (
    target.startsWith("//") ||
    rawPath.includes("\\") ||
    /%(?:2e|2f|5c)/iu.test(rawPath) ||
    allowedOrigins.length === 0 ||
    allowedPathPatterns.length === 0
  )
    return false;
  try {
    const url = new URL(target, `${allowedOrigins[0]}/`);
    if (
      !allowedOrigins.includes(url.origin) ||
      url.username ||
      url.password ||
      url.hash
    )
      return false;
    const escaped = allowedPathPatterns
      .map((pattern) =>
        pattern
          .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
          .replaceAll("**", "\0")
          .replaceAll("*", "[^/]*")
          .replaceAll("\0", ".*"),
      )
      .join("|");
    return new RegExp(`^(?:${escaped})$`, "u").test(url.pathname);
  } catch {
    return false;
  }
}

function routeTemplateMatches(template, target, allowedOrigins) {
  try {
    const url = new URL(target, `${allowedOrigins[0]}/`);
    const observed = `${url.pathname}${url.search}`;
    const escaped = template
      .replace(/[.+?^${}()|[\]\\]/gu, "\\$&")
      .replace(/\*\*/gu, ".*")
      .replace(/\*/gu, "[^/]*");
    return new RegExp(`^${escaped}$`, "u").test(observed);
  } catch {
    return false;
  }
}

export function validatePlan(plan) {
  const errors = [];
  if (!plan || typeof plan !== "object" || Array.isArray(plan))
    return { ok: false, errors: ["plan must be an object"], expectedHash: "" };

  for (const key of Object.keys(plan))
    if (!PLAN_KEYS.has(key)) errors.push(`unknown plan property: ${key}`);

  const version = trimmed(plan.version);
  if (version !== "1") errors.push('version must be "1"');

  const runId = typeof plan.runId === "string" ? plan.runId.trim() : "";
  if (!RUN_ID_PATTERN.test(runId))
    errors.push("runId must be a safe identifier");

  const environment =
    typeof plan.environment === "string" ? plan.environment.trim() : "";
  if (!ENVIRONMENTS.has(environment))
    errors.push("environment must be local, preview, or production");

  const candidateSha =
    typeof plan.candidateSha === "string" ? plan.candidateSha.trim() : "";
  if (!SHA_PATTERN.test(candidateSha))
    errors.push("candidateSha must be a full commit SHA");

  const surface = typeof plan.surface === "string" ? plan.surface.trim() : "";
  if (!SURFACE_PATTERN.test(surface))
    errors.push("surface must be a kebab-case identifier");

  const origins = trimmedList(plan.allowedOrigins);
  const paths = trimmedList(plan.allowedPathPatterns);
  const allowed = trimmedList(plan.allowedActions);
  const refs = trimmedList(plan.inputReferences);

  if (origins.length === 0)
    errors.push("allowedOrigins requires an array of origins");
  if (paths.length === 0)
    errors.push("allowedPathPatterns requires an array of path patterns");
  if (allowed.length === 0)
    errors.push("allowedActions requires an action allowlist");
  if (!Array.isArray(plan.inputReferences) || refs.length === 0)
    errors.push("inputReferences must declare opaque references");
  for (const ref of refs)
    if (!REF_PATTERN.test(ref))
      errors.push(`inputReferences must use opaque references: ${ref}`);

  if (!Array.isArray(plan.coverage) || plan.coverage.length === 0)
    errors.push("coverage must be non-empty");

  if (!HEX_64_PATTERN.test(trimmed(plan.rubricSha256) ?? ""))
    errors.push("rubricSha256 must bind the private rubric before execution");

  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.origin !== origin || url.username || url.password)
        errors.push(`invalid origin: ${origin}`);
      if (environment === "local") {
        const localOrigins = Object.values(LOCAL_APP_ORIGINS).flat();
        if (!localOrigins.includes(origin))
          errors.push(`local origin is not a declared app origin: ${origin}`);
      } else if (environment === "preview") {
        if (!isVersionedPagesOrigin(origin))
          errors.push(
            `preview origin is not a versioned Cloudflare Pages origin: ${origin}`,
          );
      } else if (!PRODUCTION_ORIGINS.includes(origin)) {
        errors.push(`production origin is not canonical: ${origin}`);
      }
    } catch {
      errors.push(`invalid origin: ${origin}`);
    }
  }

  for (const pattern of paths)
    if (typeof pattern !== "string" || !pattern.startsWith("/"))
      errors.push(`invalid path pattern: ${pattern}`);

  const sideEffectMode = plan?.sideEffectMode;

  for (const action of allowed)
    if (!ALL_ACTIONS.has(action)) errors.push(`invalid action: ${action}`);

  if (
    plan?.sideEffectMode === "none" &&
    allowed.some((action) => WRITE_CAPABLE_ACTIONS.has(action))
  )
    errors.push("sideEffectMode none permits observation-only actions only");

  if (!["none", "authorized-writes"].includes(sideEffectMode))
    errors.push("sideEffectMode must be none or authorized-writes");
  if (environment === "production" && sideEffectMode !== "none")
    errors.push("production plans are read-only and cannot authorize writes");
  if (
    environment === "production" &&
    allowed.some((action) => !OBSERVATION_ONLY_ACTIONS.has(action))
  )
    errors.push("production plans permit observation-only actions only");

  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  if (steps.length === 0) errors.push("steps must be non-empty");
  const ids = [];
  for (const step of steps) {
    if (!step || typeof step !== "object" || Array.isArray(step)) {
      errors.push("every step must be an object");
      continue;
    }
    for (const key of Object.keys(step))
      if (!STEP_KEYS.has(key)) errors.push(`unknown step property: ${key}`);
    const stepId = typeof step.id === "string" ? step.id.trim() : "";
    ids.push(stepId);
    if (!stepId) errors.push("every step needs an id");
    const action = typeof step.action === "string" ? step.action.trim() : "";
    const target = typeof step.target === "string" ? step.target.trim() : "";
    const expectedPath =
      typeof step.expectedPath === "string" ? step.expectedPath.trim() : "";
    const inputRef =
      typeof step.inputRef === "string" ? step.inputRef.trim() : "";
    if (!ALL_ACTIONS.has(action))
      errors.push(`step has disallowed action: ${step.action}`);
    if (action && !allowed.includes(action))
      errors.push(`step action is not declared in allowedActions: ${action}`);
    if (
      step.inputRef !== undefined &&
      (!inputRef || !REF_PATTERN.test(inputRef))
    )
      errors.push(`step has invalid inputRef: ${step.inputRef}`);
    if (inputRef && !refs.includes(inputRef))
      errors.push(`step has undeclared inputRef: ${inputRef}`);
    if (action === "navigate") {
      if (!target) errors.push("navigate requires a target");
      else if (!navigationAllowed(target, origins, paths))
        errors.push(
          `navigate target is outside allowed origin/path: ${target}`,
        );
    }
    if (
      [
        "click",
        "type",
        "select",
        "submit-form",
        "activate-link",
        "clear-input",
      ].includes(action) &&
      !target
    )
      errors.push(`${action} requires a target`);
    if (["type", "select"].includes(action) && !inputRef)
      errors.push(`${action} requires an inputRef`);
    if (
      action === "activate-link" &&
      (!expectedPath || !navigationAllowed(expectedPath, origins, paths))
    )
      errors.push("activate-link requires an allowed expectedPath");
  }
  if (new Set(ids).size !== ids.length)
    errors.push("steps requires unique ids");

  const coverageStepIds = [];
  const coverageIdentityRefs = [];
  for (const entry of plan.coverage ?? []) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push("every coverage entry must be an object");
      continue;
    }
    for (const key of Object.keys(entry))
      if (!COVERAGE_KEYS.has(key))
        errors.push(`unknown coverage property: ${key}`);
    const app = typeof entry.app === "string" ? entry.app.trim() : "";
    if (!["site", "dashboard"].includes(app))
      errors.push(`invalid coverage app: ${entry.app}`);
    const entryPath = typeof entry.path === "string" ? entry.path.trim() : "";
    if (!entryPath.startsWith("/") || entryPath.includes(".."))
      errors.push(`invalid coverage path: ${entry.path}`);
    const role = typeof entry.role === "string" ? entry.role.trim() : "";
    if (!ROLE_PATTERN.test(role))
      errors.push(`invalid coverage role: ${entry.role}`);
    const identityClass =
      typeof entry.identityClass === "string" ? entry.identityClass.trim() : "";
    if (!["anonymous", "authorized-session"].includes(identityClass))
      errors.push(`invalid coverage identityClass: ${entry.identityClass}`);
    if (
      app === "dashboard" &&
      identityClass === "anonymous" &&
      plan.sideEffectMode !== "none"
    )
      errors.push(
        `anonymous dashboard coverage must be an observation-only auth gate: ${entry.identityRef}`,
      );
    if (
      app === "dashboard" &&
      !["anonymous", "authorized-session"].includes(identityClass)
    )
      errors.push(
        `dashboard coverage requires an authorized session: ${entry.identityRef}`,
      );
    const identityRef =
      typeof entry.identityRef === "string" ? entry.identityRef.trim() : "";
    if (!REF_PATTERN.test(identityRef) || !refs.includes(identityRef))
      errors.push(
        `coverage identityRef must be declared: ${entry.identityRef}`,
      );
    if (typeof entry.stepId !== "string" || !entry.stepId.trim())
      errors.push("coverage stepId is required");
    coverageStepIds.push(entry?.stepId);
    coverageIdentityRefs.push(entry?.identityRef);
  }
  if (new Set(coverageStepIds).size !== coverageStepIds.length)
    errors.push("each coverage entry requires its own navigation step");
  if (new Set(coverageIdentityRefs).size !== coverageIdentityRefs.length)
    errors.push("each coverage entry requires its own identityRef");

  for (const entry of plan.coverage ?? []) {
    const step = steps.find((candidate) => candidate?.id === entry?.stepId);
    if (
      step &&
      (step.action !== "navigate" ||
        step.inputRef !== entry.identityRef ||
        !routeTemplateMatches(entry.path, step.target ?? "", origins))
    )
      errors.push(
        `coverage step does not navigate the mapped route with its declared identity: ${entry.stepId}`,
      );
  }

  const fixtureNamespace =
    typeof plan.fixtureNamespace === "string"
      ? plan.fixtureNamespace.trim()
      : "";
  const authorizationReceiptRef =
    typeof plan.authorizationReceiptRef === "string"
      ? plan.authorizationReceiptRef.trim()
      : "";
  const lifecycleRefs = ["beforeProbeRef", "afterProbeRef", "cleanupRef"].map(
    (key) => [key, typeof plan[key] === "string" ? plan[key].trim() : ""],
  );

  if (sideEffectMode === "authorized-writes") {
    if (environment === "production")
      errors.push("authorized writes require a non-production environment");
    if (!fixtureNamespace || !REF_PATTERN.test(fixtureNamespace))
      errors.push("authorized writes require a declared fixtureNamespace");
    if (!authorizationReceiptRef || !REF_PATTERN.test(authorizationReceiptRef))
      errors.push(
        "authorized writes require a declared authorizationReceiptRef",
      );
    for (const [key, value] of lifecycleRefs)
      if (!value || !REF_PATTERN.test(value) || !refs.includes(value))
        errors.push(`${key} must be a declared opaque reference`);
  } else if (sideEffectMode === "none") {
    if (fixtureNamespace)
      errors.push("observation-only plans cannot declare a fixtureNamespace");
    if (authorizationReceiptRef)
      errors.push(
        "observation-only plans cannot declare an authorizationReceiptRef",
      );
    for (const [key, value] of lifecycleRefs)
      if (value) errors.push(`observation-only plans cannot declare a ${key}`);
  }

  const evidencePath =
    typeof plan?.evidencePath === "string" ? plan.evidencePath.trim() : "";
  if (
    !EVIDENCE_PATTERN.test(evidencePath) ||
    !evidencePath.startsWith(
      `$HOME/.development-system/private/verification/${runId}/`,
    )
  )
    errors.push("invalid evidencePath");

  const expectedHash = computePlanSha256(plan);
  if (trimmed(plan.sha256) !== expectedHash)
    errors.push("sha256 does not match canonical plan");

  return { ok: errors.length === 0, errors, expectedHash };
}

const FEATURE_MAP_SURFACE_IDS = ["site", "dashboard", "backend"];
const BROWSER_SURFACE_IDS = new Set(["site", "dashboard"]);
const JOURNEY_KEYS = new Set([
  "id",
  "surface",
  "launch",
  "identity",
  "identityClass",
  "behavior",
  "routes",
  "preconditions",
  "steps",
  "expectedResults",
  "beforeProbe",
  "afterProbe",
  "cleanup",
  "evidence",
  "sideEffectMode",
  "status",
  "sourceGlobs",
  "proofRunId",
  "proofEnvironment",
  "proofRoute",
]);
const EVIDENCE_PREFIX = "$HOME/.development-system/private/verification/";

export function validateFeatureMap(map) {
  const errors = [];
  if (!map || typeof map !== "object" || Array.isArray(map))
    return { ok: false, errors: ["feature map must be an object"] };

  if (map.schemaVersion !== 1)
    errors.push("feature map must use schemaVersion 1");
  if (map.product !== "aohys.com")
    errors.push('feature map must declare product "aohys.com"');

  if (
    !Array.isArray(map.surfaces) ||
    JSON.stringify(map.surfaces.map((surface) => surface?.id).sort()) !==
      JSON.stringify([...FEATURE_MAP_SURFACE_IDS].sort())
  )
    errors.push(
      "feature map must define exactly the site, dashboard, and backend surfaces",
    );
  for (const surface of map.surfaces ?? []) {
    if (surface.id === "backend" && surface.localOrigin)
      errors.push("the backend surface has no browser origin");
    if (BROWSER_SURFACE_IDS.has(surface.id)) {
      if (
        !/^http:\/\/(localhost|127\.0\.0\.1):\d{4,5}\/?$/u.test(
          surface.localOrigin ?? "",
        )
      )
        errors.push(`surface ${surface.id} requires a local loopback origin`);
    }
  }

  if (
    !Array.isArray(map.journeys) ||
    map.journeys.length < 3 ||
    map.journeys.length > 5
  )
    errors.push("feature map must map between three and five journeys");

  const journeyIds = [];
  for (const journey of map.journeys ?? []) {
    if (!journey || typeof journey !== "object" || Array.isArray(journey)) {
      errors.push("every journey must be an object");
      continue;
    }
    for (const key of Object.keys(journey))
      if (!JOURNEY_KEYS.has(key))
        errors.push(`unknown journey property: ${key}`);
    journeyIds.push(journey.id);
    for (const key of [
      "id",
      "surface",
      "launch",
      "identity",
      "identityClass",
      "behavior",
      "evidence",
      "sideEffectMode",
      "status",
    ])
      if (typeof journey[key] !== "string" || !journey[key].trim())
        errors.push(`journey requires ${key}`);
    for (const key of ["routes", "preconditions", "steps", "expectedResults"])
      if (!Array.isArray(journey[key]) || journey[key].length === 0)
        errors.push(`journey ${journey.id} requires a non-empty ${key}`);
    for (const key of ["sourceGlobs"])
      if (!Array.isArray(journey[key]) || journey[key].length === 0)
        errors.push(`journey ${journey.id} requires a non-empty ${key}`);
    for (const key of ["beforeProbe", "afterProbe", "cleanup"])
      if (typeof journey[key] !== "string" || !journey[key].trim())
        if (!Array.isArray(journey[key]) || journey[key].length === 0)
          errors.push(`journey ${journey.id} requires ${key}`);
    if (
      typeof journey.evidence !== "string" ||
      !journey.evidence.startsWith(EVIDENCE_PREFIX) ||
      !journey.evidence.includes("<run-id>")
    )
      errors.push(
        `journey ${journey.id} evidence must stay under the private host directory`,
      );
    if (!BROWSER_SURFACE_IDS.has(journey.surface))
      errors.push(`journey ${journey.id} must map a browser surface`);
    if (
      journey.surface === "dashboard" &&
      !["anonymous", "authorized-session"].includes(journey.identityClass)
    )
      errors.push(
        `dashboard journey ${journey.id} requires an authorized or anonymous gate session`,
      );
    if (
      journey.surface === "dashboard" &&
      journey.identityClass === "anonymous" &&
      (journey.sideEffectMode !== "none" || journey.status !== "draft")
    )
      errors.push(
        `anonymous dashboard journeys must stay observation-only drafts: ${journey.id}`,
      );
    if (!["none", "authorized-writes"].includes(journey.sideEffectMode))
      errors.push(`journey ${journey.id} has an invalid sideEffectMode`);
    if (!["draft", "proven"].includes(journey.status))
      errors.push(`journey ${journey.id} has an invalid status`);
    if (journey.status === "proven") {
      for (const key of ["proofRunId", "proofEnvironment", "proofRoute"])
        if (typeof journey[key] !== "string" || !journey[key].trim())
          errors.push(`proven journey ${journey.id} requires ${key}`);
    } else if (
      journey.proofRunId ||
      journey.proofEnvironment ||
      journey.proofRoute
    ) {
      errors.push(
        `draft journey ${journey.id} cannot claim a proof run before evidence exists`,
      );
    }
    if (
      journey.sideEffectMode === "authorized-writes" &&
      journey.surface === "dashboard" &&
      journey.status !== "proven"
    )
      errors.push(
        `write journeys remain draft until an authorized run proves them: ${journey.id}`,
      );
  }
  if (new Set(journeyIds).size !== journeyIds.length)
    errors.push("journey ids must be unique");
  if (
    !(map.journeys ?? []).some(
      (journey) =>
        journey?.surface === "dashboard" &&
        journey.identityClass === "authorized-session",
    )
  )
    errors.push(
      "protected dashboard surfaces require an authorized-session journey",
    );

  const serialized = JSON.stringify(map);
  if (
    /(?:api[_-]?key|secret|password|bearer\s|authorization:)/iu.test(serialized)
  )
    errors.push("feature map must never contain credentials");

  return { ok: errors.length === 0, errors };
}

function matchesSourcePrefix(filePath, globs) {
  return globs.some(
    (glob) => filePath === glob || filePath.startsWith(`${glob}/`),
  );
}

export function selectMappedFeatures({ changedFiles, featureMap }) {
  const files = [...new Set(changedFiles ?? [])].sort();
  return (featureMap?.journeys ?? []).filter((journey) =>
    files.some((filePath) =>
      matchesSourcePrefix(filePath, journey.sourceGlobs ?? []),
    ),
  );
}
