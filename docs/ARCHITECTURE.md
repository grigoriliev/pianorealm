# Pianorealm — Ecosystem Architecture

> **Status:** Draft architecture baseline (proposed; not an implementation report)  
> **Scope:** Cross-package technical boundaries, composition, integration contracts, runtime ownership, and repository conventions  
> **Applies to:** Current and future `@pianorealm/*` packages  
> **First implementation:** `@pianorealm/keyboard`
>
> **Related documents:** [Ecosystem vision and ownership](./ECOSYSTEM.md) · [Keyboard specification](../packages/keyboard/PROJECT_SPEC.md)
>
> This document defines **ecosystem-level architecture**. It does not freeze APIs for unimplemented packages or replace a package's internal `ARCHITECTURE.md`. Examples marked *illustrative* are design sketches, not promises of published exports.

## 1. Purpose and authority

Pianorealm is a collection of focused JavaScript/TypeScript libraries for piano-oriented experiences. The packages are composed by a consuming application; installing one package must not implicitly activate another domain.

This document answers:

- Which technical responsibilities belong to each package?
- How do packages integrate without depending on each other's internals?
- Who owns note state, browser resources, events, and cleanup?
- What conventions allow packages to evolve and release independently?

**Document ownership:**

| Document | Source of truth for |
| --- | --- |
| `docs/ECOSYSTEM.md` | Ecosystem goals, package responsibilities, product boundaries |
| `docs/ARCHITECTURE.md` | Cross-package architecture rules and integration conventions |
| `packages/<name>/PROJECT_SPEC.md` | Features and acceptance requirements of that package |
| `packages/<name>/ARCHITECTURE.md` | Internal modules, algorithms, public API design of that package |
| `packages/<name>/DEVELOPMENT_PLAN.md` | Build phases and sequencing |
| `packages/<name>/PROJECT_STATE.md` | Verified implementation status and next-step handoff |
| `docs/decisions/*.md` | Rationale and outcome of significant architecture decisions |

An unresolved conflict between documents must be documented and decided, not silently reconciled in code. Normative words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** indicate requirement strength.

## 2. Architectural objectives

1. **Independent use.** `@pianorealm/keyboard` works without interaction, MIDI, or audio.
2. **Explicit composition.** Applications determine how input actions affect rendering, transport, and sound.
3. **Directional dependencies.** Lower-level packages never import higher-level orchestration; circular dependencies are forbidden.
4. **Stable, narrow contracts.** Other packages use documented exports rather than internal source files, generated SVG structure, or CSS selectors.
5. **Portable note identity.** MIDI integers `0`–`127` identify piano pitches across package boundaries.
6. **Separate state domains.** Visual keys, input intent, MIDI connections/messages, and audio voices are distinct.
7. **Predictable lifecycles.** Whoever creates a resource owns its release; removing one package does not leave another in a broken state.
8. **Environment honesty.** Packages describe their runtime requirements; keyboard remains offline-friendly and embedded-host compatible.
9. **Incremental design.** Do not introduce generic infrastructure until verified use cases justify it.

These principles outrank convenience shortcuts such as wiring sound playback into a renderer's `pressKey()` method.

## 3. Packages and boundaries

| Package | Owns | Explicitly does not own | Status |
| --- | --- | --- | --- |
| `@pianorealm/keyboard` | Note/range utilities needed for visualization, geometry, SVG, visual pressed state, labels, skins, overlays, sizing, static SVG | Human input listeners, MIDI I/O, audio production | First package; specified |
| `@pianorealm/interaction` | Pointer/touch/mouse/physical-keyboard input interpretation, gestures, note intent, input lifecycle | SVG renderer internals, sound, device MIDI transport | Planned |
| `@pianorealm/midi` | MIDI device discovery, permissions, input/output messages, device lifecycle | Visual display, audio synthesis, pointer input | Planned |
| `@pianorealm/audio` | Audio synthesis/playback, voice handling, audio scheduling and lifecycle | SVG geometry, browser input gestures, MIDI transport | Planned |

Potential theory, adapter, composition, sequencing, or recording packages are **not approved dependencies or committed packages**. Their names and APIs remain open.

### 3.1 Dependency policy

```text
                      APPLICATION / HOST
                     /      |       |      \
                    v       v       v       v
               keyboard  interaction midi  audio
                    ^         |
                    |_________|  optional keyboard integration,
                                 through a public API or adapter
```

This is a conceptual diagram, not a claim that `interaction` already imports `keyboard`.

**Required rules:**

- `keyboard` **MUST NOT** import `interaction`, `midi`, or `audio`.
- `midi` and `audio` **SHOULD** run independently of `keyboard` and of each other.
- `interaction` **MAY** integrate with `keyboard` via a documented peer dependency or adapter; choose only after the interaction package is designed.
- **No package** may import another package's `src/` internals, private subpaths, or generated DOM structure.
- **No circular dependencies** between published Pianorealm packages.
- **No mandatory shared runtime package** merely to avoid duplicating a tiny type or utility. Consider extraction only when stable, real reuse emerges.
- **No automatic cross-domain effects:** a visual state change alone must not send MIDI or make sound.

An application-level coordinator can bind multiple packages; a future optional composition package could do the same without changing the core dependency rules.

## 4. Shared vocabulary and data contracts

### 4.1 Note identity

Use an integer `0`–`127` as the default pitched-note identifier at package boundaries. Under the default scientific-pitch convention, C4 is MIDI 60. Note names such as `C4`, `F#3`, and `Bb3` are interface conveniences; each accepting API must document spelling, octave offsets, parsing, and validation.

Illustrative types (not a proposed new shared package):

```ts
type MidiNote = number; // validate integer range 0..127 at runtime

type NoteAction =
  | { type: 'note-on'; note: MidiNote; sourceId: string; velocity?: number }
  | { type: 'note-off'; note: MidiNote; sourceId: string };
```

`velocity`, channel, device identity, timestamps, and other metadata are **domain-specific**. They do not belong in the keyboard's visual pressed-state model merely because another package may need them. Any eventual shared protocol must specify units, time base, cardinality, ordering, and validation before publication.

### 4.2 Distinct state domains

| Domain | Meaning | Owner |
| --- | --- | --- |
| Visual pressed state | A note is *drawn* as pressed | Keyboard instance |
| Human input state | One or more active physical/pointer sources request a note | Interaction instance or application |
| MIDI state | Connection, channel, incoming/outgoing messages | MIDI package / application |
| Audio state | One or more voices are sounding | Audio package / application |

**Never infer audio or MIDI behavior from a key's visual pressed state.** Conversely, MIDI note-on does not automatically change a diagram unless application code maps it there.

### 4.3 Multiple sources and repeated note-ons

A single pitch may be activated by multiple fingers, devices, channels, or inputs. A naïve `note-off => releaseKey(note)` mapping can incorrectly hide a note while another source still holds it.

**Composition-layer responsibility:** when combining sources, retain an active-source set or reference count *by the appropriate source identity*. Update the visual key only while at least one active source remains. For audio and MIDI, preserve any additional domain semantics (channels, velocity, voices, sustain, repeated note-ons) rather than forcing all events into one boolean.

The keyboard's `pressKey()`/`releaseKey()` remain a **visual convenience API**, not a source-tracking engine.

### 4.4 Timing and event semantics

- Producers **SHOULD** make event ordering, synchronous/asynchronous delivery, and error handling explicit.
- Device/performance timestamps, if exposed, **MUST** state units and time origin.
- Permission-gated and asynchronous operations (MIDI, audio) **MUST NOT** be disguised as synchronous keyboard operations.
- Cross-package event payloads **SHOULD** use simple structured data; avoid leaking DOM nodes, private class instances, or implementation-specific closures.
- Do not freeze a universal `NoteAction` interface until at least two packages and their integration tests justify it.

## 5. Integration patterns

### 5.1 Application-mediated composition (preferred)

```text
Human input -> interaction -> application coordinator
                                      |-> keyboard.pressKey(...) [visual]
                                      |-> audio play action      [sound]
                                      `-> midi send action      [transport]
```

The coordinator selects which side effects occur, and handles duplicate sources and release behavior. Keyboard display can also be driven by a non-interactive sequence or an application state store.

### 5.2 MIDI-driven visualization

```text
MIDI device -> midi -> application mapping -> keyboard visual state
```

The MIDI package can be used without a keyboard. The mapping must account for source/channel identity when simultaneous note ownership matters.

### 5.3 Static and embedded usage

```text
Application or build script -> keyboard.renderToSVG(...) -> self-contained SVG
```

Static rendering is data-to-markup generation, not input handling. This enables offline and Anki-like environments without requiring a full runtime component.

### 5.4 Illustrative integration sketch

```ts
// Illustrative only: not a published interaction or audio API.
interaction.onNoteAction((action) => {
  const isActive = activeNotes.update(action); // application-owned aggregation
  if (isActive) keyboard.pressKey(action.note);
  else keyboard.releaseKey(action.note);

  // Any audio or MIDI action is explicitly chosen here, not by keyboard.
});
```

`activeNotes` and `onNoteAction` are placeholders for concepts, not confirmed method names. Design and test an actual integration before documenting any of them as a stable public API.

## 6. Keyboard-specific integration surface

`@pianorealm/keyboard` is the first implementation and establishes the initial constraints for future packages. Its **internal** architecture belongs in `packages/keyboard/ARCHITECTURE.md`; these are the ecosystem-facing requirements:

- A public method or methods to set/get **visual** pressed notes.
- A lifecycle (`destroy()` or equivalent) that releases renderer-owned observers and resources.
- A stable, minimal way for `interaction` to resolve a pointer location to a key **without** inspecting internal SVG elements.
- Optional public events for keyboard-domain changes, never implicit musical commands.
- A static SVG path sharing geometry and appearance logic with the live renderer.

### 6.1 Hit-testing contract

Keyboard exposes `getNoteAtPoint(clientX, clientY): number | null` in viewport CSS pixels. The mounted adapter maps through the SVG screen transform to the layout's half-open key rectangles, with black-key precedence. Gesture mapping and input listeners belong to the caller. [Keyboard hit-testing contract](../packages/keyboard/README.md#hit-testing) · [Layout ADR](../packages/keyboard/docs/decisions/0002-layout-sizing-and-hit-testing.md)

### 6.2 Internal rendering boundaries that integrations must respect

```text
note/range + validated config
              |
              v
       deterministic geometry
              |
              v
       visual render model <---- visual pressed state / skins / overlays
             / \
            v   v
        live SVG  static SVG string
        + DOM     (no mounted DOM)
```

The live renderer may perform targeted element updates; the static path must remain self-contained and safe for embedding. Other packages interact with the **public** keyboard API, not these subsystems.

## 7. Runtime capability and lifecycle policy

### 7.1 Ownership

Every package is responsible for resources it creates:

| Resource | Owning component |
| --- | --- |
| SVG nodes, `ResizeObserver`, renderer listeners, animation state | Keyboard instance |
| Pointer/touch/physical-key listeners, pointer capture, gesture state | Interaction instance |
| MIDI device connections and message handlers | MIDI instance |
| Audio context, nodes, voices, scheduling timers | Audio instance or documented shared audio manager |
| Links/subscriptions between instances | Application coordinator or explicit composition adapter |

Destroying an instance **MUST** clean up its resources and prevent further unintended callbacks. Repeated initialization/destruction, multiple instances, and mid-operation teardown need tests. APIs must document behavior on calls after destruction.

### 7.2 Host capabilities

- **Keyboard:** may require a DOM for mounted rendering; pure geometry and static SVG **SHOULD** work without one. Avoid network resources and global CSS. Feature-detect optional browser APIs such as `ResizeObserver` and document fallbacks.
- **Interaction:** browser input and focus capabilities vary by host; attaching listeners is an explicit consumer action.
- **MIDI:** browser/device support and user permission vary; capability detection and permission errors are part of the MIDI API.
- **Audio:** autoplay restrictions and user activation vary; context initialization and unlock must be explicit and documented.

Never imply the entire ecosystem supports a runtime simply because the keyboard renderer can run there. Test each package against its declared matrix.

### 7.3 Anki and embedded constraints

`keyboard` **MUST** remain usable offline in restricted rendering environments, without importing Anki APIs. For classic-script embeds:

- Avoid `document.write()`, document-global element-ID assumptions, and unscoped CSS.
- Support multiple instances and repeated initialization with predictable cleanup.
- Do not assume each card navigation creates a fresh global execution context.
- Avoid remote assets and runtime network requests.
- Offer a self-contained static SVG option when scripting is limited.
- Document verified client/platform versions separately from untested targets.

Anki-specific setup examples and compatibility testing belong in keyboard documentation; Anki behavior must not leak into other packages' core APIs.

## 8. Public APIs and compatibility policy

### 8.1 API design

Public APIs **SHOULD**:

- Be TypeScript-first while callable from plain JavaScript.
- Use explicit entry points and generated declarations.
- Validate external data at runtime where needed (especially MIDI notes, dimensions, and SVG markup input).
- Distinguish read-only values, mutable state, and side-effecting operations.
- Provide explicit subscription/unsubscription and teardown mechanisms.
- Avoid exposing private DOM nodes or internal implementation classes as a compatibility promise.

A type exported publicly is part of the API contract. Deep imports into source files are unsupported unless intentionally listed as subpath exports.

### 8.2 Error model

- Invalid synchronous arguments **SHOULD** raise descriptive exceptions or return documented validation results consistently within a package.
- Asynchronous capability/permission failures **SHOULD** reject with actionable, documented errors.
- Event callback failures must not corrupt internal state; packages must document whether they surface, isolate, or forward handler errors.
- Destruction should be safe and idempotent where practical.

Exact error types belong to each package's API design.

### 8.3 SemVer and cross-package evolution

- Published packages **SHOULD** use semantic versioning independently, with changelogs and migration notes for breaking changes.
- Cross-package integration tests **MUST** cover supported version combinations once packages actually integrate.
- Experimental interfaces must be marked as such; planned APIs must not be presented as implemented.
- Avoid lockstep versioning unless release coordination later provides a compelling reason.
- Before a breaking shared-contract change, assess affected consumers, document a migration path, and add compatibility tests.

## 9. Distribution and browser globals

### 9.1 npm entry points

Use the npm scope `@pianorealm/*`. Each published package should ship only the formats it actually supports, with a tested `exports` map, TypeScript declarations, sourcemaps where appropriate, and accurate runtime dependencies. For `keyboard`, ESM and a standalone offline browser build are explicit requirements; CommonJS is optional if justified.

### 9.2 Standalone bundles

Packages with classic `<script>` integration share the **`Pianorealm`** namespace. The keyboard classic script installs its constructor at `Pianorealm.Keyboard`. The accepted keyboard artifacts are:

```text
pianorealm-keyboard.esm.js
pianorealm-keyboard.umd.js
pianorealm-keyboard.umd.min.js
```

The standalone installer preserves sibling properties and reuses a constructor when the package and version match. Incompatible bindings raise an error. Future packages opt in to standalone distribution. [Accepted namespace and collision policy](decisions/0002-standalone-global-namespace.md)

### 9.3 CSS and asset isolation

- Keyboard styling **MUST** be component-scoped, with no global resets or page-wide selectors.
- Static SVG **MUST** be self-contained; SVG IDs for gradients, masks, and other definitions should not collide across instances or repeated insertions.
- User-controlled labels or SVG-related configuration **MUST** be validated/escaped to avoid markup/script injection.
- Foundational keyboard rendering **MUST NOT** require CDN fonts, remote images, stylesheets, or network downloads.

## 10. Repository and build architecture

A monorepo is **recommended as a possible organizational shape**, not an ecosystem requirement or an immediate tooling commitment. Begin with one real package. Do not create placeholder future package implementations.

```text
pianorealm/
├── README.md
├── docs/
│   ├── ECOSYSTEM.md
│   ├── ARCHITECTURE.md               # this file
│   └── decisions/                   # ADRs added when decisions are made
├── packages/
│   └── keyboard/
│       ├── PROJECT_SPEC.md
│       ├── ARCHITECTURE.md
│       ├── DEVELOPMENT_PLAN.md
│       ├── PROJECT_STATE.md
│       ├── README.md
│       ├── prompts/
│       ├── src/
│       ├── tests/
│       ├── demo/
│       └── package.json
└── [workspace configuration if/when adopted]
```

If packages eventually use separate repositories, retain equivalent cross-links and policy documents. Choose a workspace manager, task runner, release tool, lint config, and formatting conventions only when implementation requirements justify those choices.

### 10.1 TypeScript and module conventions

- Use explicit typed public exports and TypeScript declarations for published packages.
- Prefer standards-compatible ESM exports; support other bundle targets only where required.
- Keep internal modules private by default, with narrow public entry points.
- Avoid hidden process-wide singleton state for browser instances.
- Keep host-specific code behind capability checks and clear integration boundaries.
- Test the **built artifacts**, not only TypeScript source imports.

### 10.2 Package layout

A package should separate public entry points, internal domain logic, adapters/host integration, tests, and examples as appropriate. The keyboard's concrete geometry/rendering module tree is intentionally specified later in its own architecture document.

## 11. Testing and quality gates

### 11.1 Per-package tests

Each package **SHOULD** include tests appropriate to its responsibilities:

| Package | Examples |
| --- | --- |
| Keyboard | MIDI parsing, key geometry, partial ranges, orientations, SVG output, skin/state invariants, resize, cleanup, accessibility, offline artifacts |
| Interaction (future) | Pointer/touch gestures, keyboard mapping, cancellation, multi-touch sources, detach/cleanup, hit-testing adapter |
| MIDI (future) | Message parsing, channel/source semantics, unsupported API/permissions, reconnect/disconnect, cleanup |
| Audio (future) | Voice lifecycle, scheduling, overlapping notes, audio capability/unlock behavior, cleanup |

### 11.2 Cross-package tests (when integrations exist)

Before declaring an integration stable, test at least:

1. Display-only keyboard works without other Pianorealm packages.
2. Interaction drives keyboard through documented APIs without SVG structure assumptions.
3. Independent active sources do not prematurely release a shared visual note.
4. MIDI input updates visualization only through explicit application mapping.
5. Visual `pressKey()` **does not** automatically send MIDI or trigger sound.
6. Unsubscribing/destroying either side leaves no stale callbacks.
7. A package upgrade is checked against its supported peer/integration versions.

### 11.3 Browser, bundle, and accessibility checks

- Exercise real browser rendering where DOM/SVG layout matters; use visual regression for representative skins/ranges/orientations.
- Run npm-consumer smoke tests against package exports and generated types.
- For keyboard, test classic-script loading and no-network operation in relevant embedded hosts.
- Document supported/verified browsers and Anki clients; never claim compatibility solely from simulated tests.
- Validate SVG accessibility labels, visible focus/contrast implications where applicable, and reduced-motion behavior.

## 12. Decision process and change control

Significant cross-package decisions **SHOULD** have an Architecture Decision Record (ADR) in `docs/decisions/`, such as:

```text
0001-repository-topology.md
0002-standalone-global-namespace.md
0003-cross-package-note-action-contract.md
0004-interaction-keyboard-integration.md
```

Each `decisions/` directory has its own numbering sequence. Assign the next unused number in that directory and keep the filename prefix and ADR title number in sync. Use the file path when referencing records across directories.

Recommended ADR sections: **Context**, **Decision**, **Alternatives**, **Consequences**, **Status**, and **Date**. Use `proposed`, `accepted`, `superseded`, or `rejected` consistently. Record both breaking decisions and the reasons for deferring a shared abstraction.

For AI-assisted or phased development:

1. Read `ECOSYSTEM.md`, this file, and relevant package documents.
2. Identify the current task and its package boundary.
3. Propose any cross-package contract change before implementing it.
4. Change only necessary files; add tests for changed behavior.
5. Run available verification; report what was actually executed.
6. Update relevant architecture/ADR documents when decisions change.
7. Update package `PROJECT_STATE.md` with verified progress and unresolved issues.

Prompts are operational aids, not higher-priority architectural sources of truth.

## 13. Open architecture decisions

The following are **not yet settled** and must not be assumed by initial implementation:

| Decision | Why it matters | Intended decision point |
| --- | --- | --- |
| Monorepo/workspace tool or separate repos | Release automation and local linking | Before multi-package development |
| Browser global shape and collision policy | Multiple standalone scripts sharing one page | Keyboard packaging design |
| `interaction` dependency vs. optional adapter | Independent reuse and peer versioning | Interaction architecture planning |
| Shared event/action format | Source identity, velocity, channels, timestamps | First real cross-package integration |
| Note source aggregation strategy | Overlapping gestures/devices | First playable/MIDI-driven app |
| npm export map and optional CommonJS | Consumer interoperability | Keyboard release planning |
| Exact supported browser/Anki matrix | Honest compatibility and fallbacks | Keyboard validation/release |
| Independent vs. coordinated package releases | SemVer and integration versions | When second package exists |
| Shared core/theory utility package | Prevent duplicated stable business logic | Only after verified cross-package reuse |

An open decision is **not** permission for an implementation to invent a public ecosystem contract. Record its resolution before depending on it.

## 14. Non-goals

This document does **not** require:

- Implementing `interaction`, `midi`, or `audio` alongside `keyboard`.
- Shipping a global event bus, dependency injection container, or plugin marketplace.
- A universal audio/MIDI note-event protocol before it is validated in real use.
- A monorepo build system before there is a second package.
- Any specific front-end framework or state-management library.
- A default coupling between a visible key and a sounding note.

## 15. Architecture acceptance checklist

A new package or major integration proposal is architecturally ready when:

- [ ] Its responsibilities and excluded responsibilities are written down.
- [ ] Dependency direction is one-way and does not create a cycle.
- [ ] Interactions use documented exports, not private modules/DOM selectors.
- [ ] Note and event semantics are explicit, including multiple sources if relevant.
- [ ] Resource ownership and teardown are specified.
- [ ] Runtime prerequisites and capability failures are documented.
- [ ] API stability and experimental surface are distinguished.
- [ ] A minimal independent-use example exists.
- [ ] Cross-package behavior is covered by integration tests when applicable.
- [ ] Relevant open decisions have ADRs or documented deferred status.

---

**Architecture baseline:** Build `@pianorealm/keyboard` as a correct, portable, display-only library. Keep future interaction, MIDI, and audio as separately owned capabilities that applications can compose through explicit, tested public contracts.
