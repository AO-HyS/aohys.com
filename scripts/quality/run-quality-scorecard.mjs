#!/usr/bin/env node

import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdir,
  open,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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

const root = process.cwd();
const args = process.argv.slice(2);
const FORCE_KILL_GRACE_MS = 250;
const LATEST_LOCK_TIMEOUT_MS = 5_000;
const LATEST_LOCK_STALE_MS = 60_000;

function option(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new TypeError(`${name} requires a value`);
  }
  return value;
}

function git(...gitArgs) {
  try {
    return execFileSync("git", gitArgs, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function appendTail(current, chunk, limit = 1_000_000) {
  const next = current + chunk;
  return next.length > limit ? next.slice(-limit) : next;
}

function ownerIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function recoverAbandonedLatestLock(lockPath) {
  try {
    const [serializedLock, lockStats] = await Promise.all([
      readFile(lockPath, "utf8"),
      stat(lockPath),
    ]);
    const ageMs =
      performance.timeOrigin + performance.now() - lockStats.mtimeMs;
    if (
      !shouldRecoverLatestLock(
        serializedLock,
        ageMs,
        LATEST_LOCK_STALE_MS,
        ownerIsAlive,
      )
    ) {
      return false;
    }
    if ((await readFile(lockPath, "utf8")) !== serializedLock) return false;
    await unlink(lockPath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    throw error;
  }
}

async function acquireLatestLock(lockPath) {
  const deadline = performance.now() + LATEST_LOCK_TIMEOUT_MS;
  while (true) {
    let handle;
    try {
      handle = await open(lockPath, "wx");
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if (await recoverAbandonedLatestLock(lockPath)) continue;
      if (performance.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
      continue;
    }

    const serializedLock = JSON.stringify({
      ownerPid: process.pid,
      token: randomUUID(),
    });
    try {
      await handle.writeFile(serializedLock);
      return { handle, serializedLock };
    } catch (error) {
      await handle.close().catch(() => undefined);
      await unlink(lockPath).catch(() => undefined);
      throw error;
    }
  }
}

async function publishLatestReport(report, latestPath) {
  const lockPath = `${latestPath}.lock`;
  const temporaryPath = `${latestPath}.${report.runId}.tmp`;
  const lock = await acquireLatestLock(lockPath);
  try {
    let existingReport = null;
    try {
      existingReport = JSON.parse(await readFile(latestPath, "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT" && !(error instanceof SyntaxError))
        throw error;
    }

    if (!shouldReplaceLatestReport(existingReport, report)) return;
    await writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`);
    await rename(temporaryPath, latestPath);
  } finally {
    await lock.handle.close();
    await unlink(temporaryPath).catch(() => undefined);
    const currentLock = await readFile(lockPath, "utf8").catch(() => null);
    if (currentLock === lock.serializedLock) {
      await unlink(lockPath).catch(() => undefined);
    }
  }
}

async function executeGate(gate) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  let stdout = "";
  let stderr = "";
  let timedOut = false;

  process.stdout.write(`\n[quality-scorecard] ${gate.id}\n`);
  const exitCode = await new Promise((resolve) => {
    let forceKillTimer;
    const child = spawn(gate.command, gate.args, {
      cwd: root,
      env: process.env,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => {
      stdout = appendTail(stdout, chunk.toString());
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendTail(stderr, chunk.toString());
    });
    child.on("error", (error) => {
      stderr = appendTail(stderr, error.stack ?? error.message);
      resolve(127);
    });
    child.on("close", (code) => resolve(code ?? 1));

    const terminate = (signal) => {
      if (!child.pid) return;
      try {
        process.kill(
          process.platform === "win32" ? child.pid : -child.pid,
          signal,
        );
      } catch {
        child.kill(signal);
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      terminate("SIGTERM");
      forceKillTimer = setTimeout(
        () => terminate("SIGKILL"),
        FORCE_KILL_GRACE_MS,
      );
    }, gate.timeoutMs);
    child.on("close", () => {
      clearTimeout(timer);
      clearTimeout(forceKillTimer);
    });
  });

  const durationMs = Math.round(performance.now() - start);
  const status = exitCode === 0 && !timedOut ? "pass" : "fail";
  const budgetStatus =
    gate.budgetMs === null
      ? "unbudgeted"
      : durationMs <= gate.budgetMs
        ? "within"
        : "exceeded";

  process.stdout.write(
    `[quality-scorecard] ${gate.id}: ${status} (${(durationMs / 1000).toFixed(2)}s)\n`,
  );

  return {
    id: gate.id,
    category: gate.category,
    enforcement: gate.enforcement,
    command: [gate.command, ...gate.args],
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs,
    attempts: 1,
    runnerRetries: 0,
    timeoutMs: gate.timeoutMs,
    timedOut,
    exitCode,
    status,
    budgetMs: gate.budgetMs,
    budgetStatus,
    metrics: parseGateMetrics(gate.parser, stdout),
    stdoutTail: redactSensitiveText(stdout.slice(-4_000)),
    stderrTail: redactSensitiveText(stderr.slice(-4_000)),
  };
}

const configPath = path.resolve(
  root,
  option("--config", "scripts/quality/quality-scorecard.config.json"),
);
const config = validateScorecardConfig(
  JSON.parse(await readFile(configPath, "utf8")),
);
const selected = option("--gate");
const selectedIds = selected
  ? [
      ...new Set(
        selected
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ]
  : null;
const gates = selectConfiguredGates(config.gates, selectedIds);

if (args.includes("--plan")) {
  process.stdout.write(`${JSON.stringify({ ...config, gates }, null, 2)}\n`);
  process.exit(0);
}

const startedAt = new Date().toISOString();
const runStart = performance.now();
const gateResults = await runGatesSequentially(gates, executeGate);
const summary = summarizeGateResults(gateResults);
const finishedAt = new Date().toISOString();
const wallDurationMs = Math.round(performance.now() - runStart);
const exceededGates = gateResults
  .filter((gate) => gate.budgetStatus === "exceeded")
  .map((gate) => gate.id);
const wallStatus = selectedIds
  ? "not-applicable"
  : config.wallBudgetMs === null
    ? "unbudgeted"
    : wallDurationMs <= config.wallBudgetMs
      ? "within"
      : "exceeded";
const performanceBudget = {
  enforcement: config.budgetEnforcement,
  outcome:
    exceededGates.length > 0 || wallStatus === "exceeded" ? "fail" : "pass",
  wallBudgetMs: config.wallBudgetMs,
  wallStatus,
  exceededGates,
};
if (
  performanceBudget.enforcement === "block" &&
  performanceBudget.outcome === "fail"
) {
  summary.outcome = "fail";
}
const report = {
  schemaVersion: config.schemaVersion,
  repository: config.repository,
  profile: config.profile,
  selection: selectedIds ?? "all",
  runId: `${config.repository}-${startedAt.replaceAll(":", "-")}-${randomUUID()}`,
  startedAt,
  finishedAt,
  wallDurationMs,
  gateResult: summary.outcome,
  orchestration: readOrchestrationMetadata(process.env),
  performanceBudget,
  git: {
    commit: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    dirty: Boolean(git("status", "--porcelain")),
  },
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: os.cpus()[0]?.model ?? null,
    logicalCpus: os.cpus().length,
    totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
  },
  gates: gateResults,
  summary,
};

const outputDir = path.resolve(root, "output/quality-scorecard");
await mkdir(outputDir, { recursive: true });
const explicitOutput = option("--output");
const runPath = explicitOutput
  ? assertPathWithinRoot(
      root,
      path.resolve(root, explicitOutput),
      "--output path",
    )
  : assertPathWithinRoot(
      outputDir,
      path.join(outputDir, `${report.runId}.json`),
      "generated report path",
    );
const latestPath = path.join(outputDir, "latest.json");
await mkdir(path.dirname(runPath), { recursive: true });
if (selectedIds && runPath === latestPath) {
  throw new TypeError("A selected-gate report cannot overwrite latest.json");
}
if (runPath !== latestPath) {
  await writeFile(runPath, `${JSON.stringify(report, null, 2)}\n`);
}
if (!selectedIds) await publishLatestReport(report, latestPath);

process.stdout.write(
  `\n[quality-scorecard] ${summary.outcome.toUpperCase()} — ${summary.passed} pass, ${summary.failed} fail, ${summary.skipped} skip\n`,
);
process.stdout.write(
  `[quality-scorecard] performance budget: ${performanceBudget.outcome} (${performanceBudget.enforcement})\n`,
);
process.stdout.write(`[quality-scorecard] report: ${runPath}\n`);
process.exitCode = summary.outcome === "pass" ? 0 : 1;
