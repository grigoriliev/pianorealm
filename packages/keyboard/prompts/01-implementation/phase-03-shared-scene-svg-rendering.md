# Phase 3 — Shared Scene Model and Minimal SVG Rendering

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation  
> **Phase:** 3 (after Phase 2)  
> **Working directory:** Pianorealm repository root  
> **Scope:** DOM-independent scene, minimal SVG renderer and mount lifecycle, structural updates, early static parity

## Objective

Implement **Phase 3** of `@pianorealm/keyboard`: render the first correct, minimally styled piano keyboard in a supplied HTML element, using the **existing Phase 2 geometry engine** and a **shared, DOM-independent scene description**. Prove that the scene can also drive a basic SVG-string serialization path, so full static rendering in Phase 9 will not require a second rendering engine.

Deliver a small, testable vertical slice: **normalized configuration → geometry → minimal appearance → scene → mounted SVG / preliminary serialized SVG**. Preserve the separation between scene construction and browser lifecycle.

**Do not implement Phase 4–10 features merely because their types or extension points are anticipated.** In particular, there is no user interaction, audio, MIDI I/O, pressed-note API, full theme system, overlay editor, or playground in this phase.

## Authority and required reading

Work against the **current local checkout**, not an assumed state from earlier prompts or GitHub's published `main` branch.

1. Follow `AGENTS.md` and `packages/keyboard/AGENTS.md`.
2. Read `docs/ECOSYSTEM.md` and `docs/ARCHITECTURE.md` for ecosystem/package boundaries.
3. Read `packages/keyboard/PROJECT_SPEC.md`, especially rendering, orientation, sizing, accessibility, embedding, and lifecycle requirements.
4. Read `packages/keyboard/ARCHITECTURE.md`, especially sections on data contracts, shared scene, SVG output paths, controller, sizing, and safety.
5. Read `packages/keyboard/DEVELOPMENT_PLAN.md`, especially **Phase 3 — Shared scene model and minimal mounted SVG** and the cross-phase requirements.
6. Read `packages/keyboard/PROJECT_STATE.md` and confirm actual Phase 2 results.
7. Read `packages/keyboard/docs/PHASE_0_REVIEW.md` and **all applicable accepted ADRs in the current repository**, especially the ADRs governing layout/fitting, scene/SVG/safety, configuration, instance lifecycle, and public exports. **Discover filenames; do not assume ADR numbering or titles.**
8. Inspect the existing `src/`, tests, `package.json`, Vite/Vitest configuration, and geometry contracts. Reuse established utilities and patterns.

**Precedence:** accepted ADRs and approved specifications take precedence over illustrative names/signatures in this prompt. If the checkout reveals a material conflict, identify it and use the established decision process rather than silently inventing a competing contract.

## Preflight — before editing

1. Run `git status --short`, note the current branch/worktree, and preserve all existing modifications.
2. Confirm Phase 2 is complete **in this checkout** and its gate is verified. If not, report the precise unmet items; do not mark Phase 3 done or silently reimplement the geometry engine.
3. Run the existing package `typecheck`, `test`, and `build` scripts to establish a baseline, recording failures separately from regressions.
4. Inspect exported internal geometry types and the normalized configuration API. Avoid duplicating note parsing, dimension validation, layout calculations, or orientation transforms.
5. Briefly describe the planned scene records, dependency direction, mount lifecycle, and static-parity strategy before implementing.
6. Keep edits inside `packages/keyboard/` unless a cross-package change is necessary and explicitly justified.

If the whole phase cannot be safely completed in one pass, use coherent, tested sub-tasks and record the remaining work in `PROJECT_STATE.md`.

## Implementation scope

### A. Shared, pure scene representation

Create a small **browser-independent scene builder** that consumes the normalized options, Phase 2 layout, and a minimal resolved appearance. It must:

- Represent **each visible MIDI note exactly once**, preserving note identity, kind (`white`/`black`), and geometry from Phase 2.
- Define deterministic **white-before-black draw order**, with ascending MIDI order within each layer, as required by the layout ADR.
- Express geometric and visual information in a renderer-neutral, typed, read-only representation. No `HTMLElement`, `SVGElement`, `document`, `window`, observer, or CSSOM dependencies.
- Carry intrinsic bounds and the information required for SVG `viewBox` and future labels/pressed states/overlays, without prematurely implementing those features.
- Use stable **logical element identity** (for example, note-based keys) without coupling public consumers to internal SVG IDs/classes/selectors.
- Provide a **Minimal** appearance only: readable white and black key fills, boundaries, and a suitable neutral background, with no global styles or remote assets.
- Establish a safe boundary for future user-controlled text and SVG attributes. Do not pass through unchecked raw markup or arbitrary attribute maps.
- Avoid exposing internal scene types from the public package root unless an accepted ADR explicitly requires it.

Decide the smallest scene shape that supports **both** output paths. Do not design a general-purpose SVG framework or a generic virtual DOM.

### B. SVG DOM adapter and initial mount

Implement the mounted renderer as a browser-only adapter consuming scene records:

- Construct a correctly namespaced SVG root and child elements using DOM APIs (`createElementNS` or equivalent safe methods).
- Mount exclusively inside the caller-provided container; do not modify the rest of the page.
- Render white keys beneath black keys, using exact Phase 2 rectangles and note identities.
- Set a correct SVG `viewBox` matching intrinsic layout dimensions; preserve aspect ratio and orientation from geometry, rather than recomputing coordinates.
- Apply only component-local presentation attributes/styles. Avoid global CSS selectors, `document.write()`, external assets, runtime downloads, and unnecessary global IDs.
- Keep instance-local ownership of its root SVG, key-node registry (if established), and any resources created.
- Support at least **two instances** in one page without cross-instance interference.
- Do not attach pointer/touch/mouse/computer-keyboard listeners; the library remains display-only.

Prefer a design that permits **targeted per-key visual updates in Phase 4**. Structural rebuilds are acceptable in Phase 3; do not implement pressed-key behavior yet.

### C. Minimal public controller and structural updates

Implement the smallest approved `PianoKeyboard` class/controller needed to mount and manage the keyboard. Follow existing accepted signatures if present; otherwise keep any new public surface intentionally narrow and document it.

Required Phase 3 behavior:

- `new PianoKeyboard({ container, ...options })`: validate the container/options, normalize configuration, derive layout and scene, and mount the SVG (or enter a documented no-viewport state when appropriate).
- `setRange(from, to)`: atomically validate the new inclusive range, compute a replacement layout/scene, and update the mounted structure. Accept existing supported MIDI/note-name forms through Phase 1 utilities.
- `setOrientation(orientation)`: switch horizontal/vertical without changing note identities or using an independent layout algorithm.
- `resize()`: re-evaluate viewport/fitting using the accepted sizing policy and return safely for disconnected/zero-size hosts as defined by ADRs.
- `destroy()`: release resources and remove only the instance-owned mounted content; call it repeatedly without throwing if the accepted lifecycle policy says it is idempotent.

Constraints:

- Validate and prepare structural updates **before committing them**, so invalid `setRange`/`setOrientation` calls do not corrupt the mounted instance.
- Preserve the caller container's unrelated child nodes and pre-existing attributes/styles; do not `innerHTML = ''` on the host.
- Define post-destroy behavior for mutating methods based on accepted decisions; test it.
- Avoid reinitialization side effects and leaks; each instance owns only what it creates.
- Do not expose unapproved configuration mutation methods, event emitters, skin registration, or hit-testing methods merely to match a future API sketch.

### D. Initial sizing and viewport fitting

Implement only the sizing behavior needed for a correct initial mount and basic `resize()`; defer advanced responsive features to Phase 6.

Honor the accepted layout/sizing ADR, including:

- Intrinsic keyboard geometry is expressed in **SVG user units**; container resize does **not** mutate the Phase 2 key coordinates.
- Container fitting uses **uniform contain scaling** with centered letterboxing; do not stretch the geometry.
- Fixed sizing uses explicit viewport dimensions and accepted intrinsic fallbacks when omitted.
- Disconnected, unavailable, and zero-size containers follow the documented **no-active-viewport / recover-on-resize** behavior; do not divide by zero or generate invalid SVG attributes.
- SVG paint is clipped according to the approved viewport policy; key rectangles and geometry queries remain determined by Phase 2.
- Apply feature detection for optional APIs. Introduce `ResizeObserver` now **only if needed for the accepted Phase 3 mount contract**; otherwise document deferred automatic observation to Phase 6. Any introduced observer must be disconnected on destroy.

Do not add clipping/scroll options, min/max dimensions, animation, or CSS transform–aware client-coordinate hit testing in this phase. Those remain later-phase concerns.

### E. Preliminary SVG-string serialization / parity proof

Create a small **DOM-independent SVG serializer prototype or parity fixture**, powered by **the same scene records** as the mounted renderer:

- Serialize a Minimal keyboard with explicit namespaces, `viewBox`, finite dimensions, and safe XML attribute encoding.
- Do not require `window`, `document`, or a mounted element at module evaluation or serialization time.
- Share scene-building and appearance resolution; **do not duplicate geometry or key-style algorithms** in the serializer.
- Establish stable, documented SVG attribute ordering or normalized scene-based comparison for reliable tests (byte-identical markup is not mandatory unless the accepted policy requires it).
- Avoid arbitrary raw SVG injection; have an explicit path for escaping any future text/attribute values.
- Plan collision-safe `<defs>` ID allocation for future gradients/filters/overlays; avoid unnecessary IDs in the Minimal implementation.
- Add a Node-side smoke test if practical. Keep this path **internal for now** unless accepted ADRs require a public API at Phase 3.

**Full public `PianoKeyboard.renderToSVG`, feature-complete static output, standalone bundles, and Anki distribution belong to Phase 9.** Phase 3 proves the architecture, not those later release gates.

### F. Accessibility, isolation, and input safety baseline

- Provide an accessible name/description for the visual keyboard root using safe SVG semantics (for example, `<title>` with a correctly scoped reference or an equivalent accepted pattern).
- Treat the keyboard as a display-only visualization, not a focusable playable instrument. Do not invent keyboard interactions or misleading interactive ARIA roles.
- Scope all styling to the mounted component. Ensure the Minimal skin contrasts white/black keys clearly.
- Use safe DOM methods and XML escaping rather than assembling markup from unvalidated external values.
- Do not claim formal accessibility compliance or Anki client compatibility without appropriate testing.

## Verification requirements

Use existing Vitest tooling; add targeted unit/integration tests and browser smoke checks where test infrastructure permits. Assertions must be based on actual geometry/scenes, **not just static markup snapshots**.

### 1. Pure scene tests

- Identical normalized input/layout produces equivalent deterministic scene records.
- Every note in the inclusive range appears exactly once; no extra notes.
- White keys appear before black keys, with ascending MIDI order within each group.
- Scene positions/bounds exactly match Phase 2 geometry in **both orientations**.
- Cover normal (`C4–B4`, `C3–C5`), partial (`C4–C#4`), black-endpoint (`C#4–D#4`), single-white (`C4`) and single-black (`C#4`) ranges.
- Scene builder does not access DOM globals or mutate input objects.

### 2. Mounted SVG integration tests

- Correct SVG namespace, `viewBox`, root dimensions/fitting, and expected key counts/attributes.
- Black-key elements are ordered above white-key elements.
- Changing range and orientation updates structure and intrinsic dimensions correctly.
- Invalid constructor options or invalid structural updates fail predictably; failed updates leave prior mounted state intact.
- `resize()` produces no invalid dimensions for zero/disconnected containers and can recover after a valid measurement.
- Two mounts remain independent; updating/destroying one does not affect the other.
- `destroy()` cleans up instance-owned nodes and observers/listeners (if any), is safe when repeated, and enforces documented use-after-destroy behavior.
- Unrelated host children and styles are preserved.

### 3. Static-scene parity and safety tests

- Minimal static serialization consumes the same scene builder as mounting.
- Compare normalized geometry/note/ordering information between mounted output and serialized SVG for representative fixtures, including vertical and single-black layouts.
- Escaping/validation prevents malformed attributes and unsafe untrusted text (include a hostile-looking sample if a dynamic text path exists).
- Import the pure scene/serialization modules without browser globals; run a Node smoke test where tooling allows.
- Verify no external resources, global CSS effects, or uncontrolled duplicate IDs are generated by the Minimal output.

### 4. Existing baseline and manual verification

- Run `npm run typecheck`, `npm test`, and `npm run build` from `packages/keyboard` (adapt to actual scripts if named differently).
- Run any relevant browser/integration commands present in the checkout. If no browser test harness exists, do not claim browser rendering was verified; record a simple manual verification procedure for an actual browser.
- Ensure Phase 1 note/configuration and Phase 2 geometry tests still pass unchanged.
- Record **exact commands, observed results, environment constraints, and test counts** in the completion report and `PROJECT_STATE.md`. Never mark unexecuted checks as passed.

## Out of scope — do not implement

- Pressed-key storage and `setPressedKeys`/`pressKey`/`releaseKey` (Phase 4).
- Classic/Modern/Neon/Dark skins, custom skins, gradients and animation (Phases 5–6/10).
- Full automatic responsive sizing, min/max dimensions, clipping/scroll controls, transitions and reduced-motion infrastructure beyond a minimal baseline (Phase 6).
- Labels, note annotations, indicators, custom overlays, user SVG elements (Phase 7).
- Public events, plugins, mounted client-pixel hit testing, pointer/keyboard gesture handling (Phase 8 or another package).
- Production `renderToSVG` API, UMD/global bundles, Anki templates, full offline compatibility matrix (Phase 9).
- Interactive playground, publishing, expansive release documentation, visual-regression infrastructure unless already available (Phase 10).
- Dependencies on `@pianorealm/interaction`, `@pianorealm/midi`, or `@pianorealm/audio`.

## Suggested module areas (adapt to actual checkout)

```text
packages/keyboard/
├── src/
│   ├── public/
│   │   └── PianoKeyboard.ts          # thin mounted controller/facade
│   ├── scene/
│   │   ├── build-scene.ts            # pure scene composition
│   │   └── types.ts                  # internal, readonly scene records
│   ├── svg/
│   │   ├── dom-renderer.ts           # browser-only adapter
│   │   └── serialize.ts              # early pure serializer
│   ├── sizing/
│   │   └── viewport.ts               # mount/fit policy; no geometry duplication
│   └── index.ts                      # intentional public exports
├── tests/
│   ├── unit/
│   │   └── scene.test.ts
│   └── integration/
│       ├── mount.test.ts
│       └── svg-parity.test.ts
└── PROJECT_STATE.md
```

**This tree is illustrative, not a request to create placeholder modules.** Use the project's existing organization, naming, test environment, and established types. Avoid broad refactoring of Phase 1/2 code.

## Execution workflow

1. Inspect and verify the Phase 2 handoff and baseline.
2. Briefly propose the scene record contract, ownership boundaries, public methods, and fit behavior.
3. Implement the pure scene builder and its unit tests.
4. Implement the minimal SVG DOM adapter and controller with lifecycle/structural tests.
5. Add early SVG serialization and parity tests using the **same** scene.
6. Perform focused safety, accessibility, and multi-instance checks.
7. Run the full relevant package verification; fix Phase 3 regressions.
8. Update `packages/keyboard/PROJECT_STATE.md` with **verified** progress, known limitations, and the next Phase 4 task. Update development-plan checkboxes only for completed items.
9. Review `git diff --check` and `git status --short`. Do not modify unrelated files or rewrite accepted ADRs without a genuine decision conflict.
10. Provide a concise completion report.

## Phase 3 completion gate

Mark Phase 3 **Complete** only when all conditions hold:

- [ ] A Minimal keyboard mounts correctly in a caller-provided element.
- [ ] Horizontal and vertical key geometry matches Phase 2 with correct ordering and note identities.
- [ ] The scene builder has no browser DOM dependency and is shared by mounted output and an early serializer/parity fixture.
- [ ] `setRange`, `setOrientation`, `resize`, and `destroy` behave according to the accepted contracts.
- [ ] Multiple instances, invalid-update atomicity, and resource cleanup are tested.
- [ ] Component output is isolated, safely constructed, and has an accessible root description.
- [ ] Relevant scene, DOM, parity, and regression tests are executed and pass (or true environmental blockers are explicitly recorded and the phase remains incomplete).
- [ ] Type checking and build pass; `PROJECT_STATE.md` accurately records evidence and outstanding checks.

## Required final report

Use this structure:

1. **Summary:** implemented scope and whether the Phase 3 gate passed.
2. **Files changed:** created/modified files and purpose.
3. **Public API changes:** actual exported class/methods, with no invented features.
4. **Verification:** commands, test counts, results, browser/manual checks, and any blocked verification.
5. **Architecture:** scene/DOM/serializer separation and any noteworthy choices or ADR conflicts.
6. **Known limitations:** deliberately deferred Phase 4–10 work and environmental gaps.
7. **Next task:** concise Phase 4 handoff.

**Do not commit, push, publish, or start Phase 4.** Leave changes ready for maintainer review.
