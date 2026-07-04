export const MODEL_TIERS = ["fast", "balanced", "deep", "specialized", "restricted-preview"] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

export const EXECUTION_WORKER_ROLES = [
  "orchestrator",
  "scout",
  "implementer",
  "convex-specialist",
  "browser-qa",
  "computer-operator",
  "reviewer",
  "release-manager",
] as const;
export type ExecutionWorkerRole = (typeof EXECUTION_WORKER_ROLES)[number];

export const EXECUTION_TOOL_SURFACES = ["shell", "browser", "computer-use", "convex", "none"] as const;
export type ExecutionToolSurface = (typeof EXECUTION_TOOL_SURFACES)[number];

export const EXECUTION_REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh"] as const;
export type ExecutionReasoningEffort = (typeof EXECUTION_REASONING_EFFORTS)[number];

export type OpenAiExecutionModel = {
  id: string;
  tier: ModelTier;
  label: string;
  defaultUse: string;
  avoidFor: readonly string[];
  toolSurfaces: readonly ExecutionToolSurface[];
  notes?: string;
};

export const OPENAI_EXECUTION_MODELS = [
  {
    id: "gpt-5.4-nano",
    tier: "fast",
    label: "Fast scout",
    defaultUse: "Repo search, file mapping, log summarization, simple classification, and heartbeat summaries.",
    avoidFor: ["architecture decisions", "security-sensitive changes", "Convex schema or auth work", "final review"],
    toolSurfaces: ["shell", "none"],
    notes: "Use when the output should be evidence, not judgment.",
  },
  {
    id: "gpt-5.4-mini",
    tier: "fast",
    label: "Fast worker",
    defaultUse: "Focused subagents, browser QA, computer-use tasks, small edits, and structured verification.",
    avoidFor: ["ambiguous architecture", "release promotion", "incident analysis", "data-loss risk"],
    toolSurfaces: ["shell", "browser", "computer-use", "none"],
  },
  {
    id: "gpt-5.4",
    tier: "balanced",
    label: "Balanced implementer",
    defaultUse: "Normal implementation, tests, refactors with clear scope, and code review follow-up.",
    avoidFor: ["cheap repo scanning", "high-risk auth/env/release decisions without escalation"],
    toolSurfaces: ["shell", "browser", "computer-use", "convex", "none"],
  },
  {
    id: "gpt-5.4-pro",
    tier: "deep",
    label: "Deep pro",
    defaultUse: "Human-selected escalation for unusually complex coding or architecture tasks.",
    avoidFor: ["default execution routing", "cheap discovery", "routine implementation"],
    toolSurfaces: ["shell", "browser", "computer-use", "convex", "none"],
    notes: "Kept out of automatic routing until the orchestrator explicitly chooses the cost/latency tradeoff.",
  },
  {
    id: "gpt-5.5",
    tier: "deep",
    label: "Deep judgment",
    defaultUse: "Orchestration, architecture, Convex data model changes, auth, environment contracts, release, and final risk review.",
    avoidFor: ["bulk grep", "routine log summarization", "simple mechanical edits"],
    toolSurfaces: ["shell", "browser", "computer-use", "convex", "none"],
  },
  {
    id: "gpt-5.5-pro",
    tier: "deep",
    label: "Deep flagship pro",
    defaultUse: "Human-selected escalation for maximum-complexity architecture or incident analysis.",
    avoidFor: ["default execution routing", "ordinary code changes", "routine review"],
    toolSurfaces: ["shell", "browser", "computer-use", "convex", "none"],
    notes: "Default deep judgment remains gpt-5.5 unless the user asks for the pro tier.",
  },
  {
    id: "gpt-5.6",
    tier: "restricted-preview",
    label: "Restricted preview",
    defaultUse: "Do not route by default; only use when explicitly available and intentionally selected.",
    avoidFor: ["default execution routing", "repeatable local workflow assumptions"],
    toolSurfaces: ["shell", "browser", "computer-use", "convex", "none"],
    notes: "Preview availability is not assumed for this repo.",
  },
  {
    id: "gpt-5.3-codex",
    tier: "specialized",
    label: "Codex specialized",
    defaultUse: "Codex-specific coding workloads when an explicit Codex API worker is configured.",
    avoidFor: ["default local Codex Pro routing", "Browser plugin work", "Computer Use plugin work"],
    toolSurfaces: ["shell", "none"],
  },
  {
    id: "gpt-5.4-cyber",
    tier: "specialized",
    label: "Cybersecurity specialized",
    defaultUse: "Security review and cyber checks when that product surface is explicitly configured.",
    avoidFor: ["ordinary implementation", "browser QA", "repo search"],
    toolSurfaces: ["shell", "none"],
  },
  {
    id: "o3-deep-research",
    tier: "specialized",
    label: "Deep research",
    defaultUse: "Long-form external research only.",
    avoidFor: ["repo implementation", "local QA", "release execution"],
    toolSurfaces: ["none"],
  },
  {
    id: "o4-mini-deep-research",
    tier: "specialized",
    label: "Deep research mini",
    defaultUse: "Lower-cost external research only.",
    avoidFor: ["repo implementation", "local QA", "release execution"],
    toolSurfaces: ["none"],
  },
  {
    id: "computer-use-preview",
    tier: "specialized",
    label: "Computer use model",
    defaultUse: "Raw computer-use model surface only when building an API computer-use integration.",
    avoidFor: ["this repo's local QA workflow", "Browser plugin work", "shell tasks"],
    toolSurfaces: ["computer-use"],
    notes: "For local execution in Codex, use the Computer Use plugin worker instead of calling this model directly.",
  },
  {
    id: "gpt-image-2",
    tier: "specialized",
    label: "Image generation",
    defaultUse: "Image generation or editing only.",
    avoidFor: ["code execution", "repo search", "browser QA"],
    toolSurfaces: ["none"],
  },
  {
    id: "gpt-image-1.5",
    tier: "specialized",
    label: "Image generation legacy",
    defaultUse: "Image generation or editing when explicitly selected.",
    avoidFor: ["code execution", "repo search", "browser QA"],
    toolSurfaces: ["none"],
  },
  {
    id: "gpt-image-1-mini",
    tier: "specialized",
    label: "Image generation mini",
    defaultUse: "Lower-cost image generation or editing when explicitly selected.",
    avoidFor: ["code execution", "repo search", "browser QA"],
    toolSurfaces: ["none"],
  },
  {
    id: "gpt-realtime-2",
    tier: "specialized",
    label: "Realtime audio",
    defaultUse: "Realtime voice/audio interactions only.",
    avoidFor: ["repo implementation", "browser QA", "release execution"],
    toolSurfaces: ["none"],
  },
  {
    id: "gpt-realtime-translate",
    tier: "specialized",
    label: "Realtime translation",
    defaultUse: "Streaming speech-to-speech translation only.",
    avoidFor: ["repo implementation", "browser QA", "release execution"],
    toolSurfaces: ["none"],
  },
  {
    id: "gpt-realtime-whisper",
    tier: "specialized",
    label: "Realtime transcription",
    defaultUse: "Realtime speech-to-text transcription only.",
    avoidFor: ["repo implementation", "browser QA", "release execution"],
    toolSurfaces: ["none"],
  },
  {
    id: "gpt-4o-transcribe",
    tier: "specialized",
    label: "Transcription",
    defaultUse: "Speech-to-text transcription only.",
    avoidFor: ["repo implementation", "browser QA", "release execution"],
    toolSurfaces: ["none"],
  },
  {
    id: "gpt-4o-mini-transcribe",
    tier: "specialized",
    label: "Transcription mini",
    defaultUse: "Lower-cost speech-to-text transcription only.",
    avoidFor: ["repo implementation", "browser QA", "release execution"],
    toolSurfaces: ["none"],
  },
  {
    id: "sora-2",
    tier: "specialized",
    label: "Video generation",
    defaultUse: "Video generation only.",
    avoidFor: ["repo implementation", "browser QA", "release execution"],
    toolSurfaces: ["none"],
  },
  {
    id: "sora-2-pro",
    tier: "specialized",
    label: "Video generation pro",
    defaultUse: "Higher-quality video generation only.",
    avoidFor: ["repo implementation", "browser QA", "release execution"],
    toolSurfaces: ["none"],
  },
  {
    id: "text-embedding-3-large",
    tier: "specialized",
    label: "Embedding retrieval",
    defaultUse: "Semantic indexing and retrieval only.",
    avoidFor: ["implementation", "review", "UI automation"],
    toolSurfaces: ["none"],
  },
] as const satisfies readonly OpenAiExecutionModel[];

export type ExecutionWorkerProfile = {
  role: ExecutionWorkerRole;
  modelId: (typeof OPENAI_EXECUTION_MODELS)[number]["id"];
  tier: ModelTier;
  reasoningEffort: ExecutionReasoningEffort;
  serviceTier?: "priority";
  toolSurface: ExecutionToolSurface;
  mandate: string;
  handoffWhen: readonly string[];
};

export const EXECUTION_WORKERS = [
  {
    role: "orchestrator",
    modelId: "gpt-5.5",
    tier: "deep",
    reasoningEffort: "xhigh",
    serviceTier: "priority",
    toolSurface: "shell",
    mandate: "Own goal decomposition, worker assignment, heartbeat review, escalation, and final gate decisions.",
    handoffWhen: ["needs direct browser verification", "needs local Mac UI operation", "worker reports repeated failure"],
  },
  {
    role: "scout",
    modelId: "gpt-5.4-nano",
    tier: "fast",
    reasoningEffort: "none",
    toolSurface: "shell",
    mandate: "Find files, routes, tests, commands, logs, and existing contracts. Return evidence with paths.",
    handoffWhen: ["needs judgment", "needs code edits", "touches auth/env/release/data contracts"],
  },
  {
    role: "implementer",
    modelId: "gpt-5.5",
    tier: "deep",
    reasoningEffort: "low",
    serviceTier: "priority",
    toolSurface: "shell",
    mandate: "Make scoped normal code changes with low reasoning after the orchestrator has done the hard thinking.",
    handoffWhen: ["needs browser QA", "needs Mac UI operation", "touches high-risk Convex/auth/release areas"],
  },
  {
    role: "convex-specialist",
    modelId: "gpt-5.5",
    tier: "deep",
    reasoningEffort: "high",
    serviceTier: "priority",
    toolSurface: "convex",
    mandate: "Handle Convex schema, functions, auth/session boundaries, data migration, and dashboard runtime contracts.",
    handoffWhen: ["needs visible browser verification", "needs release promotion", "change is purely mechanical"],
  },
  {
    role: "browser-qa",
    modelId: "gpt-5.4-mini",
    tier: "fast",
    reasoningEffort: "low",
    toolSurface: "browser",
    mandate: "Use the Browser plugin for localhost, preview, production, routes, visual states, and DOM/browser evidence.",
    handoffWhen: ["browser plugin is unavailable", "requires non-browser Mac app UI", "QA reveals architectural or data risk"],
  },
  {
    role: "computer-operator",
    modelId: "gpt-5.4-mini",
    tier: "fast",
    reasoningEffort: "low",
    toolSurface: "computer-use",
    mandate: "Use Computer Use only for local Mac app UI actions that Browser or shell cannot perform.",
    handoffWhen: ["task can be done through Browser", "task can be done through shell", "next action is risky and needs confirmation"],
  },
  {
    role: "reviewer",
    modelId: "gpt-5.5",
    tier: "deep",
    reasoningEffort: "high",
    serviceTier: "priority",
    toolSurface: "shell",
    mandate: "Review behavioral risk, missing tests, data loss, privacy, and release impact.",
    handoffWhen: ["only needs file mapping", "needs direct browser evidence"],
  },
  {
    role: "release-manager",
    modelId: "gpt-5.5",
    tier: "deep",
    reasoningEffort: "xhigh",
    serviceTier: "priority",
    toolSurface: "shell",
    mandate: "Own release train, environment checks, smoke commands, and promotion readiness.",
    handoffWhen: ["needs browser smoke evidence", "needs provider UI operation"],
  },
] as const satisfies readonly ExecutionWorkerProfile[];

export type ExecutionTaskSignal = {
  text: string;
  files?: readonly string[];
  needsBrowser?: boolean;
  needsComputer?: boolean;
  repoSearchOnly?: boolean;
  repeatedFailureCount?: number;
};

export type ExecutionRoute = {
  role: ExecutionWorkerRole;
  modelId: (typeof OPENAI_EXECUTION_MODELS)[number]["id"];
  tier: ModelTier;
  reasoningEffort: ExecutionReasoningEffort;
  serviceTier?: "priority";
  toolSurface: ExecutionToolSurface;
  reasons: readonly string[];
};

export type ExecutionWorkerAssignment = ExecutionRoute & {
  objective: string;
  canRunInParallel: boolean;
  readOnly: boolean;
  launchPrompt: string;
};

export type ExecutionWave = {
  id: string;
  label: string;
  parallel: boolean;
  dependsOn?: readonly string[];
  workers: readonly ExecutionWorkerAssignment[];
};

export type ExecutionRunPlan = {
  goal: string;
  waves: readonly ExecutionWave[];
  gates: readonly string[];
  notes: readonly string[];
};

const HIGH_RISK_PATTERNS = [
  /\bauth\b/i,
  /\bbetter auth\b/i,
  /\bsession\b/i,
  /\bjwks?\b/i,
  /\bsecret/i,
  /\benv(ironment)?\b/i,
  /\brelease\b/i,
  /\bdeploy\b/i,
  /\bproduction\b/i,
  /\bmigration\b/i,
  /\bschema\b/i,
  /\bconvex\b/i,
  /\bdashboard api\b/i,
] as const;

const BROWSER_PATTERNS = [
  /\bbrowser\b/i,
  /\bvar\b/i,
  /\bvisual\b/i,
  /\broute\b/i,
  /\blocalhost\b/i,
  /\bpreview\b/i,
  /\bresponsive\b/i,
  /\baccessibility\b/i,
] as const;

const COMPUTER_PATTERNS = [
  /\bcomputer\b/i,
  /\bmac app\b/i,
  /\bdesktop app\b/i,
  /\bsystem settings\b/i,
  /\bclick\b/i,
  /\bdrag\b/i,
] as const;

const SEARCH_PATTERNS = [
  /\bfind\b/i,
  /\bsearch\b/i,
  /\blocate\b/i,
  /\bmap\b/i,
  /\bgrep\b/i,
  /\brg\b/i,
] as const;

export function routeExecutionTask(task: ExecutionTaskSignal): ExecutionRoute {
  const text = [task.text, ...(task.files ?? [])].join("\n");
  const repeatedFailure = (task.repeatedFailureCount ?? 0) >= 2;
  const hasHighRiskSignal = repeatedFailure || HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text));
  const hasBrowserSignal = BROWSER_PATTERNS.some((pattern) => pattern.test(text));

  if (task.needsComputer || COMPUTER_PATTERNS.some((pattern) => pattern.test(text))) {
    return profileRoute("computer-operator", ["requires local Mac UI control"]);
  }

  if (hasHighRiskSignal && !task.needsBrowser) {
    return profileRoute("convex-specialist", [
      repeatedFailure ? "same problem failed repeatedly" : "touches high-risk backend/release/auth surface",
    ]);
  }

  if (task.needsBrowser || hasBrowserSignal) {
    return profileRoute("browser-qa", ["requires Browser plugin evidence"]);
  }

  if (task.repoSearchOnly || SEARCH_PATTERNS.some((pattern) => pattern.test(text))) {
    return profileRoute("scout", ["repo search or mapping only"]);
  }

  return profileRoute("implementer", ["scoped implementation task"]);
}

export function createExecutionRunPlan(task: ExecutionTaskSignal): ExecutionRunPlan {
  const text = [task.text, ...(task.files ?? [])].join("\n");
  const needsBrowser = task.needsBrowser || BROWSER_PATTERNS.some((pattern) => pattern.test(text));
  const needsComputer = task.needsComputer || COMPUTER_PATTERNS.some((pattern) => pattern.test(text));
  const highRisk = (task.repeatedFailureCount ?? 0) >= 2 || HIGH_RISK_PATTERNS.some((pattern) => pattern.test(text));
  const release = /\b(release|deploy|production|preview|smoke)\b/i.test(text);
  const repoSearchOnly = task.repoSearchOnly === true;

  const discoveryWorkers: ExecutionWorkerAssignment[] = [
    workerAssignment(
      "scout",
      task,
      "Map the current repo surface: relevant files, routes, tests, commands, and known constraints. Return evidence with paths.",
      true,
      true,
      "Return concise findings only. Do not edit files.",
    ),
  ];

  if (highRisk) {
    discoveryWorkers.push(
      workerAssignment(
        "convex-specialist",
        task,
        "Identify Convex/auth/env/release/data-contract risks before implementation. Return required guardrails and files to inspect.",
        true,
        true,
        "This is a risk preflight. Do not edit files yet.",
      ),
    );
  }

  if (needsBrowser) {
    discoveryWorkers.push(
      workerAssignment(
        "browser-qa",
        task,
        "Prepare Browser-plugin verification targets: routes, states, viewport coverage, and evidence to capture after implementation.",
        true,
        true,
        "Use the Browser plugin surface for browser work. Do not substitute another browser mechanism.",
      ),
    );
  }

  if (needsComputer) {
    discoveryWorkers.push(
      workerAssignment(
        "computer-operator",
        task,
        "Prepare Computer Use steps for local Mac UI work that Browser or shell cannot cover.",
        true,
        true,
        "Use Computer Use only for local app UI. Stop before risky UI actions that require confirmation.",
      ),
    );
  }

  const waves: ExecutionWave[] = [
    {
      id: "orchestrator-intake",
      label: "Orchestrator intake",
      parallel: false,
      workers: [
        workerAssignment(
          "orchestrator",
          task,
          "Normalize the goal, decide parallelism, and hold the final gate.",
          false,
          true,
          "You are the manager thread. Keep ownership of sequencing and do not edit implementation files in this intake step.",
        ),
      ],
    },
    {
      id: "parallel-discovery",
      label: "Parallel discovery",
      parallel: true,
      dependsOn: ["orchestrator-intake"],
      workers: discoveryWorkers,
    },
  ];

  if (!repoSearchOnly) {
    const implementationRole: ExecutionWorkerRole = highRisk ? "convex-specialist" : "implementer";
    waves.push({
      id: "implementation",
      label: "Implementation",
      parallel: false,
      dependsOn: ["parallel-discovery"],
      workers: [
        workerAssignment(
          implementationRole,
          task,
          highRisk
            ? "Implement the high-risk backend/data/auth/release slice using the guardrails from discovery."
            : "Implement the scoped code change after discovery evidence is available.",
          false,
          false,
          "Edit only the owned files. Do not revert unrelated user or worker changes.",
        ),
      ],
    });

    const verificationWorkers: ExecutionWorkerAssignment[] = [
      workerAssignment(
        "reviewer",
        task,
        "Review the diff for behavioral risk, missing tests, privacy, data loss, and release impact.",
        true,
        true,
        "Review only. Do not edit unless explicitly asked to patch a finding.",
      ),
    ];

    if (needsBrowser) {
      verificationWorkers.push(
        workerAssignment(
          "browser-qa",
          task,
          "Run Browser-plugin verification on the changed visible surfaces and return evidence.",
          true,
          true,
          "Use Browser plugin. Capture routes, visible state, console issues, and viewport notes.",
        ),
      );
    }

    if (release) {
      verificationWorkers.push(
        workerAssignment(
          "release-manager",
          task,
          "Verify release-train readiness, environment risk, and smoke commands needed before promotion.",
          true,
          true,
          "Do not deploy unless explicitly instructed. Return release readiness evidence.",
        ),
      );
    }

    waves.push({
      id: "parallel-verification",
      label: "Parallel verification",
      parallel: true,
      dependsOn: ["implementation"],
      workers: verificationWorkers,
    });
  }

  return {
    goal: task.text,
    waves,
    gates: repoSearchOnly
      ? ["No code gate required for discovery-only work."]
      : ["pnpm run verify:precommit", needsBrowser ? "Browser-plugin QA evidence" : "", release ? "pnpm verify and release smoke readiness" : ""].filter(Boolean),
    notes: [
      "Workers in the same wave can run in parallel; later waves wait for dependency evidence.",
      "The orchestrator uses gpt-5.5 with xhigh reasoning. Normal implementation uses gpt-5.5 with low reasoning.",
      "Use Browser and Computer Use as dedicated workers; do not replace them with unrelated automation surfaces.",
    ],
  };
}

function profileRoute(role: ExecutionWorkerRole, reasons: readonly string[]): ExecutionRoute {
  const profile: ExecutionWorkerProfile | undefined = EXECUTION_WORKERS.find((worker) => worker.role === role);
  if (!profile) {
    throw new Error(`No execution worker profile for ${role}.`);
  }

  const route: ExecutionRoute = {
    role: profile.role,
    modelId: profile.modelId,
    tier: profile.tier,
    reasoningEffort: profile.reasoningEffort,
    toolSurface: profile.toolSurface,
    reasons,
  };

  if (profile.serviceTier) {
    return {
      ...route,
      serviceTier: profile.serviceTier,
    };
  }

  return route;
}

function workerAssignment(
  role: ExecutionWorkerRole,
  task: ExecutionTaskSignal,
  objective: string,
  canRunInParallel: boolean,
  readOnly: boolean,
  instruction: string,
): ExecutionWorkerAssignment {
  const route = profileRoute(role, [`assigned as ${role}`]);
  const files = task.files?.length ? `\nKnown files:\n${task.files.map((file) => `- ${file}`).join("\n")}` : "";
  return {
    ...route,
    objective,
    canRunInParallel,
    readOnly,
    launchPrompt: [
      `Goal: ${task.text}`,
      files,
      `Worker role: ${role}`,
      `Model: ${route.modelId}`,
      `Reasoning effort: ${route.reasoningEffort}`,
      `Tool surface: ${route.toolSurface}`,
      `Objective: ${objective}`,
      `Instruction: ${instruction}`,
      "Return evidence, changed paths if any, blockers, and recommended next step.",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
