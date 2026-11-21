# Phase 7 — Labels, Indicators, and Layered Overlays

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation  
> **Phase:** 7 (requires verified Phase 6)  
> **Working directory:** Pianorealm repository root  
> **Scope:** Musical labels, pressed-key indicator modes, note highlights, declarative per-key overlays, tests and documentation

## Objective

Implement **Phase 7** of `@pianorealm/keyboard`: configurable note annotations and independent visual layers that work in both orientations, on white and black keys, across all supported skins, and in both mounted and serialized SVG output.

Build on the existing geometry, shared scene, mounted SVG adapter, pure serializer, visual state, skin resolution, and Phase 6 responsive/animation behavior. **Do not add pointer interaction, MIDI, sound, public event subscriptions, hit-testing exports, or a plugin framework.**

## 1. Required reading and source-of-truth order

Use the **local working tree** rather than assuming public GitHub `main` reflects recent completed phases.

1. Follow `AGENTS.md` and `packages/keyboard/AGENTS.md`.
2. Read `docs/ECOSYSTEM.md`, `docs/ARCHITECTURE.md`, and `packages/keyboard/PROJECT_SPEC.md` (especially visualization modes, note naming, labels, overlays, accessibility, security, and Anki compatibility).
3. Read `packages/keyboard/ARCHITECTURE.md` (scene ownership, layer order, DOM adapter, static serializer, configuration and validation).
4. Read Phase 7 and cross-phase gates in `packages/keyboard/DEVELOPMENT_PLAN.md`.
5. Read `packages/keyboard/PROJECT_STATE.md` and **all accepted relevant ADRs** in `packages/keyboard/docs/decisions/` (and ecosystem ADRs when applicable). In particular, inspect decisions about configuration/state, SVG scene and safe attributes/IDs, presentation/skin precedence, and lifecycle.
6. Inspect actual public exports and types, tests, existing demo, and implementation of Phases 3–6. Do not assume the examples below are already part of the public API.

**Authority:** Accepted ADRs and existing documented contracts prevail over illustrative examples here. Do not silently change them. If an essential Phase 7 contract is unspecified, present a minimal proposed decision and document it according to repository ADR policy before implementing incompatible public behavior.

## 2. Preconditions and baseline

Before editing:

- Verify Phase 6 is complete **in this checkout**, including responsive sizing and opt-in/reduced-motion-safe transitions. Verify Phases 3–5 provide scene generation, mounted rendering/serialization, pressed state, and appearance resolution.
- Review `git status`; preserve pre-existing modifications and never overwrite unrelated work.
- Run baseline `typecheck`, tests, and build using scripts in the package (record results or the exact environmental blocker).
- Identify existing hooks or scene types for labels/indicators/overlays and avoid introducing a parallel rendering pipeline.
- Briefly describe planned public-facing APIs, layer order, validation rules, file changes, and test approach before making changes.

If a required earlier phase is absent or broken, **stop and report the blocker** instead of implementing that phase implicitly.

## 3. Phase 7 implementation scope

### 3.1 Musical labels and key highlighting

Add typed, optional visual settings for the approved subset of:

- Scientific pitch note names, MIDI numbers, octave labels, and configurable C-note emphasis.
- Custom labels per MIDI note (support note names where approved by the existing normalization contract).
- Custom note/key highlighting independent of the pressed state and independent of skin selection.
- Accidentals and octave formatting must reuse the established note utilities and notation configuration; **do not invent a separate note parser**.
- Provide a clear precedence policy when global label settings, custom per-note labels, and skin defaults overlap.
- Default behavior should preserve the Phase 6 keyboard appearance unless a new feature is explicitly enabled or an accepted ADR defines otherwise.

Use geometry-relative positions/anchors that work in **horizontal and vertical** layouts and on both black and white keys. Avoid clipped or unreadable labels where reasonably possible, especially with partial ranges and narrow hosts; define/document deterministic small-size behavior rather than expanding key geometry to fit text. Off-range labels/highlights must not produce stray rendered nodes.

### 3.2 Pressed-key visualization modes

Support these configured modes with an explicit default and validated option values:

- `color`: pressed-key appearance only.
- `indicator`: indicator only, without applying pressed fill merely because the note is pressed.
- `both`: pressed-key appearance and indicator.

Support **multiple pressed notes** and appropriate white/black-key contrast. Allow configuration (as consistent with accepted decisions) of indicator shape, fill/stroke colors, size, position, opacity, and border/stroke width; prefer a small, well-defined declarative set of shapes (e.g. circle) instead of inventing an unlimited graphics API.

- Indicator nodes derive from pressed state; they must not be stored as an alternative source of pressed-note truth.
- Indicators should track geometry changes, orientation, skin switching, configuration updates, and range changes without losing off-range pressed state.
- Respect Phase 6 animation and reduced-motion behavior. If an indicator transition can be achieved safely with the existing animation model, support it; do not create a separate animation engine or expand the public animation contract without approval.
- When mode or state changes, update affected visual nodes where practical instead of rebuilding the full keyboard.

### 3.3 Independent user overlays and annotations

Implement a **declarative** per-note overlay model supporting the initial planned primitives:

- Circle/dot.
- Text label.
- Number.
- Badge (a styled text/number marker).

Support multiple overlays on one note with deterministic intra-key order and documented positioning (e.g. normalized anchors or approved relative offsets). Keep overlay configuration independent of pressed state, built-in/custom skin, and underlying note geometry. Use the existing normalized MIDI representation and documented note-name support for map keys.

Provide `setKeyOverlays(...)` and any minimal companion operation(s) the accepted architecture calls for. Example **illustrating intent only** (adjust types/signatures to approved contracts):

```ts
piano.setKeyOverlays({
  C4: [
    { type: 'circle', color: '#3498db' },
    { type: 'text', text: '1' },
  ],
});
```

Define and test:

- Whole-map replacement vs. merge semantics; absence vs. empty list; optional clear behavior.
- Duplicate note-key normalization and behavior of out-of-range overlay entries.
- What happens to overlay definitions through `setRange`, `setOrientation`, `setSkin`, resize, and destruction.
- Whether clipping is applied to the parent key; overlays must not silently overlap other keys or escape the SVG viewport in an uncontrolled way.
- Order among key bodies, pressed styling, built-in labels, indicators, custom highlights, and user overlays. Follow accepted ADRs; document any remaining approved choices.

Do **not** accept arbitrary raw HTML/SVG strings as overlay markup. Do **not** expose mutable SVG elements or internal DOM nodes as a public extension point.

### 3.4 Scene model and live/static SVG parity

- Extend the **existing shared, DOM-independent scene** to represent all new visual elements. Use the existing layout coordinates and skin/appearance resolution.
- Both live DOM rendering and pure SVG serialization must consume the **same resolved visual representation**, using the existing safe SVG attribute/text mechanisms.
- Preserve layering: black keys visibly remain above white-key bodies; visual annotations are anchored to their intended keys; overlays follow a documented deterministic stacking order.
- Ensure static SVG is self-contained, safe, and shows the requested end state without relying on external styles, scripts, runtime animations, or browser globals.
- Account for SVG identifier isolation across multiple mounted instances and exported documents if defs, masks, clip paths, or gradients are needed; prefer reusing the existing identifier strategy.
- Preserve accessibility labels/role on the overall component. Decorative shapes should not introduce spurious screen-reader content; user-visible annotation text should be handled using the agreed accessibility policy.
- DOM adapter should target changed notes or affected layers where practical. Avoid unnecessary geometry recalculation for text/indicator-only updates.

### 3.5 Configuration, validation, and safety

- Define precise TypeScript types for supported label, indicator, highlight, and overlay options. Export **only intentional public types and methods** from the package root.
- Use established constructor/`setOptions(...)` semantics for merging, resetting, and precedence. Handle array replacement consistently with the approved configuration model.
- Validate **before committing updates**. Invalid color/paint strings, non-finite/negative sizes, invalid position/opacity values, unsupported shape types, invalid note identifiers, unsafe Unicode/XML characters, and malformed overlay definitions must not partially mutate options/state/DOM.
- Encode all SVG text and attributes safely. Reject or sanitize inputs per existing policy; never interpolate unchecked strings into markup or CSS.
- Include explicit checks for injection-like text (`<`, `&`, quotes), unsupported SVG paint values, attempted attribute/event-handler injection, and unsafe `url(...)` references where relevant.
- Keep CSS and SVG styles component-scoped and compatible with offline/embedded hosts. No global selector rules, network fonts or external assets.
- Preserve independent state and resources for multiple keyboard instances; make repeated updates safe and `destroy()` cleanup consistent with its existing contract.

## 4. Explicitly out of scope

Do **not** implement:

- Mouse/touch/pointer/computer-keyboard event interaction inside `@pianorealm/keyboard`.
- MIDI I/O, playback, synthesized audio, or dependencies on other Pianorealm packages.
- Phase 8 typed event subscriptions, public hit-testing API, plugin registration, or extension lifecycle.
- Phase 9 Anki packaging, new UMD bundles, or a new public static SVG export API if not already approved.
- Phase 10 full playground, all remaining skins, or an extensive custom SVG element/plugin DSL.
- Arbitrary untrusted SVG injection, HTML overlays, or unrelated refactors.

A **small optional enhancement** to the existing development demo is acceptable if isolated: add controls or prepared examples for label mode, indicator mode, and a multi-overlay key. Do not replace the demo or let optional UI work delay core completion. The demo must consume public APIs only.

## 5. Verification and required tests

Add focused unit/integration tests and regressions for:

1. **Label accuracy:** C4/MIDI 60, sharps/flats and octave convention, custom labels, C-note emphasis, invalid and off-range entries.
2. **Both orientations:** geometry-relative alignment for white and black keys, partial ranges including black-key endpoints, small or fractional dimensions.
3. **Pressed modes:** `color`, `indicator`, `both`; press, release, clear, multiple notes; off-range state returning to view; state preservation during setSkin/setRange/setOrientation/resize.
4. **Indicator validation:** supported shapes, size, opacity, stroke, position, contrast with black/white keys, and safe behavior at tiny dimensions.
5. **Overlays:** several overlays on one key, multiple notes, replacement/clear behavior, stable order, clipping/positioning policy, state preservation and isolation from skins.
6. **Atomic failures:** invalid note, type, text, dimensions, SVG/CSS payloads; verify model, DOM, and previously rendered state remain unchanged.
7. **Live/static parity:** compare normalized semantic SVG structure, layer order, text, geometry, attributes, and resolved appearance for representative configurations; test pure generation under Node **without DOM globals**.
8. **Targeted updates:** where permitted, verify DOM key identity remains stable through label/overlay/indicator updates; pressed-state-only changes must not remount unaffected key nodes.
9. **Accessibility:** accessible root label/role preserved, decorative overlay behavior, non-color-only pressed indicator, and reduced-motion handling.
10. **Multiple instances/lifecycle:** ID/defs isolation, changes to one instance do not affect another, teardown removes owned nodes/resources, post-destroy methods obey accepted contract.
11. **Regression:** all Phase 1–6 tests remain passing, including existing geometry fixtures and visual state behavior.

For browser-dependent details (font metrics, actual contrast, narrow/mobile layout, clipping, responsive behavior), run a real-browser smoke/visual check if tooling is available. **Do not claim visual verification based on jsdom alone.** Record manual checks still needed.

Run and report the actual package scripts for **type checking, tests, and production build** (and, if supported, demo smoke). If the environment prevents a command, give the command/error and distinguish unverified from failed.

## 6. Implementation workflow

1. Inspect existing source, tests, demos, and accepted ADRs; identify applicable types and extension points.
2. Propose minimal public settings/API shapes, precise stacking order, replacement semantics, clipping policy, and validation boundaries. Resolve conflicts before coding.
3. Implement the scene/appearance representation **before** wiring mounted DOM changes and serializer support; reuse existing modules.
4. Implement labels/highlights, pressed indicators, then overlay operations in small, testable increments.
5. Add validation, security tests, integration/parity tests, and any permitted small demo enhancement.
6. Run package tests, typecheck, build, and browser checks where possible; fix regressions.
7. Document new public options/methods and key behavior in the package README or the appropriate docs; update ADRs only as required by project policy.
8. Update `packages/keyboard/PROJECT_STATE.md` with **observed** completion status, files touched, exact verification commands/results, remaining limitations, and Phase 8 handoff.
9. Review `git diff --check` and `git status`; preserve unrelated working-tree changes.

**Do not commit, push, release, or publish.** Do not change other packages or widen public exports merely to simplify tests or the demo.

## 7. Phase 7 completion gate

Mark Phase 7 **Complete** only when all of the following are verified:

- [ ] Note-name/MIDI/octave/custom labels and key highlights work as specified.
- [ ] `color`, `indicator`, and `both` pressed modes work on black and white keys and preserve existing state semantics.
- [ ] Declarative per-key overlays support circle/dot, text, number, and badge, including multiple overlays per note and predictable replacement/order behavior.
- [ ] Layers stay visually independent of skin and pressed state, with approved stacking, positioning, and clipping rules.
- [ ] Input validation is atomic and SVG serialization safely encodes or rejects unsafe values.
- [ ] Live and pure static SVG share resolved scene output and pass parity checks.
- [ ] Existing geometry and pressed state behaviors are not regressed; targeted updates avoid full redraw where practical.
- [ ] Accessibility, reduced-motion, multiple-instance isolation, and cleanup have been checked.
- [ ] Typecheck, unit/integration tests, and production build pass, or failures/blockers are recorded without incorrectly marking completion.
- [ ] Public documentation and `PROJECT_STATE.md` reflect actual behavior and verification.

If a criterion is incomplete, mark **In progress** or **Blocked**, document the gap, and give a bounded next task. Do not begin Phase 8.

## 8. Required completion report

Report concisely:

1. **Status:** Complete / In progress / Blocked, with reasons.
2. **Public API:** New or updated options, overlay methods/types, and explicit semantics.
3. **Architecture:** How new layers flow through scene, live DOM, and static SVG.
4. **Files:** Created and modified, distinguishing core, tests, demo, and docs.
5. **Verification:** Exact commands, observed results, and any browser/manual checks.
6. **Security/accessibility:** Edge cases covered and limitations.
7. **Handoff:** Known issues, deferred work, and the next Phase 8 prerequisites.
8. **Git:** Confirm no commit or push was made.
