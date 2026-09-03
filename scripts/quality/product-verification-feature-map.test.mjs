import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  selectMappedFeatures,
  validateFeatureMap,
} from "./product-verification-lib.mjs";

const mapPath = new URL(
  "../../config/product-verification-feature-map.json",
  import.meta.url,
);
const featureMap = JSON.parse(readFileSync(mapPath, "utf8"));

test("the shipped feature map passes the feature-map contract", () => {
  const result = validateFeatureMap(featureMap);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test("the map carries three to five journeys and never claims a proof run", () => {
  assert.ok(featureMap.journeys.length >= 3 && featureMap.journeys.length <= 5);
  for (const journey of featureMap.journeys) {
    assert.equal(journey.status, "draft");
    assert.equal(journey.proofRunId, undefined);
    assert.equal(journey.proofEnvironment, undefined);
    assert.equal(journey.proofRoute, undefined);
  }
});

test("dashboard journeys map an authorized session plus the anonymous auth gate", () => {
  for (const journey of featureMap.journeys) {
    if (journey.surface !== "dashboard") continue;
    assert.ok(
      ["authorized-session", "anonymous"].includes(journey.identityClass),
    );
    assert.match(journey.identity, /^(?:anonymous|host\.)/);
    assert.equal(journey.sideEffectMode, "none");
    assert.doesNotMatch(journey.behavior, /create|edit|delete|submit|publish/i);
    if (journey.identityClass === "anonymous") {
      assert.equal(journey.id, "dashboard-auth-gate");
      assert.equal(journey.status, "draft");
    }
  }
  assert.ok(
    featureMap.journeys.some(
      (journey) =>
        journey.surface === "dashboard" &&
        journey.identityClass === "authorized-session",
    ),
  );
});

test("the map keeps evidence private and references real aohys.com routes", () => {
  const serialized = JSON.stringify(featureMap);
  assert.match(serialized, /\/case-studies\/casa-roca/);
  assert.match(serialized, /\/es\/casos\/casa-roca/);
  assert.match(serialized, /\/dashboard\/leads/);
  assert.match(serialized, /apps\/dashboard\/src\/app\/router\.tsx/);
  assert.match(
    serialized,
    /\$HOME\/\.development-system\/private\/verification\/<run-id>\//,
  );
  assert.doesNotMatch(serialized, /password|Bearer |api[_-]?key|secret/i);
});

test("changed-file selection intersects mapped source globs only", () => {
  assert.deepEqual(
    selectMappedFeatures({
      changedFiles: ["apps/site/src/components/sunlit/SunlitCtaBand.astro"],
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
    selectMappedFeatures({
      changedFiles: ["apps/dashboard/src/app/router.tsx"],
      featureMap,
    }).map((journey) => journey.id),
    ["dashboard-auth-gate"],
  );
  assert.deepEqual(
    selectMappedFeatures({ changedFiles: ["docs/notes.md"], featureMap }),
    [],
  );
});
