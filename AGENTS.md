# AOHYS Agent Execution

This repo uses an execution-only orchestration workflow. Visual planning and visual recap are separate artifacts; do not run them as part of normal execution unless the user asks for them.

For any non-trivial implementation, verification, PR-review, release-readiness, Browser QA, Computer Use, Convex, auth, env, or dashboard task:

1. Start by generating a repo-local execution run:

   ```sh
   pnpm run agent:start -- --goal "<user task>"
   ```

   Add `--file <path>` for known files, `--browser` when visible browser behavior or VAR evidence is required, `--computer` when local Mac UI operation is required, and `--repo-search-only` for discovery-only work.

2. Follow the generated waves in `agent-runs/<timestamp>-<slug>/execution-run.md`.

3. Launch workers in the same wave in parallel when the host supports subagents. If subagent tooling is unavailable, execute the same wave order locally and preserve the dependency gates.

4. Keep the orchestrator as the owner of sequencing, heartbeats, escalation, and final gates. The orchestrator should use `gpt-5.5` with `xhigh` reasoning.

5. Use the repo model policy in `docs/agent-execution.md`:
   - `scout`: `gpt-5.4-nano`, `reasoningEffort: none`, shell-only repo search and maps.
   - `implementer`: `gpt-5.5`, `reasoningEffort: low`, normal scoped implementation after discovery.
   - `convex-specialist`: `gpt-5.5`, `reasoningEffort: high`, Convex/auth/env/schema/release/data contracts.
   - `browser-qa`: `gpt-5.4-mini`, `reasoningEffort: low`, bundled Browser plugin only.
   - `computer-operator`: `gpt-5.4-mini`, `reasoningEffort: low`, bundled Computer Use plugin only.
   - `reviewer`: `gpt-5.5`, `reasoningEffort: high`, behavioral and release-risk review.
   - `release-manager`: `gpt-5.5`, `reasoningEffort: xhigh`, release train and smoke readiness.

6. Do not replace Browser work with ad hoc Playwright in this workflow. Do not replace Computer Use with Browser or shell when local Mac app UI operation is the task.

7. Do not use GitHub Actions for this workflow. It is local to the repo and the current PR/branch.

Skip `agent:start` only for tiny direct answers, one-line read-only shell checks, or when the user explicitly asks not to orchestrate.
