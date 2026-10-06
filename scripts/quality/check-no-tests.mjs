// This CI entry point binds the actual CLI to the exact dependency pin.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(root, "package.json"));
const pin = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
  .devDependencies["@aohys/development-system"];
const expected = /\/v(\d+\.\d+\.\d+)\/aohys-development-system-\1\.tgz$/.exec(
  pin,
)?.[1];
const installedMetadata =
  require.resolve("@aohys/development-system/package.json");
const installed = JSON.parse(readFileSync(installedMetadata, "utf8"));
if (!expected || installed.version !== expected) {
  throw new Error(
    `Pinned CI package ${expected ?? "unknown"} differs from installed ${installed.version}; run pnpm install --frozen-lockfile before verification`,
  );
}
execFileSync(
  process.execPath,
  [
    resolve(dirname(installedMetadata), "bin/development-system.mjs"),
    "check-no-tests",
    "--root",
    root,
  ],
  { cwd: root, stdio: "inherit" },
);
