import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const canaries = [
  ["packages/core/tsconfig.json", "packages/core/package.json"],
  ["packages/environment/tsconfig.json", "packages/environment/package.json"],
  [
    "packages/content-graph/tsconfig.json",
    "packages/content-graph/package.json",
  ],
  ["apps/backend/tsconfig.json", "apps/backend/package.json"],
  ["apps/dashboard/tsconfig.json", "apps/dashboard/package.json"],
  ["apps/site/tsconfig.json", "apps/site/package.json"],
  [
    "packages/release-train/tsconfig.json",
    "packages/release-train/package.json",
  ],
];

test("every IM-07 package keeps both strict canaries enabled", () => {
  for (const [configPath, packagePath] of canaries) {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    assert.equal(
      config.compilerOptions?.exactOptionalPropertyTypes,
      true,
      `${configPath} exactOptionalPropertyTypes`,
    );
    assert.equal(
      config.compilerOptions?.noUncheckedIndexedAccess,
      true,
      `${configPath} noUncheckedIndexedAccess`,
    );
    assert.match(
      packageJson.devDependencies?.typescript ?? "",
      /^\^?6\./,
      `${packagePath} TypeScript 6`,
    );
  }
});
