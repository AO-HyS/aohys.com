import assert from "node:assert/strict";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

const outputPath = "output/quality-scorecard/timeout-contract-test.json";

test("the runner force-kills a gate that ignores SIGTERM", () => {
  const latestPath = "output/quality-scorecard/latest.json";
  const latestBefore = existsSync(latestPath)
    ? readFileSync(latestPath, "utf8")
    : null;
  const config = JSON.stringify({
    schemaVersion: "1.0.0",
    repository: "timeout-contract-test",
    profile: "test",
    gates: [
      {
        id: "resistant-child",
        category: "test",
        command: process.execPath,
        args: ["scripts/quality/fixtures/ignore-sigterm.mjs"],
        timeoutMs: 50,
      },
    ],
  });
  const configPath = "output/quality-scorecard/timeout-contract-config.json";
  const configWriter = spawnSync(process.execPath, [
    "-e",
    `require("node:fs").mkdirSync("output/quality-scorecard",{recursive:true});require("node:fs").writeFileSync(${JSON.stringify(configPath)},${JSON.stringify(config)})`,
  ]);
  assert.equal(configWriter.status, 0);

  const started = performance.now();
  const result = spawnSync(
    process.execPath,
    [
      "scripts/quality/run-quality-scorecard.mjs",
      "--config",
      configPath,
      "--gate",
      "resistant-child",
      "--output",
      outputPath,
    ],
    { encoding: "utf8", timeout: 3_000 },
  );
  const elapsedMs = performance.now() - started;
  const report = JSON.parse(readFileSync(outputPath, "utf8"));

  unlinkSync(configPath);
  unlinkSync(outputPath);
  assert.equal(result.status, 1);
  assert.equal(result.signal, null);
  assert.ok(elapsedMs < 2_000, `runner took ${elapsedMs}ms`);
  assert.equal(report.gates[0].timedOut, true);
  assert.equal(report.gates[0].status, "fail");
  assert.equal(
    existsSync(latestPath) ? readFileSync(latestPath, "utf8") : null,
    latestBefore,
  );
});
