#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const failures = [];

const skillPath = path.join(ROOT, ".agents/skills/verify-aohys/SKILL.md");
const featureMapPath = path.join(
  ROOT,
  "config/product-verification-feature-map.json",
);
const contractModules = [
  "scripts/quality/product-verification-lib.mjs",
  "scripts/quality/product-verification-plan.mjs",
  "scripts/quality/product-verification-changed.mjs",
  "scripts/quality/product-verification-doctor.mjs",
  "scripts/quality/check-product-verification.mjs",
];

const requiredSections = [
  "## Surface",
  "## Run",
  "## Doctor",
  "## Drive",
  "## Observe",
  "## Isolate",
  "## Feature Map",
  "## Truthfulness",
];

function fail(message) {
  failures.push(message);
}

if (!fs.existsSync(skillPath)) {
  fail("missing .agents/skills/verify-aohys/SKILL.md");
} else {
  const skill = fs.readFileSync(skillPath, "utf8");
  for (const section of requiredSections)
    if (!skill.includes(section)) fail(`skill is missing ${section}`);
  if (
    !skill.includes("$HOME/.development-system/private/verification/<run-id>")
  )
    fail("skill must use the private host evidence directory");
  if (
    !/Astra is the neutral Computer Use\s+executor/.test(skill) ||
    !/Astra owns/.test(skill)
  )
    fail("skill must separate neutral Astra execution from Astra judgment");
  if (!skill.includes("config/product-verification-feature-map.json"))
    fail("skill must reference the canonical product feature map");
  if (!/Computer Use/.test(skill))
    fail("skill must name Computer Use as the only UI driver");
  if (!/Production.*read-only|read-only.*[Pp]roduction/.test(skill))
    fail("skill must keep production read-only");
}

if (!fs.existsSync(featureMapPath)) {
  fail("missing config/product-verification-feature-map.json");
} else {
  let featureMap;
  try {
    featureMap = JSON.parse(fs.readFileSync(featureMapPath, "utf8"));
  } catch (error) {
    fail(`feature map is not valid JSON: ${error.message}`);
  }
  if (featureMap) {
    if (featureMap.schemaVersion !== 1)
      fail("feature map must use schemaVersion 1");
    if (featureMap.product !== "aohys.com")
      fail('feature map must declare product "aohys.com"');
    const surfaceIds = (featureMap.surfaces ?? []).map(
      (surface) => surface?.id,
    );
    if (
      JSON.stringify([...surfaceIds].sort()) !==
      JSON.stringify(["backend", "dashboard", "site"])
    )
      fail(
        "feature map must define exactly the site, dashboard, and backend surfaces",
      );
    const serialized = JSON.stringify(featureMap);
    if (/playwright|cypress|agent-browser/i.test(serialized))
      fail("feature map must never activate a browser harness");
    for (const journey of featureMap.journeys ?? []) {
      if (journey.surface === "dashboard") {
        if (
          !["authorized-session", "anonymous"].includes(journey.identityClass)
        )
          fail(`journey ${journey.id} must require an authorized session`);
        if (
          journey.identityClass === "anonymous" &&
          (journey.id !== "dashboard-auth-gate" ||
            journey.sideEffectMode !== "none" ||
            journey.status !== "draft")
        )
          fail(
            `journey ${journey.id} must be the observation-only auth-gate draft`,
          );
      }
      if (journey.status !== "draft")
        fail(
          `journey ${journey.id} must stay draft until a real run proves it`,
        );
      if (journey.proofRunId || journey.proofEnvironment || journey.proofRoute)
        fail(
          `journey ${journey.id} cannot claim a proof run before evidence exists`,
        );
    }
  }
}

for (const relativePath of contractModules)
  if (!fs.existsSync(path.join(ROOT, relativePath)))
    fail(`missing verification contract module: ${relativePath}`);

for (const packagePath of [
  "package.json",
  "apps/site/package.json",
  "apps/dashboard/package.json",
  "apps/backend/package.json",
]) {
  const absolutePath = path.join(ROOT, packagePath);
  if (!fs.existsSync(absolutePath)) continue;
  const pkg = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  for (const dependencyName of ["playwright", "@playwright/test", "cypress"]) {
    if (
      dependencyName in (pkg.dependencies ?? {}) ||
      dependencyName in (pkg.devDependencies ?? {})
    )
      fail(
        `${packagePath} retains a retired browser dependency: ${dependencyName}`,
      );
  }
  for (const [name, command] of Object.entries(pkg.scripts ?? {}))
    if (/playwright|cypress|agent-browser/i.test(`${name} ${command}`))
      fail(`${packagePath} exposes an active browser-harness script: ${name}`);
}

for (const configName of [
  "playwright.config.ts",
  "playwright.config.mjs",
  "cypress.config.ts",
  "cypress.config.mjs",
]) {
  if (fs.existsSync(path.join(ROOT, configName)))
    fail(`obsolete browser-harness config remains: ${configName}`);
}

if (failures.length > 0) {
  console.error("[product-verification] contract failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[product-verification] contract: OK");
