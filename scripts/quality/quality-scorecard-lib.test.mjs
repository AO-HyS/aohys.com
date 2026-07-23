import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPathWithinRoot,
  parseGateMetrics,
  readOrchestrationMetadata,
  redactSensitiveText,
  runGatesSequentially,
  selectConfiguredGates,
  shouldRecoverLatestLock,
  shouldReplaceLatestReport,
  summarizeGateResults,
  validateScorecardConfig,
} from "./quality-scorecard-lib.mjs";

test("shouldRecoverLatestLock recovers dead owners and old malformed locks", () => {
  const liveOwner = () => true;
  const deadOwner = () => false;
  const validLock = JSON.stringify({ ownerPid: 42, token: "lock-token" });

  assert.equal(shouldRecoverLatestLock(validLock, 1, 60_000, liveOwner), false);
  assert.equal(shouldRecoverLatestLock(validLock, 1, 60_000, deadOwner), true);
  assert.equal(shouldRecoverLatestLock("", 59_999, 60_000, liveOwner), false);
  assert.equal(shouldRecoverLatestLock("", 60_000, 60_000, liveOwner), true);
});

test("readOrchestrationMetadata records only values supplied by the harness", () => {
  const metadata = readOrchestrationMetadata({
    QUALITY_AGENT_ROLE: "fast_implementer",
    QUALITY_ATTEMPT: "2",
    QUALITY_CACHED_INPUT_TOKENS: "1200",
    QUALITY_COST_USD: "0.031",
    QUALITY_HARNESS: "codex-desktop",
    QUALITY_MODEL: "gpt-example",
    QUALITY_ORCHESTRATION_RUN_ID: "agent-run-42",
    QUALITY_OUTPUT_TOKENS: "345",
    QUALITY_PARENT_RUN_ID: "parent-run-1",
    QUALITY_REASONING: "low",
    QUALITY_TASK_ID: "AOH-147",
  });

  assert.deepEqual(metadata, {
    taskId: "AOH-147",
    orchestrationRunId: "agent-run-42",
    parentRunId: "parent-run-1",
    harness: "codex-desktop",
    agentRole: "fast_implementer",
    model: "gpt-example",
    reasoning: "low",
    attempt: 2,
    tokenUsage: {
      cachedInput: 1200,
      output: 345,
    },
    costUsd: 0.031,
  });
  assert.equal(readOrchestrationMetadata({}), null);
});

test("readOrchestrationMetadata rejects malformed measured values", () => {
  assert.throws(
    () => readOrchestrationMetadata({ QUALITY_ATTEMPT: "0" }),
    /QUALITY_ATTEMPT must be a positive integer/,
  );
  assert.throws(
    () => readOrchestrationMetadata({ QUALITY_OUTPUT_TOKENS: "unknown" }),
    /QUALITY_OUTPUT_TOKENS must be a non-negative integer/,
  );
});

test("parseGateMetrics aggregates Impeccable findings by rule and file", () => {
  const metrics = parseGateMetrics(
    "impeccable-json",
    JSON.stringify([
      { antipattern: "gradient-text", severity: "warning", file: "a.css" },
      { antipattern: "gradient-text", severity: "warning", file: "b.css" },
      { antipattern: "layout-transition", severity: "error", file: "a.css" },
    ]),
  );

  assert.deepEqual(metrics, {
    findings: 3,
    files: 2,
    byRule: { "gradient-text": 2, "layout-transition": 1 },
    bySeverity: { error: 1, warning: 2 },
  });
});

test("validateScorecardConfig accepts a minimal comparable profile", () => {
  const config = validateScorecardConfig({
    schemaVersion: "1.0.0",
    repository: "aohys",
    profile: "core",
    gates: [
      {
        id: "lint",
        category: "static-analysis",
        command: "pnpm",
        args: ["lint"],
        enforcement: "block",
      },
    ],
  });

  assert.equal(config.gates[0].timeoutMs, 600_000);
  assert.equal(config.wallBudgetMs, null);
  assert.equal(config.budgetEnforcement, "observe");
});

test("summarizeGateResults separates observed findings from blocking failures", () => {
  const summary = summarizeGateResults([
    { status: "pass", enforcement: "block", durationMs: 10 },
    { status: "fail", enforcement: "observe", durationMs: 20 },
    { status: "fail", enforcement: "block", durationMs: 30 },
  ]);

  assert.deepEqual(summary, {
    outcome: "fail",
    passed: 1,
    failed: 2,
    skipped: 0,
    observedFailures: 1,
    blockingFailures: 1,
    durationMs: 60,
  });
});

test("runGatesSequentially preserves order and continues after a failure", async () => {
  const visited = [];
  const gates = [{ id: "lint" }, { id: "typecheck" }];

  const results = await runGatesSequentially(gates, async (gate) => {
    visited.push(gate.id);
    return {
      id: gate.id,
      status: gate.id === "lint" ? "fail" : "pass",
    };
  });

  assert.deepEqual(visited, ["lint", "typecheck"]);
  assert.deepEqual(
    results.map(({ status }) => status),
    ["fail", "pass"],
  );
});

test("selectConfiguredGates rejects unknown gate ids", () => {
  assert.throws(
    () =>
      selectConfiguredGates(
        [{ id: "lint" }, { id: "typecheck" }],
        ["lint", "typo"],
      ),
    /Unknown gate id: typo/,
  );
});

test("redactSensitiveText removes common credentials from captured logs", () => {
  const output = [
    "API_TOKEN=super-secret-value",
    "PASSWORD=correct horse battery staple",
    "PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nprivate-key-body\n-----END PRIVATE KEY-----",
    "Authorization: Bearer abc.def.ghi",
    "DATABASE_URL=postgres://database-user:database-password@db.example/app",
    "Set-Cookie: session=browser-secret; HttpOnly; Secure",
    "remote=https://user:password@example.com/repo.git",
    "github=ghp_abcdefghijklmnopqrstuvwxyz123456",
  ].join("\n");

  const redacted = redactSensitiveText(output);

  assert.doesNotMatch(
    redacted,
    /super-secret|correct horse|private-key-body|abc\.def|database-user|database-password|browser-secret|password|ghp_/,
  );
  assert.match(redacted, /API_TOKEN=\[REDACTED\]/);
  assert.match(redacted, /Authorization: Bearer \[REDACTED\]/);
  assert.match(redacted, /DATABASE_URL=\[REDACTED\]/);
  assert.match(redacted, /Set-Cookie: \[REDACTED\]/);
});

test("shouldReplaceLatestReport keeps the newest started full run", () => {
  const older = { startedAt: "2026-07-23T12:00:00.000Z" };
  const newer = { startedAt: "2026-07-23T12:00:01.000Z" };

  assert.equal(shouldReplaceLatestReport(older, newer), true);
  assert.equal(shouldReplaceLatestReport(newer, older), false);
  assert.equal(shouldReplaceLatestReport(null, older), true);
});

test("assertPathWithinRoot rejects output paths outside the allowed root", () => {
  assert.throws(
    () => assertPathWithinRoot("/repo", "/outside/report.json", "output"),
    /output must stay inside/,
  );
  assert.equal(
    assertPathWithinRoot("/repo", "/repo/output/report.json", "output"),
    "/repo/output/report.json",
  );
});
