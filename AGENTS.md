# AOHYS Agent Instructions

Read this file before changing the repository.

## Coding orchestration

The pinned Development System supplies the shared workflow and native agent
profiles. Read its [contract](.codex/development-system/contract.md) and the
[product adapter](.codex/development-system/repository.md). Use the installed
`coding-orchestration` skill for non-trivial work and the global Codex agents
from `${CODEX_HOME:-$HOME/.codex}/agents`.

Keep the already selected model, including Astra, as the orchestrator. Let it
choose the approach, useful delegation and proportional checks under that
contract. Role profiles recommend defaults; they do not replace the selected
parent or prove runtime capabilities. Do not duplicate model routing, execution
recipes or lifecycle gates in product documentation.

Visual planning remains opt-in. Use a standalone completion/review document when requested or needed for the
agreed evidence package; ordinary completion uses the final response.

## Merge gate

Agents may push branches, open pull requests, and resolve or close review threads as part of normal execution. Do not merge any PR or branch into `develop`, `main`, or production release branches unless the user explicitly authorizes that merge. One instruction may authorize
implementation, merge and publication together; retain it through the task.
General instructions like "avanza" or "continua" alone are not merge approval.

## Delivery quality

- Use `pnpm quality:changed` for ordinary implementation and pre-push feedback.
- Run `pnpm quality:certify` once for the integrated candidate, not once per implementation lane.
- Both gates run static validation, lint, typecheck and build only; they run no automated tests.
- Select Browser QA (real observation of the running product) from observable risk. Documentation, copy, labels, icons, and internal-only changes do not require browser ceremony without a mapped user surface.
- Parallel or sequential lanes converge before `develop`; Git owns commit continuity and the branch produces one shared preview without manual SHA bookkeeping.
- Prove provider readiness before the shared preview when auth, data migrations, seeds, roles, or environment contracts changed.

## No automated tests

The owner does not want automated tests in this repository. Agents must not
create, generate, modify, or run automated tests of any kind (unit,
integration, E2E, or browser test suites), and must not add test runners,
test configs, test scripts, or test-only dependencies. This overrides any
skill, workflow, or template that asks for tests (including TDD). Verify
changes with typecheck, lint, build, and real browser observation of the
product instead.

## Tool routing

- Use the bundled Browser plugin for browser and visual QA.
- Use Computer Use for local Mac app UI work that Browser or shell cannot perform.
- Do not replace Browser verification with ad hoc Playwright.
- Do not replace Computer Use with Browser or shell when local Mac app UI operation is the task.
- Do not use GitHub Actions to orchestrate local subagents.

## Devin Cloud

`environment.yaml` is the cloud blueprint; it provisions `$HOME` from the committed `.codex/` mirror and the `.agents/skills/` union, then runs `pnpm ds setup`. `.devin/` holds shared agent config and MCP servers; secrets live in Devin org secrets, never in the repo. Update the blueprint when the pinned toolchain or committed agent assets change.

## Agent skills

### Issue tracker

Linear is the operational tracker for AOHYS; external pull requests are not an automatic triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix` labels. See `docs/agents/triage-labels.md`.

### Domain docs

AOHYS uses a single domain context through `CONTEXT.md` and global ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## Development System package

The package version in `package.json` and its lockfile are the source for the
managed `.codex/` and `.agents/skills/` mirrors. Run `pnpm ds setup` explicitly
after adopting a release; dependency installation never changes HOME. Prefer
`pnpm ds` over an unrelated global CLI version.

The product adapter supplies AOHYS commands and boundaries. Shared workflow
instructions come from the installed contract and skills; preserve their
canonical bytes rather than maintaining a second local policy. Load only the
guidance needed for the requested work and continue to the authorized endpoint.
