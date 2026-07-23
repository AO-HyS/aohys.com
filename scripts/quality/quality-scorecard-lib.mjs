import path from "node:path";

const DEFAULT_TIMEOUT_MS = 600_000;
const VALID_ENFORCEMENT = new Set(["block", "observe"]);

export function assertPathWithinRoot(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new TypeError(`${label} must stay inside ${root}`);
  }
  return candidate;
}

export function shouldRecoverLatestLock(
  serializedLock,
  ageMs,
  staleAfterMs,
  ownerIsAlive,
) {
  try {
    const lock = JSON.parse(serializedLock);
    if (
      !Number.isInteger(lock?.ownerPid) ||
      lock.ownerPid <= 0 ||
      typeof lock.token !== "string" ||
      lock.token === ""
    ) {
      return ageMs >= staleAfterMs;
    }
    return !ownerIsAlive(lock.ownerPid);
  } catch {
    return ageMs >= staleAfterMs;
  }
}

export function redactSensitiveText(value) {
  if (typeof value !== "string" || value === "") return "";

  return value
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
      "[REDACTED PRIVATE KEY]",
    )
    .replace(
      /(\b(?:[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|ACCESS_KEY)[A-Z0-9_]*)(?:\s*[=:]\s*))([^\r\n]+)/gi,
      "$1[REDACTED]",
    )
    .replace(
      /(\bAuthorization\s*:\s*(?:Bearer|Basic)\s+)[^\s,;]+/gi,
      "$1[REDACTED]",
    )
    .replace(/(\b(?:Set-Cookie|Cookie)\s*:\s*)[^\r\n]+/gi, "$1[REDACTED]")
    .replace(
      /(\b[A-Z][A-Z0-9_]*(?:URL|URI)(?:\s*[=:]\s*))([^\s,;]+)/g,
      "$1[REDACTED]",
    )
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:)[^@\s/]+@/gi, "$1[REDACTED]@")
    .replace(
      /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,})\b/g,
      "[REDACTED]",
    );
}

export function readOrchestrationMetadata(environment) {
  const metadata = {};
  const stringFields = [
    ["QUALITY_TASK_ID", "taskId"],
    ["QUALITY_ORCHESTRATION_RUN_ID", "orchestrationRunId"],
    ["QUALITY_PARENT_RUN_ID", "parentRunId"],
    ["QUALITY_HARNESS", "harness"],
    ["QUALITY_AGENT_ROLE", "agentRole"],
    ["QUALITY_MODEL", "model"],
    ["QUALITY_REASONING", "reasoning"],
  ];

  for (const [environmentName, field] of stringFields) {
    const value = environment[environmentName]?.trim();
    if (value) metadata[field] = value;
  }

  const attempt = readNumericEnvironmentValue(environment, "QUALITY_ATTEMPT", {
    integer: true,
    minimum: 1,
    description: "a positive integer",
  });
  if (attempt !== null) metadata.attempt = attempt;

  const tokenUsage = {};
  const tokenFields = [
    ["QUALITY_INPUT_TOKENS", "input"],
    ["QUALITY_CACHED_INPUT_TOKENS", "cachedInput"],
    ["QUALITY_OUTPUT_TOKENS", "output"],
  ];
  for (const [environmentName, field] of tokenFields) {
    const value = readNumericEnvironmentValue(environment, environmentName, {
      integer: true,
      minimum: 0,
      description: "a non-negative integer",
    });
    if (value !== null) tokenUsage[field] = value;
  }
  if (Object.keys(tokenUsage).length > 0) metadata.tokenUsage = tokenUsage;

  const costUsd = readNumericEnvironmentValue(environment, "QUALITY_COST_USD", {
    integer: false,
    minimum: 0,
    description: "a non-negative number",
  });
  if (costUsd !== null) metadata.costUsd = costUsd;

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function readNumericEnvironmentValue(
  environment,
  name,
  { integer, minimum, description },
) {
  const rawValue = environment[name]?.trim();
  if (!rawValue) return null;

  const value = Number(rawValue);
  if (
    !Number.isFinite(value) ||
    value < minimum ||
    (integer && !Number.isInteger(value))
  ) {
    throw new TypeError(`${name} must be ${description}`);
  }
  return value;
}

export function parseGateMetrics(parser, stdout) {
  if (parser !== "impeccable-json") return null;
  try {
    const findings = JSON.parse(stdout.trim());
    if (!Array.isArray(findings)) {
      return { findings: null, parserError: true };
    }
    const byRule = {};
    const bySeverity = {};
    const files = new Set();
    for (const finding of findings) {
      byRule[finding.antipattern] = (byRule[finding.antipattern] ?? 0) + 1;
      bySeverity[finding.severity] = (bySeverity[finding.severity] ?? 0) + 1;
      if (finding.file) files.add(finding.file);
    }
    return { findings: findings.length, files: files.size, byRule, bySeverity };
  } catch {
    return { findings: null, parserError: true };
  }
}

function assertNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
}

export function validateScorecardConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("scorecard config must be an object");
  }

  assertNonEmptyString(input.schemaVersion, "schemaVersion");
  assertNonEmptyString(input.repository, "repository");
  assertNonEmptyString(input.profile, "profile");

  const budgetEnforcement = input.budgetEnforcement ?? "observe";
  if (!VALID_ENFORCEMENT.has(budgetEnforcement)) {
    throw new TypeError('budgetEnforcement must be "block" or "observe"');
  }

  const wallBudgetMs = input.wallBudgetMs ?? null;
  if (
    wallBudgetMs !== null &&
    (!Number.isInteger(wallBudgetMs) || wallBudgetMs <= 0)
  ) {
    throw new TypeError("wallBudgetMs must be a positive integer");
  }

  if (!Array.isArray(input.gates) || input.gates.length === 0) {
    throw new TypeError("gates must be a non-empty array");
  }

  const ids = new Set();
  const gates = input.gates.map((gate, index) => {
    if (!gate || typeof gate !== "object" || Array.isArray(gate)) {
      throw new TypeError(`gates[${index}] must be an object`);
    }

    assertNonEmptyString(gate.id, `gates[${index}].id`);
    assertNonEmptyString(gate.category, `gates[${index}].category`);
    assertNonEmptyString(gate.command, `gates[${index}].command`);

    if (ids.has(gate.id)) {
      throw new TypeError(`duplicate gate id: ${gate.id}`);
    }
    ids.add(gate.id);

    const enforcement = gate.enforcement ?? "block";
    if (!VALID_ENFORCEMENT.has(enforcement)) {
      throw new TypeError(
        `gates[${index}].enforcement must be "block" or "observe"`,
      );
    }

    if (
      gate.args !== undefined &&
      (!Array.isArray(gate.args) ||
        gate.args.some((argument) => typeof argument !== "string"))
    ) {
      throw new TypeError(`gates[${index}].args must be an array of strings`);
    }

    const timeoutMs = gate.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new TypeError(
        `gates[${index}].timeoutMs must be a positive integer`,
      );
    }

    if (
      gate.budgetMs !== undefined &&
      (!Number.isInteger(gate.budgetMs) || gate.budgetMs <= 0)
    ) {
      throw new TypeError(
        `gates[${index}].budgetMs must be a positive integer`,
      );
    }

    return {
      ...gate,
      args: gate.args ?? [],
      enforcement,
      timeoutMs,
      budgetMs: gate.budgetMs ?? null,
      parser: gate.parser ?? null,
    };
  });

  return { ...input, budgetEnforcement, wallBudgetMs, gates };
}

export function summarizeGateResults(results) {
  const summary = {
    outcome: "pass",
    passed: 0,
    failed: 0,
    skipped: 0,
    observedFailures: 0,
    blockingFailures: 0,
    durationMs: 0,
  };

  for (const result of results) {
    summary.durationMs += result.durationMs;
    if (result.status === "pass") {
      summary.passed += 1;
    } else if (result.status === "skip") {
      summary.skipped += 1;
    } else if (result.status === "fail") {
      summary.failed += 1;
      if (result.enforcement === "observe") {
        summary.observedFailures += 1;
      } else {
        summary.blockingFailures += 1;
      }
    } else {
      throw new TypeError(`unknown gate status: ${result.status}`);
    }
  }

  if (summary.blockingFailures > 0) {
    summary.outcome = "fail";
  }

  return summary;
}

export function selectConfiguredGates(gates, selectedIds) {
  if (!selectedIds) return gates;
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    throw new TypeError("At least one gate id is required");
  }

  const configuredIds = new Set(gates.map((gate) => gate.id));
  for (const id of selectedIds) {
    if (!configuredIds.has(id)) {
      throw new TypeError(`Unknown gate id: ${id}`);
    }
  }

  const selected = new Set(selectedIds);
  return gates.filter((gate) => selected.has(gate.id));
}

export function shouldReplaceLatestReport(existingReport, candidateReport) {
  const existingStartedAt = Date.parse(existingReport?.startedAt);
  const candidateStartedAt = Date.parse(candidateReport?.startedAt);
  if (!Number.isFinite(candidateStartedAt)) {
    throw new TypeError("candidate report startedAt must be an ISO date");
  }
  return (
    !Number.isFinite(existingStartedAt) ||
    candidateStartedAt >= existingStartedAt
  );
}

export async function runGatesSequentially(gates, runGate) {
  const results = [];
  for (const gate of gates) {
    results.push(await runGate(gate));
  }
  return results;
}
