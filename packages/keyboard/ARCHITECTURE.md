# `@pianorealm/keyboard` — Package Architecture

> **Status:** Accepted Phase 0 baseline; **not an implementation report**
> **Package:** `@pianorealm/keyboard`  
> **Scope:** Internal design for a framework-independent, display-only piano keyboard visualization library  
> **Related:** [Ecosystem vision](../../docs/ECOSYSTEM.md) · [Ecosystem architecture](../../docs/ARCHITECTURE.md) · [Keyboard product specification](./PROJECT_SPEC.md)
>
> This document specifies architectural boundaries and recommends implementation contracts. **Illustrative TypeScript signatures are proposals**, not published API commitments. Record unresolved choices in an ADR before relying on them across packages. **MUST**, **MUST NOT**, **SHOULD**, and **MAY** communicate requirement strength.

## 1. Purpose, authority, and non-goals

The package renders a configurable piano keyboard and exposes **visual state**, not instrument behavior. It serves browser pages, embedded webviews, offline applications, and Anki flashcards. Its geometry and static SVG generation should also be usable without a mounted browser DOM.

Requirements live in `PROJECT_SPEC.md`; ecosystem dependency and integration rules live in `docs/ARCHITECTURE.md`. This document determines **how** keyboard modules cooperate. If documents conflict, record and resolve the conflict rather than silently changing the product requirements.

The package **MUST NOT** implement pointer/mouse/touch/computer-key event handling, MIDI device access, note transmission, audio playback, or sound scheduling. Its `pressKey()` method means *mark a note visually pressed*. The application or a future optional `@pianorealm/interaction` package owns user gestures; `@pianorealm/midi` owns device I/O; `@pianorealm/audio` owns audio. None is a runtime dependency of this package.

### Design priorities

1. Correct, deterministic musical and geometric calculations.
2. Identical geometry and appearance rules for mounted and static rendering.
3. Targeted visual updates without redrawing for each key-state change.
4. Narrow, typed public APIs; internal modules remain private.
5. Resilient resource cleanup and multiple-instance isolation.
6. Scoped CSS, no network assets, and compatibility-aware browser usage.
7. Feature-rich visualization without turning the package into an application framework.

## 2. Architectural overview

```text
                 Public API: PianoKeyboard / renderToSVG
                                  |
            +---------------------+----------------------+
            |                     |                      |
      Configuration           Visual state         Events / extensions
      + validation            (pressed/overlays)     (documented hooks)
            |                     |                      |
            +----------+----------+----------------------+
                       |
           Note utilities + geometry + skin resolution
                       |
                 Render description
               (DOM-independent data)
                      / \
                     /   \
         SVG string serializer     Mounted SVG renderer
         (no browser required)      (DOM + node registry)
                   |                         |
          Self-contained SVG        Per-key DOM updates
                                             |
                                 Observer + animation lifecycle
```

**Main rule:** musical note parsing, layout, visual-state modeling, and SVG serialization must not rely on document globals or SVG element instances. Only the mounted adapter needs a browser DOM.

### Suggested module dependency direction

```text
public/ -> controller/ -> {config/, notes/, geometry/, state/, skins/, scene/}
                                   scene/ -> svg/serializer
public/static -> {config/, notes/, geometry/, state/, skins/, scene/, svg/serializer}
controller/ -> svg/dom, sizing/, events/, extensions/
```

Low-level modules **MUST NOT** import the controller, mounted renderer, or package entry point. Avoid circular imports.

## 3. Proposed package layout

```text
packages/keyboard/
├── ARCHITECTURE.md
├── PROJECT_SPEC.md
├── DEVELOPMENT_PLAN.md                # when created
├── PROJECT_STATE.md                   # when created
├── README.md                          # when created
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── index.ts                       # intentional public exports only
│   ├── public/
│   │   ├── PianoKeyboard.ts
│   │   └── types.ts
│   ├── config/
│   │   ├── defaults.ts
│   │   ├── normalize.ts
│   │   └── validate.ts
│   ├── notes/
│   │   ├── notation.ts
│   │   └── ranges.ts
│   ├── geometry/
│   │   ├── layout.ts
│   │   ├── horizontal.ts
│   │   ├── vertical.ts
│   │   └── hit-testing.ts
│   ├── state/
│   │   ├── pressed-keys.ts
│   │   └── overlays.ts
│   ├── skins/
│   │   ├── builtins.ts
│   │   └── resolve.ts
│   ├── scene/
│   │   └── build-scene.ts
│   ├── svg/
│   │   ├── serialize.ts
│   │   └── dom-renderer.ts
│   ├── sizing/
│   │   └── resize-controller.ts
│   ├── events/
│   │   └── emitter.ts
│   ├── extensions/
│   │   └── lifecycle.ts
│   └── internal/
│       └── svg-safety.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── browser/
│   └── fixtures/
├── docs/
│   ├── api/
│   └── guides/
└── demo/                             # package playground or workspace app
```

This is **a suggested logical layout**, not a requirement to create empty folders or split trivial functions into many files. Start with the modules needed by the current phase and preserve the dependencies above. The exact test/demo locations may follow the eventual workspace conventions.

## 4. Data contracts and immutability

### 4.1 Notes and ranges

- The canonical note identity is a MIDI integer in `[0, 127]`.
- Public note inputs may be numbers or supported note-name strings; normalize **once at API boundaries**.
- Default scientific pitch notation is `C4 = MIDI 60`; octave display offsets and accidental spelling are explicit configuration.
- Internal range is a normalized inclusive pair `{ from: number; to: number }`, with `from <= to`.
- Use discriminated types for orientation (`'horizontal' | 'vertical'`), key kind (`'white' | 'black'`), and sizing mode (`'container' | 'fixed'`).
- Reject `NaN`, fractional/out-of-bounds MIDI values, reversed ranges, unsupported notation, and non-finite dimensions with actionable errors.

Illustrative internal contracts:

```ts
type MidiNote = number;             // validated integer 0..127 at boundaries
type NoteInput = number | string;   // external; not all strings are valid
interface MidiRange { from: MidiNote; to: MidiNote }
type Orientation = 'horizontal' | 'vertical';
interface KeyBounds { x: number; y: number; width: number; height: number }
interface KeyLayout { note: MidiNote; kind: 'white' | 'black'; bounds: KeyBounds }
interface KeyboardLayout {
  width: number;
  height: number;
  orientation: Orientation;
  keys: readonly KeyLayout[];
}
```

Use immutable results or treat returned structures as read-only. Do not leak mutable maps, DOM references, or internal skin objects to consumers.

### 4.2 Separate sources of truth

Keep these domains distinct:

| Domain | Ownership | Examples |
| --- | --- | --- |
| Normalized configuration | Controller | Range, orientation, sizing, skin selection |
| Visual pressed state | State module | Set of MIDI note numbers |
| Key overlays / labels | State and scene modules | Badges, circles, annotations |
| Computed layout | Geometry module | Key bounds, layering, hit regions |
| Resolved appearance | Skin module | Colors, borders, effects, indicator styles |
| Mounted nodes | DOM renderer | Root SVG, keyed node lookup, generated IDs |
| Runtime resources | Controller / owners | Observers, listeners, subscriptions, extension disposers |

Do not store independent, contradictory copies of the same property. Layout and visual scene are **derived** from configuration and state.

### 4.3 Pressed-state semantics

The controller normalizes note inputs using the notation in effect at ingestion. The state store retains canonical MIDI notes across visual configuration changes, including notes outside the displayed range. The scene renders the visible intersection. [A-05](docs/decisions/0001-notes-configuration-and-state.md)

`setPressedKeys` validates and deduplicates the full array before replacing the selection. `getPressedKeys` returns a detached ascending MIDI array. Equivalent selections produce no DOM mutations. Phase 4 updates the fill and fixed dot of each changed visible key through an instance-local MIDI map. The state methods follow the mounted lifecycle contract and throw after destruction. [Lifecycle ADR](docs/decisions/0004-lifecycle-events-and-embedded-hosts.md)

## 5. Note parsing and range validation

The note utility module is **pure** and has no knowledge of screen coordinates, SVG, skin names, or the DOM.

Responsibilities:

- Convert note names to MIDI and back under documented octave settings.
- Recognize the semitone class (white/black) using modulo 12.
- Support sharp/flat spellings and consistent accidental preference in generated labels.
- Normalize inclusive ranges, including single-note ranges and ranges containing only black notes.
- Emit specific validation errors rather than silently clamping invalid notes.

Tests MUST cover octave boundaries, enharmonic aliases, full MIDI bounds, invalid strings, accidental formatting, and alternate octave display conventions. Avoid conflating note spelling with MIDI pitch identity.

## 6. Geometry engine

### 6.1 Responsibilities and invariants

`calculateLayout(normalizedOptions)` must return a deterministic, finite layout without creating any DOM nodes. It computes key bounds, layering order, and anchor regions usable by labels and overlays.

**Invariants:**

- Each valid MIDI note in the selected inclusive range has exactly one key geometry record.
- White keys occupy the primary chromatic progression lane; black keys overlap the appropriate white-key gap and are drawn above whites.
- Horizontal orientation has lower pitches to the **left**; vertical has lower pitches at the **bottom**, with black keys on the **left** side of white keys.
- Switching orientation does not change note identity or state.
- Partial ranges, black-key endpoints, single-key ranges, and all-black ranges never yield division by zero, `NaN`, or negative dimensions.
- Geometry is independent of skin; optional decorative layout adjustments must remain explicitly defined and testable.

### 6.2 Recommended base layout strategy

1. Normalize MIDI endpoints and generate ordered key descriptors.
2. Compute the white-key coordinate lattice for the complete relevant semitone sequence, including **virtual neighboring white keys outside the visible range** where needed to anchor endpoint black keys.
3. Calculate black-key positions from adjacent white-key centers/gaps, not from equal semitone spacing.
4. Resolve the viewport policy for truncated endpoints (clip, inset, or extend) **explicitly**; do not accidentally render outside the container.
5. Map base-axis coordinates into horizontal or vertical output; vertical reverses the pitch axis so low notes are at the bottom.
6. Emit stable key records and overlay/label anchor geometry; keep pixels/normalized units consistent.

**Open choice:** exact endpoint cropping, single-black-key sizing, and fixed-size versus container-width fitting need a documented decision and regression fixtures. The algorithm above is a strategy, not a silent policy choice.

### 6.3 Sizing and coordinate systems

- Choose one **canonical layout coordinate system** (recommended: CSS-pixel-equivalent numeric units inside an SVG `viewBox`).
- Define key width/height, black/white ratios, minimum/maximum constraints, and padding in one place.
- `container` mode derives an available viewport from observed host dimensions; `fixed` mode derives dimensions from explicit configuration.
- Responsive scaling, scroll/clip behavior, and aspect-ratio constraints must be deterministic and documented.
- Geometry uses provided numeric dimensions; it must not query `getBoundingClientRect()` itself.
- Avoid layout feedback loops or geometry changes caused merely by shadow, glow, or border styling.

### 6.4 Hit testing for future interaction

A future interaction adapter can call `getNoteAtPoint(clientX, clientY): number | null` with viewport CSS pixels. The query shares rendered key bounds and prioritizes the topmost black key. The caller owns input listeners and gesture handling. Optional read-only bounds require a demonstrated use case. [Hit-test contract](README.md#hit-testing)

## 7. Shared scene and two SVG output paths

A **render description** (or scene) is recommended as the shared rendering contract:

```text
normalized options + pressed state + overlays
           |            |             |
           +----- geometry + appearance resolution
                               |
                         scene description
                        /                 \
              string serializer       mounted DOM adapter
```

The scene represents stable key identities, geometry, style, labels, indicators, overlays, and layering. It **does not** contain browser element references.

### 7.1 Static serializer

`PianoKeyboard.renderToSVG(options)` must:

- Produce self-contained SVG markup from pure inputs, without requiring a container.
- Reuse the same geometry, skin resolution, labels, and overlay semantics as mounted rendering.
- Include explicit dimensions/`viewBox`, and embed all necessary styles and paint definitions.
- Escape all untrusted text and attribute values; reject unsupported SVG payloads rather than injecting raw markup unsafely.
- Avoid global CSS, external fonts/images/stylesheets, and network requests.
- Define a stable strategy for SVG `<defs>` identifiers so separately embedded instances do not collide.
- Yield deterministic output for identical normalized inputs and an explicit validated `idPrefix`. Default prefixes isolate definitions within one library copy. [Identifier policy](docs/decisions/0003-scene-safe-svg-and-identifiers.md)

**Static SVG has no browser animation or events.** It should show the requested visual end state. Node-compatible generation is the preferred target and should be verified with a Node smoke test.

### 7.2 Mounted DOM renderer

Owns the SVG root and any nodes created beneath it; maintains an internal `Map<MidiNote, KeyNodes>` or equivalent for targeted updates. Suggested behavior:

- Mount with a full scene on first render.
- For `pressKey/releaseKey`, update only affected key presentation nodes/attributes/classes and indicators.
- For overlays and labels, update the relevant subtrees where practical.
- For range/orientation or structural layout changes, a full scene rebuild is acceptable **if state remains intact**.
- Keep structural/render changes separate from animation CSS decisions.
- Avoid writing to elements outside the caller-supplied container.
- Multiple instances must have isolated nodes, styles, SVG definitions, and disposal scopes.

Do not expose DOM nodes or internal CSS classes as a supported interoperability API. DOM tests in an emulated environment are not a substitute for real-browser rendering tests.

### 7.3 Stacking and overlays

Phase 7 uses the layer order in [A-07](docs/decisions/0003-scene-safe-svg-and-identifiers.md):

1. Background, white bodies, then black bodies. Pressed fill is resolved on each body.
2. Per-note highlight strips, then upright labels and pressed indicators.
3. User overlays in ascending MIDI order, preserving the input array order for each note.

Labels and indicator records merge under A-06. The custom label, highlight and overlay maps each replace as a whole. Map keys are decimal MIDI properties or note names interpreted with the current notation, including notation in the same configuration patch. Reject duplicate normalized notes and keep valid off-range entries. Custom labels take precedence over generated labels. C emphasis uses bold text and a default highlight strip that an explicit per-note color can override. These settings are independent of skin selection.

Decorations use intrinsic coordinates. Position fractions run along pitch, from the low-note edge of the key, and depth, from the key's back edge. Clip highlights, labels and overlays to the geometric key face, subtracting black footprints from white keys. Indicators fit within a clear, inset strip to keep the shape cue intact. Text stays upright, scales down to fit a bounded text region and is omitted below the intrinsic font-size floor. The SVG remains one named image, with annotation subtrees hidden from assistive technology. See the [public configuration reference](README.md#labels-highlights-and-overlays).

## 8. Skins and styling

Skin objects **only** describe resolved appearance: backgrounds, key fills, borders, radii, shadow/gradient treatments, label colors, active-state visuals, indicator styles, and animation defaults. A skin **MUST NOT** change pitch order, MIDI numbers, state semantics, event delivery, or input behavior.

Phase 5 provides `minimal` and `classic`. `registerSkin(name, appearance)` validates and copies tokens into the keyboard instance, where `setSkin(name)` can select them. Phase 10 tracks `modern`, `neon`, `dark` and a high-contrast skin or equivalent accessibility mode. [Supported appearance tokens](README.md#skins-and-appearance)

Resolution applies Minimal defaults, selected skin tokens and explicit instance overrides in that order. The accepted policy places explicit accessibility settings last when they are introduced. Key dimensions belong to sizing options. [Configuration ADR](docs/decisions/0001-notes-configuration-and-state.md)

Keep styles scoped inside the component, including embedded and Anki usage. Avoid selectors that affect host `.card`, `body`, or generic `svg`/`rect` elements. Prefer inline SVG presentation attributes/embedded scoped styles where they improve standalone export and host isolation; define a consistent strategy so static and mounted output match. SVG definitions (gradients, filters, masks) require collision-safe IDs.

## 9. Configuration, mutation, and update planning

Configuration normalization and validation happen before mutation. **Recommended transactional approach:** validate an incoming update completely, derive new normalized configuration, then apply it; never leave the component partially updated on error.

Define update classes:

| Change | Expected work |
| --- | --- |
| Press/release a note | Targeted affected-key visual change; no layout recompute |
| Change an indicator/overlay | Recompute affected scene fragments where practical |
| Change a skin or styling override | Re-resolve appearance; preserve notes/overlays |
| Change dimensions | Recompute geometry and affected visuals; preserve notes/overlays |
| Change orientation or range | Recompute geometry and rebuild structural SVG if needed |
| Destroy | Dispose observers, events, animations, extensions, and mounted nodes |

`setOptions()` must have documented **nested merge vs. replace** behavior. Proposed: deep merge only for known option objects with arrays replaced and unknown keys rejected; this is **not yet binding**. Validate all changed paths and define precedence between constructor options and later updates.

## 10. Controller and public API

The `PianoKeyboard` controller coordinates configuration, state, derived layout/scene, renderer, observers, events, and extensions. It is a façade, **not** a catch-all place for geometry, SVG string templates, or note math.

Baseline instance API required by the specification:

```ts
class PianoKeyboard {
  constructor(options: KeyboardOptions);
  setPressedKeys(keys: readonly NoteInput[]): void;
  pressKey(key: NoteInput): void;
  releaseKey(key: NoteInput): void;
  clearPressedKeys(): void;
  getPressedKeys(): number[];
  setRange(from: NoteInput, to: NoteInput): void;
  setOrientation(orientation: Orientation): void;
  setSkin(name: string): void;
  registerSkin(name: string, appearance: AppearanceOptions): void;
  setOptions(options: KeyboardOptionsPatch): void;
  resize(): void;
  destroy(): void;
  static renderToSVG(options?: StaticKeyboardOptions): string;
}
```

The public controller includes overlay replacement, typed events, extension installation, and hit testing. Types are published at the package root. The controller rejects use after destruction, with idempotent `destroy()` and returned disposers as the lifecycle exceptions. [Public API](README.md#visualization-events)

### Construction and failure cases

Mounted construction requires a valid DOM container and enough dimensions to render or a documented zero-size waiting state. Handle disconnected/zero-size containers, repeated mounting attempts, invalid configurations, and observers not present in older embedded webviews without leaking resources.

## 11. Events and extension lifecycle

The controller commits each visualization change before dispatching snapshots through a per-instance emitter. Observer notifications use the same resize transaction as explicit `resize()`. Effective viewport dimensions come from the mounted adapter, which coalesces measurement noise. Pressed-note changes use targeted key updates before notification. Event delivery guards against reentrant keyboard mutation. [Event order and payloads](README.md#visualization-events) · [A-10](docs/decisions/0004-lifecycle-events-and-embedded-hosts.md)

The controller runs extension setup with the public keyboard façade and tracks returned cleanups. The extension owns partial setup rollback and retains any subscription disposers it needs. Destruction snapshots listeners at teardown start, stops observation, and marks the instance destroyed before extension cleanup. Final notification follows SVG and mount ownership release. [Extension contract](README.md#extensions)

The mounted adapter inverts the SVG root's screen transform from viewport CSS pixels to SVG user units. The controller queries the same immutable layout used for rendering, so both orientations retain the pure geometry engine's half-open bounds and black-key precedence. [Hit-test contract](README.md#hit-testing) · [A-09](docs/decisions/0002-layout-sizing-and-hit-testing.md)

## 12. Responsive and animation lifecycle

The mounted adapter measures the host's content box and passes numeric dimensions to the SVG viewport. Intrinsic geometry stays independent of the measurement. The adapter uses a zero-footprint slot in container mode to avoid layout feedback. It uses `ResizeObserver` where available and coalesces notifications when the host supports animation frames and frame cancellation. Explicit `resize()` measures immediately. A viewport-only change reuses the drawing, including when switching sizing modes. Orientation and key-dimension changes apply new geometry to the existing nodes. Range changes rebuild the ordered key layers and their MIDI lookup together.

The mounted adapter owns an instance-scoped CSS stylesheet for transitions. It enables motion through a positive `prefers-reduced-motion: no-preference` media query, so the browser handles preference changes without a subscription and unsupported hosts retain the final state. Explicit `enabled: false` or zero duration removes the transition rules. Validated animation overrides merge independently of scene appearance and preserve the same key nodes. The private serializer emits the shared scene's final fill and dot visibility attributes without the mounted stylesheet.

## 13. Accessibility and security

- Give the root SVG an appropriate accessible name/description or a documented decorative mode; avoid misleading button semantics for a display-only component.
- Support legible labels, high contrast, and non-color-only indicators; test compact and vertical views.
- Avoid unintended tab stops and keyboard handling in the base package; future interaction accessibility belongs to an optional integration.
- Escape labels, annotations, text overlays, CSS values, and attributes as appropriate. For custom SVG elements, prefer a validated declarative shape schema rather than raw HTML/SVG markup; never treat arbitrary supplied strings as trusted XML.
- Avoid `innerHTML` for untrusted SVG strings in the live path; prefer DOM creation APIs or sanitized, tightly controlled generated markup.
- Do not fetch external assets or execute embedded scripts; avoid dangerous URLs, event-handler attributes, `<foreignObject>`, or unrestricted custom element injection.
- Document user-supplied color/length/filter formats that are accepted and reject unsafe or unsupported values.

## 14. Embedded environments, Anki, and distribution

### Host isolation

- No framework dependencies, document-wide CSS resets, remote fonts, external resources, or runtime fetches.
- Avoid `document.write()` and assumptions that card navigation creates a new page or JavaScript context.
- Support repeated initialization, multiple instances, duplicate-script scenarios where relevant, and explicit cleanup.
- Use instance-scoped identifiers and selectors, including gradients, masks, filters, and clip paths.
- Feature-detect optional browser APIs; document minimum **tested** host versions rather than claiming universal compatibility.

### Artifacts

The specification proposes:

```text
@pianorealm/keyboard                npm package (ESM + .d.ts)
pianorealm-keyboard.esm.js          ESM browser/library artifact
pianorealm-keyboard.umd.js          classic-script standalone bundle
pianorealm-keyboard.umd.min.js      minified standalone bundle
Pianorealm.Keyboard                proposed browser global
```

The package root exports ESM and declarations. Both standalone artifacts install `Pianorealm.Keyboard` through the explicit installer and preserve other namespace members. The standalone artifacts use a self-contained classic script. [Accepted distribution contract](../../docs/decisions/0002-standalone-global-namespace.md) · [Anki client verification](docs/guides/anki-integration.md#compatibility-matrix)

## 15. Testing strategy and quality gates

| Level | Must verify |
| --- | --- |
| Pure unit tests | Note parsing, notation, range validation, key classification, layout invariants, sizing, hit-test geometry |
| State tests | Deduplication, ordering, range semantics, no-ops, multiple pressed keys, overlays |
| Scene/serializer tests | Determinism, escaping, skin application, static/live geometry equivalence, valid SVG markup |
| DOM integration tests | Targeted per-key mutation, lifecycle cleanup, repeated mount/destroy, state persistence |
| Browser tests | Actual SVG geometry, both orientations, scaling/resize, contrast/reduced motion, CSS isolation |
| Visual regression | Representative skin × orientation × range × pressed/overlay states (curated matrix) |
| Distribution smoke tests | npm ESM + types, standalone classic-script global, offline operation, Node static SVG |
| Embedded compatibility | Anki desktop/mobile clients tested individually; initialization/reuse/night mode |

Use Vitest for unit/integration tests and a real-browser runner for layout and visual checks. Run tests/build/typecheck at each phase checkpoint; never claim execution or compatibility without testing. Track expected differences such as fractional pixel rounding or text rendering when comparing static and mounted SVG.

### Essential geometry fixtures

- `C3`–`C5` and `A0`–`C8`.
- Ranges starting/ending on sharps/flats.
- One white key and one black key.
- Two adjacent notes with different colors/kinds.
- Full MIDI `0`–`127`.
- Both orientations and multiple aspect ratios.
- Tiny/zero-size containers and unusual explicit dimensions.

### Release gates

1. All documented API and state invariants have tests.
2. Geometry correctness and live/static parity are demonstrated.
3. No pointer/MIDI/audio dependencies or code have entered the package.
4. No unscoped CSS, global ID collisions, or unsafe SVG interpolation.
5. Cleanup and multi-instance behavior are verified.
6. ESM/types and standalone offline builds pass smoke tests.
7. Documented accessibility and embedded compatibility claims match real test evidence.
8. Deferred requirements are explicitly listed; do not silently describe them as complete.

## 16. Implementation sequencing

Follow the package development plan when it exists. Recommended dependency-aware order:

1. **Phase 0 — Decisions:** agree on range layout policy, out-of-range state, sizing coordinates, configuration merging, API/event rules, hit testing, static SVG IDs, browser global and host support baseline.
2. **Core utilities:** TypeScript/Vite/Vitest setup; note parsing and validation.
3. **Geometry:** pure positioning for arbitrary ranges and both orientations.
4. **Scene and SVG:** base appearance, static serializer, initial mounted render path.
5. **State:** pressed keys and targeted DOM updates.
6. **Skins:** visual tokens, overrides, initial built-ins, high-contrast route.
7. **Sizing and animation:** container/fixed modes, observer cleanup, reduced motion.
8. **Labels and overlays:** validated primitives, stacking and clipping.
9. **Events/extensions/hit testing:** narrow documented public contracts.
10. **Embedded/release:** standalone exports, Anki guide/tests, documentation, playground, visual regression, packaging.

These steps are **sequencing guidance**, not permission to omit original requirements. Build tests and cleanup checks within each phase rather than postponing them until final release.

## 17. Decisions requiring ADRs before implementation

| Decision | Why it matters | Proposed direction, not final |
| --- | --- | --- |
| Partial endpoint and single-black-key geometry | Consistent visual bounds | Virtual adjacent white keys + explicit clip/inset policy |
| Geometry units and fit behavior | Cross-renderer parity | SVG user units aligned to CSS-pixel-equivalent viewport |
| Out-of-range pressed state | State continuity | Retain normalized valid MIDI notes; render visible subset |
| `setOptions()` semantics | Predictable updates | Validate first; merge known nested objects; replace arrays |
| Public hit-test coordinates | Future `interaction` package | Use viewport CSS pixels and apply the layout's z-order |
| Scene representation and ID generation | Static/live consistency | Pure scene + deterministic static IDs / per-instance DOM IDs |
| Skin override precedence | Styling and accessibility | Defaults → skin → user override → explicit accessibility policy |
| Event batching and error semantics | Public API stability | Post-commit events; documented no-op behavior |
| Custom SVG overlay policy | Security and portability | Declarative, validated primitives; no unchecked raw markup |
| Standalone global and bundle naming | Multi-bundle coexistence | `Pianorealm.Keyboard`, namespaced UMD |
| Minimum embedded client support | Avoid false compatibility claims | Test matrix with declared versions |

Create ADRs under `docs/decisions/` for ecosystem-wide contracts and under the package's own `docs/decisions/` for keyboard-only decisions, following the repository convention. Update this document when decisions are ratified; avoid rewriting historical rationale.

## 18. Architecture acceptance checklist

- [ ] Each feature has a single owning module and obeys dependency direction.
- [ ] Geometry, note parsing, scene building, and static SVG are DOM-independent.
- [ ] Mounted and static rendering share the same layout and style resolution.
- [ ] Key-state-only updates avoid full structural SVG rebuilds.
- [ ] State is preserved across skin, orientation, range, and size changes per finalized policy.
- [ ] Configuration mutations are validated and predictable.
- [ ] External packages can use documented APIs without reading private SVG/DOM structures.
- [ ] Keyboard has zero dependencies on interaction, MIDI, and audio packages.
- [ ] SVG generation validates/escapes untrusted inputs; IDs/styles are isolated.
- [ ] Observers, subscriptions, animations, and extensions cleanly dispose.
- [ ] Offline standalone and npm outputs are verified in supported environments.
- [ ] Tests, docs, and declared supported platforms reflect implementation evidence.

---

**Architectural baseline:** `@pianorealm/keyboard` is a portable, deterministic **visualization engine**. Its core produces geometry and visual descriptions; the static serializer turns them into standalone SVG; the mounted adapter updates browser nodes efficiently. Human interaction, MIDI transport, and audio remain independently owned capabilities composed by applications through documented public contracts.

## Phase 0 review references

The [Phase 0 review](docs/PHASE_0_REVIEW.md) records the audit, architecture sketch, risks and fixtures. The maintainer accepted all six ADRs on 2026-11-21. The accepted ADRs govern any earlier sketches in this document.

- [Repository topology](../../docs/decisions/0001-repository-topology.md)
- [Standalone namespace and collision policy](../../docs/decisions/0002-standalone-global-namespace.md)
- [Notes, configuration and state](docs/decisions/0001-notes-configuration-and-state.md)
- [Layout, sizing and hit testing](docs/decisions/0002-layout-sizing-and-hit-testing.md)
- [Scene, safe SVG and identifiers](docs/decisions/0003-scene-safe-svg-and-identifiers.md)
- [Lifecycle, events and embedded hosts](docs/decisions/0004-lifecycle-events-and-embedded-hosts.md)
