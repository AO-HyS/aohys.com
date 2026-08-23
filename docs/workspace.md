# AOHYS Workspace

This is the World Tree for `aohys.com`: a directional guide for finding the authority behind a change, identifying who decides, and placing new code. It deliberately does not mirror the current repository tree. Manifests, public exports, imports, generated bindings, and source-derived graphs are the current-state evidence for any analyzed commit.

## Start With Authority

Before choosing a directory, identify the decision that the change belongs to:

- Domain language and human decision rights come from [AOHYS Site Context](../CONTEXT.md) and the [Domain Docs policy](agents/domain.md).
- Architecture decisions belong in the durable [ADR collection](adr/); an ADR records a consequential boundary decision instead of a folder preference.
- Work ownership, assignees, dependencies, and resolution comments live in the [Issue Tracker](agents/issue-tracker.md).
- Existing operational boundaries are described by the [Environment Contract](environment-contract.md), [Public Content Graph](public-content-graph.md), [Dashboard UI Kit](dashboard-ui-kit.md), and [Release Train](release-train.md).
- Release and incident procedures live in the [Release Train](release-train.md) and [Launch Hardening Checklist](launch-hardening.md). These are the runbooks; this guide must not duplicate their commands or provider state.

The accountable human decides business intent, scope, review, and release. The assigned Linear owner decides execution within those boundaries. If a proposed placement changes a consequential boundary, the relevant ADR must decide it before the directory structure does.

## Placement Decision Tree

Follow these questions in order. Stop at the first answer that provides a clear owner.

1. **Does the change alter domain language or business responsibility?** Start in `CONTEXT.md`. Resolve the term or responsibility before writing code; record a consequential boundary decision in an ADR.
2. **Does an existing contract already own the behavior?** Follow that contract's documentation to its source, tests, and public interface. Add behavior behind the owner rather than beside it.
3. **Is this behavior private to one product capability?** Place UI, state, actions, validators, and tests together inside the capability that owns the user or operational outcome. Let the nearest manifest and public export confirm the boundary.
4. **Must multiple capabilities use it?** First prefer a behavior-oriented facade owned by one capability. Create or extend a shared primitive only when the callers genuinely share the same invariant, not merely similar syntax.
5. **Does it cross a runtime or provider boundary?** Put validation and translation at the boundary named by the Environment Contract. Keep provider details behind that interface and keep release operations in the Release Train.
6. **Is the target generated?** Change the owning schema, manifest, or generator and regenerate the artifact. Never make a generated file the architectural source of truth.
7. **Is ownership still ambiguous?** Do not default to a global `lib`, `types`, `utils`, or catch-all package. Assign an owner in Linear and, when the decision is durable or costly to reverse, capture it in an ADR before adding a new boundary.

After placement, verify the dependency points toward the owner, the owner's public interface stays small, and the focused behavior test lives with the behavior. A directory name alone is not evidence of ownership.

## Durable Navigation

Use the source that matches the question instead of searching for a manually curated tree:

| Question                                                  | Durable source                                                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| What does this concept mean, and who remains accountable? | `CONTEXT.md` and `docs/agents/domain.md`                                                                      |
| Who owns the work and its dependency order?               | Linear, through `docs/agents/issue-tracker.md`                                                                |
| Why does this boundary exist?                             | The relevant record under `docs/adr/`                                                                         |
| What behavior does an operational boundary promise?       | Its contract document and public source interface                                                             |
| How is a release, recovery, or smoke check performed?     | `docs/release-train.md` and `docs/launch-hardening.md`                                                        |
| What exists at this commit?                               | Workspace/package manifests, imports, exports, generated artifacts, and source-derived graphs for that commit |

When code moves, update its manifest, imports, public exports, tests, and any affected contract or ADR. Do not update this guide with a synchronized list of directories or modules.

## Illustrative, Non-Exhaustive Example

The names in this example are illustrative and non-exhaustive. They show how to follow ownership at one point in the repository's history; they are not a required layout, a complete inventory, or a promise that these paths remain present.

Suppose a public content change also needs private editing and deployment validation. Begin with the Public Content Graph contract. Its evidence may lead through a public surface such as `apps/site`, a private workflow such as `apps/dashboard`, a provider-backed boundary such as `apps/backend`, and shared contract code such as `packages/content-graph`. Only if the invariant is truly cross-capability should it move toward a primitive boundary such as `packages/core` or `packages/environment`; release behavior remains behind a boundary such as `packages/release-train`.

The point of the example is the direction of the decisions: contract, owner, capability, boundary, verification. Before changing any named path, confirm the actual owner from the source at the commit you are editing.

## Local and Release Boundaries

Use pnpm from the repository root:

```sh
pnpm install
pnpm verify
```

Local values belong in `.env.local`; deploy-time values follow the Environment Contract. Promotion, provider reconciliation, smoke checks, and Cloudflare operations follow the Release Train and Launch Hardening runbooks. Do not infer live provider state from this document.

## Source Boundary

The repository is public as an engineering sample. Code is MIT licensed. Content, brand, copy, resume material, case-study material, images, generated media, and assets are reserved unless stated otherwise.

This is not a community open-source product and does not include a contribution workflow.
