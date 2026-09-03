#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";

import { selectMappedFeatures } from "./product-verification-lib.mjs";

function csvOption(name) {
  const arg = process.argv.find((candidate) =>
    candidate.startsWith(`--${name}=`),
  );
  return arg ? arg.slice(`--${name}=`.length) : "";
}

function readFeatureMap(relativePath) {
  return JSON.parse(
    fs.readFileSync(new URL(relativePath, `file://${process.cwd()}/`), "utf8"),
  );
}

const changedArg = csvOption("changed");
const changedFiles = changedArg
  ? changedArg
      .split(",")
      .map((filePath) => filePath.trim())
      .filter(Boolean)
  : (process.env.CHANGED_FILES ?? "")
      .split(",")
      .map((filePath) => filePath.trim())
      .filter(Boolean);

const mapArg = process.argv.find((arg) => arg.startsWith("--map="));
const featureMap = mapArg
  ? JSON.parse(fs.readFileSync(mapArg.slice("--map=".length), "utf8"))
  : readFeatureMap("config/product-verification-feature-map.json");

console.log(
  JSON.stringify(
    {
      changedFiles,
      selected: selectMappedFeatures({ changedFiles, featureMap }),
    },
    null,
    2,
  ),
);
