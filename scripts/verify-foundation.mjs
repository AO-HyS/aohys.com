import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];

const workspacePackages = [
  ["apps/site", "@aohys/site"],
  ["apps/dashboard", "@aohys/dashboard"],
  ["apps/backend", "@aohys/backend"],
  ["packages/core", "@aohys/core"],
  ["packages/environment", "@aohys/environment"],
  ["packages/content-graph", "@aohys/content-graph"],
  ["packages/dashboard-ui", "@aohys/dashboard-ui"],
  ["packages/release-train", "@aohys/release-train"],
];

const requiredRootScripts = [
  "build",
  "lint",
  "prepare",
  "typecheck",
  "test",
  "verify",
  "verify:ci",
  "verify:foundation",
  "verify:precommit",
];

const requiredPackageScripts = ["build", "lint", "typecheck", "test"];

const requiredFiles = [
  ".env.example",
  ".gitignore",
  ".github/workflows/quality-gates.yml",
  ".husky/pre-commit",
  "LICENSE",
  "README.md",
  "docs/workspace.md",
  "docs/release-train.md",
  "docs/environment-contract.md",
  "docs/public-content-graph.md",
  "docs/dashboard-ui-kit.md",
  "apps/backend/convex/tsconfig.json",
];

function filePath(relativePath) {
  return path.join(root, relativePath);
}

function readText(relativePath) {
  try {
    return readFileSync(filePath(relativePath), "utf8");
  } catch {
    return null;
  }
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (!text) {
    failures.push(`${relativePath} is missing`);
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function includesAll(relativePath, expectedValues) {
  const text = readText(relativePath);
  if (!text) {
    failures.push(`${relativePath} is missing`);
    return;
  }

  for (const expectedValue of expectedValues) {
    check(
      text.includes(expectedValue),
      `${relativePath} must include ${expectedValue}`,
    );
  }
}

for (const requiredFile of requiredFiles) {
  check(existsSync(filePath(requiredFile)), `${requiredFile} is missing`);
}

const rootPackage = readJson("package.json");
if (rootPackage) {
  check(rootPackage.private === true, "package.json must be private");
  check(
    typeof rootPackage.packageManager === "string" &&
      rootPackage.packageManager.startsWith("pnpm@"),
    "package.json must pin pnpm through packageManager",
  );

  for (const scriptName of requiredRootScripts) {
    check(
      Boolean(rootPackage.scripts?.[scriptName]),
      `package.json must define script ${scriptName}`,
    );
  }

  check(
    Boolean(rootPackage.devDependencies?.husky),
    "package.json must include husky as a devDependency",
  );
}

includesAll(".github/workflows/quality-gates.yml", [
  "name: Quality Gates",
  "pull_request:",
  "branches:",
  "develop",
  "main",
  "pnpm install --frozen-lockfile",
  "pnpm run verify:foundation",
  "pnpm run lint",
  "pnpm run typecheck",
  "pnpm run test",
  "pnpm run build",
]);

includesAll(".husky/pre-commit", [
  "pnpm run verify:precommit",
]);

includesAll("pnpm-workspace.yaml", ["apps/*", "packages/*"]);

for (const [workspaceDir, expectedName] of workspacePackages) {
  const packageJsonPath = `${workspaceDir}/package.json`;
  const workspacePackage = readJson(packageJsonPath);

  if (!workspacePackage) {
    continue;
  }

  check(
    workspacePackage.name === expectedName,
    `${packageJsonPath} must be named ${expectedName}`,
  );
  check(workspacePackage.private === true, `${packageJsonPath} must be private`);

  for (const scriptName of requiredPackageScripts) {
    check(
      Boolean(workspacePackage.scripts?.[scriptName]),
      `${packageJsonPath} must define script ${scriptName}`,
    );
  }
}

includesAll("README.md", [
  "## Evaluation Guide",
  "## Quality Gates",
  "## Architecture Map",
  "## Public Source Boundary",
  "## Environment and Credentials",
  "## Provider Responsibilities",
  "## Dashboard Architecture",
  "## Privacy and Security",
  "## License and Asset Boundaries",
  "docs/aohys-prd.md",
  "docs/aohys-issue-breakdown.md",
  "docs/aohys-tdd-plan.md",
  "pnpm install",
  "pnpm verify",
  "pnpm run verify:precommit",
  "Pre-push stays manual",
  "docs/workspace.md",
  "docs/release-train.md",
  "docs/environment-contract.md",
  "docs/public-content-graph.md",
  "docs/dashboard-ui-kit.md",
  "docs/launch-hardening.md",
  "Convex",
  "Cloudflare",
  "PostHog",
  "Resend",
  "Better Auth",
  "Cloudflare Images",
  "code is public as a working example",
  "not a community open-source product",
  "does not include a contribution workflow",
  "reserved unless stated otherwise",
]);

includesAll("docs/workspace.md", [
  "apps/site",
  "apps/dashboard",
  "apps/backend",
  "packages/core",
  "packages/environment",
  "packages/content-graph",
  "packages/dashboard-ui",
  "packages/release-train",
]);

includesAll(".env.example", [
  "AOHYS_ENV=local",
  "PUBLIC_SITE_URL=http://localhost:4321",
  "PUBLIC_CONTACT_ENDPOINT=",
  "PUBLIC_POSTHOG_KEY=",
  "CONVEX_URL=",
  "RESEND_API_KEY=",
  "BETTER_AUTH_SECRET=",
  "ADMIN_EMAIL=alejandro.ortiz@aohys.com",
]);

includesAll("apps/backend/convex/tsconfig.json", [
  "../tsconfig.json",
  "../src/**/*.ts",
]);

includesAll(".gitignore", [
  "node_modules/",
  ".env.*",
  "!.env.example",
  ".agents/",
  ".codex/",
]);

if (failures.length > 0) {
  console.error("Foundation verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Foundation verification passed.");
