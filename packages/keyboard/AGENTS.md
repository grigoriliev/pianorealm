# `@pianorealm/keyboard` — Agent Instructions

Applies to everything under `packages/keyboard/`. Also follow the repository-root `AGENTS.md` and the ecosystem documents; this file adds package-specific implementation constraints.

## Before a task

Read what is needed for the task, especially:

1. `PROJECT_SPEC.md` — keyboard requirements. If missing from the checkout, **flag the gap**; do not replace it with guesses. A previously drafted specification may need to be copied into this path.
2. `ARCHITECTURE.md` — proposed internal module boundaries and rendering pipeline.
3. `DEVELOPMENT_PLAN.md` — current phase, tasks, and completion gates.
4. `PROJECT_STATE.md` — last *verified* state, open decisions, and next task.
5. `docs/decisions/` — accepted package ADRs, if any.
6. The invoked task prompt under `prompts/`, if provided.

Confirm the current phase before writing code. **Phase 0 is planning and decisions only:** review contracts, propose/record ADRs, and update planning documents, but do not implement library functionality until the phase gate is satisfied.

## Package responsibility

`@pianorealm/keyboard` is a reusable, framework-independent **TypeScript/SVG visualization** library. It must not implement pointer, mouse, touch, or computer-key input; MIDI transport/device access; audio playback; or sound scheduling. Future Pianorealm packages integrate only via documented public contracts. Do not import the future `interaction`, `midi`, or `audio` packages.

## Internal design invariants

- Use validated MIDI integers **0–127** as canonical notes; default notation maps C4 to 60. Note names are a supported input/output convenience, not the internal identifier.
- Keep note parsing, range validation, geometry, configuration resolution, and the shared render/scene description **DOM-independent**.
- Maintain separate responsibilities for geometry, scene generation, SVG serialization, and mounted DOM updates. **Static SVG and live SVG must derive from the same geometry and resolved appearance model**, not two independently implemented renderers.
- Support horizontal and vertical layouts, partial ranges, and ranges starting/ending on black keys. Geometry must be deterministic and covered by edge-case tests.
- Keep pressed-note state separate from skins and SVG nodes. Programmatic `pressKey()`/`releaseKey()` affect **visual state only**. Update only affected mounted key elements for state-only changes where practical; preserve state across relevant visual configuration changes.
- Skins define appearance, not behavior. Overlays and annotations must be independent of skin and should support multiple items per note.
- Public extension events and eventual hit testing must expose documented data or methods; consumers must not inspect/mutate internal SVG nodes or rely on internal selectors.
- Treat examples in `ARCHITECTURE.md` as **proposed contracts** until Phase 0 decisions or ADRs make them authoritative. Do not invent event signatures, merge semantics, or hit-test behavior.

## Browser, accessibility, and security

- Keep browser-only APIs (DOM, `ResizeObserver`, listeners, animation lifecycle) in mounted adapters. Use feature detection and reliable cleanup; allow multiple independent instances.
- Support embedded/offline environments, especially Anki: no external runtime assets or required network access, no global CSS leakage, no `document.write()`, and no assumption of a fresh JavaScript context for each card.
- Scope generated styles and identifiers. Avoid unsafe insertion of user-provided text, labels, or SVG content; do not bypass sanitization/escaping for custom content.
- Include accessible SVG names/descriptions, non-color-only visual cues where applicable, and respect reduced-motion settings.
- Do not claim specific Anki client or browser compatibility without testing that environment.

## Implementation and verification

- Follow the **current phase only**, breaking large phases into bounded, reviewable tasks. Avoid unrelated refactors and speculative abstractions.
- Preferred stack: TypeScript, SVG, CSS, Vite, and Vitest, as specified in the project documents. Avoid unnecessary runtime dependencies and framework coupling.
- Add focused tests for new behavior and regression cases. Especially cover MIDI conversion, black/white key placement, endpoint notes, both orientations, state preservation, cleanup, and static/live parity when applicable.
- Do not mark a milestone complete until the acceptance gate in `DEVELOPMENT_PLAN.md` is met. Report run commands and outcomes; distinguish automated results from manual/visual checks and untested environments.
- Update `PROJECT_STATE.md` after meaningful completed work with files touched, verified results, unresolved decisions, and the next bounded task. Avoid inventing branch, commit, test counts, or release status.

## Final report

Summarize: **scope completed; files changed; tests/build checks actually run and their outcomes; known gaps or decisions; next bounded action**. If this was architecture-only work, explicitly state that no implementation code was added.
