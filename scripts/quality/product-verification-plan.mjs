#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";

import { validatePlan } from "./product-verification-lib.mjs";

const planArg = process.argv.find((arg) => arg.startsWith("--plan="));
if (!planArg)
  throw new Error(
    "Usage: pnpm verify:product:plan -- --plan=/path/to/execution-plan.json",
  );

const plan = JSON.parse(
  fs.readFileSync(planArg.slice("--plan=".length), "utf8"),
);
const result = validatePlan(plan);
if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, sha256: plan.sha256 }));
