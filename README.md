# Pianorealm

**Composable building blocks for piano-focused applications.**

Pianorealm is an open-source, framework-independent JavaScript and TypeScript ecosystem for piano visualization, interaction, MIDI connectivity, and audio. Its goal is to let developers combine only the capabilities they need—from a static keyboard diagram in a flashcard to a playable, MIDI-connected application.

> [!IMPORTANT]
> **Early development.** The keyboard package has a local ESM build with note utilities, a mounted Minimal SVG keyboard, and programmatic pressed-key highlights. Consult the [keyboard project state](packages/keyboard/PROJECT_STATE.md) for verified progress.

## Packages

| Package | Responsibility | Status |
| --- | --- | --- |
| **`@pianorealm/keyboard`** | SVG piano keyboard visualization, layout, visual note state, themes, labels, overlays, and static SVG output | Phase 4 complete. Programmatic pressed-key state, mounted SVG in both orientations, configurable range, viewport fitting, and a private static SVG prototype. |
| **`@pianorealm/interaction`** | Pointer, mouse, touch, and computer-keyboard input | Planned |
| **`@pianorealm/midi`** | MIDI input/output and device integration | Planned |
| **`@pianorealm/audio`** | Audio generation and playback | Planned |

Additional packages may be considered as concrete needs emerge. Names and APIs for future packages are not yet stable.

## Design principles

- **Small, focused packages.** Use keyboard visualization without installing or activating MIDI or audio capabilities.
- **Explicit composition.** Applications decide how gestures, MIDI messages, visual feedback, and sound interact.
- **Framework independence.** Core libraries target standard JavaScript and TypeScript instead of requiring a specific UI framework.
- **Clear ownership.** Visual pressed-key state is different from input state, MIDI transport, and sounding audio.
- **Portable note identity.** MIDI note numbers (`0–127`) serve as the default cross-package pitch representation.
- **Offline-friendly visualization.** The keyboard package is designed for websites, embedded webviews, and Anki flashcards without remote runtime assets.
- **Tested, documented interfaces.** Public APIs and resource cleanup should be predictable; implementation details are not cross-package contracts.

For example, `@pianorealm/keyboard` is intended to render a note as visually pressed when requested. It must **not** automatically play sound or send a MIDI message. A consuming application may connect this visual state to future interaction, MIDI, and audio packages.

## First milestone: `@pianorealm/keyboard`

The first package is a reusable, display-only piano keyboard visualization component. Its planned capabilities include:

- Horizontal and vertical keyboard layouts with configurable MIDI note ranges.
- Accurate white/black-key geometry, including partial octaves and black-key endpoints.
- SVG rendering and programmatic visualization of pressed notes.
- Customizable skins, indicators, labels, highlights, and overlays.
- Fixed and responsive sizing, accessibility, and reduced-motion support.
- Self-contained static SVG generation and offline/embedded use, including Anki integration.
- Public integration points that allow future input libraries to work without relying on private SVG internals.

These are **requirements and goals**, not a claim that the features are implemented today.

See the [keyboard specification](packages/keyboard/PROJECT_SPEC.md), [package architecture](packages/keyboard/ARCHITECTURE.md), and [development plan](packages/keyboard/DEVELOPMENT_PLAN.md) for details.

## Project status and roadmap

The [keyboard project state](packages/keyboard/PROJECT_STATE.md) is the authoritative record of what has actually been completed and verified.

Phase 4 delivered programmatic pressed-key visualization. Phase 5 covers skins and configurable appearance.

Development is organized into reviewable phases covering tooling, geometry, SVG rendering, visual state, appearance, responsive behavior, overlays, extension points, static/embedded builds, and release quality.

## Repository guide

```text
pianorealm/
├── AGENTS.md                         # Repository-wide coding-agent guidance
├── docs/
│   ├── ECOSYSTEM.md                  # Vision, scope, and package ownership
│   ├── ARCHITECTURE.md               # Cross-package architecture
│   └── decisions/                   # Ecosystem architecture decisions (when present)
└── packages/
    └── keyboard/
        ├── AGENTS.md                # Keyboard-specific agent guidance
        ├── PROJECT_SPEC.md          # Requirements
        ├── ARCHITECTURE.md          # Internal technical architecture
        ├── DEVELOPMENT_PLAN.md      # Phased implementation roadmap
        ├── PROJECT_STATE.md         # Verified progress and next task
        ├── docs/                    # Package documentation and decisions
        └── prompts/                 # Version-controlled AI development prompts
```

The tree illustrates the intended documentation layout; not every directory or future package is present yet.

### Documentation

- [Ecosystem overview](docs/ECOSYSTEM.md) — vision, package roles, and composition principles.
- [Ecosystem architecture](docs/ARCHITECTURE.md) — dependencies, contracts, lifecycle, and distribution conventions.
- [Keyboard specification](packages/keyboard/PROJECT_SPEC.md) — requirements for the first library.
- [Keyboard architecture](packages/keyboard/ARCHITECTURE.md) — internal design and module boundaries.
- [Keyboard development plan](packages/keyboard/DEVELOPMENT_PLAN.md) — milestones and completion gates.
- [Keyboard project state](packages/keyboard/PROJECT_STATE.md) — current verified progress.

## Development and contributions

Pianorealm is being developed incrementally, with design decisions, development prompts, and progress records kept in version control. Coding agents can use the repository's [`AGENTS.md`](AGENTS.md) files, but implementation changes should be reviewed and verified before they are treated as complete.

If you'd like to discuss a design or report a problem, [open an issue](https://github.com/grigoriliev/pianorealm/issues). Before proposing a change to package boundaries or public contracts, review the [ecosystem architecture](docs/ARCHITECTURE.md) and relevant architecture decision records.

The private keyboard package builds locally. Follow its [developer setup and verification commands](packages/keyboard/README.md#development).

## License

Pianorealm is licensed under the [Apache License 2.0](LICENSE).
