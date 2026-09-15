#!/usr/bin/env node
// Audit which model each Codex subagent actually ran on, versus the model
// configured in ~/.codex/agents/<role>.toml, and whether the spawn was forked.
//
// Usage: node ~/.codex/scripts/audit-spawn-models.mjs [--since YYYY-MM-DD] [--json]
// Exit code 1 when a subagent ran on a model other than its configured one.
// Exit code 2 when one or more runs cannot be matched to a configured role/model.

import { execFileSync } from "node:child_process";
import { createReadStream, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), ".codex");
const SESSIONS = join(CODEX_HOME, "sessions");
const AGENTS = join(CODEX_HOME, "agents");

const args = process.argv.slice(2);
const sinceArg = args[args.indexOf("--since") + 1];
const since = args.includes("--since") && sinceArg ? sinceArg : defaultSince(7);
const asJson = args.includes("--json");

function defaultSince(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

function configuredModels() {
  const out = {};
  for (const file of readdirSync(AGENTS)) {
    if (!file.endsWith(".toml")) continue;
    const text = readFileSync(join(AGENTS, file), "utf8");
    const model = /^model\s*=\s*"([^"]+)"/m.exec(text)?.[1] ?? "?";
    const effort = /reasoning_effort\s*=\s*"([^"]+)"/m.exec(text)?.[1] ?? "?";
    out[file.replace(/\.toml$/, "").replace(/-/g, "_")] = { model, effort };
  }
  return out;
}

function* rolloutFiles() {
  for (const year of safeList(SESSIONS)) {
    for (const month of safeList(join(SESSIONS, year))) {
      for (const day of safeList(join(SESSIONS, year, month))) {
        const date = `${year}-${month}-${day}`;
        if (date < since) continue;
        const dir = join(SESSIONS, year, month, day);
        for (const f of safeList(dir)) {
          if (f.startsWith("rollout-") && f.endsWith(".jsonl"))
            yield { path: join(dir, f), date };
        }
      }
    }
  }
}

function safeList(dir) {
  try {
    return readdirSync(dir).sort();
  } catch {
    return [];
  }
}

// A forked child's rollout starts with its own session_meta, then a copy of the parent's
// session_meta and turn history (turn_contexts carrying the parent's model). The child's own
// turns come last, so the last turn_context is the model the child really ran on.
async function parseMeta(path) {
  const ownId =
    /rollout-.*?-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/.exec(
      path,
    )?.[1];
  let meta = null;
  let model = "?";
  let effort = "?";
  const models = new Set();
  const stream = createReadStream(path, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    // Record header is `{"timestamp":...,["ordinal":N,]"type":...}`; skip the huge payloads cheaply.
    const type =
      /^\{"timestamp":"[^"]*",(?:"ordinal":\d+,)?"type":"([a-z_]+)"/.exec(
        line,
      )?.[1];
    if (type !== "session_meta" && type !== "turn_context") continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.type === "session_meta") {
      if (!meta || rec.payload?.id === ownId) meta = rec.payload;
      // Parents can be hundreds of MB; their model is not needed here.
      if (meta?.id === ownId && meta?.thread_source !== "subagent") break;
      continue;
    }
    if (rec.payload?.model) {
      model = rec.payload.model;
      effort = rec.payload.effort ?? rec.payload.reasoning_effort ?? "?";
      models.add(`${model}/${effort}`);
    }
  }
  rl.close();
  stream.destroy();
  return { meta, model, effort, models: [...models] };
}

// Parent rollouts can be huge; rg extracts spawn_agent argument strings quickly.
function spawnCalls(path) {
  let raw;
  try {
    raw = execFileSync(
      "rg",
      [
        "--no-filename",
        "-o",
        String.raw`"name":"spawn_agent","namespace":"agents","arguments":"(?:[^"\\]|\\.)*"`,
        path,
      ],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
  } catch {
    return [];
  }
  const calls = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    try {
      const obj = JSON.parse(`{${line}}`);
      const a = JSON.parse(obj.arguments);
      calls.push({
        task: a.task_name,
        role: a.agent_type,
        fork: a.fork_turns ?? "none",
      });
    } catch {
      /* ignore malformed */
    }
  }
  return calls;
}

const configured = configuredModels();
const parents = new Map(); // thread id -> Map(task_name -> fork)
const subagents = [];

for (const { path, date } of rolloutFiles()) {
  const { meta, model, effort, models } = await parseMeta(path);
  if (!meta) continue;
  if (meta.thread_source === "subagent") {
    const task = (meta.agent_path || "").split("/").pop();
    subagents.push({
      date,
      role: meta.agent_role,
      task,
      parent: meta.parent_thread_id,
      forkedFrom: meta.forked_from_id ?? null,
      model,
      effort,
      modelsSeen: models,
      cwd: meta.cwd,
    });
  } else {
    const calls = spawnCalls(path);
    if (calls.length) {
      const m = parents.get(meta.id) ?? new Map();
      for (const c of calls) m.set(c.task, c.fork);
      parents.set(meta.id, m);
    }
  }
}

for (const s of subagents) {
  s.fork = parents.get(s.parent)?.get(s.task) ?? (s.forkedFrom ? "yes" : "?");
  s.configured = configured[s.role]?.model ?? "?";
  s.configuredEffort = configured[s.role]?.effort ?? "?";
  s.match =
    s.configured === "?" || s.model === "?" ? null : s.model === s.configured;
}

const byRole = new Map();
for (const s of subagents) {
  const r = byRole.get(s.role) ?? {
    role: s.role,
    configured: s.configured,
    runs: 0,
    onConfigured: 0,
    forked: 0,
    forkedOff: 0,
  };
  r.runs++;
  if (s.match) r.onConfigured++;
  if (s.fork !== "none" && s.fork !== "?") {
    r.forked++;
    if (s.match === false) r.forkedOff++;
  }
  byRole.set(s.role, r);
}

const mismatches = subagents.filter((s) => s.match === false);
const unknown = subagents.filter((s) => s.match === null);

if (asJson) {
  console.log(
    JSON.stringify(
      { since, subagents, byRole: [...byRole.values()], mismatches, unknown },
      null,
      2,
    ),
  );
} else {
  console.log(
    `Subagent spawns since ${since}: ${subagents.length} (${unknown.length} without a configured or resolved model)`,
  );
  const totals = {};
  for (const s of subagents) totals[s.model] = (totals[s.model] ?? 0) + 1;
  console.log(
    "Resolved models:",
    Object.entries(totals)
      .map(([m, n]) => `${m}=${n}`)
      .join("  "),
  );
  console.log("");
  console.log(
    pad("role", 24) +
      pad("configured", 16) +
      pad("runs", 6) +
      pad("on-config", 10) +
      pad("forked", 8) +
      "forked+off-model",
  );
  for (const r of [...byRole.values()].sort((a, b) => b.runs - a.runs)) {
    console.log(
      pad(r.role, 24) +
        pad(r.configured, 16) +
        pad(r.runs, 6) +
        pad(r.onConfigured, 10) +
        pad(r.forked, 8) +
        r.forkedOff,
    );
  }
  console.log("");
  if (mismatches.length === 0 && unknown.length === 0) {
    console.log(
      "OK: every observed subagent had a configured role and ran on its configured model.",
    );
  } else if (mismatches.length === 0) {
    console.log(
      `PARTIAL: every one of ${subagents.length - unknown.length} resolved configured runs matched; ${unknown.length} run(s) remain unverified.`,
    );
  } else {
    console.log(
      `MISMATCH: ${mismatches.length} subagent(s) ran off their configured model (latest 15):`,
    );
    for (const s of mismatches.slice(-15)) {
      console.log(
        `  ${s.date}  ${pad(s.role, 22)} ran=${pad(s.model, 14)} effort=${pad(s.effort, 7)} fork=${pad(s.fork, 5)} task=${s.task}`,
      );
    }
  }
}

// process.exit() would truncate piped stdout before Node flushes it.
process.exitCode = mismatches.length ? 1 : unknown.length ? 2 : 0;

function pad(v, n) {
  return String(v).padEnd(n);
}
