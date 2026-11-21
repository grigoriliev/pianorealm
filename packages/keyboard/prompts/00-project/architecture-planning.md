# Phase 0 — Architecture Planning and Contract Decisions

> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Planning / architecture review  
> **Development phase:** 0 — Architecture, contracts, and decisions  
> **Expected outcome:** Reviewable decisions, ADR drafts, and a verified handoff into Phase 1  
> **Execution rule:** **Do not implement application or library code in this phase.**

## Your role

Act as a senior TypeScript library architect reviewing the first package in the **Pianorealm** ecosystem. Your job is to turn existing requirements and proposed designs into a coherent, minimal, reviewable architecture for `@pianorealm/keyboard` **without expanding its scope**.

Use precise, implementation-ready language. Prefer small, stable contracts over speculative abstractions. Clearly distinguish **requirements**, **accepted decisions**, **recommendations**, and **unresolved questions**. Do not call a proposal an accepted contract merely because it appears in a draft document.

## 1. Read the sources before proposing decisions

From the repository root, inspect these files in this order:

1. `docs/ECOSYSTEM.md` — ecosystem vision, package boundaries, and ownership.
2. `docs/ARCHITECTURE.md` — cross-package dependency and integration rules.
3. `packages/keyboard/PROJECT_SPEC.md` — keyboard functional and release requirements.
4. `packages/keyboard/ARCHITECTURE.md` — proposed internal package architecture.
5. `packages/keyboard/DEVELOPMENT_PLAN.md` — milestone definitions and Phase 0 gate.
6. `packages/keyboard/PROJECT_STATE.md` — last evidence-based status and open decisions.
7. Existing `docs/decisions/` and `packages/keyboard/docs/decisions/`, if present.
8. Existing `packages/keyboard/` source, tests, configurations, and Git metadata, if available.

If `packages/keyboard/PROJECT_SPEC.md` is absent, **report the missing source explicitly**. Do not silently substitute an unrelated document. Ask for the intended specification when its absence would prevent a reliable decision; otherwise continue with a clearly labeled provisional audit based on the available sources. Do not claim that an uninspected repository or file is empty.

### Source precedence and conflict handling

- Ecosystem documents govern **cross-package** boundaries.
- The keyboard specification governs **required keyboard behavior**.
- The package architecture contains **proposals** until accepted or recorded in an ADR.
- The development plan governs **phase ordering and completion gates**.
- Project state records **observed progress**, not requirements.
- Accepted ADRs govern their explicit decision scope, subject to an explicit review if they conflict with higher-level requirements.
- **This prompt is a workflow instruction, not an architectural source of truth.**

When sources disagree, record each conflict with file/section references, competing interpretations, impact, and a recommended resolution. Do not silently rewrite requirements to eliminate a conflict.

## 2. Scope and guardrails

### In scope

- Define module boundaries, dependency direction, and a minimal public API sketch.
- Resolve or document critical Phase 0 design decisions.
- Describe deterministic note, geometry, visual state, and shared SVG-scene contracts.
- Design compatibility points for future Pianorealm packages without creating those packages.
- Set measurable Phase 1 prerequisites, fixtures, and release-relevant constraints.
- Draft architectural decision records (ADRs) and update planning documentation **when authorized by the repository workflow**.

### Explicitly out of scope

- Implementing TypeScript modules, rendering logic, build tooling, tests, or demos.
- Implementing mouse, pointer, touch, or computer-keyboard input (`@pianorealm/interaction`).
- Implementing MIDI devices or transport (`@pianorealm/midi`).
- Implementing audio (`@pianorealm/audio`).
- Creating shared packages solely because reuse might be needed later.
- Building a generalized plugin framework or exposing internal DOM/SVG nodes.
- Claiming runtime, browser, Anki, build, or test verification without executing checks.

**Non-negotiable boundaries:** `keyboard` is a framework-independent **visualization-only** package; MIDI note integers `0..127` are canonical (`C4 = 60` by default); geometry and scene generation are DOM-independent; live and static SVG share the same geometry/appearance model; multiple instances and offline embedded use are design constraints; other Pianorealm packages must not become mandatory keyboard dependencies.

## 3. Work in bounded passes

### Pass A — Repository and requirements audit

1. Identify which referenced files actually exist and which were read.
2. Determine whether there is working code, tests, package configuration, or ADR history. Cite observed paths and current Git branch/commit if available; otherwise say **Unknown**.
3. Produce a compact requirements-to-architecture traceability table covering: notes, geometry, rendering, state, skins, overlays, resizing, events, hit testing, static SVG, accessibility, security, embedded/Anki, distribution, and cleanup.
4. List contradictions, omissions, ambiguities, or risky assumptions and rank them **Blocking / Important / Can defer**.
5. Identify which decisions must be made for **Phase 1**, which must be fixed before **Phase 2–3**, and which can remain deferred until **Phase 8–10**. Avoid premature specificity in future-package integrations.

**Output:** An audit with source references and a prioritized decision backlog. Do not edit substantive architecture files before this audit is complete.

### Pass B — Decide the minimum stable contracts

For each topic below, provide a **recommended decision**, at least one **alternative**, the **tradeoffs**, the **affected modules/APIs**, and a **testable invariant**. Mark the decision **Proposed**, **Accepted** (only with supporting evidence), or **Deferred** (with the safe interim rule).

| ID | Topic | Questions to resolve |
| --- | --- | --- |
| A-01 | Repository and modules | Package directories, imports, dependency direction, workspace assumptions, public/internal exports, TypeScript/build baseline. Do not require a monorepo tool prematurely. |
| A-02 | Note semantics | Scientific notation (`C4 = 60`), sharps/flats, octave offsets, parsing errors, inclusive MIDI endpoints, single-note ranges. |
| A-03 | Geometry boundaries | White/black key coordinates, partial octaves, black-key range endpoints, clipping/insets, z-order, orientation transforms, virtual adjacent white keys. |
| A-04 | Coordinate system and sizing | Logical SVG units, fixed/container sizing, scaling vs. recomputation, initial fit/overflow policy, test fixture dimensions. |
| A-05 | Visual state | Pressed notes outside the visible range, order of returned keys, duplicate inputs, repeated press/release, range/skin/orientation/resize preservation. |
| A-06 | Configuration | Defaults, nested merge vs. replacement, validation and atomic updates, `setOptions()` behavior, skin override precedence. |
| A-07 | Shared scene and rendering | Pure geometry → resolved scene → static serializer/live renderer; key identity, layer order, incremental DOM updates, deterministic output and IDs. |
| A-08 | Safe content and styling | Label escaping, validated color/size/shape inputs, declarative overlay policy, custom SVG restrictions, CSS isolation and namespace/ID collision avoidance. |
| A-09 | Public composition interfaces | Narrow hit-testing surface with coordinate space, bounds and black-key precedence; no private node access; no pointer/MIDI/audio logic. |
| A-10 | Events and extensions | Minimal typed events, payloads, no-op semantics, subscription cleanup, extension lifecycle; avoid unnecessary generalization. |
| A-11 | Runtime and distribution | ESM/TypeScript exports, standalone/UMD and proposed `Pianorealm.Keyboard` global, offline assets, optional CJS, multiple bundle coexistence. |
| A-12 | Embedded/Anki and accessibility | Feature detection, repeated initialization/teardown, reduced motion, screen-reader labels, night mode integration, explicit untested-client policy. |

For each contract, include concrete examples or small **type/interface sketches** where they remove ambiguity. Mark all sketches as *non-implemented*. Do not invent a cross-package `NoteAction` or a global event bus as a settled ecosystem API.

### Pass C — Architecture blueprint

Produce the following concise artifacts for review:

1. **Responsibility map** — modules and who owns parsing, geometry, configuration, visual state, skin resolution, scene creation, SVG serialization, DOM mounting, events, and extensions.
2. **Dependency diagram** — allowed module imports with no cycles; browser-specific adapters must not be imported into the pure static rendering path.
3. **Data-flow diagram** — configuration + visual state → pure geometry/appearance → shared scene → live DOM or standalone SVG string.
4. **Public API sketch** — constructor, `setPressedKeys`, `pressKey`, `releaseKey`, `clearPressedKeys`, `getPressedKeys`, `setRange`, `setOrientation`, `setSkin`, `setOptions`, `resize`, `destroy`, `renderToSVG`, plus proposed overlay/event/hit-test entry points. Explain what is intentionally private.
5. **Lifecycle narrative** — initialization, key-state-only update, structural update, resize, static generation, repeated initialization, destroy, and double-destroy handling.
6. **Cross-package integration example** — conceptual application-mediated use of `interaction`/`midi`/`audio`, showing that the keyboard does not own or trigger those effects.
7. **Risk register** — severity, trigger, mitigation, earliest phase of verification, and whether the item blocks Phase 1.

Avoid designing a large framework. Include only abstractions required by documented needs or an immediate compatibility invariant.

### Pass D — Fixtures, quality gates, and ADRs

Define a small, high-value verification matrix that later phases can turn into automated tests:

- Note parsing: `C4 → 60`, enharmonics, octave naming/offset, invalid inputs, and MIDI boundaries `0/127`.
- Geometry: full and partial octaves; ranges starting/ending on black notes; **single black note**; edge notes; both orientations; known widths/heights.
- Rendering: white/black stacking, equal scene coordinates for static/live output, safe XML text/attribute handling, unique instance IDs.
- State: multi-note pressing, duplicates, out-of-view retention policy, no-op calls, preservation across configuration changes.
- Integration: black-key hit precedence, out-of-bounds points, stable public semantics without private DOM access.
- Host behavior: repeated mount/unmount, multiple keyboards, no external assets, absent `ResizeObserver`, reduced motion, Anki-specific smoke checks when a runtime is available.

For each critical decision, propose a focused ADR. Use these locations:

- Ecosystem-wide decisions: `docs/decisions/NNNN-short-title.md`
- Keyboard-only decisions: `packages/keyboard/docs/decisions/NNNN-short-title.md`

Each ADR should include **Title, Status, Context, Decision, Alternatives, Consequences, Verification, and References**. Inspect existing numbering before assigning the next number. Draft ADRs as `Proposed` unless there is explicit evidence of approval; never self-label them `Accepted` merely by writing them.

Distinguish **design-time checks** (review of invariants/fixtures) from **executed checks** (commands actually run). Phase 0 does not require code tests or builds.

## 4. File-change policy

- First complete the audit and recommendations; then, if editing is available and consistent with the user's request, create **focused ADR drafts** and update `packages/keyboard/ARCHITECTURE.md` only to reference clearly proposed or accepted decisions.
- Do not change `docs/ECOSYSTEM.md`, `docs/ARCHITECTURE.md`, or `packages/keyboard/PROJECT_SPEC.md` to silently resolve conflicts. Instead supply a precise proposed change and its rationale; apply authoritative changes only after explicit review/approval.
- Do not create `src/`, tests, or build config in Phase 0.
- Update `packages/keyboard/PROJECT_STATE.md` **only with observed facts**: audited files, drafted decisions, outstanding approvals, checked Git metadata, and next exact action.
- Preserve the existing phase status until its documented completion gate is genuinely met; distinguish **planning completed** from **design approved**.
- Keep changes scoped and readable for Git review. Do not overwrite unrelated work.
- If file-editing or repository access is unavailable, provide copy-ready content and an exact file change list instead of claiming that files were modified.

## 5. Phase 0 completion gate

Do **not** declare Phase 0 complete until all of the following are true:

- [ ] Available authoritative sources have been inspected, and missing sources are explicitly recorded.
- [ ] Material conflicts have been resolved through the appropriate authority, or remaining issues are explicitly documented and nonblocking.
- [ ] Critical note, geometry, state, scene, configuration, and lifecycle policies are reviewable and no longer ambiguous for Phase 1.
- [ ] Key decisions have ADRs with a clear approval status; significant unresolved decisions have owners or a documented safe deferral.
- [ ] Initial module dependency map, public API sketch, and geometry fixture list are documented.
- [ ] Future `interaction`, `midi`, and `audio` needs are supported through public composition boundaries, not keyboard dependencies.
- [ ] `PROJECT_STATE.md` accurately reflects decisions, verification evidence, blockers, and the next task.
- [ ] A maintainer has reviewed and accepted the Phase 0 baseline (or the repository's documented approval process has been satisfied).

If any condition remains unmet, report **Phase 0: In progress / awaiting decision**, not **Complete**. Do not begin Phase 1 automatically.

## 6. Required final response

Return a concise but actionable report in this order:

1. **Repository evidence:** Files inspected; branch/commit if observed; missing documents.
2. **Requirements audit:** Important conflicts and gaps, with file/section references.
3. **Decision table:** IDs A-01 to A-12, status, recommendation, tradeoff, and blocking phase.
4. **Architecture blueprint:** Modules, dependency direction, data flows, public API/lifecycle sketches.
5. **ADRs:** Proposed filenames and statuses; identify any ADRs actually written.
6. **Verification plan:** Fixtures and exact design/implementation checks; distinguish planned from executed.
7. **Files changed:** Exact paths, or **None** if only advising.
8. **Phase 0 status:** Complete / In progress / Blocked, with explicit gate evidence.
9. **Next bounded task:** One concrete follow-up suitable for a limited AI session.

**Do not claim approvals, commits, passing tests, browser compatibility, or implemented functionality without evidence.**
