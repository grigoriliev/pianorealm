# `@pianorealm/keyboard` — Development Plan

> **Status:** Active · **Package:** `@pianorealm/keyboard` · **Last revised:** 2026-11-22
> **Scope:** First implementation of Pianorealm's framework-independent piano-keyboard visualization package.

## 1. Purpose and authority

This is the execution roadmap for implementing, verifying, documenting, and releasing `@pianorealm/keyboard`. It converts the requirements into small, independently reviewable phases suitable for AI-assisted development with limited context or usage quotas.

**Read alongside (in precedence order for their respective subjects):**

1. [`../../docs/ECOSYSTEM.md`](../../docs/ECOSYSTEM.md) — ecosystem vision and package responsibilities.
2. [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — cross-package rules and integration policy.
3. [`PROJECT_SPEC.md`](PROJECT_SPEC.md) — authoritative keyboard feature and release requirements.
4. [`ARCHITECTURE.md`](ARCHITECTURE.md) — keyboard internals, invariants, and proposed designs.
5. [`PROJECT_STATE.md`](PROJECT_STATE.md) — actual implementation progress and verification.

When a proposal conflicts with an existing accepted specification or ADR, stop that change, identify the conflict, and update the relevant authoritative document through review; do not silently alter contracts. This plan records intended work, **not evidence that implementation or testing has occurred**.

## 2. Scope and package boundaries

**In scope:** Note parsing; MIDI-based keyboard layout; live SVG visualization; programmatically controlled pressed-key state; horizontal/vertical orientation; skins; responsive and fixed sizing; animations; labels/indicators/overlays; public events and narrow extension points; hit-testing for future integration; DOM-independent SVG string rendering; accessibility; offline/standalone and Anki deployment; quality checks, documentation, demo, and package distribution.

**Out of scope:** Mouse/pointer/touch/computer-key interaction (`@pianorealm/interaction`), device MIDI I/O (`@pianorealm/midi`), sound/audio playback (`@pianorealm/audio`), and host-specific logic in the core. Do not create empty future packages or simulate their implementations here. Applications compose packages using documented interfaces.

**Non-negotiable invariants:**

- MIDI integers `0..127` are canonical; note names are normalized at API boundaries (default `C4 = 60`).
- Geometry and scene generation are deterministic, browser-DOM-independent modules.
- Mounted and static SVG use **the same** geometry and resolved appearance/scene model.
- Pressed-key changes update affected nodes without reconstructing the entire keyboard.
- Range, skin, size, and orientation changes preserve visual state under the adopted policy.
- CSS and SVG identifiers are isolated; user-provided text and SVG-related values are safely handled.
- Multiple instances can coexist; `destroy()` releases owned resources.
- No online assets or other Pianorealm packages are needed at runtime.
- No testing, browser, Anki, or accessibility claim is made without recorded verification.

## 3. Working approach

### 3.1 One phase is a milestone, not necessarily one AI request

Each phase may be split into **bounded tasks** (usually one cohesive module, its tests, and its documentation). Each task should have: a concrete objective; explicit in/out of scope; relevant files; expected behavior; acceptance tests; and a small completion report. Avoid asking for the entire phase if the implementation is too large to audit in one session.

A typical task cycle:

1. Read the four authoritative documents and `PROJECT_STATE.md` (if present); inspect relevant code before editing.
2. State the current task, dependencies, and any unresolved contract decisions.
3. Make minimal, focused changes; add tests for positive, negative, boundary, and regression cases.
4. Run relevant checks. Record **commands and actual results**; if execution was impossible, say so.
5. Review changed files for architecture violations and regressions, then fix failures.
6. Update `PROJECT_STATE.md`, phase checklist, and decision docs only as appropriate.
7. Commit a coherent, verified increment; begin the next task only after the checkpoint.

**Suggested common checks once scripts exist:** `typecheck`, `lint` (if configured), `test`, `build`; add browser tests, bundle smoke tests, and visual checks as their infrastructure comes online. These are intended categories, **not assertions that scripts already exist**.

### 3.2 Session handoff discipline

`PROJECT_STATE.md` should be brief and verifiable, containing the current phase/task, completed versus pending items, architecture/ADR links, changed files or modules, exact last run commands/results, unresolved defects, environmental limitations, and next recommended task. Do not store speculative test counts or completion claims. Git commits remain the ultimate history; state notes are a convenient handoff, not a replacement for source control.

### 3.3 Definition of done for every task

- Scope and public API impact are understood; dependent decisions are resolved.
- Implementation fits the dependency rules and contains no unrequested framework/input/audio coupling.
- Tests cover important edge cases and are run when tools are available.
- Types, build, and affected existing tests remain valid, or blockers are explicitly recorded.
- Usage and constraints are documented where they changed.
- `PROJECT_STATE.md` is updated with verifiable status and next work.

## 4. Milestones at a glance

Status values: **Not started / In progress / Blocked / Complete / Deferred**. Change status only with evidence recorded in [`PROJECT_STATE.md`](PROJECT_STATE.md).

| Phase | Milestone | Dependencies | Gate / tangible outcome | Status |
| --- | --- | --- | --- | --- |
| **0** | Architecture and ADRs | Existing ecosystem and package docs | Decisions and contracts documented | Complete |
| **1** | Project foundation and note utilities | 0 | Tooling works; note/validation tests pass | Complete |
| **2** | Pure geometry engine | 1 | Correct both-orientation layouts and edge cases | Complete |
| **3** | Shared scene + minimal live SVG | 2 | Mount/render/destroy; basic static-scene parity | Complete |
| **4** | Pressed-key visual state | 3 | Stable state API and targeted updates | Complete |
| **5** | Skins and customization | 4 | Skin-independent state; baseline themes | Complete |
| **6** | Sizing and motion | 5 | Container/fixed sizing, reduced motion, cleanup | Complete |
| **7** | Labels, indicators, overlays | 6 | Layered, safe configurable visual annotations | Not started |
| **8** | Events, hit testing, extensions | 7 | Typed composition points without input coupling | Not started |
| **9** | Static SVG, standalone builds, Anki | 8 + early shared-scene work | Self-contained output and embedded smoke tests | Not started |
| **10** | Release hardening and publication prep | 1–9 | Complete release gates, docs, playground, QA | Not started |

**Critical sequencing qualification:** Design static output, Anki compatibility, and hit-testing during **Phase 0**; establish shared scene abstractions in **Phase 3**. Phase 9 completes and verifies these capabilities—it must not require replacing the core renderer. Release tooling may be scaffolded in Phase 1; full packaging verification happens in Phases 9–10.

## 5. Phase 0 — Architecture, contracts, and decisions

**Objective:** Remove expensive ambiguities before implementing APIs, layout rules, or serialized output.

**Planning scope**

- Audit `PROJECT_SPEC.md`, keyboard `ARCHITECTURE.md`, and ecosystem docs for contradictions and missing acceptance tests.
- Confirm package layout, module dependency direction, root exports, TypeScript strategy, and whether the first package uses a standalone repository-like layout or a workspace. **Do not require monorepo tooling.**
- Finalize note names, octave offsets, enharmonics, inclusive ranges, invalid inputs, and single-note behavior.
- Define virtual-white-key/black-key boundary strategy, geometry coordinate system, z-order, dimension defaults, and clipping/scroll rules.
- Decide how pressed notes outside the visible range behave, how `getPressedKeys` is ordered, and whether no-op calls emit events.
- Specify `setOptions` merge/validation/atomicity, skin override precedence, and effects of range/orientation/skin updates.
- Define scene shape, safe label/overlay value policy, SVG definition ID isolation, and static/live serialization parity.
- Define a **minimal** host-independent hit-test contract: coordinates, black-key precedence, bounds, and behavior outside the keyboard.
- Define event payloads, subscription/disposal pattern, error handling, and minimal extension lifecycle **without** implementing input.
- Decide actual ESM/UMD outputs, `Pianorealm` global shape, conditional exports, optional CommonJS, and CSS/asset packaging.
- Define embedded baseline: supported APIs and fallbacks, Anki reinitialization rules, night mode, and testable client/version matrix.
- Record accepted decisions as ADRs (package-level in `docs/decisions/`, ecosystem-level in root `docs/decisions/`); update `ARCHITECTURE.md` to reference them.

**Deliverables:** Approved architecture baseline, initial API/type sketch, ADRs for consequential decisions, risk register, geometry fixture list, explicit support-versus-untested policy, and updated `PROJECT_STATE.md`.

**Gate:** A new implementer can answer how geometry, scene generation, state, and lifetime work from the accepted decisions. See the [Phase 0 review](docs/PHASE_0_REVIEW.md) and [accepted ADRs](ARCHITECTURE.md#phase-0-review-references) for completion evidence and deferred verification.

## 6. Phase 1 — Tooling, note utilities, and configuration

**Objective:** Establish a buildable, testable TypeScript package with deterministic musical input handling.

**Tasks**

- [x] Create actual package configuration for `@pianorealm/keyboard`, TypeScript, Vite, Vitest, export entry points, and initial scripts.
- [x] Establish module folders and a small public entry (`src/index.ts`); avoid exposing internal types by accident.
- [x] Implement MIDI note classification (white/black), note-name parsing/formatting, accidental preference, octave conventions, and note-input normalization.
- [x] Implement inclusive range validation and normalized configuration defaults; reject invalid MIDI/fractional/non-finite values.
- [x] Define error types/messages and document invalid-input behavior.
- [x] Add unit tests for `C4 = 60`, octave boundaries, enharmonic equivalence, MIDI `0` and `127`, bad note strings, reversed ranges, and option validation.
- [x] Build, type-check, and test the local ESM note utility package.

**Gate:** Note utility and configuration tests pass; the package can be built, imported, and typechecked locally; no DOM dependency in utility modules.

## 7. Phase 2 — Deterministic keyboard geometry

**Objective:** Compute horizontal and vertical key positions without SVG or browser APIs.

**Tasks**

- [x] Implement normalized dimensions, key-kind classification and white-key reference positions.
- [x] Implement black-key positions and width/height proportions from the Phase 0 policy.
- [x] Handle arbitrary ranges, partial octaves, ranges starting/ending on black notes, and single-note ranges.
- [x] Implement vertical layout with low notes at bottom, high at top, black keys on the left; horizontal low-left/high-right.
- [x] Compute key bounds and z-order for the SVG scene and logical hit testing. Keep the internal layout result immutable.
- [x] Add deterministic fixture tests (`C3–C5`, `A0–C8`, black endpoints, one black key, `0–127`, extreme sizes, both orientations).
- [x] Assert invariants (finite nonnegative bounds, stable order, no missing keys, black-key relationships, consistent layout extents).

**Gate:** Geometry test matrix passes without a DOM; calculations are deterministic and documented for both orientations.

## 8. Phase 3 — Shared scene model and minimal mounted SVG

**Objective:** Display the first correct keyboard while keeping future static rendering inexpensive.

**Tasks**

- [x] Build a DOM-independent scene representation from normalized config, layout, and a minimal resolved style.
- [x] Define stable visual element identity, white/black stacking, safe text and attribute construction boundaries.
- [x] Implement minimal SVG DOM adapter: construct, mount into a provided container, update structural settings, and destroy.
- [x] Support configurable range and orientation; render a basic Minimal appearance only.
- [x] Implement core `PianoKeyboard` construction, `setRange`, `setOrientation`, `resize`, and `destroy` as applicable to this phase.
- [x] Ensure instance-local root elements and safe repeated setup/teardown; avoid unscoped styles or global IDs.
- [x] Add scene and DOM integration tests for SVG structure, notes present, layer order, multiple instances and destruction.
- [x] Add an early static serializer prototype or parity fixture using **the same scene** (full public static API may arrive in Phase 9).

**Gate:** A basic piano mounts and renders correctly in both orientations; scene is usable without the browser DOM; basic lifecycle tests pass.

## 9. Phase 4 — Programmatic pressed-key state

**Objective:** Separate visualization state from layout and efficiently show multiple pressed notes.

**Tasks**

- [x] Implement normalized state storage and the finalized visibility/out-of-range policy.
- [x] Expose `setPressedKeys`, `pressKey`, `releaseKey`, `clearPressedKeys`, `getPressedKeys` with note-name/MIDI inputs and documented ordering.
- [x] Implement state-to-scene styling for visible keys; update only affected DOM elements where structural changes are unnecessary.
- [x] Support simultaneous notes, duplicates, repeated operations, and range/orientation changes without accidental state loss.
- [x] Test targeted DOM updates, DOM-independent state storage, invalid note inputs, range changes, and repeated cleanup. Phase 5 covers preservation during actual skin switching.

**Gate passed.** The visual state API preserves canonical note identity through layout changes. Mutation and identity tests confirm that state-only commands update only affected SVG attributes. The Node scene, SVG parity and Firefox demo checks passed. [Verification evidence](PROJECT_STATE.md#phase-4-verification)

## 10. Phase 5 — Skins and configurable appearance

**Objective:** Add presentation variants without changing note, layout, or state logic.

**Tasks**

- [x] Define typed skin tokens and resolution order (defaults → selected skin → allowed overrides → explicit contrast policy when available).
- [x] Implement **Minimal** and **Classic** skins first; validate switching while notes remain pressed.
- [x] Implement `setSkin`, appearance overrides, color/border/radius/shadow/gradient customization, and custom-skin API as finalized.
- [x] Scope styling to the SVG/component; create per-instance IDs for gradients, filters, or masks as needed.
- [x] Test skin switching, override precedence, malformed values, visual state continuity, and multi-instance isolation.
- [x] Record remaining promised skins (**Modern, Neon, Dark**, and any agreed high-contrast skin) as explicit Phase 10 completion items, not silently delivered.

**Gate verified:** Minimal and Classic share the layout and pressed-state logic. Tests cover overrides, validation, targeted updates, definition isolation and SVG parity. Future skins and contrast policy are tracked in Phase 10. [Phase 5 evidence](PROJECT_STATE.md#phase-5-handoff)

## 11. Phase 6 — Sizing, responsiveness, and animation

**Objective:** Make layouts reliable in responsive, fixed, and embedded containers.

**Tasks**

- [x] Complete container mode with `ResizeObserver` and an explicit `resize()` fallback. Verify fixed mode.
- [x] Support the Phase 0 viewport, key dimension, contain fit, and clipping rules. Configurable size limits and automatic scrolling remain deferred under A-04.
- [x] Preserve proportions, key identities, appearance and pressed state across resizing and orientation changes.
- [x] Prevent layout feedback. Coalesce observer notifications, skip equivalent measurements and cancel queued work on teardown.
- [x] Add solid-fill transitions and fixed-dot fades with validated duration, easing, on/off and skin defaults.
- [x] Respect live `prefers-reduced-motion` changes and explicit motion-off.
- [x] Verify tiny and zero sizes, fractional reflow, rapid updates, teardown and reduced motion in automated tests and headless Firefox.

**Gate passed.** The package checks and Firefox fixtures verified both sizing modes, motion, instance isolation, teardown and final-state SVG. [Phase 6 evidence](PROJECT_STATE.md#phase-6-handoff)

## 12. Phase 7 — Labels, indicators, and layered overlays

**Objective:** Provide configurable musical annotations without coupling them to skins or interaction.

**Tasks**

- [ ] Implement note names, MIDI labels, octave labels, custom note labels, and C-note/key highlighting.
- [ ] Implement pressed-state modes (`color`, `indicator`, `both`) with circle/shape size, opacity, border, and position options.
- [ ] Implement independent overlay layers (circle/dot, text, number, badge), multiple overlays per key, order, and positioning.
- [ ] Add `setKeyOverlays` and any companion methods finalized in the architecture.
- [ ] Validate and safely encode all user-controlled text, attributes, colors, and declarative SVG primitives; no raw unchecked SVG markup.
- [ ] Verify readability and orientation-specific positioning, including white/black keys and narrow embedded sizes.
- [ ] Test overlay replacement, skin changes, pressed state interactions, scene/static serialization compatibility, and unsafe input cases.

**Gate:** Layers coexist predictably, remain independently configurable, and create safe, deterministic scene output.

## 13. Phase 8 — Public events, hit testing, and extension lifecycle

**Objective:** Create small documented integration points for future Pianorealm packages.

**Tasks**

- [ ] Implement typed events (as finalized): `pressedKeysChanged`, `rangeChanged`, `orientationChanged`, `skinChanged`, `resized`, `destroyed`.
- [ ] Implement subscription/unsubscription, immutable/useful payloads, deterministic event ordering, and final no-op semantics.
- [ ] Expose the narrow public hit-test surface from Phase 0; black keys should win overlapping hit regions.
- [ ] Implement a minimal `use()`/extension lifecycle with owned disposables and cleanup; support skin/overlay registration through documented APIs if adopted.
- [ ] Prevent extensions from mutating internal DOM/layout state directly.
- [ ] Test listener removal, extension destroy, event payloads, error isolation policy, multiple instances, and hit-testing under scaling and both orientations.
- [ ] Write a short **illustrative** composition example for future interaction/MIDI/audio; no implementation or dependency on those packages.

**Gate:** External consumers can observe visual-state changes and map locations to notes without relying on private SVG internals.

## 14. Phase 9 — Static SVG, offline bundles, and Anki integration

**Objective:** Complete the second rendering output path and prove distribution works in restricted hosts.

**Tasks**

- [ ] Implement `PianoKeyboard.renderToSVG(options)` with **no DOM requirement**, sharing geometry, scene, skin, and annotation logic with the mounted renderer.
- [ ] Include self-contained styles/definitions, safe escaping, unique/collision-resistant SVG IDs, and deterministic behavior where promised.
- [ ] Test generated output in Node.js (if supported) and in browsers; compare static and mounted representations for representative fixtures.
- [ ] Produce ESM and standalone classic-script/UMD variants, including minified build, self-contained runtime assets and tested namespace preservation (proposed `Pianorealm.Keyboard`; exact API is an ADR).
- [ ] Add smoke tests for imports, global exposure, coexisting instances, offline execution, and absence of network dependency.
- [ ] Write an Anki guide: media-file deployment, front/back card templates, horizontal/vertical initialization, state updates, night mode, multiple instances, and safe reinitialization.
- [ ] Test Anki Desktop and mobile clients **where environments are actually available**; record version, OS, evidence, limitations, and untested clients separately. Include AnkiWeb if accessible and feasible.
- [ ] Document embedded API fallbacks and behavior without `ResizeObserver` or other optional browser features.

**Gate:** Static SVG is genuinely self-contained, standalone builds load without a module loader/network, and compatibility claims match verified environments.

## 15. Phase 10 — Release quality, developer experience, and publication prep

**Objective:** Bring the initial package to the acceptance criteria defined in `PROJECT_SPEC.md` §21.

**Tasks**

- [ ] Complete remaining specified built-in skins (**Modern, Neon, Dark**) and high-contrast/accessibility strategy; verify every supported visualization mode in every built-in skin.
- [ ] Finalize validated public types, exports map, TypeScript declarations, source maps, scripts, license/metadata, and package contents. Decide CommonJS only if justified.
- [ ] Write README, quick start, API/config reference, skin/overlay/extension guides, JS/TS examples, Anki guide, and release notes.
- [ ] Build a playground using the actual package: ranges, orientations, skins, pressed state, size, animations, labels/overlays, and generated configuration example.
- [ ] Curate a visual regression matrix across skins, orientations, representative ranges and states; baseline and run in a consistent browser environment.
- [ ] Run complete unit/integration/typecheck/build tests and browser/accessibility checks; inspect SVG accessibility labels, contrast, non-color indicators, reduced motion, and CSS/ID isolation.
- [ ] Verify lifecycle and performance (incremental state updates, rapid resizes, repeated initialization/destruction, large ranges, multi-instance use).
- [ ] Execute npm package smoke tests from **built artifacts**, ESM/type imports, classic-script globals, offline/embedded usage, and supported static Node rendering.
- [ ] Prepare changelog, semantic version decision, migration policy, known limitations, and publication checklist. Publishing itself is a separate authorized action.
- [ ] Audit every requirement; identify any explicitly deferred feature and its effect on stated release promises.

**Gate:** All promised initial-release acceptance criteria are met by evidence, or the release scope/version is deliberately adjusted and documented. Do not mark complete on the strength of documentation alone.

## 16. Cross-cutting verification matrix

| Concern | First addressed | Rechecked at | Evidence to retain |
| --- | --- | --- | --- |
| MIDI note normalization and ranges | 0–1 | 2, 4, 9, 10 | Unit tests and API examples |
| Partial/black-endpoint geometry | 0–2 | 3, 8, 9, 10 | Geometry fixtures + browser captures |
| Both orientations | 2 | 3, 6, 7, 9, 10 | Deterministic tests and browser checks |
| Shared static/live scene | 0, 3 | 5, 7, 9, 10 | Parity tests, DOM-free serializer tests |
| Pressed-key state, no full rebuild | 4 | 5–10 | State and DOM mutation tests |
| CSS/SVG safety and isolation | 0, 3 | 5, 7, 9, 10 | Malicious-input tests, multi-instance tests |
| ResizeObserver fallback and cleanup | 0, 3 | 6, 9, 10 | Lifecycle/browser test results |
| Accessibility/reduced motion | 0, 3 | 5–10 | Browser and accessibility checks |
| Hit testing and events | 0, 2 | 8, 10 | Contract and coordinate tests |
| Offline/Anki support | 0, 3 | 9, 10 | Bundle smoke tests, per-client matrix |
| Documentation and packaging | 1 | Every gate, especially 9–10 | Built artifacts, verified examples |

**Verification policy:** Vitest tests alone cannot prove actual SVG appearance, responsive layout, assistive technology usability, or Anki client support. Real-browser/client checks are separate gates. Record unavailable environments honestly.

## 17. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Incorrect black-key/partial-range math becomes embedded in renderer | Specify fixtures and pure geometry tests before SVG work |
| Static rendering drifts from browser rendering | Shared scene model from Phase 3; compare scene/geometry in Phase 9 |
| Future interaction requires private SVG inspection | Define geometry-backed hit testing in Phase 0, expose narrow API in Phase 8 |
| Repeated Anki card rendering leaks instances or duplicates IDs | Instance-local resources, explicit teardown, host-oriented tests |
| Untrusted labels or SVG overlays inject markup | Typed declarative overlays, validation and output escaping |
| Theme gradients or CSS collide across instances | Scoped styles and unique instance/serialization IDs |
| AI coding sessions overwrite working modules | Small scoped tasks, tests before edits, state handoffs, Git commits |
| Features silently disappear from a reduced release | Trace requirements against Phase 10 audit; explicitly record deferrals |
| Fragile cross-environment claims | Maintain tested client/version matrix; mark missing evidence as untested |

## 18. Suggested repository documents and prompt workflow

```text
pianorealm/
├── docs/
│   ├── ECOSYSTEM.md
│   ├── ARCHITECTURE.md
│   └── decisions/                # ecosystem ADRs, when needed
└── packages/
    └── keyboard/
        ├── PROJECT_SPEC.md
        ├── ARCHITECTURE.md
        ├── DEVELOPMENT_PLAN.md  # this file
        ├── PROJECT_STATE.md     # create at first checkpoint
        ├── README.md
        ├── docs/
        │   └── decisions/        # keyboard ADRs, when needed
        ├── prompts/
        │   ├── 00-project/
        │   ├── 01-implementation/
        │   ├── 02-review/
        │   └── 06-workflow/
        ├── src/
        ├── tests/
        └── demo/
```

**Recommended prompt filenames** (create them only when useful): `prompts/00-project/architecture-planning.md`, `prompts/01-implementation/phase-01-core-foundation.md` through `phase-10-release-quality.md`, `prompts/02-review/code-review.md`, `prompts/06-workflow/project-checkpoint.md`, and `prompts/06-workflow/session-handoff.md`. Use the spec/architecture documents as referenced input rather than duplicating them into each prompt.

### Reusable task prompt contract

For each phase task, specify: **objective; authority documents; current state; included files/behaviors; excluded work; relevant ADRs; acceptance tests; actual commands to run; completion report; state update**. Ask for review separately if the change is consequential; don't ask the AI to invent successful results when it cannot execute tests.

## 19. Project state and next task

See [`PROJECT_STATE.md`](PROJECT_STATE.md) for the verified implementation, last check results, and next bounded task.

## 20. Release readiness checklist

- [ ] Independently usable install and import of `@pianorealm/keyboard`.
- [ ] Full keyboard range/orientation and partial-black-endpoint correctness.
- [ ] Programmatic state methods and update invariants proven by tests.
- [ ] Zero pointer/keyboard/MIDI/audio behavior or coupling in this package.
- [ ] Promised skins, custom styling, labels, overlays, and animation options work.
- [ ] SVG accessibility, contrast, non-color indicators, and reduced motion verified.
- [ ] Static SVG and mounted SVG share layout/style logic and pass parity tests.
- [ ] npm ESM/types and standalone offline classic-script distribution smoke-tested.
- [ ] Safe text/SVG handling, component CSS/IDs, and multi-instance behavior verified.
- [ ] Cleanup, repeated creation/destruction, sizing, and performance verified.
- [ ] Actual host/Anki support claims backed by named test environments.
- [ ] README, API/config guides, Anki instructions, demo, and release notes complete.
- [ ] All test/build/browser/visual gates run and results recorded; deferrals explicit.

---

**Guiding rule:** Build a reliable visualization foundation first; add capabilities in small verified increments. Preserve public boundaries so future `@pianorealm/interaction`, `@pianorealm/midi`, and `@pianorealm/audio` packages can compose with the keyboard without changing its internals.
