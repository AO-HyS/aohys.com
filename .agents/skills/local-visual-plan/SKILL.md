---
name: local-visual-plan
description: User-invoked local workflow for turning a risky implementation request or existing text plan into an Agent-Native visual plan before editing code.
disable-model-invocation: true
---

# Local Visual Plan

Use this skill when the user explicitly invokes `$local-visual-plan` and wants a local visual implementation plan before code changes begin. The goal is an approval surface: architecture, files, UI states, API/data contracts, risks, validation, and open questions in an Agent-Native Plan viewed locally.

This skill is local-first. Do not set up GitHub Actions. Do not require `OPENAI_API_KEY`. Do not publish to hosted Plans unless the user explicitly asks. Use local-files mode and the current Codex session to author the plan.

## Workflow

1. Capture the planning brief.
   - Extract the title and brief from the user's request, attached plan, issue, or current conversation.
   - If the request is too vague to plan responsibly, ask one concise clarifying question before preparing files.
   - Completion criterion: title, brief, and target repo/path are clear enough to inspect the codebase.

2. Prepare the local Plan workspace with the bundled helper.
   - Basic command:
     ```sh
     node ~/.agents/skills/local-visual-plan/scripts/prepare-plan.mjs --title "Short plan title" --brief "What the user wants to change"
     ```
   - For a plan document already on disk:
     ```sh
     node ~/.agents/skills/local-visual-plan/scripts/prepare-plan.mjs --title "Short plan title" --brief-file path/to/plan.md
     ```
   - To choose a durable repo folder instead of `/tmp`:
     ```sh
     node ~/.agents/skills/local-visual-plan/scripts/prepare-plan.mjs --title "Short plan title" --brief "..." --local-dir plans/short-plan-slug
     ```
   - Completion criterion: the helper reports a `visual-plan-prompt.md`, `localDir`, block catalog, and serve command.

3. Read the generated `visual-plan-prompt.md` completely.
   - Inspect the repo before authoring the plan. Use real files, routes, schemas, tests, package scripts, and design docs where relevant.
   - Do not edit implementation files while planning unless the user explicitly changes the task from planning to implementation.
   - Completion criterion: the relevant current system shape is known from source files, not guessed.

4. Author the local plan files.
   - Write the plan into the helper's `localDir`, normally as `plan.mdx`.
   - Use `canvas.mdx` or `prototype.mdx` only when they earn their place: UI storyboards, screen flows, or interactive behavior that prose cannot carry.
   - Include concrete implementation order, affected files, validation commands, browser/VAR targets for UI work, risks, and open questions.
   - Completion criterion: `plan.mdx` exists, is grounded in the repo, and contains enough detail for the user to approve or correct before code edits.

5. Validate and serve locally.
   - Run the helper's `checkCommand` first.
   - If the check passes, run the helper's `serveCommand`:
     ```sh
     npx @agent-native/core@latest plan local serve --dir <localDir> --kind plan --open
     ```
   - Keep the serve process running until the user has the URL or asks to stop.
   - Completion criterion: a local Plan URL is available, or the exact validation/rendering failure is reported with the generated `localDir`.

## Output To User

Report:

- the planning title and source brief used;
- the local Plan folder;
- the local Plan URL if serving succeeded;
- the key approval questions and implementation/VAR checkpoints.

Do not present the visual plan as approved. It is an approval gate before implementation, not the implementation itself.
