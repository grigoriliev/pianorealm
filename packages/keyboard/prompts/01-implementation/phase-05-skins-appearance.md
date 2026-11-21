# Phase 5 — Skins and Configurable Appearance

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation  
> **Phase:** 5 (requires verified Phase 4)  
> **Working directory:** Pianorealm repository root  
> **Scope:** Typed visual tokens, Minimal and Classic skins, appearance overrides, safe skin switching, shared-scene styling, and regression tests

## Objective

Implement **Phase 5** of `@pianorealm/keyboard`: a small, extensible appearance system that allows the existing piano keyboard to change its visual presentation **without changing geometry, musical identity, pressed-key state, or interaction semantics**.

Deliver two working built-in skins—**Minimal** and **Classic**—and a documented, type-safe path for appearance overrides and custom skins, as defined by the accepted decisions. The mounted SVG and the existing DOM-independent serializer must use the **same resolved appearance and scene data**.

**Do not treat this phase as permission to implement every future skin or the full playground.**

## 1. Required reading and authority

Use the **actual local checkout**. Do not assume the public `main` branch or a prior conversation reflects uncommitted work.

1. Follow both `AGENTS.md` and `packages/keyboard/AGENTS.md`.
2. Read `docs/ECOSYSTEM.md` and `docs/ARCHITECTURE.md` for ecosystem boundaries.
3. Read `packages/keyboard/PROJECT_SPEC.md`, focusing on skins, customization, pressed visuals, SVG, accessibility, and embedded hosts.
4. Read `packages/keyboard/ARCHITECTURE.md`, focusing on configuration, skin resolution, scene data, SVG adapters, and state preservation.
5. Read `packages/keyboard/DEVELOPMENT_PLAN.md`, **Phase 5** and its completion gate.
6. Read `packages/keyboard/PROJECT_STATE.md` and all relevant **accepted ADRs** under `packages/keyboard/docs/decisions/`, particularly decisions governing configuration merging, scene rendering, SVG identifiers, state, and styling. Resolve any discrepancy using the repository's documented decision process; do not silently invent a different contract.
7. Inspect the existing implementation and tests in `packages/keyboard/src/`, `tests/`, and the development demo before editing.

Where the design documents offer an *illustrative API* rather than an accepted contract, prefer the narrowest compatible design. Record any materially new decision in an ADR if repository rules require one. Do not renumber existing ADRs.

## 2. Prerequisite check (stop if blocked)

Before changing code:

- Verify Phases **1–4** are complete **in this checkout**, with particular attention to Phase 4's five pressed-note methods and targeted DOM updates.
- Inspect actual exported types, normalized configuration, `PianoKeyboard` methods, scene records, DOM adapter, serializer, and their existing tests.
- Run the existing package verification scripts (typecheck, tests, build) and record their outcomes.
- Inspect the Git status and preserve all existing user changes.

**If Phase 4 is absent or its completion gate is not met**, do not reimplement it under Phase 5. Report the missing prerequisites and the next action, and stop. If a prerequisite check fails for an environmental reason, distinguish that from a code failure.

## 3. In scope

### 3.1 Typed appearance model

Design a **small, explicit** set of appearance tokens sufficient for the first two skins and the existing pressed-key visualization:

- Keyboard/background paint (including transparent behavior as already supported).
- White/black key fill colors.
- Key stroke/border color and width.
- Key corner radii where supported without altering geometry.
- Pressed-key colors/appearance, consistent with Phase 4's chosen presentation.
- Classic-style gradient and subtle shadow/filter treatments **if feasible using self-contained SVG without adding a runtime dependency**.

Keep the token set extensible for future indicators, labels, overlays, and motion without implementing those future systems today. Avoid exposing raw DOM nodes, arbitrary unsanitized SVG strings, general-purpose CSS selectors, or unrestricted renderer internals as a customization API.

Skin tokens may define **appearance only**. They must never alter note ranges, note ordering, key geometry, layout dimensions, or the logical pressed-key set.

### 3.2 Resolution and precedence

Implement one deterministic appearance resolver, shared by the mounted and string-rendering paths.

Follow the precedence established by accepted ADRs. If no accepted decision specifies the entire order, propose and document:

`built-in base defaults → selected skin → validated instance appearance overrides → explicit accessibility policy (when defined)`

Do not silently promise that arbitrary user colors satisfy accessibility contrast requirements. Preserve existing explicit overrides when changing skins according to the adopted configuration policy; define and test the treatment of resets (`undefined` or other reset semantics) and replacement versus merging.

Ensure resolution does not mutate caller-owned inputs, internal frozen configuration snapshots, or built-in skin definitions.

### 3.3 Built-in skins

Implement exactly these required skins first:

- **Minimal**: flat, readable light white keys and dark black keys, modest borders, no unnecessary effects.
- **Classic**: ivory-toned white keys, dark black keys, restrained depth using optional self-contained gradients/shadows and small rounding.

Both must support pressed-note visualization and all existing orientations, ranges, sizing modes, and live/static output paths.

Do **not** implement Modern, Neon, Dark, or high-contrast as completed built-ins in Phase 5. Track those promised skins explicitly for Phase 10 as the development plan requires.

### 3.4 Public configuration and updates

Implement the Phase 5 API specified by accepted decisions, including:

- Choosing a skin at creation time, if not already supported.
- `piano.setSkin(...)` with the agreed accepted type and validation.
- Instance-level appearance overrides via the agreed `setOptions(...)`/constructor form.
- A modest custom-skin mechanism **if approved by Phase 0 decisions**, with validation and an understandable lifecycle or registration policy.

**Do not invent a global mutable skin registry** if the documented architecture does not require one. If registering shared skins is reserved for the Phase 8 extension system, implement only the safe Phase 5 custom-skin option approved by the architecture and document the deferred registration API.

Public APIs must reject unknown skin names and malformed/unsafe token values with actionable errors. Invalid configuration updates must be **atomic**: preserve the old skin, overrides, scene, DOM, and pressed notes.

Avoid breaking the existing Phase 1–4 exports and consumers. Publish only intentional types and functions from `src/index.ts`; keep internals private.

### 3.5 Integration with the existing render pipeline

Extend the **current shared scene model**, rather than adding a second skin-specific renderer:

- Resolve appearance in DOM-independent TypeScript code.
- Represent paint and any SVG definitions in the shared scene.
- Let the mounted adapter and the XML serializer consume the same resolved values.
- Apply skin changes to visual attributes and relevant definitions, preserving stable key identities and pressed state.
- Rebuild structural nodes only if technically necessary and justified; a skin change must not trigger geometry recalculation solely because paint changed.
- Keep **state-only updates targeted** as implemented in Phase 4.

For SVG gradients, filters, masks, or similar definitions:

- Use **instance-safe, collision-resistant IDs** and valid internal references.
- Keep exported SVG self-contained; no external stylesheets, fonts, images, network requests, or global CSS.
- Preserve XML escaping and input validation; never interpolate arbitrary untrusted markup into SVG.
- Ensure two keyboards on the same page cannot accidentally reference each other's definitions.

### 3.6 Existing development demo (optional, bounded)

If the existing `demo/` is simple to extend, add a **Minimal / Classic** selector and a small set of safe override controls using the actual public API. Preserve the existing orientations, range examples, pressed-key demonstration (if present), and SVG download.

Do not build the full Phase 10 playground, duplicate skin-rendering logic in the demo, or add unrelated application frameworks. If demo work would substantially expand scope, leave it as a clearly recorded follow-up instead.

## 4. Explicitly out of scope

- Phase 6 animation system, advanced responsive behavior, motion preferences beyond maintaining current behavior.
- Phase 7 customizable indicators, labels, annotations, overlay architecture.
- Phase 8 events, plugin lifecycle, public skin registries if not already approved, public hit-testing changes.
- Phase 9 public static `PianoKeyboard.renderToSVG(...)` API, UMD bundles, Anki integration completion.
- Phase 10 full playground, visual regression infrastructure, complete skin catalog, publication work.
- Mouse/touch/keyboard interaction, MIDI devices, audio playback, or dependencies on future Pianorealm packages.
- Rewrites of the Phase 1 note utilities, Phase 2 geometry, or unrelated build tooling.

## 5. Required behavior and acceptance tests

Write focused **unit, integration, and serialization parity tests** using the repository's current test conventions. Cover at least:

1. **Default behavior:** existing constructor calls still render Minimal and do not change geometry or key ordering.
2. **Skin resolution:** Minimal and Classic produce distinguishable, deterministic resolved appearance; built-ins remain immutable.
3. **Override priority:** user-supplied allowed values win over skin defaults under the accepted precedence; reset and partial-update semantics are exercised.
4. **Skin switching:** `setSkin('classic')` and back changes visual output but preserves canonical note IDs, bounds, orientation, range, and all pressed notes (including off-range notes).
5. **Pressed notes:** pressed and unpressed white and black keys remain visually distinguishable in both skins; pressing or releasing a note still updates affected nodes without recreating the whole SVG.
6. **Validation:** unknown skins, incorrect value types, invalid CSS/SVG paint values, non-finite/negative widths or radii, and unsafe values are rejected according to the chosen token contract.
7. **Atomic failure:** an invalid skin/override update leaves configuration, pressed state, scene, SVG DOM and current presentation unchanged.
8. **Isolation:** two simultaneous instances with different skins/customizations do not share mutable tokens, DOM IDs, or SVG paint references.
9. **Scene parity:** DOM-independent XML serialization and mounted SVG use matching paints, key order, bounds, and SVG definitions for representative horizontal and vertical ranges, including black-key endpoints.
10. **Lifecycle:** switching skins repeatedly and destroying/remounting does not leak per-instance definitions, listeners, or observers.
11. **Backward compatibility:** existing Phase 1–4 unit and integration tests still pass; ESM consumers and declarations still typecheck.

For visual effects such as gradients and shadows, include a bounded real-browser smoke check **if a browser is available**, verifying visual output and exported SVG. Do not substitute snapshot/assertion success for a claim of visual correctness across all browsers.

## 6. Implementation approach

1. Inspect real source, test, configuration, and accepted ADR contracts; summarize the proposed file-level changes briefly.
2. Verify prerequisites and run the current baseline tests, typecheck, and build.
3. Introduce typed skin definitions and pure appearance resolution.
4. Add Minimal and Classic, using appropriate SVG-safe style tokens.
5. Integrate resolved appearance into the shared scene, serializer, and mounted renderer.
6. Implement validated public skin selection and appearance overrides with atomic updates.
7. Confirm pressed state and targeted updates survive skin changes.
8. Add tests, including invalid input and multi-instance isolation.
9. Optionally add minimal demo controls if small and consistent with existing demo.
10. Run the package's actual verification scripts and any feasible browser smoke checks; correct regressions.
11. Update the relevant README/API notes for newly exposed public options, and update `PROJECT_STATE.md` with evidence and remaining Phase 10 skin work.

Use small, reviewable changes. Where implementation size is too large for one session, complete a coherent subset, report the exact remaining work, and leave the phase **in progress**—do not silently reduce the acceptance gate.

## 7. Phase 5 completion gate

Mark Phase 5 **Complete** only when:

- [ ] Minimal and Classic render correctly across existing orientations, supported ranges, and sizing modes.
- [ ] Appearance tokens, precedence, validation, overrides, and `setSkin` (plus the approved custom-skin mechanism) are documented and tested.
- [ ] No skin alters geometry, MIDI identity, or logical pressed-note state.
- [ ] Pressed visualization and targeted state updates still work after skin changes.
- [ ] Mounted and serialized SVG share one appearance model and have safe, isolated definitions.
- [ ] Invalid updates are atomic and previous capabilities remain compatible.
- [ ] Relevant tests, typecheck, and build pass **with recorded command output/results**.
- [ ] Any available browser visual checks and their limitations are explicitly reported.
- [ ] Modern, Neon, Dark, and the accessibility/high-contrast strategy remain visible as Phase 10 work, not marked complete.
- [ ] `PROJECT_STATE.md` accurately records the changes, verification evidence, known limitations, and next task (Phase 6).

## 8. Completion report

In the final Codex response, provide:

1. **Prerequisite status:** what was found in the local checkout, including Phase 4 verification.
2. **Implementation summary:** exact skin APIs, token types, and precedence actually implemented.
3. **Files added/modified:** concise list grouped by purpose.
4. **Verification:** each command/test performed and actual result; separate browser checks from unit tests.
5. **Compatibility:** how existing pressed state, SVG output, and public exports were preserved.
6. **Known gaps:** especially deferred skins, accessibility policy decisions, and untested environments.
7. **Next action:** the next bounded Phase 6 task, or blockers if Phase 5 remains incomplete.

**Do not commit, push, publish, or change unrelated packages.** Ask before deviating from accepted ADRs or making a breaking public API change.
