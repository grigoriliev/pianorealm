# Phase 8 — Public Events, Hit Testing, and Extension Lifecycle

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation  
> **Phase:** 8 (requires verified Phase 7)  
> **Working directory:** Pianorealm repository root  
> **Scope:** Typed visualization events, public geometry-backed hit testing, minimal extension lifecycle, tests, and focused API documentation

## Objective

Implement **Phase 8** of `@pianorealm/keyboard`: narrowly scoped public integration points that let other code **observe committed visualization changes**, **identify the note at a visual location**, and **install/dispose small visualization extensions** without depending on private SVG internals.

This is an integration foundation for future Pianorealm packages, **not** implementation of `@pianorealm/interaction`, `@pianorealm/midi`, or `@pianorealm/audio`. Preserve the existing pure geometry → shared scene → mounted/static SVG architecture and all completed Phase 1–7 behavior.

## 1. Read the authoritative project context

Read from the **local working tree** (which may be newer than public GitHub):

1. Root `AGENTS.md` and `packages/keyboard/AGENTS.md`.
2. `docs/ECOSYSTEM.md` and `docs/ARCHITECTURE.md` (package boundaries and cross-package composition).
3. `packages/keyboard/PROJECT_SPEC.md` (events, extensions, hit testing, isolation, lifecycle, Anki constraints).
4. `packages/keyboard/ARCHITECTURE.md` (geometry, coordinate systems, events, controller, extension ownership).
5. `packages/keyboard/DEVELOPMENT_PLAN.md` (Phase 8 scope, dependencies, gate, testing expectations).
6. `packages/keyboard/PROJECT_STATE.md` (verified completion and outstanding tasks).
7. All **accepted relevant ADRs** under `docs/decisions/` and `packages/keyboard/docs/decisions/`; especially the decisions covering layout/sizing/hit testing, note/configuration/state semantics, public API, events, extension lifecycle, and destruction.
8. Actual source, public exports, test fixtures, demo, and scripts for Phases 2–7.

**Authority rule:** Accepted ADRs and established public contracts take precedence over illustrative API sketches in this prompt. Do not silently alter a decision or infer that an example signature has already been accepted. If an essential decision is missing or contradictory, identify it and propose the smallest consistent resolution under the repository ADR process before publishing behavior.

## 2. Preflight: verify the local checkout

Before editing:

- Inspect `git status` and preserve all pre-existing work; do not reset, overwrite, or revert unrelated changes.
- Verify Phase 7 is recorded **and actually implemented**: labels/indicators/overlays work, and the package has the expected geometry, controller, mounted SVG, serializer, responsive sizing, pressed-state, and skin layers.
- Inspect current controller methods, geometry API, coordinate transforms, destroy policy, and any already implemented event/emitter or extension hooks. **Extend rather than duplicate** them.
- Run current package type checking, unit/integration tests, and production build using scripts that actually exist; record exact commands and results. If a check cannot run, report why.
- Before writing code, provide a brief plan showing files likely to change, event contract, hit-test coordinate strategy, extension lifecycle, and verification approach.

If a prerequisite phase or necessary architectural contract is missing, **stop and report the blocker**, rather than implementing earlier phases implicitly.

## 3. Public typed visualization events

Implement the event names established by the approved architecture (where applicable):

- `pressedKeysChanged`
- `rangeChanged`
- `orientationChanged`
- `skinChanged`
- `resized`
- `destroyed`

### 3.1 Public API and types

- Use a small, strongly typed event map with a documented payload type per event; avoid `any` and avoid exposing private controllers, raw DOM nodes, or mutable internal collections.
- Prefer a concise subscription pattern such as `piano.on(eventName, handler)` returning an **idempotent unsubscribe function**, **if consistent with the accepted ADR**. Add `off()` only when approved or needed by the established API.
- Export only intended public event types and APIs from the package's documented entry point(s), not source-relative internal imports.
- Event payloads must contain useful, immutable/read-only snapshots of **committed** state: for example ordered pressed MIDI notes, validated range, orientation, active skin identity, or resolved dimensions as relevant. Do not publish internal `Set` objects or mutable geometry references.
- Avoid creating DOM-specific event contracts unless the accepted architecture explicitly calls for them.

### 3.2 Delivery semantics

Define and verify behavior consistently with accepted ADRs for:

- Synchronous vs. asynchronous delivery; for a minimal implementation, prefer **post-commit synchronous** delivery if undecided and safe.
- Deterministic event ordering when one public operation affects multiple observable values.
- No-op operations: repeated `pressKey`, repeated `setSkin`, unchanged resize, equivalent set replacement, etc. Use the **approved** emission policy; do not invent duplicate notifications.
- Atomic validation: invalid operations must not alter state or emit a success event.
- Listener mutation during dispatch: subscribe/unsubscribe while delivering, reentrant state changes, and self-unsubscription must behave deterministically.
- Listener exceptions: adopt the approved error-isolation policy and test it explicitly. One faulty consumer should not corrupt committed keyboard state or unintentionally prevent required cleanup.
- Event delivery during `destroy()`: specify when `destroyed` fires, what is still observable at that instant, whether it fires exactly once, and how subscriptions are cleared afterward.
- Calls after destruction: follow the already established use-after-destroy policy. Make `destroy()` itself idempotent.

**Boundary:** These events describe **visualization state changes**, not `pointerdown`, `noteOn`, `noteOff`, audio activity, or interactive gestures. Do not add browser input listeners to implement them.

## 4. Geometry-backed public hit testing

Make a narrow, documented method available to future interaction consumers without forcing them to inspect key `<rect>` elements or depend on internal SVG selectors.

### 4.1 Coordinate contract

- Consult the accepted layout/hit-test ADR for exact signature, origin, units, boundary inclusion, and viewport behavior.
- If it approves a method comparable to `getNoteAtPoint(x, y): number | null`, implement **that** contract. The signature here is illustrative, not an override of ADRs.
- Clearly define whether callers pass **container-local CSS pixels**, SVG user units, or another coordinate space. Coordinate meaning **must not vary silently** with sizing mode or orientation.
- Convert host-local coordinates to the geometry coordinate system in the mounted/controller boundary. Keep the pure geometry hit-test implementation DOM-independent.
- Account for actual mounted transforms and scaling, including SVG `viewBox`, container-based sizing, possible offsets/padding, and any approved clipping/scrolling behavior. Use existing sizing/layout abstractions, not a second geometry algorithm.
- Report `null` (or the approved result) for points outside the rendered keyboard, invalid/unavailable layout, and gaps according to the accepted contract. Reject non-finite coordinates as prescribed by validation rules; avoid returning an arbitrary note.
- Black keys must take precedence in overlapping regions, consistent with visual stacking. At edges or exact shared boundaries, use the stable policy from the layout ADR.
- Support horizontal and vertical keyboards, partial ranges, black-key endpoints, single-note ranges, and resizes. Hit testing must reflect the **current committed layout**, not stale geometry.
- Do not expose mutable key-geometry references or internal SVG nodes. Any public bounds accessor must be narrowly justified and read-only.

### 4.2 Integration boundary

- **Do not** register pointer, mouse, touch, keyboard, or MIDI input handlers as part of Phase 8.
- **Do not** implement key-pressing as a side effect of hit testing. It identifies a location only.
- Add a short, non-executable conceptual composition example demonstrating how an application or future `@pianorealm/interaction` *could* call hit testing and then choose to update visualization. Label such examples as illustrative unless corresponding APIs are implemented.

## 5. Minimal extension lifecycle

Implement only the extension mechanism approved by the architecture and ADRs. The goal is **small, explicit extension points**, not a general plugin platform.

### 5.1 Install and dispose

- Prefer the agreed `piano.use(extension)` lifecycle if adopted, with a typed, bounded extension interface and a clearly defined installation return value/disposer.
- An extension may subscribe to public events and use **documented public APIs** for registered skins, overlays, and visual contributions if those registration APIs are already accepted. Avoid granting raw internal renderer, scene, controller, or DOM mutation access.
- Define initialization, successful installation, failed initialization/rollback, individual disposal, and implicit disposal during keyboard destruction.
- Disposal must be idempotent and clean up event subscriptions and other resources **owned by that extension**. Destroying one extension must not affect unrelated extensions or keyboard instances.
- Decide and document handling of duplicate registration, invalid extension objects, reinstallation, extension disposal during event dispatch, and registration after keyboard destruction, according to established policy.
- If initialization throws, leave the instance in a consistent state and do not leak partially registered resources.
- Document deterministic cleanup order where ordering matters. Verify that destroy remains safe if cleanup throws under the adopted error policy.
- **Do not** introduce runtime dependencies on future packages, dynamic remote plugin loading, dependency injection containers, arbitrary SVG insertion, or a broad extensibility framework.

### 5.2 Registration surface

- Reuse Phase 5 custom-skin and Phase 7 overlay APIs when these already serve extension needs.
- Add only the minimum documented registration mechanism needed to meet an accepted Phase 8 contract.
- Do **not** create unbounded `registerElement()`, unrestricted HTML/SVG markup injection, or private DOM escape hatches. Preserve existing text escaping, safe SVG attributes, namespace isolation, and static/live parity.
- If the approved architecture explicitly defers custom overlay **type registration**, note the deferral; do not fabricate a new extensibility requirement.

## 6. Preserve established behavior and constraints

- All note identifiers remain canonical MIDI integers (0–127); reuse existing note normalization.
- Existing visual pressed-state methods remain visual-only and keep off-range notes according to the state ADR.
- Event/extension code must not force a full SVG reconstruction for a note-only change; avoid unnecessary layout work.
- Switching skins, range, orientation, and responsive size must retain existing state preservation and visual-layer rules.
- Static SVG rendering remains **DOM-independent** and must not serialize listeners, extension lifecycle objects, or browser-only resources.
- Preserve scoped CSS/IDs, safe SVG generation, accessibility semantics, reduced-motion handling, offline operation, multiple instances, and embedded/Anki lifecycle constraints.
- Prefer no new runtime dependencies. Keep TypeScript declarations accurate and exported APIs intentional.

## 7. Tests and verification

Add focused unit and integration tests using the project's existing test setup. Cover at least:

### Events

- Each supported event fires with the correct name, committed-state payload, and immutable/snapshot behavior.
- No-op emission policy and invalid-operation non-emission.
- Listener unsubscribe and repeat-unsubscribe behavior.
- Listener registration/removal during dispatch; deterministic order and reentrancy behavior.
- Listener exception policy and absence of state corruption.
- `destroyed` event exactly once (as approved), event/subscription cleanup, and post-destroy behavior.
- Separate keyboard instances do not share listeners.

### Hit testing

- Interior points for representative white keys and black keys.
- Overlap: black key wins over the white key beneath it.
- Boundary/outside points, gaps, non-finite coordinates, and unavailable layout.
- Horizontal and vertical orientation, including vertical low-note-at-bottom semantics.
- Partial ranges, black-key start/end notes, and single-note ranges.
- Fixed and container sizing, `viewBox`/CSS scaling, offsets, and resizing where supported by the current rendering model.
- Geometry and mounted hit-test behavior stay consistent; no accidental changes to Phase 2 numeric layout fixtures.

### Extensions

- Install/initialize, explicit dispose, implicit dispose on keyboard destruction.
- Cleanup is idempotent, does not leak subscriptions, and is independent across multiple instances.
- Failed initialization rolls back owned resources; duplicate install and post-destroy cases follow the documented policy.
- An extension operates only through approved public interfaces and does not need internal DOM access.
- Existing custom-skin/overlay behavior remains intact if extension APIs compose with it.

### Regression and build

- Retain tests for pressed state, overlays, skin switching, container sizing, static serialization, and live SVG rendering.
- Run type checking, full relevant test suite, and production build using the actual package scripts.
- Perform a small browser/manual check of hit testing if the test environment cannot accurately represent CSS layout. Report manual checks separately from automated tests.
- Verify emitted TypeScript declarations/public exports for event and extension consumer code.
- If tests cannot exercise real Anki clients, **do not claim Anki compatibility was verified**.

Do not assert test success without actually executing the commands.

## 8. Documentation and demonstration

- Document event names, payload schemas, subscription/disposal, no-op/event ordering semantics, and destruction behavior.
- Document the **exact** hit-test coordinate space with a compact diagram or example; include behavior outside the keyboard and over black keys.
- Document extension installation and cleanup using public APIs; clearly label future-package composition examples as conceptual.
- Update an existing lightweight demo **only if useful for manual verification**. A simple coordinate probe or event log is sufficient; do not turn the demo into an interactive piano or add actual pointer-to-press functionality in the library.
- Do not build the full playground (Phase 10) or introduce Anki distribution/build changes (Phase 9).

## 9. Explicitly out of scope

Do **not** implement:

- Pointer/touch/mouse/computer-key interactions or keyboard-control behavior.
- MIDI input/output, device integration, or sound/audio playback.
- Production interaction/MIDI/audio packages or mandatory cross-package dependencies.
- Full static SVG release tooling, Anki documentation and bundles (Phase 9).
- Remaining skins, full playground, broad compatibility certification, or release publishing (Phase 10).
- A generalized plugin dependency resolver, arbitrary custom DOM access, or unapproved public APIs.

## 10. Required execution workflow

1. Read the source documents and inspect the current local implementation.
2. Verify the Phase 7 gate, inspect `git status`, and run baseline checks.
3. Identify accepted contracts and any blocking ambiguities; propose narrowly scoped resolutions when needed.
4. Briefly outline a minimal implementation and test plan.
5. Implement typed visualization events with deterministic semantics and tests.
6. Implement geometry-backed public hit testing and tests.
7. Implement minimal extension installation/disposal and tests.
8. Document the public integration contracts and, if appropriate, add a small non-interactive verification demo.
9. Run verification; fix defects in Phase 8 work without unrelated rewrites.
10. Update `packages/keyboard/PROJECT_STATE.md` with **verified** results, remaining risks, and Phase 9 readiness. Mark Phase 8 complete only when its gate has genuinely passed.
11. Do **not** commit, push, publish, or begin Phase 9.

If resource limits interrupt execution, leave the repository in a coherent state, accurately record unfinished work, and give the next bounded task. Do not falsely mark the phase complete.

## 11. Completion gate

Phase 8 is complete only when all applicable conditions are met:

- [ ] Public typed event API is implemented and intentionally exported.
- [ ] Accepted event payload, no-op, order, error, and destroy semantics are documented and tested.
- [ ] Public hit testing uses existing geometry, correct coordinates, and black-key precedence.
- [ ] Multiple orientations, scaling/sizing modes, range edge cases, and out-of-bounds cases are tested.
- [ ] Minimal extension lifecycle installs and disposes safely without private DOM access.
- [ ] Existing Phase 1–7 functionality remains intact, with relevant regressions passing.
- [ ] No interaction, MIDI, or audio logic or dependency was added to `@pianorealm/keyboard`.
- [ ] Actual type-check, test, and build outcomes are recorded, including environmental blockers.
- [ ] Public documentation and `PROJECT_STATE.md` reflect what is really implemented.

**Phase gate from the development plan:** External consumers can observe visual-state changes and map locations to notes without relying on private SVG internals.

## 12. Final report format

Provide a concise final report covering:

1. **Implemented scope:** events, hit testing, extensions, and any deliberate deferrals.
2. **Public contracts:** API signatures, payload types, coordinate system, and lifecycle semantics.
3. **Changed files:** created/modified files and purpose.
4. **Verification:** exact commands run, results, test counts if known, and any manual checks.
5. **Remaining risks:** unresolved design choices, gaps, or environments not verified.
6. **Project state:** what changed in `PROJECT_STATE.md`, whether the Phase 8 gate passed, and the next bounded Phase 9 preparation task.

Do not report unrun tests as passed. Do not commit or push.
