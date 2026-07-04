import { describe, expect, it } from "vitest";
import { createExecutionRunPlan, EXECUTION_WORKERS, OPENAI_EXECUTION_MODELS, routeExecutionTask } from "../src/index.js";

describe("agent execution routing", () => {
  it("keeps Browser and Computer Use as explicit worker surfaces", () => {
    expect(EXECUTION_WORKERS.find((worker) => worker.role === "browser-qa")).toMatchObject({
      modelId: "gpt-5.4-mini",
      toolSurface: "browser",
    });
    expect(EXECUTION_WORKERS.find((worker) => worker.role === "computer-operator")).toMatchObject({
      modelId: "gpt-5.4-mini",
      toolSurface: "computer-use",
    });
  });

  it("uses xhigh orchestration with low-reasoning gpt-5.5 for normal implementation", () => {
    expect(EXECUTION_WORKERS.find((worker) => worker.role === "orchestrator")).toMatchObject({
      modelId: "gpt-5.5",
      reasoningEffort: "xhigh",
      serviceTier: "priority",
    });
    expect(EXECUTION_WORKERS.find((worker) => worker.role === "implementer")).toMatchObject({
      modelId: "gpt-5.5",
      reasoningEffort: "low",
      serviceTier: "priority",
    });
  });

  it("routes cheap repo discovery to the fast scout", () => {
    expect(routeExecutionTask({ text: "search the repo and map the files for dashboard media" })).toMatchObject({
      role: "scout",
      modelId: "gpt-5.4-nano",
      tier: "fast",
      reasoningEffort: "none",
      toolSurface: "shell",
      reasons: ["repo search or mapping only"],
    });
  });

  it("routes visible behavior and VAR checks to Browser", () => {
    expect(routeExecutionTask({ text: "run VAR browser QA against /dashboard/projects" })).toMatchObject({
      role: "browser-qa",
      modelId: "gpt-5.4-mini",
      toolSurface: "browser",
    });
  });

  it("routes direct Mac UI work to Computer Use instead of Browser", () => {
    expect(routeExecutionTask({ text: "use the Mac app UI to click through the local settings panel" })).toMatchObject({
      role: "computer-operator",
      modelId: "gpt-5.4-mini",
      toolSurface: "computer-use",
    });
  });

  it("escalates Convex, auth, release, and repeated failures to deep judgment", () => {
    expect(routeExecutionTask({ text: "change Convex schema and Better Auth session behavior" })).toMatchObject({
      role: "convex-specialist",
      modelId: "gpt-5.5",
      tier: "deep",
    });
    expect(routeExecutionTask({ text: "prepare production release" })).toMatchObject({
      role: "convex-specialist",
      modelId: "gpt-5.5",
      tier: "deep",
    });
    expect(routeExecutionTask({ text: "fix failing test", repeatedFailureCount: 2 })).toMatchObject({
      modelId: "gpt-5.5",
      tier: "deep",
    });
  });

  it("keeps Convex or auth risk above incidental route language", () => {
    expect(routeExecutionTask({ text: "change the Convex dashboard route contract" })).toMatchObject({
      role: "convex-specialist",
      modelId: "gpt-5.5",
      reasoningEffort: "high",
    });
  });

  it("does not route restricted preview models by default", () => {
    const routedModelIds = new Set(
      [
        routeExecutionTask({ text: "search repo", repoSearchOnly: true }),
        routeExecutionTask({ text: "implement a small component" }),
        routeExecutionTask({ text: "verify route in browser" }),
        routeExecutionTask({ text: "convex release env change" }),
      ].map((route) => route.modelId),
    );

    expect(routedModelIds.has("gpt-5.6")).toBe(false);
    expect(OPENAI_EXECUTION_MODELS.find((model) => model.id === "gpt-5.6")).toMatchObject({
      tier: "restricted-preview",
    });
  });

  it("creates parallel discovery and verification waves for UI implementation work", () => {
    const plan = createExecutionRunPlan({
      text: "Implement a dashboard route change and run VAR browser QA",
      files: ["apps/dashboard/src/screens/projects-screen.tsx"],
    });

    expect(plan.waves.map((wave) => [wave.id, wave.parallel])).toEqual([
      ["orchestrator-intake", false],
      ["parallel-discovery", true],
      ["implementation", false],
      ["parallel-verification", true],
    ]);
    expect(plan.waves[1]?.workers.map((worker) => worker.role)).toContain("browser-qa");
    expect(plan.waves[2]?.workers[0]).toMatchObject({
      role: "implementer",
      modelId: "gpt-5.5",
      reasoningEffort: "low",
    });
    expect(plan.waves[3]?.workers.map((worker) => worker.role)).toEqual(["reviewer", "browser-qa"]);
  });

  it("adds release manager verification and smoke gate for release work", () => {
    const plan = createExecutionRunPlan({
      text: "Prepare preview release smoke for the dashboard",
    });

    expect(plan.waves[3]?.workers.map((worker) => worker.role)).toContain("release-manager");
    expect(plan.waves[3]?.workers.find((worker) => worker.role === "release-manager")).toMatchObject({
      modelId: "gpt-5.5",
      reasoningEffort: "xhigh",
      serviceTier: "priority",
      canRunInParallel: true,
      readOnly: true,
    });
    expect(plan.gates).toContain("pnpm verify and release smoke readiness");
  });
});
