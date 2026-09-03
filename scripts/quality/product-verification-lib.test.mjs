import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  LOCAL_APP_ORIGINS,
  canonicalPlanWithoutHash,
  computePlanSha256,
  selectMappedFeatures,
  validateFeatureMap,
  validatePlan,
} from "./product-verification-lib.mjs";

function basePlan(overrides = {}) {
  return {
    version: "1",
    runId: "aohys-20260902-public-home",
    environment: "local",
    candidateSha: "a".repeat(40),
    surface: "site-public-home",
    allowedOrigins: ["http://localhost:4321"],
    allowedPathPatterns: ["/**"],
    allowedActions: ["navigate", "scroll", "capture-screenshot"],
    inputReferences: ["session.anonymous-visitor"],
    coverage: [
      {
        app: "site",
        path: "/",
        role: "anonymous",
        identityClass: "anonymous",
        identityRef: "session.anonymous-visitor",
        stepId: "open-home",
      },
    ],
    rubricSha256: "b".repeat(64),
    steps: [
      {
        id: "open-home",
        action: "navigate",
        target: "http://localhost:4321/",
        inputRef: "session.anonymous-visitor",
      },
      { id: "capture-home", action: "capture-screenshot" },
    ],
    sideEffectMode: "none",
    evidencePath:
      "$HOME/.development-system/private/verification/aohys-20260902-public-home/site-public-home/",
    sha256: "",
    ...overrides,
  };
}

function baseFeatureMap(overrides = {}) {
  return {
    schemaVersion: 1,
    product: "aohys.com",
    surfaces: [
      {
        id: "site",
        app: "apps/site",
        localOrigin: "http://localhost:4321",
        scope: "public marketing site",
      },
      {
        id: "dashboard",
        app: "apps/dashboard",
        localOrigin: "http://127.0.0.1:5180",
        scope: "private operations workspace",
      },
      {
        id: "backend",
        app: "apps/backend",
        scope: "Convex; no browser surface",
      },
    ],
    journeys: [
      {
        id: "site-public-home",
        surface: "site",
        launch: "http://localhost:4321/",
        identity: "anonymous",
        identityClass: "anonymous",
        behavior: "The public home renders without authentication.",
        routes: ["/"],
        preconditions: ["The site app is ready."],
        steps: ["Navigate to /.", "Capture the initial viewport."],
        expectedResults: ["The home renders without a runtime error."],
        beforeProbe: "GET / and record status.",
        afterProbe: "Repeat the same GET and assert it is unchanged.",
        cleanup: "none",
        evidence:
          "$HOME/.development-system/private/verification/<run-id>/site-public-home/",
        sideEffectMode: "none",
        status: "draft",
        sourceGlobs: ["apps/site/src/pages"],
      },
      {
        id: "dashboard-overview",
        surface: "dashboard",
        launch: "http://127.0.0.1:5180/dashboard/",
        identity: "host.dashboard-operator-session",
        identityClass: "authorized-session",
        behavior: "An authorized operator observes the readiness checklist.",
        routes: ["/dashboard/"],
        preconditions: ["An authorized session exists."],
        steps: ["Navigate to /dashboard/.", "Observe the checklist."],
        expectedResults: ["Overview renders without a runtime error."],
        beforeProbe: "Record the checklist state.",
        afterProbe: "Repeat and assert it is unchanged.",
        cleanup: "none",
        evidence:
          "$HOME/.development-system/private/verification/<run-id>/dashboard-overview/",
        sideEffectMode: "none",
        status: "draft",
        sourceGlobs: [
          "apps/dashboard/src/app/dashboard-shell.tsx",
          "apps/dashboard/src/navigation.ts",
        ],
      },
      {
        id: "dashboard-leads",
        surface: "dashboard",
        launch: "http://127.0.0.1:5180/dashboard/leads",
        identity: "host.dashboard-operator-session",
        identityClass: "authorized-session",
        behavior: "An authorized operator observes contact requests.",
        routes: ["/dashboard/leads"],
        preconditions: ["An authorized session exists."],
        steps: ["Navigate to /dashboard/leads.", "Observe the list."],
        expectedResults: ["Leads renders without a runtime error."],
        beforeProbe: "Record the list state.",
        afterProbe: "Repeat and assert it is unchanged.",
        cleanup: "none",
        evidence:
          "$HOME/.development-system/private/verification/<run-id>/dashboard-leads/",
        sideEffectMode: "none",
        status: "draft",
        sourceGlobs: ["apps/dashboard/src/features/leads"],
      },
    ],
    ...overrides,
  };
}

test("a valid observation-only plan passes with a stable canonical hash", () => {
  const plan = basePlan({ sha256: computePlanSha256(basePlan()) });
  const result = validatePlan(plan);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.expectedHash, computePlanSha256(plan));
});

test("canonical serialization is independent of property order", () => {
  const plan = basePlan({ sha256: computePlanSha256(basePlan()) });
  const reordered = Object.fromEntries(Object.entries(plan).reverse());
  assert.equal(computePlanSha256(reordered), computePlanSha256(plan));
  assert.equal(validatePlan(reordered).ok, true);
});

test("plans never authorize writes in production", () => {
  const result = validatePlan(
    basePlan({
      environment: "production",
      allowedOrigins: ["https://aohys.com"],
      sideEffectMode: "authorized-writes",
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("production")));
});

test("production plans permit observation-only actions only", () => {
  const result = validatePlan(
    basePlan({
      environment: "production",
      allowedOrigins: ["https://aohys.com"],
      allowedActions: ["navigate", "click"],
      coverage: [
        {
          app: "site",
          path: "/",
          role: "anonymous",
          identityClass: "anonymous",
          identityRef: "session.anonymous-visitor",
          stepId: "open-home",
        },
      ],
      steps: [
        {
          id: "open-home",
          action: "navigate",
          target: "https://aohys.com/",
          inputRef: "session.anonymous-visitor",
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((error) => error.includes("observation-only actions")),
  );
});

test("observation-only plans cannot declare write authorization", () => {
  const result = validatePlan(
    basePlan({
      fixtureNamespace: "fixture.run-scoped",
      authorizationReceiptRef: "host.authorization.receipt",
      beforeProbeRef: "host.probe.before",
      afterProbeRef: "host.probe.after",
      cleanupRef: "host.cleanup.run",
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 3);
});

test("authorized writes require a declared authorization receipt", () => {
  const result = validatePlan(
    basePlan({
      environment: "preview",
      allowedOrigins: ["https://pr-42-aohys-com.aohys-com.pages.dev"],
      sideEffectMode: "authorized-writes",
      fixtureNamespace: "fixture.run-scoped",
      beforeProbeRef: "host.probe.before",
      afterProbeRef: "host.probe.after",
      cleanupRef: "host.cleanup.run",
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.every((error) => !error.includes("production")));
  assert.ok(
    result.errors.some((error) => error.includes("authorizationReceiptRef")),
  );
});

test("a valid authorized-writes preview plan passes end to end", () => {
  const draft = basePlan({
    environment: "preview",
    allowedOrigins: ["https://pr-42-aohys-com.aohys-com.pages.dev"],
    allowedActions: ["navigate", "type", "capture-screenshot"],
    sideEffectMode: "authorized-writes",
    fixtureNamespace: "fixture.run-scoped",
    authorizationReceiptRef: "host.authorization.receipt",
    beforeProbeRef: "host.probe.before",
    afterProbeRef: "host.probe.after",
    cleanupRef: "host.cleanup.run",
    inputReferences: [
      "session.anonymous-visitor",
      "fixture.contact-form-entry",
      "host.probe.before",
      "host.probe.after",
      "host.cleanup.run",
    ],
    coverage: [
      {
        app: "site",
        path: "/",
        role: "anonymous",
        identityClass: "anonymous",
        identityRef: "session.anonymous-visitor",
        stepId: "open-home",
      },
    ],
    steps: [
      {
        id: "open-home",
        action: "navigate",
        target: "https://pr-42-aohys-com.aohys-com.pages.dev/",
        inputRef: "session.anonymous-visitor",
      },
      {
        id: "submit-contact",
        action: "type",
        target: "textarea[name=message]",
        inputRef: "fixture.contact-form-entry",
      },
      { id: "capture-home", action: "capture-screenshot" },
    ],
  });
  const plan = { ...draft, sha256: computePlanSha256(draft) };
  const result = validatePlan(plan);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.equal(result.expectedHash, plan.sha256);
});

test("write-capable actions outside authorized-writes fail closed", () => {
  const result = validatePlan(
    basePlan({
      allowedActions: ["navigate", "click"],
      steps: [
        {
          id: "open-home",
          action: "navigate",
          target: "http://localhost:4321/",
          inputRef: "session.anonymous-visitor",
        },
        { id: "try-click", action: "click", target: "button" },
      ],
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("observation-only")));
});

test("navigation is confined to allowed origins and paths", () => {
  const result = validatePlan(
    basePlan({
      allowedOrigins: ["http://127.0.0.1:5180"],
      steps: [
        {
          id: "open-home",
          action: "navigate",
          target: "http://localhost:4321/",
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("outside allowed origin/path"),
    ),
  );
});

test("coverage entries must navigate their mapped route with their declared identity", () => {
  const result = validatePlan(
    basePlan({
      coverage: [
        {
          app: "site",
          path: "/es/",
          role: "anonymous",
          identityClass: "anonymous",
          identityRef: "session.anonymous-visitor",
          stepId: "capture-home",
        },
      ],
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((error) =>
      error.includes("does not navigate the mapped route"),
    ),
  );
});

test("dashboard coverage maps an anonymous auth gate and requires authorized sessions", () => {
  const plan = basePlan({ sha256: computePlanSha256(basePlan()) });
  const mutated = structuredClone(plan);
  mutated.coverage[0].app = "dashboard";
  mutated.coverage[0].identityClass = "anonymous";
  mutated.sha256 = computePlanSha256(mutated);
  const anonymousGate = validatePlan(mutated);
  assert.equal(anonymousGate.ok, true);
  assert.deepEqual(anonymousGate.errors, []);

  mutated.sideEffectMode = "authorized-writes";
  const anonymousWrite = validatePlan(mutated);
  assert.equal(anonymousWrite.ok, false);
  assert.ok(
    anonymousWrite.errors.some((error) =>
      error.includes("observation-only auth gate"),
    ),
  );

  const authorized = structuredClone(plan);
  authorized.coverage[0].app = "dashboard";
  authorized.coverage[0].identityClass = "authorized-session";
  authorized.coverage[0].identityRef = "host.dashboard-operator-session";
  authorized.inputReferences = ["host.dashboard-operator-session"];
  authorized.steps[0].inputRef = "host.dashboard-operator-session";
  authorized.sha256 = computePlanSha256(authorized);
  const authorizedRead = validatePlan(authorized);
  assert.equal(authorizedRead.ok, true);
});

test("plans reject local origins outside the declared app allowlist", () => {
  const result = validatePlan(
    basePlan({ allowedOrigins: ["http://localhost:9999"] }),
  );
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((error) => error.includes("declared app origin")),
  );
});

test("plans reject unversioned or production preview origins", () => {
  for (const origin of [
    "https://aohys-com.pages.dev",
    "https://aohys.com",
    "http://pr-42-aohys-com.aohys-com.pages.dev",
  ]) {
    const result = validatePlan(
      basePlan({ environment: "preview", allowedOrigins: [origin] }),
    );
    assert.equal(result.ok, false, origin);
    assert.ok(
      result.errors.some((error) =>
        error.includes("versioned Cloudflare Pages"),
      ),
      origin,
    );
  }
});

test("evidence must stay inside the private host directory for the run", () => {
  for (const evidencePath of [
    "./evidence/leaked/",
    "$HOME/.development-system/private/verification/other-run/site-public-home/",
    "$HOME/.development-system/private/verification/run with spaces/",
  ]) {
    const result = validatePlan(basePlan({ evidencePath }));
    assert.equal(result.ok, false, evidencePath);
    assert.ok(
      result.errors.some((error) => error.includes("evidencePath")),
      evidencePath,
    );
  }
});

test("plans bind the private rubric by hash only", () => {
  const plan = basePlan({ sha256: computePlanSha256(basePlan()) });
  const result = validatePlan(plan);
  assert.equal(result.ok, true);
  assert.doesNotMatch(
    canonicalPlanWithoutHash(plan),
    /rubricContent|acceptance-rubric\.json/,
  );
});

test("input references stay opaque and declared", () => {
  const result = validatePlan(
    basePlan({
      inputReferences: ["customer@row-1", " undeclared.ref "],
      sha256: "",
    }),
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 2);
});

test("every local origin is a declared loopback app origin", () => {
  assert.deepEqual(LOCAL_APP_ORIGINS.site, ["http://localhost:4321"]);
  assert.deepEqual(LOCAL_APP_ORIGINS.dashboard, ["http://127.0.0.1:5180"]);
});

test("the shipped feature map passes and maps three to five honest journeys", () => {
  const map = JSON.parse(
    readFileSync(
      new URL(
        "../../config/product-verification-feature-map.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const result = validateFeatureMap(map);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
  assert.ok(map.journeys.length >= 3 && map.journeys.length <= 5);
  for (const journey of map.journeys)
    if (journey.surface === "dashboard") {
      assert.ok(
        ["authorized-session", "anonymous"].includes(journey.identityClass),
      );
      if (journey.identityClass === "anonymous") {
        assert.equal(journey.id, "dashboard-auth-gate");
        assert.equal(journey.sideEffectMode, "none");
      }
      assert.equal(journey.status, "draft");
      assert.equal(journey.proofRunId, undefined);
    }
  assert.ok(
    map.journeys.some(
      (journey) =>
        journey.surface === "dashboard" &&
        journey.identityClass === "authorized-session",
    ),
  );
});

test("changed-file selection intersects mapped source globs only", () => {
  const featureMap = baseFeatureMap();
  assert.deepEqual(
    selectMappedFeatures({
      changedFiles: ["apps/site/src/pages/index.astro"],
      featureMap,
    }).map((journey) => journey.id),
    ["site-public-home"],
  );
  assert.deepEqual(
    selectMappedFeatures({
      changedFiles: ["apps/dashboard/src/features/leads/leads-screen.tsx"],
      featureMap,
    }).map((journey) => journey.id),
    ["dashboard-leads"],
  );
  assert.deepEqual(
    selectMappedFeatures({ changedFiles: ["docs/notes.md"], featureMap }),
    [],
  );
});
