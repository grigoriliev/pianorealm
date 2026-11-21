# Keyboard Phase 0 review

The maintainer accepted all six Phase 0 ADRs on 2026-11-21. The audit below records findings from before approval. The accepted ADRs govern the baseline, and examples and signatures remain design sketches.

## Requirements traceability

| Requirement | Source | Proposed owner and first evidence |
| --- | --- | --- |
| Notes and ranges | Spec §5, ecosystem architecture §4 | Note normalization, MIDI identity and inclusive ranges, Phase 1 |
| Geometry | Spec §6 | Pure layout and orientation fixtures, Phase 2 |
| Rendering | Spec §7 | Shared scene and DOM adapter parity, Phase 3 |
| Pressed state | Spec §8 | MIDI set and changed fragments, Phase 4 |
| Skins | Spec §9 | Appearance resolver and scoped customization, Phase 5 |
| Overlays | Spec §10 | Validated per-key scene contributions, Phase 7 |
| Resizing and motion | Spec §11 | Host sizing adapter and CSS motion policy, Phases 3 and 6 |
| Events | Spec §13 | Controller transaction notifications and disposers, Phase 8 |
| Hit testing | Spec §12, ecosystem architecture §6 | Pure layout query plus mounted coordinate conversion, Phases 2 and 8 |
| Static SVG | Spec §7 | Shared scene serializer, prototype Phase 3 and public output Phase 9 |
| Accessibility | Spec §14 | Scene semantics and adapter motion, Phases 3 and 6, browser audit Phase 10 |
| Security | Spec §§7, 9–10, 15–16 | Validated scene and output IDs, Phases 3, 7 and 9 |
| Embedded and Anki | Spec §16 | Host lifecycle and offline builds, Phases 3 and 9 |
| Distribution | Spec §§4, 16, 19 | Package root, classic install and artifact tests, Phases 1 and 9–10 |
| Cleanup | Spec §15 | Scoped mount and extension teardown, Phases 3 and 8 |

## Findings before approval

| Priority | Sources and competing readings | Impact and recommended resolution |
| --- | --- | --- |
| Blocking | Spec §§6, 9 and 11 permit dimension overrides in customization. Architecture §§6, 8 models skins as appearance-only and geometry as independent. | Allow dimensions through sizing only. After approval clarify spec §9 with “Customize key dimensions through sizing options. Skin tokens customize appearance.” Until resolved, avoid freezing skin or sizing types. |
| Important | Ecosystem vision §§3 and 3.2 groups hit testing under interaction and also describes a keyboard hit-test API. Ecosystem architecture §6 and spec §12 require a public mapping or equivalent. | Approve keyboard ownership of the geometry query and interaction ownership of gesture mapping. Clarify the package-map cell to read “Gesture-to-note mapping using public geometry queries when available.” This gates integration changes in Phase 8. |
| Important | Architecture §17 suggests container-local hit coordinates. Ecosystem architecture §6.1 and spec §12 leave the space open. | Adopt viewport CSS pixels for the mounted API and logical units for the pure query. Document scroll, transforms and failure modes before Phase 8. |
| Important | Spec §10 asks for custom SVG shapes/elements. Architecture §13 favors validated declarative input. | Approve typed shapes and paths for the custom shape requirement. Interpret broader element support as constrained by the output schema. Any additional elements require review before Phase 7. |
| Important | Spec §§11, 16 requires responsive default sizing and feature detection. Architecture §§6, 10 and 12 leaves fitting, waiting and fallback details open. | Ratify contain fitting, zero-size recovery and manual resize before Phase 3. |
| Can defer | Spec §§16, 19 and ecosystem architecture §9 give preferred artifact/global names while leaving concrete export and loader behavior open. | Commit to the proposed initial ESM boundary before Phase 1. Verify standalone filenames and collision behavior in Phase 9. Keep all host combinations untested until measured. |

The maintainer resolved the dimension question by assigning key dimensions to sizing options and keeping skin tokens appearance-only. The accepted ADRs record the remaining design decisions. Optional bounds, CommonJS and exact browser/client support floors remain deferred to Phases 8–10. Keep bounds private, ship ESM as the import contract and mark untested hosts explicitly.

## Responsibilities and dependencies

Arrows point from an importer to its dependency. Configuration owns defaulting and validation. Notes owns parsing and formatting. Layout owns key bounds, depth order and pure point lookup. State holds normalized pressed notes and overlay assignments. Appearance resolves skin tokens. Scene composes geometry, styles, labels, indicators and overlays. The two output adapters own serialization or DOM materialization. The mounted controller owns transactions, subscriptions and extension cleanup; the host adapter owns measurement and observation.

```text
public root → mount controller, static render function, approved note utilities
mount controller → config, state, layout, appearance, scene, DOM adapter,
                   host sizing, events, extensions
static render function → config, state normalization, layout, appearance,
                         scene, SVG serializer
config/state/layout → note utilities and pure value types
appearance → validated appearance values
scene → layout records, resolved appearance, state snapshots, validated overlays
DOM adapter → scene records, host ID allocation
SVG serializer → scene records, XML encoding, static ID allocation
```

The class static method delegates to the pure static render function. A module may be loaded in Node without evaluating DOM globals. Static implementation imports only pure modules and its serializer.

```text
input → normalize/validate → geometry + resolved appearance
                               ↓
    pressed/overlays → shared scene → mounted SVG or standalone SVG string
```

## Public API sketch (non-implemented)

```ts
type NoteInput = number | string
type Orientation = 'horizontal' | 'vertical'
type Range = Readonly<{ from: number; to: number }>
type Size = Readonly<{ width: number; height: number }>
type Dispose = () => void
type VisualEvents = {
  pressedKeysChanged: readonly number[]
  rangeChanged: Range
  orientationChanged: Orientation
  skinChanged: string
  resized: Size
  destroyed: undefined
}
declare class PianoKeyboard {
  constructor(options: MountedOptions)
  setPressedKeys(keys: readonly NoteInput[]): void
  pressKey(key: NoteInput): void
  releaseKey(key: NoteInput): void
  clearPressedKeys(): void
  getPressedKeys(): number[]
  setRange(from: NoteInput, to: NoteInput): void
  setOrientation(orientation: Orientation): void
  setSkin(name: string): void
  registerSkin(name: string, appearance: AppearanceTokens): void
  setOptions(patch: KeyboardOptionsPatch): void
  setKeyOverlays(entries: readonly KeyOverlayAssignment[]): void
  getNoteAtPoint(clientX: number, clientY: number): number | null
  on<K extends keyof VisualEvents>(event: K, handler: (value: VisualEvents[K]) => void): Dispose
  use(setup: (keyboard: PianoKeyboard) => void | Dispose): Dispose
  resize(): void
  destroy(): void
  static renderToSVG(options: StaticOptions): string
}
```

`MountedOptions` adds an element and optional callback-error handler to common visual configuration. `KeyboardOptionsPatch` has mutable configuration fields only. `StaticOptions` adds initial pressed notes, overlays and optional ID prefix, with fixed sizing and optional inline skin tokens. Overlay assignments contain a `NoteInput` and an ordered list of validated overlays. Replace the assignment set atomically, reject duplicate normalized note entries and allow multiple items per entry. The private surface includes renderer nodes, selector names, ID allocators, raw scene data, observer handles, key bounds and configuration internals.

Validate and stage the initial mount before exposing a live instance. A key-state transaction regenerates changed visible fragments from the shared scene builder. Structural changes validate and recompute derived records as needed before committing, preserving logical state. Resize changes fitting and skips equivalent measurements. Static rendering uses explicit or intrinsic dimensions and creates no host resources. The host handles repeated initialization by disposing its previous instance. Teardown stops pending work, disposes owned resources and sends one terminal event. Repeated destroy calls are no-ops.

Conceptually, an application receives a gesture interpreted by interaction using the public coordinate query, updates keyboard visual state and explicitly chooses whether to send MIDI or start audio. Incoming MIDI may independently update the display. These are application decisions. The packages exchange MIDI note identities through their own public APIs, with no common event bus or assumed input/audio signatures.

## Risk register

| Severity | Trigger | Mitigation | First verification | Blocks Phase 1 |
| --- | --- | --- | --- | --- |
| Resolved | Baseline approval and dimension ownership | Accepted ADRs and updated spec §9 | Phase 0 | No |
| High | Enharmonic crossing or invalid configuration partly commits | Normalize and validate before publishing a snapshot | Phase 1 | Yes, contract approval |
| High | Endpoint layout clips or produces empty bounds | Virtual white seams and positive viewport fixtures | Phase 2 | No |
| High | Scene drifts or IDs collide across instances | Shared scene, scoped IDs, explicit static prefix policy | Phase 3 | No |
| High | Custom content executes or references an external resource | Typed allowlist and context-specific escaping | Phase 3 | No |
| Important | Hidden/embedded host fails to resize or remount | Waiting state, manual resize and scoped disposal | Phase 3 | No |
| Important | Coordinate mapping drifts under CSS transforms | Pure containment plus screen transform tests | Phases 2 and 8 | No |
| Important | Anki support is inferred from another host | Record client, platform and observed behavior for each claim | Phase 9 | No |

## Verification matrix

These fixtures specify expected results. Phase 0 checks the design and document consistency. Future phases run executable assertions.

| Gate | Proposed fixtures and assertions |
| --- | --- |
| Phase 1 | Parse C4 → 60, F♯3 and Gb3 → 54, B#3 → 60, Cb4 → 59, C-1 → 0, G9 → 127. Format 60 at offset +1 as C5 and parse it back. Reject H4, C##4, 60.5, NaN, Infinity, −1, 128 and reversed ranges. Accept range 61–61. A failed mixed patch preserves previous options. |
| Phase 2 | With 20×100 whites and 12×60 blacks, C4–B4 yields 140×100, C3–C5 300×100, A0–C8 1040×100, 0–127 1500×100 and one record per MIDI note. C#4–D#4 yields a 32×100 horizontal viewBox with black rectangles at x=0 and 20 and white D at x=6. C4–C#4 and C#4–D4 each yield 26×100. Single C4 yields 20×100. Single C#4 yields 12×100 with key at (0,0,12,60), or vertical viewBox 100×12 with key (0,0,60,12). C#4–D#4 rotates to 100×32 with low black at y=20 and high black at y=0. Confirm finite bounds, unique notes and orientation ordering for the full range. |
| Phases 3 and 6 | Fit 32×100 into 100×100 and verify a 34 CSS px inset on each side. Recover from a zero-size mount and test absent ResizeObserver with manual resize. Mount twice in separate containers, destroy twice, then remount. Verify accessible name, unique IDs, white/black stacking, scene parity and reduced-motion end state. Render a label containing quotes, angle brackets and ampersands as text; reject unsafe XML characters and URL/style payloads. |
| Phases 4, 5 and 7 | Set [67, C4, 60] → [60, 67]. Shrink, switch skin/orientation, resize and restore; retained state and overlays reappear. A repeated press or release skips DOM changes. A batch containing invalid data keeps existing state. Verify overlays clip per key and explicit overrides reset correctly. |
| Phase 8 | In the horizontal C#4–D#4 fixture, (7,10) hits C#4 over D4, (7,60) hits D4, (0,60) and (32,10) miss. Repeat after fitting, scrolling and transforms through the mounted API. Assert no-op notification silence, committed payloads, listener failure isolation and cleanup order. |
| Phases 9 and 10 | Parse standalone output in Node, compare scene-derived coordinates and styles with live output, verify explicit prefix determinism and instance ID isolation. Smoke-test packed ESM and declarations, classic loading with sibling globals, and zero external requests. Test repeated navigation, static fallback and night mode on named Anki Desktop platforms, AnkiDroid, AnkiMobile and AnkiWeb where available. Record missing hosts as untested. |
