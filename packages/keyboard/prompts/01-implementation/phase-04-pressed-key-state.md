# Phase 4 — Programmatic Pressed-Key Visual State

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation  
> **Phase:** 4 (requires verified Phase 3)  
> **Working directory:** Pianorealm repository root  
> **Scope:** Logical pressed-note state, public state-control API, shared-scene presentation, and targeted mounted SVG updates

## Objective

Implement **Phase 4** of `@pianorealm/keyboard`: provide a reliable, programmatic pressed-key visualization API that operates independently of keyboard geometry, skins, browser input, MIDI devices, and audio. Multiple notes can be visually pressed simultaneously, and changing a key's state **must not rebuild the keyboard SVG**.

Build on the **existing Phase 1 note utilities**, **Phase 2 geometry**, and **Phase 3 scene/mounted renderer**. Do not replace those implementations or duplicate their calculations. The logical pressed-note model is the source of truth; the SVG is a derived view.

## Authority and required reading

Work against the **current local checkout**, not an assumed state of an earlier chat or GitHub `main`.

1. Follow repository-root `AGENTS.md` and `packages/keyboard/AGENTS.md`.
2. Read `docs/ECOSYSTEM.md` and `docs/ARCHITECTURE.md` for package boundaries.
3. Read `packages/keyboard/PROJECT_SPEC.md`, especially pressed-key visualization, state APIs, state preservation, rendering, and safety.
4. Read `packages/keyboard/ARCHITECTURE.md`, especially sections on state ownership, scene generation, mounted SVG updates, and public APIs.
5. Read `packages/keyboard/DEVELOPMENT_PLAN.md`, especially **Phase 4 — Programmatic pressed-key state** and the cross-phase gates.
6. Read `packages/keyboard/PROJECT_STATE.md` for the most recently verified local state.
7. Discover and read **all relevant accepted ADRs** in `packages/keyboard/docs/decisions/` and relevant ecosystem ADRs. In particular, locate the accepted decision on **note normalization, configuration transactions, and visual pressed state** (A-02, A-05, A-06), regardless of any future filename change.
8. Inspect the actual TypeScript source, exports, configuration normalization, scene shape, mounted renderer, serializer, tests, and development demo. **Discover real file names and interfaces; do not assume the suggested architecture tree was implemented verbatim.**

**Decision precedence:** Follow accepted ADRs and approved specifications over illustrative signatures in this prompt. If they materially disagree, report the conflict and use the documented decision process; do not silently invent a new contract.

## Preflight — establish the real baseline

Before modifying files:

1. Run `git status --short` and identify the current branch/worktree. Preserve unrelated or uncommitted user changes.
2. Confirm **Phase 3 is actually complete in this checkout**: scene model, mounted SVG renderer, structural range/orientation updates, basic lifecycle, and the preliminary serializer/parity path. If a prerequisite is missing, report the exact gap and avoid treating it as completed.
3. Run the existing package `typecheck`, `test`, and `build` scripts (discover names in `package.json`); record their **actual** outcomes and distinguish preexisting failures from regressions.
4. Inspect how the renderer identifies mounted key nodes and how the scene assigns base appearance. Briefly describe the minimal state-store and per-key update approach before editing.
5. Keep changes within `packages/keyboard/` unless a cross-package change is justified and necessary.
6. Do not discard or rewrite the Phase 3 development demo. Demo enhancements are optional and narrowly scoped to showcasing the new state API.

If the work is too large for one safe pass, implement a coherent tested slice and record remaining items in `PROJECT_STATE.md`; **do not claim Phase 4 is complete until its full gate passes**.

## Implementation scope

### A. DOM-independent pressed-note state model

Create a small state module (for example `src/state/pressed-keys.ts`, or the closest existing structure) that:

- Stores canonical **MIDI integers 0–127** in an internal `Set` or equivalent, with no DOM, SVG, skin, geometry, or browser dependencies.
- Normalizes public note names and MIDI inputs **at API boundaries**, using existing Phase 1 normalization and the instance's applicable notation configuration.
- Follows accepted **A-05** semantics: maintain all valid pressed MIDI notes, **including notes outside the currently displayed range**; render only the visible intersection.
- Deduplicates equivalent inputs (e.g. `60`, `"C4"`, `"B#3"` under the default convention).
- Returns a **fresh, ascending MIDI-number array** for public state reads. Never leak the mutable internal Set or expose internal state objects.
- Treats `pressKey` for an already-pressed note, `releaseKey` for an unpressed note, `clearPressedKeys` on an empty state, and `setPressedKeys` with the same normalized set as **no-ops**.
- Supports a full valid MIDI range regardless of the displayed keyboard range.
- Uses the established notation rules when names are ingested; changing notation later **does not reinterpret already-normalized notes**.
- Preserves state across orientation, range, fitting, sizing, and future appearance updates. Do not couple this state to a particular scene object or SVG element.

### B. Public `PianoKeyboard` state API

Implement and export the instance methods, following established public conventions and types:

```ts
piano.setPressedKeys(["C4", "E4", "G4"]);
piano.pressKey("C4");
piano.pressKey(61);
piano.releaseKey("E4");
piano.clearPressedKeys();
const midiNotes = piano.getPressedKeys(); // fresh ascending number[]
```

Required methods:

- `setPressedKeys(keys)` — **atomically replace** logical state with the normalized deduplicated set.
- `pressKey(key)` — add one valid MIDI note.
- `releaseKey(key)` — remove one valid MIDI note.
- `clearPressedKeys()` — clear all pressed notes.
- `getPressedKeys()` — return a detached ascending array of MIDI integers.

Validation and lifecycle:

- Use existing note parsing and errors: malformed input/type -> `TypeError`, invalid numeric/domain input -> `RangeError`, as established by accepted decisions.
- For `setPressedKeys`, **validate every item and prepare the entire new set before committing any change**. One invalid item must not partially change state **or** mounted visuals.
- Reject unsupported collection types according to the current API conventions; document the accepted input collection and whether arrays/iterables are supported. Do not accidentally iterate a string as a list of characters.
- Honor the accepted controller post-`destroy()` contract for all new methods; do not invent a conflicting lifecycle policy.
- Avoid introducing new public exports beyond the methods and necessary approved types; preserve private-module boundaries and the existing package export map.
- State changes are **visual commands only**: no synthesized note-on/off interactions, pointer handlers, audio, or MIDI output.

### C. Shared scene and visual presentation

- Extend the existing **DOM-independent shared scene** with only the state-derived information needed to render pressed keys, preserving note geometry and white-before-black stacking.
- Apply a **simple, accessible, clearly distinguishable pressed appearance** using the current Minimal baseline; reuse any already-established active-color tokens rather than inventing the Phase 5 skin system.
- Keep base geometry and structural scene generation independent of the mutable state store. Derive the visible pressed set from logical state plus current range.
- Use **the same scene appearance rules** for mounted SVG and the existing preliminary SVG-string serializer/parity fixtures. Do not create two independent pressed-style algorithms.
- The first cut may use a pressed fill or another minimal affordance; advanced indicator modes, custom colors, glow, animations, skins, and overlays belong to later phases. Do not claim their completion now.
- Avoid global styles, external assets, unchecked SVG string injection, and unsafe attribute values.

### D. Targeted live DOM updates (critical)

For a state-only change:

- Update **only the affected visible note nodes/attributes** using the renderer's existing instance-local MIDI-to-key-node registry or a minimal extension of it.
- **Do not replace the root `<svg>`**, the keyboard's structural layers, or unrelated key elements.
- `pressKey` / `releaseKey` should touch at most the matching visible key's presentation; changes to notes that are outside the current range should change only logical state, with no unnecessary DOM work.
- `setPressedKeys` should compute a **symmetric difference** (or equivalent) between old and new sets, and update just the visible notes whose pressed status actually changed.
- No-op operations should produce no visual mutations, even if the supplied note aliases differ.
- When a structural update is required (for example `setRange` or `setOrientation`), a scene/DOM rebuild is acceptable; the rebuilt keys must reflect the **existing logical state**, including notes that become visible again.
- Multiple controller instances must remain fully independent; do not query globally by note ID, CSS class, or element selector.
- Do not add user-input listeners or an event bus in this phase. Event semantics and the public event system are scheduled for Phase 8; avoid designing unapproved event payloads here.

### E. Minimal documentation / optional demo enhancement

- Update the package README or focused API documentation to show the five methods, canonical MIDI output ordering, off-range retention, and visual-only meaning of a pressed key.
- If a Phase 3 Vite demo exists, optionally add a **small, explicit programmatic showcase** (e.g. a button that highlights a C-major chord and another that clears it). Keep it small and separate from the production bundle. **Do not implement pointer-to-note playing** or the full Phase 10 playground.
- Do not mark Phase 5 skins or Phase 7 indicator/overlay features as delivered.

## Verification requirements

Use the existing Vitest and build setup. Add focused unit/integration tests without weakening or replacing existing coverage.

### 1. Pure state tests

- Empty initial state.
- `pressKey`, `releaseKey`, `clearPressedKeys`, and `setPressedKeys` produce the expected logical sets.
- Multiple simultaneous pressed notes, including both black and white keys.
- Mixed MIDI numbers, note names, enharmonic aliases, duplicates and ordering: return `[60, 64, 67]` for an appropriate C-major-chord input, irrespective of input order.
- `getPressedKeys()` returns a detached array; modifying the result cannot modify stored state.
- Idempotence/no-ops: repeating press/release/clear or replacing with an equivalent set leaves the state unchanged.
- Invalid single notes and invalid mixed batches throw with no mutation; `setPressedKeys` is atomic.
- MIDI boundaries `0` and `127`; malformed names; `NaN`, fractional values, negative and >127 numbers, and wrong input types.
- When notation offsets are configured, names are interpreted on ingestion and the stored MIDI values remain unchanged if the convention subsequently changes.
- Pure state logic imports and runs without `window`/`document`.

### 2. Mounted renderer tests

- Programmatic `pressKey("C4")` changes **C4's visible presentation** and does not replace the SVG root, other key elements, or their geometry.
- `releaseKey` restores the appropriate unpressed presentation; `clearPressedKeys` updates only previously pressed, visible notes.
- `setPressedKeys` updates only the symmetric difference of visible notes; equivalent-set operations do not modify mounted presentation.
- Pressing an off-range note does not alter mounted nodes, but it appears pressed after `setRange` brings it into view; hiding and re-showing it preserves logical state.
- State remains intact across both orientations, `resize()`, and every structural option already supported in Phase 3.
- A failed batch or invalid public input changes neither logical state nor SVG appearance.
- Two separate keyboard instances do not share state or accidentally update each other's nodes.
- Repeated mount/destroy and post-destroy operations follow the accepted lifecycle contract; no stale references or observers are leaked.
- Tests assert **node identity** as well as appearance where practical; a visually correct full rerender is **not** sufficient to pass the targeted-update gate.

### 3. Scene and serializer parity

- The scene shows the same pressed/not-pressed notes as the controller state intersected with its displayed range.
- Existing preliminary static SVG output, if supported in Phase 3, reflects the same pressed appearance from shared scene records; preserve the Node/DOM separation.
- Existing Phase 1–3 note, geometry, rendering, sizing, destruction, and minimal serializer tests remain passing.

### 4. Execution and evidence

1. Run package typechecking, unit/integration tests, and build using **actual defined scripts**.
2. Run any existing Node smoke check for pure scene/serializer behavior, if present.
3. If possible, inspect the demo in a real browser for C-major chord activation, clearing, both orientations, and off-range retention. **Report browser checks separately from automated tests**; do not claim browser verification if it was not performed.
4. Check for accidental public exports, extra runtime dependencies, global CSS/DOM access, and unrelated edits.
5. Record command names, actual results, and limitations in `PROJECT_STATE.md`.

## Out of scope — do not implement

- Mouse, touch, pointer, computer-keyboard, or gesture handling (`@pianorealm/interaction`).
- MIDI device integration and transport (`@pianorealm/midi`).
- Audio playback (`@pianorealm/audio`).
- Multiple skin themes, skin registration, override APIs, and `setSkin` (Phase 5).
- Advanced sizing, `ResizeObserver` enhancement, animation and reduced-motion implementation not already required by Phase 3 (Phase 6).
- Configurable indicator modes, labels, overlays, and annotations (Phase 7).
- Public event system, plugins/extensions, and public hit-testing exposure (Phase 8).
- Final `renderToSVG()` public API, UMD distribution, Anki integration (Phase 9).
- Full interactive playground or release hardening (Phase 10).

## Completion gate

Phase 4 may be marked **Complete** only when all are true:

- [ ] All five public methods are implemented, typed, validated and documented.
- [ ] Logical state stores normalized MIDI values and returns ascending detached arrays.
- [ ] Duplicate inputs, no-ops, off-range retention, and atomic replacement match accepted A-05 rules.
- [ ] Targeted DOM updates are **tested by stable node identity** for state-only changes.
- [ ] Structural range/orientation/resize operations preserve or correctly reflect pressed state.
- [ ] Multiple instances, invalid batches, and lifecycle behavior have regression coverage.
- [ ] Shared scene and preliminary serializer use consistent pressed-state appearance semantics.
- [ ] All applicable prior tests, typechecks, and build pass, or blockers are explicitly recorded and the phase remains incomplete.
- [ ] `PROJECT_STATE.md` and the Phase 4 checklist in `DEVELOPMENT_PLAN.md` reflect **verified** results, not assumptions.

## Final handoff report

At the end, report:

1. **Scope implemented** and whether the Phase 4 gate passed.
2. **Files created/modified** and any public API or type additions.
3. **Key decisions** applied and any unresolved conflicts/ADRs needed.
4. **Commands actually run** and their results (counts only if observed).
5. **Browser/demo checks** performed versus not performed.
6. **Known gaps, failures, or environmental blockers**.
7. **Recommended next bounded task** (Phase 5 only after Phase 4 gate).

Do **not** commit, push, publish, or start Phase 5. Preserve unrelated local changes.
