# Pianorealm — Agent Instructions

These instructions apply throughout this repository. A package may add narrower instructions in its own `AGENTS.md`; package instructions supplement these rules and must not override ecosystem boundaries.

## Mission and source documents

Pianorealm is a modular ecosystem for piano-related software. Its packages must work independently and compose through documented public APIs. Start by reading only the documents relevant to the task:

- `docs/ECOSYSTEM.md` — vision, package ownership, and composition principles.
- `docs/ARCHITECTURE.md` — cross-package contracts, dependency policy, lifecycle, and distribution conventions.
- `packages/<name>/PROJECT_SPEC.md` — package requirements (where present).
- `packages/<name>/ARCHITECTURE.md` — package design; proposed signatures are not automatically approved.
- `packages/<name>/DEVELOPMENT_PLAN.md` and `PROJECT_STATE.md` — milestones and evidence-backed handoff.
- `docs/decisions/` and package-specific `docs/decisions/` — accepted architecture decisions (ADRs), when present.

If a referenced document is missing, report it. Do not assume a separately discussed document exists in the working tree. If documents disagree, explain the discrepancy and request a decision or record an explicit unresolved issue; do not invent a resolution.

## Non-negotiable ecosystem boundaries

- `@pianorealm/keyboard` owns visualization only, **not** mouse/touch/keyboard interaction, MIDI I/O, or audio playback.
- Planned packages: `@pianorealm/interaction` owns human input, `@pianorealm/midi` owns MIDI devices/messages, and `@pianorealm/audio` owns audio generation/playback.
- Applications coordinate effects across packages. Calling a visual `pressKey()` must not emit MIDI or play sound.
- Do not introduce circular package dependencies, imports from another package's private `src/` internals, or coupling to private DOM/SVG structures.
- Do not introduce a mandatory shared runtime package or generic plugin infrastructure without a demonstrated need and an architecture decision.
- MIDI integers **0–127** are the standard note identity at package boundaries; default scientific notation uses **C4 = 60**. Other state concepts (visual state, input intent, MIDI transport, audio voices) stay separate.
- Proposed APIs, bundle names, integrations, and repository tooling are **not approved** merely because they appear in design examples.

## Task workflow

1. Inspect the actual working tree and relevant guidance before edits. Check applicable nested `AGENTS.md` files.
2. State the bounded goal and relevant constraints. Follow the active phase; **do not start implementation in a planning-only phase**.
3. Prefer the smallest cohesive change that fulfills the request. Keep modules focused, dependencies lean, and public exports intentional.
4. Do not edit unrelated files or rewrite architecture/contracts silently. For a breaking change, explain consequences and update relevant design records before implementation.
5. Add or update tests when behavior changes; run the most relevant checks available. Report **exact commands and observed results**. If execution is unavailable, explicitly say tests/builds were not run.
6. Review the diff for accidental modifications, leaked secrets, untracked generated files, and documentation drift.
7. At a meaningful checkpoint, update the relevant `PROJECT_STATE.md` with verified progress, remaining work, test evidence, and the next bounded task. Do not mark phases or compatibility targets complete without verification.

## Working with coding agents

- Treat prompts in `packages/*/prompts/` as **task instructions**, not as more authoritative than specifications and accepted ADRs.
- Prefer one focused implementation or review task per session. Avoid speculative implementation of future packages.
- Never claim to have committed, tested, packaged, or verified a change unless that action actually occurred.
- Do not commit, push, publish to npm, delete substantial files, or modify repository-wide dependencies without the user's explicit request.
- When a choice affects other packages, propose an ADR in `docs/decisions/`; keep package-local decisions in `packages/<name>/docs/decisions/`.

## Handoff format

End substantive tasks with a concise summary of **changes**, **checks performed and results**, **unresolved decisions/limitations**, and **next task**. State clearly if no files were changed.
