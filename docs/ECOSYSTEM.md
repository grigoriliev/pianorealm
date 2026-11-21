# Pianorealm Ecosystem

> **Status:** Draft · **Scope:** Ecosystem-wide vision, package responsibilities, and integration principles  
> **First package:** [`@pianorealm/keyboard`](../packages/keyboard/PROJECT_SPEC.md)  
> **Audience:** Maintainers, contributors, application developers, and AI coding assistants
>
> This document defines the intended architecture of the Pianorealm ecosystem. It is a design specification, **not** a statement that planned packages or APIs are already available.

## 1. Vision

**Pianorealm** is a modular, framework-independent ecosystem of JavaScript and TypeScript packages for building piano-oriented musical experiences. It aims to provide reusable building blocks for **visualization**, **human interaction**, **MIDI connectivity**, **audio**, and potentially related educational or creative functionality.

Consumers should be able to adopt exactly the functionality they need: a read-only keyboard diagram on a website, a visual keyboard embedded in an Anki card, a touch-enabled piano, or a MIDI-driven musical application. No consumer should have to install audio or MIDI support merely to render keys.

The ecosystem begins with **`@pianorealm/keyboard`**, a display-only SVG piano keyboard visualization library. Additional packages will be introduced incrementally as concrete needs arise.

## 2. Core principles

1. **Composability over a monolith.** Packages have focused responsibilities and work together through explicit public contracts.
2. **Opt-in capabilities.** Visualization, interaction, MIDI, and audio can be adopted independently where their domains allow.
3. **One-way dependencies.** Foundational packages do not depend on higher-level integrations; circular package dependencies are forbidden.
4. **Framework independence.** Public APIs use standard JavaScript/TypeScript and browser capabilities; adapters for frameworks may be introduced separately.
5. **Portable musical identities.** MIDI note numbers (integers `0`–`127`) are the default common representation of pitched piano notes at cross-package boundaries.
6. **Clear behavioral ownership.** Rendering a pressed key, receiving an input gesture, transmitting MIDI, and sounding audio are different operations.
7. **Documented interfaces.** Packages integrate through their published exports, not private source paths, CSS selectors, or internal DOM elements.
8. **Lightweight, offline-friendly foundations.** In particular, keyboard visualization must not depend on remote assets, runtime services, or unrelated packages.
9. **Explicit resource lifecycle.** Each package owns and cleans up the listeners, observers, devices, timers, and other resources it creates.
10. **Incremental stability.** Favor a small tested API with room to grow over speculative frameworks and premature abstractions.

## 3. Package map

| Package | Role | Status | Scope |
| --- | --- | --- | --- |
| **`@pianorealm/keyboard`** | Visualize piano keys and visual note state | **First package — specified, not assumed implemented** | Geometry, SVG rendering, note/range utilities needed for display, skins, labels, overlays, responsive layouts, static SVG |
| **`@pianorealm/interaction`** | Interpret human input | **Planned** | Pointer, mouse, touch, and computer-keyboard input; hit-testing and gesture-to-note mapping |
| **`@pianorealm/midi`** | Communicate with MIDI devices | **Planned** | MIDI input/output, device discovery and lifecycle, message mapping |
| **`@pianorealm/audio`** | Produce and manage sound | **Planned** | Audio playback, synthesis or samples, voice management, scheduling, and audio lifecycle |

Other packages—such as framework adapters, music-theory utilities, notation, sequencing, or recording—are **possible future directions only**. Their names, boundaries, and implementation are not committed by this document.

### 3.1 `@pianorealm/keyboard`: visualization

**Owns:**

- Piano key geometry and horizontal/vertical layouts.
- SVG generation, mounting, and targeted display updates.
- Programmatic *visual* pressed-key state.
- Skins, indicators, labels, highlights, and visual overlays.
- Fixed/responsive sizing; accessibility and reduced-motion presentation.
- Display-oriented events, lifecycle, and narrow extension points.
- Static SVG rendering, suitable for environments that cannot run interactive JavaScript.
- Offline and embedded deployment support, including Anki-focused documentation.

**Does not own:** pointer/keyboard input listeners, MIDI device access, sound production, playback sequencing, or application state orchestration.

Calling `keyboard.pressKey(60)` means **“render MIDI note 60 as visually pressed”**. It does *not* mean “a human pressed a key,” “send MIDI note-on,” or “play a sound.” Likewise, clearing a visual key does not inherently transmit note-off or stop audio.

See the [keyboard package specification](../packages/keyboard/PROJECT_SPEC.md) for requirements and the exact API-design work still outstanding.

### 3.2 `@pianorealm/interaction`: human input (planned)

**Owns:**

- Pointer, touch, mouse, and physical/computer-keyboard input.
- Mapping gestures and keystrokes to note actions.
- Input-specific state and lifecycle: attach, detach, cancel, and release behavior.
- Input-specific accessibility and focus behavior as applicable.

**Does not own:** keyboard SVG internals, MIDI device transport, or audio generation.

Interaction may use a narrow public keyboard hit-testing API and call public visual-state methods, but must not inspect private SVG structure. Applications may also use interaction without audio or MIDI. The specific `interaction` exports and any peer dependencies are **to be designed**, not established here.

### 3.3 `@pianorealm/midi`: MIDI devices (planned)

**Owns:**

- Device discovery, permission flow, connection/disconnection, and device state.
- Incoming/outgoing MIDI message handling and mapping.
- Appropriate error handling and cleanup for MIDI resources.

**Does not own:** keyboard display, browser input gestures, or audio rendering.

MIDI should be usable without a visual keyboard. Sending MIDI must be an explicit consumer or orchestration decision—not an implicit consequence of a visual `pressedKeysChanged` event. Platform permission and availability constraints must be handled where MIDI is used.

### 3.4 `@pianorealm/audio`: audio generation (planned)

**Owns:**

- Audio playback, voices, samples/synthesis as defined by the eventual package.
- Audio engine initialization, playback lifecycle, timing, and cleanup.
- Audio permission/autoplay restrictions and user-gesture requirements.

**Does not own:** SVG key geometry, keyboard visual state, MIDI transport, or pointer input.

Audio must be usable without a keyboard visualization. Precise playback and scheduling APIs remain open design work.

## 4. Dependency and composition rules

The desired architecture is compositional rather than a dependency chain in which every package imports every other package.

```text
                         Application / composition layer
                          /          |          |        \
                         v           v          v         v
                @pianorealm/   @pianorealm/ @pianorealm/ @pianorealm/
                   keyboard     interaction      midi        audio
                      ^              |
                      |______________|  optional public integration

  No keyboard --> interaction / midi / audio dependencies.
  No implicit midi <--> audio dependency.
  No circular package dependencies.
```

**Normative rules:**

- `keyboard` **MUST NOT** depend on `interaction`, `midi`, or `audio`.
- `midi` and `audio` **SHOULD** function independently of `keyboard`.
- `interaction` **MAY** depend on or peer-depend on `keyboard` for a keyboard-specific adapter; that choice must be documented when the package is designed.
- Packages **MUST NOT** import another package's private `src/` modules or rely on its undocumented DOM/CSS implementation.
- Packages **MUST NOT** form circular dependencies.
- Application code or a separately designed composition layer **SHOULD** decide which action affects visualization, MIDI, and audio.
- Common abstractions **SHOULD NOT** be extracted into a shared package until real duplication or a stable integration need has been demonstrated.

An event emitted by one package must not silently cause unrelated side effects in another package simply because both packages happen to be installed.

## 5. Shared musical concepts

### 5.1 Note identity

Across package boundaries, prefer **MIDI note numbers from `0` through `127`** for ordinary piano note identity. For example, under the default scientific-pitch convention, **C4 = MIDI 60**.

Note names (`"C4"`, `"F#3"`, `"Bb3"`) are convenient display and input formats. Packages should document how they parse and present names, sharps/flats, and octave conventions; names should not be silently assumed to be unambiguous across configurable conventions.

### 5.2 Separate state types

The ecosystem distinguishes at least four concepts:

| Concept | Example | Typical owner |
| --- | --- | --- |
| **Visual state** | C4 is shown as pressed | `keyboard` |
| **Input intent** | User pressed or released a touchscreen key | `interaction` |
| **MIDI transport state** | MIDI note-on sent on channel 1 | `midi` |
| **Audio playback state** | A C4 voice is sounding | `audio` |

These can be correlated by an application, but they are **not automatically equivalent**. A note may be visually highlighted without sounding; a MIDI device may play without a visible keyboard; multiple sound voices might correspond to the same pitch.

### 5.3 Contracts to design before cross-package integration

When connecting packages, document explicitly:

- Note identity and allowable range.
- Note-on/note-off semantics, especially repeated presses and multiple input sources.
- MIDI channel, velocity, timing, and other metadata where relevant.
- Coordinate space and hit-testing for visual keyboard interaction.
- Event names, payload types, subscriptions, cleanup, and error behavior.
- Whether calls are synchronous, asynchronous, cancellable, or permission-gated.

**Do not** encode transport- or audio-specific metadata into `keyboard` merely to prepare for future features.

## 6. Example compositions

The following examples describe intended relationships, **not finalized public APIs**.

### Static visualization

```text
Application -> keyboard -> SVG visualization
```

A website or Anki card uses only `@pianorealm/keyboard` to show notes or chords. No interaction, MIDI, or audio package is required.

### Playable on-screen keyboard

```text
User gesture -> interaction -> application
                                |-> keyboard visual state
                                `-> audio playback
```

The application decides whether a gesture should update the display, produce sound, or both. Releasing an input is not the same thing as erasing an annotation or other visual overlay.

### MIDI visualization

```text
MIDI device -> midi -> application -> keyboard visual state
```

A hardware MIDI keyboard drives visual highlighting while `keyboard` remains unaware of Web MIDI APIs.

### MIDI-controlled synthesizer

```text
MIDI device -> midi -> application -> audio
                              `-> keyboard (optional)
```

The visualization is optional, and audio can remain independent of SVG rendering.

### Offline flashcard

```text
Pre-rendering script -> keyboard static SVG -> flashcard markup
```

Anki or another embedded host can display a self-contained diagram without depending on a running MIDI or audio engine.

## 7. Public APIs and compatibility

- Each package publishes a documented entry point and TypeScript declarations where applicable.
- Public APIs should remain small, typed, and independent of framework implementations.
- Consumers should not require private module paths, internal classes, or rendered SVG selectors.
- All event subscriptions, observers, device connections, and optional extensions must support cleanup.
- Changes in one package should not require unrelated packages to change unless a documented shared contract evolves.
- Cross-package integrations should have smoke tests in a minimal consumer application before being considered stable.
- Public API breaking changes should be documented with migration guidance.

For `keyboard`, a potential future integration contract is public hit-testing (for example `getNoteAtPoint(...)`), with a documented coordinate system. **The final method name, signature, and behavior must be decided during keyboard architecture planning**; this document does not freeze them.

## 8. Distribution and naming

### npm packages

Use the npm scope **`@pianorealm/*`**. For example:

```text
@pianorealm/keyboard
@pianorealm/interaction  (planned)
@pianorealm/midi         (planned)
@pianorealm/audio        (planned)
```

Published packages should keep their dependency declarations honest and avoid mandatory installation of unrelated Pianorealm functionality.

### Standalone browser builds

For packages that provide classic-script bundles, prefer a single **`Pianorealm`** browser-global namespace instead of a separate unscoped global for each package. The keyboard specification currently proposes `Pianorealm.Keyboard` and artifact names such as `pianorealm-keyboard.umd.min.js`.

These are **proposed conventions**, subject to packaging/compatibility validation. Exact exports and collision behavior must be finalized and tested before release. Not every future package is required to ship a UMD bundle.

### Runtime and host environments

`keyboard` must remain especially suitable for plain websites, embedded webviews, offline applications, and Anki cards. Anki is a supported *target to test and document*, not a core dependency. Other packages may have different platform limitations—particularly MIDI permission requirements and audio autoplay policies—and must document those explicitly.

## 9. Repository strategy

A **monorepo is an option, not a prerequisite** for the first package. Repository layout should reflect actual package needs, not speculative package implementations.

If Pianorealm uses a monorepo, the intended document layout is:

```text
pianorealm/
├── README.md
├── docs/
│   ├── ECOSYSTEM.md                 # This document
│   ├── ARCHITECTURE.md              # Cross-package technical decisions, when needed
│   └── decisions/                  # Ecosystem-wide ADRs, when needed
├── packages/
│   └── keyboard/
│       ├── PROJECT_SPEC.md         # Keyboard-specific requirements
│       ├── ARCHITECTURE.md          # Keyboard implementation decisions
│       ├── DEVELOPMENT_PLAN.md
│       ├── PROJECT_STATE.md
│       ├── prompts/
│       ├── src/
│       ├── tests/
│       └── package.json
└── ...
```

Create future package folders **only when development of those packages begins**. If packages use separate repositories, maintain equivalent cross-links and keep this document as the shared ecosystem policy.

### Source of truth

| Document | Governs |
| --- | --- |
| `docs/ECOSYSTEM.md` | Ecosystem vision, package responsibilities, and cross-package boundaries |
| `docs/ARCHITECTURE.md` | Approved ecosystem-wide technical decisions, when created |
| `packages/keyboard/PROJECT_SPEC.md` | Detailed feature requirements for `@pianorealm/keyboard` |
| `packages/keyboard/ARCHITECTURE.md` | Keyboard implementation architecture and approved contracts |
| `packages/keyboard/DEVELOPMENT_PLAN.md` | Keyboard implementation phases |
| `packages/keyboard/PROJECT_STATE.md` | Verified keyboard progress and handoff status |

In case of ambiguity, **ecosystem ownership rules belong here**, while package-specific behavior belongs in that package's specification. Conflicts should be explicitly resolved and recorded, not silently ignored.

## 10. Quality and release principles

Each package should:

- Provide focused documentation, installation instructions, and real examples.
- State supported environments and known limitations without claiming untested compatibility.
- Include appropriate unit, integration, and packaging tests.
- Handle cleanup, errors, and invalid input predictably.
- Avoid unexpected global side effects.
- Follow semantic versioning and maintain change/release notes.
- Clearly differentiate implemented features, planned features, and experimental APIs.

For the initial keyboard package, geometry correctness, efficient rendering, accessibility, responsive behavior, static SVG, offline distribution, CSS isolation, and lifecycle safety are release-critical. Detailed acceptance criteria remain in the keyboard specification.

## 11. Development sequence

**Now:** Design and build `@pianorealm/keyboard` as a standalone visualization foundation. Preserve narrow future integration points (particularly note identity and public hit-testing), but do not implement interaction, MIDI, or audio inside it.

**Later:** Add `interaction`, `midi`, or `audio` when use cases justify them. Before implementation, write each package's own specification, dependency policy, API proposal, and integration tests. Validate real consumer workflows before stabilizing cross-package contracts.

**Ongoing:** Revisit shared abstractions only after patterns emerge in at least two real packages. Avoid prematurely introducing a shared core, global event bus, plugin registry, or application framework.

## 12. Open ecosystem decisions

The following are deliberately **not** settled by this draft:

1. **Repository topology:** Monorepo/workspace or independently maintained repositories.
2. **Browser globals:** Final shape and coexistence behavior of multiple standalone bundles.
3. **Interaction coupling:** Whether `interaction` uses `keyboard` as a peer dependency, optional adapter, or another small public contract.
4. **Cross-package event protocol:** Final names/types and behavior for user-intent actions, repeated notes, velocity, channel, and cancellation.
5. **Common helpers:** Whether independent packages eventually justify a shared utility package.
6. **Release cadence:** Independent package versioning and coordinated compatibility policy, if needed.
7. **Support matrix:** Browser, webview, Anki-client, Web MIDI, and audio-environment support targets for each package.

Record accepted choices in a repository architecture decision record (ADR) when they become consequential.

---

## Summary

**Pianorealm is a collection of composable musical building blocks, not a single piano application.** `@pianorealm/keyboard` visualizes notes; `@pianorealm/interaction` will interpret user gestures; `@pianorealm/midi` will communicate with devices; and `@pianorealm/audio` will make sound. Applications explicitly connect those capabilities through stable, documented interfaces.
