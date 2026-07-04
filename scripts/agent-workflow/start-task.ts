import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createExecutionRunPlan, type ExecutionRunPlan } from "../../packages/core/src/index.js";

type CliArgs = {
  goal?: string;
  files: string[];
  browser?: boolean;
  computer?: boolean;
  repoSearchOnly?: boolean;
  failureCount?: number;
  outDir?: string;
  json?: boolean;
};

const USAGE =
  'Usage: pnpm run agent:start -- --goal "Implement ..." [--file path] [--browser] [--computer] [--repo-search-only] [--failure-count count] [--out-dir dir] [--json]';

const args = parseArgs(process.argv.slice(2));

if (!args.goal) {
  throw new Error(USAGE);
}

const runPlan = createExecutionRunPlan({
  text: args.goal,
  files: args.files,
  needsBrowser: args.browser,
  needsComputer: args.computer,
  repoSearchOnly: args.repoSearchOnly,
  repeatedFailureCount: args.failureCount,
});

const outputDir = args.outDir ?? join("agent-runs", `${timestamp()}-${slugify(args.goal)}`);
mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, "execution-run.json"), `${JSON.stringify(runPlan, null, 2)}\n`);
writeFileSync(join(outputDir, "execution-run.md"), renderMarkdown(runPlan));

if (args.json) {
  console.log(JSON.stringify({ outputDir, runPlan }, null, 2));
} else {
  console.log(`Agent execution run created: ${outputDir}`);
  for (const wave of runPlan.waves) {
    const mode = wave.parallel ? "parallel" : "sequential";
    console.log(`- ${wave.id} (${mode}): ${wave.workers.map((worker) => `${worker.role}:${worker.modelId}/${worker.reasoningEffort}`).join(", ")}`);
  }
  console.log(`\nNext: open ${join(outputDir, "execution-run.md")} and launch workers by wave.`);
}

function parseArgs(raw: string[]): CliArgs {
  const parsed: CliArgs = { files: [] };

  for (let i = 0; i < raw.length; i += 1) {
    const token = raw[i];
    if (token === "--") {
      continue;
    }

    if (token === "--browser") {
      parsed.browser = true;
      continue;
    }
    if (token === "--computer") {
      parsed.computer = true;
      continue;
    }
    if (token === "--repo-search-only") {
      parsed.repoSearchOnly = true;
      continue;
    }
    if (token === "--json") {
      parsed.json = true;
      continue;
    }

    const value = raw[i + 1];
    if (!value) {
      throw new Error(`Missing value for ${token}`);
    }

    switch (token) {
      case "--goal":
        parsed.goal = value;
        break;
      case "--file":
        parsed.files.push(value);
        break;
      case "--out-dir":
        parsed.outDir = value;
        break;
      case "--failure-count":
        parsed.failureCount = Number.parseInt(value, 10);
        if (Number.isNaN(parsed.failureCount)) {
          throw new Error("--failure-count must be a number.");
        }
        break;
      default:
        throw new Error(`Unsupported argument: ${token}`);
    }
    i += 1;
  }

  return parsed;
}

function renderMarkdown(plan: ExecutionRunPlan): string {
  const lines = [
    `# Agent Execution Run`,
    "",
    `Goal: ${plan.goal}`,
    "",
    "## Waves",
    "",
  ];

  for (const wave of plan.waves) {
    lines.push(`### ${wave.label}`);
    lines.push(`- id: \`${wave.id}\``);
    lines.push(`- mode: ${wave.parallel ? "parallel" : "sequential"}`);
    if (wave.dependsOn?.length) {
      lines.push(`- waits for: ${wave.dependsOn.map((dependency) => `\`${dependency}\``).join(", ")}`);
    }
    lines.push("");

    for (const worker of wave.workers) {
      lines.push(`#### ${worker.role}`);
      lines.push(`- model: \`${worker.modelId}\``);
      lines.push(`- reasoning: \`${worker.reasoningEffort}\``);
      lines.push(`- tier: \`${worker.tier}\``);
      lines.push(`- tool: \`${worker.toolSurface}\``);
      lines.push(`- read-only: ${worker.readOnly ? "yes" : "no"}`);
      lines.push(`- parallel-safe: ${worker.canRunInParallel ? "yes" : "no"}`);
      lines.push("");
      lines.push("Prompt:");
      lines.push("");
      lines.push("```text");
      lines.push(worker.launchPrompt);
      lines.push("```");
      lines.push("");
    }
  }

  lines.push("## Gates");
  lines.push("");
  for (const gate of plan.gates) {
    lines.push(`- ${gate}`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  for (const note of plan.notes) {
    lines.push(`- ${note}`);
  }
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "task";
}
