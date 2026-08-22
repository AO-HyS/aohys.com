import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const registryPath = path.join(
  root,
  "docs/architecture/compatibility-registry.json",
);
const redirectPath = path.join(root, "apps/site/public/_redirects");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));

const expectedInventory = [
  "dashboard-alias:/dashboard/case-studies",
  "dashboard-alias:/dashboard/media",
  "public-redirect:/blog",
  "public-redirect:/agents",
  "public-redirect:/pricing",
  "public-redirect:/es/blog",
  "public-redirect:/es/agentes",
  "public-redirect:/es/precios",
  "public-redirect:/blog/*",
  "public-redirect:/es/blog/*",
  "site-renderer:dashboard-sign-in",
  "site-renderer:dashboard-state",
  "site-renderer:dashboard-app-shell",
  "pages-entry:dashboard-renderer",
  "pages-entry:dashboard-fallback",
  "package-surface:dashboard-ui-empty",
];

const expectedRedirects = [
  ["/blog", "/case-studies/", 301],
  ["/agents", "/practice/", 301],
  ["/pricing", "/resume/", 301],
  ["/es/blog", "/es/casos/", 301],
  ["/es/agentes", "/es/practica/", 301],
  ["/es/precios", "/es/curriculum/", 301],
  ["/blog/*", "/case-studies/:splat/", 301],
  ["/es/blog/*", "/es/casos/:splat/", 301],
];

function entriesOfKind(kind) {
  return registry.entries.filter((entry) => entry.kind === kind);
}

test("compatibility registry contains the exact approved inventory", () => {
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.requirement, "RQ-04");
  assert.deepEqual(
    registry.entries.map((entry) => entry.id),
    expectedInventory,
  );
  assert.equal(
    new Set(registry.entries.map((entry) => entry.id)).size,
    expectedInventory.length,
  );
});

test("every compatibility entry carries ownership, RQ-04 evidence, and retirement", () => {
  for (const entry of registry.entries) {
    assert.equal(typeof entry.owner, "string", `${entry.id} owner`);
    assert.ok(entry.owner.length > 0, `${entry.id} owner must not be empty`);
    assert.equal(
      typeof entry.rq04Evidence,
      "string",
      `${entry.id} rq04Evidence`,
    );
    assert.match(entry.rq04Evidence, /^RQ-04:/, `${entry.id} must cite RQ-04`);
    assert.equal(
      typeof entry.retirementCondition,
      "string",
      `${entry.id} retirementCondition`,
    );
    assert.ok(
      entry.retirementCondition.length > 0,
      `${entry.id} retirementCondition must not be empty`,
    );
    assert.equal(typeof entry.source, "string", `${entry.id} source`);
    assert.ok(entry.source.length > 0, `${entry.id} source must not be empty`);
  }
});

test("dashboard aliases are the two approved legacy project surfaces", () => {
  assert.deepEqual(
    entriesOfKind("dashboard-alias").map((entry) => [
      entry.surface,
      entry.canonicalSurface,
      entry.source,
    ]),
    [
      [
        "/dashboard/case-studies",
        "/dashboard/projects",
        "apps/dashboard/src/navigation.ts",
      ],
      [
        "/dashboard/media",
        "/dashboard/projects",
        "apps/dashboard/src/navigation.ts",
      ],
    ],
  );
});

test("public redirect registry matches the eight active Pages redirects", () => {
  assert.deepEqual(
    entriesOfKind("public-redirect").map((entry) => [
      entry.surface,
      entry.target,
      entry.status,
    ]),
    expectedRedirects,
  );

  const redirects = readFileSync(redirectPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [source, target, status] = line.split(/\s+/);
      return [source, target, Number(status)];
    });

  assert.deepEqual(redirects, expectedRedirects);
});

test("renderer and empty-surface entries retain their declared source contract", () => {
  const rendererEntries = registry.entries.filter(
    (entry) =>
      entry.kind.endsWith("renderer") || entry.kind === "site-renderer",
  );
  assert.equal(rendererEntries.length, 5);
  assert.deepEqual(
    rendererEntries.map((entry) => [entry.id, entry.source, entry.renderer]),
    [
      [
        "site-renderer:dashboard-sign-in",
        "apps/site/src/dashboard-access-states.ts",
        "renderDashboardSignIn",
      ],
      [
        "site-renderer:dashboard-state",
        "apps/site/src/dashboard-access-states.ts",
        "renderDashboardState",
      ],
      [
        "site-renderer:dashboard-app-shell",
        "apps/site/src/dashboard-access.ts",
        "renderDashboardAppShell",
      ],
      [
        "pages-entry:dashboard-renderer",
        "functions/dashboard/[[path]].ts",
        "onRequest",
      ],
      [
        "pages-entry:dashboard-fallback",
        "functions/dashboard/[[path]].ts",
        "unavailableDashboardHtml",
      ],
    ],
  );
  assert.deepEqual(
    registry.entries.find(
      (entry) => entry.id === "package-surface:dashboard-ui-empty",
    ),
    {
      id: "package-surface:dashboard-ui-empty",
      kind: "package-surface",
      surface: "packages/dashboard-ui",
      source: "packages/dashboard-ui/tsconfig.json",
      owner: "packages/dashboard-ui",
      rq04Evidence:
        "RQ-04: the workspace retains packages/dashboard-ui as an intentionally empty compatibility surface with only its TypeScript boundary.",
      retirementCondition:
        "Retire when the package gains a first shared dashboard UI module or is removed from the workspace through an approved architecture change.",
    },
  );
});
