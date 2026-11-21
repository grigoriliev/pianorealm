# Pianorealm — Ecosystem and Keyboard Library Specification

> **Status:** Draft specification · **Primary package:** `@pianorealm/keyboard` · **Scope:** Ecosystem conventions plus the first package
>
> **Source:** Revised and expanded from the original *Piano Keyboard Visualization Library* specification. This document defines requirements, not a claim that any feature has been implemented.

## 1. Vision and scope

**Pianorealm** is a modular, framework-independent ecosystem of JavaScript/TypeScript libraries for musical visualization, interaction, MIDI connectivity, audio, and related educational or creative experiences.

The first package, **`@pianorealm/keyboard`**, renders and manages the **visual state of a piano keyboard**. It is a reusable visualization component, **not** a playable instrument, MIDI controller, or audio engine.

Pianorealm should allow consumers to adopt one package without being forced to install unrelated functionality. A plain website, an Anki flashcard, an educational application, or a framework adapter should be able to use `@pianorealm/keyboard` on its own.

### Guiding principles

1. **Small, composable packages.** One clear responsibility per package.
2. **Core independence.** Keyboard visualization does not import interaction, MIDI, or audio.
3. **Framework independence.** Plain browser APIs first; frameworks may have separate adapters later.
4. **Stable public contracts.** Integrations use documented APIs, not DOM structure or internal modules.
5. **Offline and embedded-friendly.** No remote assets or external runtime services in the core renderer.
6. **Reliable rendering.** Geometry correctness, accessibility, predictable state updates, and cleanup take precedence over effects.
7. **Incremental delivery.** Design extension points now; implement optional ecosystem packages only when needed.

## 2. Ecosystem package map

| Package | Responsibility | Dependency direction / scope |
| --- | --- | --- |
| **`@pianorealm/keyboard`** | Piano geometry, SVG rendering, skins, visual state, overlays, static SVG, accessible display | First package; **must not depend on** interaction, MIDI or audio |
| **`@pianorealm/interaction`** | Pointer, mouse, touch, and computer-keyboard input; map user gestures to note actions | Future optional package; may depend on or peer-depend on `keyboard` |
| **`@pianorealm/midi`** | Web MIDI input/output, device selection, connection and message mapping | Future optional package; transport-oriented and usable without a visual keyboard |
| **`@pianorealm/audio`** | Note playback, sound generation/samples, playback scheduling and audio lifecycle | Future optional package; usable without a visual keyboard |

Other packages (for example, framework adapters, theory helpers, notation, or sequencers) are **possibilities, not commitments**. Do not pre-build them or create speculative abstractions solely for them.

### Architectural boundaries

- `keyboard` **renders** notes and visual indicators. Programmatic `pressKey()` means “show this key as pressed,” **not** “emit a note-on event to a device” or “play sound.”
- `interaction` **interprets user input** and invokes keyboard visual-state APIs and/or publishes domain-level note actions. Pointer/touch/keyboard listeners do **not** belong in `keyboard`.
- `midi` **handles MIDI messages and devices**; it should not require an SVG element or keyboard instance to operate. MIDI output should require an explicit application action, not happen automatically on a visual state change.
- `audio` **produces/manages audio**; it should not depend on keyboard DOM layout or SVG nodes. Web Audio permission/autoplay policies are handled by the audio consumer/package, not the keyboard renderer.
- Applications orchestrate packages. Example: interaction produces a note-on action; the application or composition layer calls both `keyboard.pressKey(note)` and an audio/MIDI method.
- No circular dependencies between Pianorealm packages. Do not place generic event buses, MIDI adapters, or audio interfaces inside `keyboard` just to anticipate a future package.

### Compatibility contracts for the ecosystem

- Use MIDI note numbers (`0`–`127`) as the canonical **note identity at integration boundaries**. Note names are convenience inputs to the keyboard API.
- Distinguish **visual pressed state** from **musical input events** and **audio playback state**.
- Make ownership explicit: each package creates, manages, and destroys only its own resources.
- Consumers can compose packages without importing undocumented `src/` paths.
- Cross-package protocols and adapter APIs should be documented and tested with a small integration example before being considered stable.

## 3. Scope of `@pianorealm/keyboard`

### In scope

- Musical note naming/conversion and validation needed for keyboard visualization.
- Geometry and positioning of piano keys across arbitrary note ranges.
- Horizontal and vertical SVG rendering.
- Programmatically controlled visual key states.
- Skins, styling, labels, indicators, custom overlays and animation.
- Fixed and responsive layouts; multiple instances; lifecycle and cleanup.
- A small, documented public event and extension interface.
- Static, self-contained SVG generation where no mounted DOM is needed.
- Library builds suited to npm and classic-script offline/embedded use, especially Anki.
- Automated tests, documentation, examples, and an interactive **developer playground** (which may use controls, but does not make the library itself interactive).

### Explicitly out of scope

- Pointer, touch, mouse, or physical computer-keyboard event handling within the library.
- Web MIDI device enumeration, MIDI I/O or message transport.
- Audio playback, samples, synthesis, recording or scheduling.
- React/Vue/Angular dependencies, application-specific state, or Anki-specific runtime dependencies.
- A large generic plugin framework or premature multi-package workspace complexity.

## 4. Technology and distribution targets

- **Language:** TypeScript with generated declaration files.
- **Rendering:** SVG; CSS for scoped styling and transitions.
- **Development/build:** Vite; a library build configured for the required outputs.
- **Unit testing:** Vitest; add browser/integration and visual tests where useful.
- **Dependencies:** Minimize external runtime dependencies; ideally none for `keyboard`.
- **Frameworks:** Compatible with plain JavaScript and TypeScript; no required React, Vue, Angular, etc.
- **Environment:** Browser DOM for mounted render mode; DOM-independent geometry and preferably Node-compatible string generation for `renderToSVG()`.
- **Operation:** Offline at runtime. No CDN, remote fonts/images/stylesheets, or runtime downloads.

A package may contain bundled/scoped styles, but it must not affect host CSS. Do not assume modern browser APIs always exist in embedded clients; use feature detection and graceful fallbacks where practical.

## 5. Notes, ranges and notation

- Support both MIDI note numbers and valid note names as user-facing inputs.
- Maintain MIDI note numbers internally as the canonical representation.
- Document the chosen default scientific-pitch convention explicitly, including **C4 = MIDI 60**; allow configurable octave numbering offset for presentation/parsing where appropriate.
- Support sharps and flats for note names, configurable accidental preference for displayed labels, and MIDI number labels.
- Validate finite integer MIDI notes in `0`–`127`; reject invalid, reversed, or unsupported ranges with descriptive errors.
- Support ranges such as `C2`–`C6`, `A0`–`C8`, `C3`–`C5`, and **any valid MIDI range**, including partial octaves and endpoints on black notes.
- A single-note or black-note-only range must have a documented, predictable layout policy and tests; avoid division-by-zero or assumptions that every range contains white keys.

## 6. Geometry engine

Geometry must be a **pure or DOM-independent** subsystem, separate from SVG markup and mounting.

Calculate:

- White-key order, positions and dimensions.
- Black-key positions and dimensions relative to the surrounding white-key geometry, including truncated ranges.
- Correct depth/overlap ordering of white and black keys.
- Horizontal and vertical transforms/coordinates.
- Partial ranges, including a starting/ending black key.
- Bounds for labels, indicators and key-level overlays.
- Fixed and container-derived sizing constraints.

Geometry outputs should be deterministic for identical options. Avoid coupling calculations to a specific theme or UI framework. Define and test how keys behave when neighboring notes are outside the selected range.

### Orientation

**Horizontal:** lower notes at the left; higher notes at the right; white keys extend vertically; black keys appear over their usual upper portions.

**Vertical:** lower notes at the bottom; higher notes at the top; white keys extend horizontally; black keys appear toward the left edge.

Changing orientation must not change note identities or clear visual key/overlay state.

## 7. Rendering architecture

Separate at minimum:

1. Note and range utilities.
2. Configuration, defaults and validation.
3. Geometry/layout calculations.
4. Visual state storage.
5. Skin/theme resolution.
6. SVG element/markup generation.
7. Live DOM mounting and targeted updates.
8. Labels/indicators/overlay composition.
9. Animation and responsive lifecycle.
10. Public API, events and extension lifecycle.

Both **live SVG** and **static SVG** must use the same core geometry rules and resolved visual styling so outputs do not drift apart.

For pressed-state changes, update affected SVG elements where practical; do not rebuild the entire keyboard for each `pressKey()` or `releaseKey()`. Full structural rerenders may be appropriate for changes such as range or orientation, while preserving state according to documented rules.

### Static SVG

Provide:

```ts
PianoKeyboard.renderToSVG(options): string;
```

Requirements:

- Works without mounting a component and, where practical, without a browser DOM (for example in Node.js).
- Supports range, orientation, skin, pressed-key states, indicators, labels, overlays, and dimensions within the applicable static capabilities.
- Produces standalone, self-contained SVG markup; no remote assets or global CSS requirements.
- Escapes/validates user-controlled text and attributes to avoid SVG/HTML injection.
- Does not rely on JavaScript for the rendered static result.

## 8. Visual state and pressed keys

Provide a state API including:

```ts
setPressedKeys(keys: NoteInput[]): void;
pressKey(key: NoteInput): void;
releaseKey(key: NoteInput): void;
clearPressedKeys(): void;
getPressedKeys(): number[];
```

`NoteInput` represents a valid MIDI number or supported note name. Implement stable normalization, deduplication and predictable return ordering. Decide and document whether out-of-range notes remain in logical state or are discarded; do not allow skin/orientation/resize changes to silently mutate that policy.

Required visualization modes:

- **Color:** change the pressed key's appearance.
- **Indicator:** show a configurable marker.
- **Both:** combine color and marker.

Configure pressed color, indicator color/shape/size/position/border/opacity, and animation. Support multiple simultaneous pressed keys (white and black).

**Semantic rule:** pressed state is visual state controlled by consumers. It does not itself represent a physical key gesture, MIDI event, or sounding voice.

## 9. Skins, styling and customization

Provide a skin abstraction that controls **appearance only**, not musical behavior, state semantics, input handling or geometry algorithms.

Built-in skins from the original specification:

| Skin | Character |
| --- | --- |
| **Minimal** | Flat light/dark keys, restrained borders, minimal decoration |
| **Classic** | Ivory/light keys, dark keys, subtle gradients/shadows/rounding |
| **Modern** | Contemporary colors, restrained rounding/shadows and transitions |
| **Neon** | Dark setting, vivid active colors and optional glow |
| **Dark** | Dark interface, lighter grays and high-contrast indicators |

Support an additional **high-contrast accessibility skin** or equivalent documented high-contrast styling mode. Future possibilities: Vintage/Wooden, Educational/Colorful, Skeuomorphic, Monochrome.

Allow user overrides of background, white/black colors, borders, dimensions, radii, shadows, gradients, labels, active state, indicators, and animation. Establish a documented custom-skin registration API; no skin should alter note identities or event semantics.

Keep CSS scoped to the component; avoid global selectors, host resets, global ID collisions and unqualified names. Support transparent, inherited or explicit backgrounds and light/dark host contexts.

## 10. Labels, highlighting and overlays

Support optional note names, octave labels, MIDI values, C-note highlighting, custom labels, and custom key highlighting. Labels must remain readable in both orientations and in small layouts.

Use independently configurable visualization layers for:

- Base key styling.
- Pressed-key visual state.
- Custom note highlighting.
- Key labels and annotations.
- User-defined overlays.

Support multiple overlays per note with initial types such as circles/dots, text, numbers and badges; define a safe, extensible path for custom SVG shapes/elements without requiring consumers to manipulate internal SVG nodes. Specify stacking order, clipping and bounds behavior so overlays cannot accidentally obscure key geometry without a clear configuration choice.

Example **illustrative** API:

```ts
piano.setKeyOverlays({
  C4: [
    { type: 'circle', color: '#3498db' },
    { type: 'text', text: '1' }
  ]
});
```

## 11. Sizing, responsiveness and animation

### Sizing

- Default **container-based** sizing, responsive to container dimensions.
- **Fixed** dimensions with configurable white-key width/height, black-key width/height and overall dimensions.
- Support both orientations, different aspect ratios and CSS-constrained containers.
- Where feasible, configurable minimum/maximum key dimensions, scaling, clipping and scrolling for large ranges.
- Use `ResizeObserver` with feature detection; provide explicit `resize()` as a fallback.
- Avoid ResizeObserver feedback loops, unnecessary DOM writes and full rerendering on every frame.
- Preserve state across resizing.

### Animation

- Configurable on/off, duration, easing and skin-specific defaults.
- Basic color, indicator fade, glow and shadow transitions as appropriate.
- Respect `prefers-reduced-motion`; permit an unconditional animation-off setting.
- Ensure disabled animation and static SVG behave predictably.

## 12. Public API and composition points

The precise TypeScript types and overloads are to be finalized during architecture planning. The following names express the desired consumer-level contract.

### Construction (illustrative)

```ts
import { PianoKeyboard } from '@pianorealm/keyboard';

const piano = new PianoKeyboard({
  container: document.getElementById('piano')!,
  range: { from: 'C2', to: 'C6' },
  orientation: 'horizontal',
  sizing: { mode: 'container' },
  skin: 'classic',
  appearance: {
    pressedIndicator: 'both',
    pressedKeyColor: '#4a90e2',
    indicatorColor: '#4a90e2'
  },
  animation: { enabled: true }
});

piano.setPressedKeys(['C4', 'E4', 'G4']);
```

### Required instance methods

```ts
setPressedKeys(keys);
pressKey(key);
releaseKey(key);
clearPressedKeys();
getPressedKeys();
setRange(from, to);
setOrientation(orientation);
setSkin(skin);
setOptions(options);
resize();
destroy();
```

### Visualization and extension methods

Document methods for managing overlays, subscribing/unsubscribing to events, and installing/disposal of small extensions (for example `setKeyOverlays()`, `on()`, `off()` and `use()`). Finalize method signatures and errors before coding.

### Interaction interoperability, without embedding interaction

A future `@pianorealm/interaction` must not need to parse internal SVG markup or assume CSS selectors. Define a **minimal public way** to map coordinates or key identities to rendered keys. Candidate capabilities to evaluate during Phase 0:

- `getNoteAtPoint(x, y)` using a documented coordinate system, **or**
- an equivalent stable public hit-testing/key-identification abstraction.

Optionally expose read-only key bounds for third-party annotations. Keep these APIs narrow; do **not** expose the internal DOM tree or renderer implementation as the integration contract. Hit-testing is a visualization/layout query, **not** pointer-event handling.

### Configuration behavior

Specify and test whether `setOptions()` merges or replaces nested options, how invalid changes fail, and which updates require structural rerender. Ensure `destroy()` is idempotent or clearly documented if not.

## 13. Events and extensions

Provide a lightweight subscription/unsubscription mechanism for **visualization state and lifecycle**, such as:

- `pressedKeysChanged`
- `rangeChanged`
- `orientationChanged`
- `skinChanged`
- `resized`
- `destroyed`

Event payloads should be typed, predictable, and useful to consumers. Event names are not a substitute for input events like `pointerdown`, MIDI note-on, or audio-start; those belong elsewhere.

Provide limited extension points to register skins/visualization overlays, subscribe to events, add visual elements through supported APIs, and clean up resources. An extension should have a documented lifecycle and cleanup behavior. Do not implement a generic service container, plugin dependency graph or broad middleware engine in version 1.

## 14. Accessibility

- Use meaningful SVG accessibility labels and descriptions as appropriate for a **display-only** musical visualization.
- Avoid promising keyboard-operable controls in the display-only core: interactive keyboard handling belongs in `interaction`.
- Provide readable labels and a high-contrast presentation.
- Offer non-color-only active-state indicators.
- Respect reduced-motion settings.
- Ensure information remains distinguishable at compact sizes; document necessary tradeoffs.
- Avoid inaccessible hidden content or accidental focusable controls in decorative SVGs.
- Leave a clear integration path for future accessible interaction packages.

## 15. Performance and lifecycle

- Update individual changed keys without gratuitous full SVG rebuilds.
- Avoid unnecessary DOM operations, forced layout reads and resize loops.
- Handle reasonable keyboard ranges up to the full MIDI key range.
- Support multiple keyboard instances on the same page/card.
- Clean up observers, listeners, timers, animations and extension resources.
- Support repeated construction and destruction without memory leaks.
- Keep instance IDs, CSS and SVG definitions unique/scoped when needed.

## 16. Embedded environments and Anki

Anki is an important deployment target, **not** an architectural dependency.

### Standalone build

Provide a classic-script-compatible standalone browser bundle with one documented global namespace. Target distribution artifact names, subject to build configuration, are:

- `pianorealm-keyboard.esm.js`
- `pianorealm-keyboard.umd.js`
- `pianorealm-keyboard.umd.min.js`

The standalone build must include all required runtime code and styling, need no module loader or internet connection, and avoid excessive global namespace pollution.

**Global API decision:** Prefer `Pianorealm.Keyboard` (a namespaced ecosystem global) rather than a bare global `PianoKeyboard`; finalize this in Phase 0 and ensure examples match the actual bundle export. A possible classic-script usage shape is:

```html
<script src="_pianorealm-keyboard.umd.min.js"></script>
<script>
  const Keyboard = window.Pianorealm.Keyboard;
  const piano = new Keyboard({
    container: document.querySelector('.piano'),
    range: { from: 'C3', to: 'C5' },
    skin: 'classic'
  });
</script>
```

This example is **proposed API**, not a claim of existing Anki-compatible output; exact media filename, namespace and template lifecycle handling must be verified in tested clients.

### Runtime compatibility

- No `document.write()`.
- No assumptions that each card navigation creates a fresh JavaScript execution context.
- Avoid global CSS rules, duplicate IDs and unnecessary globals.
- Support safe repeated initialization, multiple instances and reliable cleanup.
- Feature-detect DOM/browser APIs and document fallbacks.
- Support compact/narrow/mobile dimensions, explicit/transparent backgrounds, and light/dark host styling.
- Document host-controlled night-mode integration without hard-coding Anki classes into the library.
- Test and document behavior separately in Anki Desktop on Windows/macOS/Linux, AnkiDroid, AnkiMobile, and (where possible) AnkiWeb. Do not claim compatibility without real verification.

### Anki documentation

Provide copy-and-paste front/back examples, instructions for placing media files in `collection.media`, script references, initialization, state display, both orientations, night mode, and card lifecycle limitations. Clearly distinguish **live JavaScript** from **pre-rendered static SVG** workflows.

## 17. Testing and quality gates

### Unit testing (Vitest)

Cover:

- MIDI/name conversion, enharmonics, octave offsets and invalid inputs.
- Note range validation, black-key endpoints and edge/single-note ranges.
- White/black geometry and partial octaves in both orientations.
- Sizing calculations and constraints.
- Pressed-key state, multiple keys, deduplication and state preservation.
- Skin resolution, switching and individual overrides.
- Overlay geometry/ordering and text escaping.
- Configuration updates and lifecycle cleanup.
- Events, extension cleanup and `renderToSVG()` determinism.

### Integration and browser testing

- Mount/update/destroy in real DOM conditions.
- Responsive resizing and multiple instances.
- CSS isolation and accessibility behavior.
- Static SVG in the relevant non-DOM environment.
- Package exports and installed-consumer smoke tests.
- Optional integration smoke tests for future packages, without importing those packages into `keyboard`.

### Visual regression testing

Capture representative combinations of skin, orientation, note range, pressed state, overlay type and dimensions. Prevent accidental geometric or styling regressions; use a manageable matrix rather than every Cartesian combination.

### Verification discipline

No task is complete merely because code was written. Record commands executed, test/build results and limitations. Do not claim Anki device compatibility, performance or accessibility validation that has not been performed.

## 18. Documentation and developer playground

Provide:

- README, installation, quick start, public API, configuration and type references.
- Geometry/orientation explanation and note naming conventions.
- Skin/indicator/overlay customization and extension guidance.
- Horizontal/vertical, full/partial range, fixed/responsive and multi-instance examples.
- Plain JS and TS examples and import/classic-script guidance.
- Anki guide (front/back, offline media, night mode, lifecycle).
- Standalone static SVG examples.
- Clear statement distinguishing `@pianorealm/keyboard` from `@pianorealm/interaction`, `@pianorealm/midi` and `@pianorealm/audio`.

Build a separate **developer playground** using the published library API, with controls for skins, orientation, ranges, sizing, active keys, indicators, labels, overlays and animations. Changes should update the preview and produce sample initialization code. The playground may have UI controls; it must not inject input handling into the core library.

## 19. Packaging, exports and versioning

Publish as `@pianorealm/keyboard` with:

- ESM import path and TypeScript declarations.
- Optional CommonJS output if demonstrably useful and not costly to maintain.
- Standalone UMD/classic-script bundle, including a minified variant.
- Correct `package.json` exports, styles/assets delivery, source maps and build scripts.
- No external runtime assets; offline-compatible distribution.
- Semantic versioning, changelog, documented public vs internal APIs, and migration notes for breaking changes.

**Naming:** npm package names use the scoped `@pianorealm/*` convention; standalone artifact filenames use `pianorealm-<package>.*` to avoid confusion with other global libraries. Public browser globals should use one `Pianorealm` namespace when multiple standalone packages coexist.

Do not require a monorepo at the start. A monorepo/workspace is an architectural choice to evaluate when a second package actually exists; whether using one repository or many, package boundaries must remain enforceable.

## 20. Development process and phased delivery

### Required planning before implementation

1. Review this specification and identify ambiguities, risks and decisions.
2. Propose package/module architecture and source tree.
3. Explain horizontal/vertical key geometry, especially partial ranges and black-note endpoints.
4. Define live-versus-static SVG sharing and state preservation rules.
5. Define public composition contracts for future `interaction`, without implementing input.
6. Decide browser namespace, Anki distribution and environment support policy.
7. Produce an initial API proposal and testing strategy.
8. Record architectural decisions in `ARCHITECTURE.md` or ADRs before coding.

### Suggested phases

| Phase | Deliverable |
| --- | --- |
| **0 — Architecture** | Contracts, module boundaries, package/export strategy and decision record |
| **1 — Foundation** | TS/Vite/Vitest setup, note utilities, config validation and tests |
| **2 — Geometry** | Deterministic horizontal/vertical layouts, partial-range cases and tests |
| **3 — SVG renderer** | Minimal live rendering, mount/resize/destroy and rendering tests |
| **4 — Visual state** | Pressed-key API, efficient updates, state invariants and tests |
| **5 — Skins** | Theme system, minimal/classic baseline, custom overrides; other skins as capacity allows |
| **6 — Responsive and motion** | Fixed/container sizing, resize handling, reduced-motion and transition options |
| **7 — Labels and overlays** | Labels, highlight layers, indicators and overlay API |
| **8 — Events and extensions** | Lightweight events, narrow composition/hit-testing contract and extension lifecycle |
| **9 — Static SVG and Anki** | Shared render model, static SVG, standalone artifacts, embedded docs and compatibility tests |
| **10 — Release quality** | Remaining skins, docs, playground, visual tests, packaging and release checks |

The table is a **planning sequence**, not permission to defer foundational design: decisions that affect static SVG, Anki and future composition must be considered in Phase 0 and protected by tests as each subsystem is added.

### Phase workflow

For each phase: inspect existing code and project state → agree on scope → implement only scoped requirements → add/update tests → run verification → review defects → update documentation and `PROJECT_STATE.md` → commit. Avoid unrelated rewrites and placeholder implementations.

## 21. Acceptance criteria for the initial keyboard release

An initial stable keyboard release is acceptable only when:

1. The package can be installed as `@pianorealm/keyboard` and used without any other Pianorealm package.
2. Both orientations and valid MIDI note ranges render correctly, including partial/octave and black-key boundary cases.
3. Programmatic state APIs update visual keys reliably and preserve documented invariants across styling, resizing and layout changes.
4. The API is genuinely non-interactive: no built-in pointer, computer-keyboard, MIDI device or sound behavior.
5. At least the promised initial skin/customization functionality is implemented and tested; any intentionally deferred skin/effect is explicitly listed as deferred rather than claimed complete.
6. Overlay/label functionality and reduced-motion/accessibility behavior meet their documented contracts.
7. Live and static SVG rendering share geometry and styling logic, and the static output is self-contained.
8. npm ESM/types exports and an offline classic-script build function in smoke tests.
9. Instance cleanup, multiple instances and CSS isolation are tested.
10. Documentation explains composability, Anki setup and tested-versus-untested host support.
11. Unit/build and representative browser/visual tests pass, or all exceptions are documented before release.

## 22. Open design decisions to resolve in Phase 0

These should be decided deliberately, rather than left as accidental implementation details:

1. **Repository topology:** single package repo now versus early workspace/monorepo.
2. **Browser global:** precise `Pianorealm.Keyboard` constructor/namespace shape and coexistence of future bundles.
3. **Range semantics:** state behavior when notes fall outside the visible range; single-note layouts.
4. **Geometry sizing:** canonical units, black-key sizing defaults and clipping for partial ranges.
5. **Hit testing:** coordinate system and smallest stable surface usable by `@pianorealm/interaction`.
6. **Skin customization:** object overrides versus registered skins and their precedence.
7. **Static SVG:** style embedding, gradients/IDs uniqueness, safe SVG input policy and Node support.
8. **Anki support:** lowest tested client versions, script injection/reinitialization strategy and unsupported APIs.
9. **Events:** exact payload types, error semantics and batching behavior.
10. **Build outputs:** ESM/UMD actual filenames, exports mapping and whether CommonJS earns its maintenance cost.

## 23. Final engineering rules

- Keep implementation modular; never put the entire project into one source file.
- Never sacrifice correctness of geometry or note semantics for visual effects.
- Keep package and public API boundaries explicit.
- Avoid unnecessary runtime dependencies and prevent CSS/global leakage.
- Tests and documentation are part of each feature, not an optional final cleanup.
- Preserve the keyboard library as a **display-only foundation** for the future Pianorealm ecosystem.
- Build a reliable, lightweight first package before expanding the ecosystem.
