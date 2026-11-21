# Phase 6 — Responsive Sizing and Animation

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation  
> **Phase:** 6 (requires verified Phase 5)  
> **Working directory:** Pianorealm repository root  
> **Scope:** Container and fixed sizing, responsive lifecycle, accessible pressed-key transitions, verification

## Objective

Implement **Phase 6** of `@pianorealm/keyboard` so an SVG keyboard behaves reliably in **container-based**, **fixed-size**, and **embedded** layouts, and supports **optional, configurable pressed-key animation** without changing musical state or geometry semantics.

Build on the existing Phase 1–5 architecture. Keep geometry pure, the shared scene authoritative for rendered appearance, and browser observation/animation within the mounted runtime. Preserve deterministic standalone SVG serialization: it must depict a stable visual state without depending on transitions or browser APIs.

**Do not implement Phase 7 overlays, configurable indicator modes, or the full playground as part of this phase.**

## 1. Source of truth and required reading

Use the **actual local working tree**; do not assume that GitHub `main` contains all completed work.

1. Follow the repository root `AGENTS.md` and `packages/keyboard/AGENTS.md`.
2. Read `docs/ECOSYSTEM.md` and `docs/ARCHITECTURE.md` for package boundaries.
3. Read `packages/keyboard/PROJECT_SPEC.md`, especially sizing, responsiveness, animation, accessibility, standalone SVG, and embedded-environment requirements.
4. Read `packages/keyboard/ARCHITECTURE.md`, especially geometry, configuration updates, DOM adapter, scene model, responsive lifecycle, and animation lifecycle.
5. Read **Phase 6** and the cross-phase gates in `packages/keyboard/DEVELOPMENT_PLAN.md`.
6. Read `packages/keyboard/PROJECT_STATE.md` and the **accepted** ADRs in `packages/keyboard/docs/decisions/`; pay particular attention to the actual decisions for layout coordinates, sizing/fit policy, fixed and container modes, option merging, SVG scene/DOM identity, instance styling, and lifecycle.
7. Inspect the actual exported APIs, source modules, tests, package scripts, and any existing development demo.

**Priority:** Accepted ADRs and agreed contracts take precedence over illustrative examples in this prompt. Do not silently override an accepted decision. If the contract is genuinely unspecified, choose the smallest compatible behavior, document it, and request/record a new ADR only when required by repository policy.

## 2. Prerequisite and baseline gate

Before editing:

- Verify **Phases 1–5** are actually complete in this checkout, especially Phase 2 geometry, Phase 3 shared scene/DOM serializer, Phase 4 pressed-key state, and Phase 5 appearance resolution and skin switching.
- Inspect Git status; preserve user changes and avoid unrelated edits.
- Run the package's existing **test**, **typecheck**, and **build** commands (or record why a command could not run).
- Identify current sizing APIs and coordinate conventions. Determine exactly which Phase 6 capabilities are missing rather than replacing working Phase 3 behavior.
- Summarize the proposed file-level changes before implementing.

If required Phase 5 APIs or acceptance criteria are missing, **stop**, explain the blocker, and do not quietly implement Phase 5 during Phase 6. Distinguish unavailable tooling from actual failing tests.

## 3. Scope: sizing model and layout policy

### 3.1 Container mode

- Implement or complete **container-based sizing** as the documented default.
- Measure the component's intended host/container (not the entire viewport) with minimal layout reads.
- Use `ResizeObserver` when available. Feature-detect it: avoid assuming its existence in Anki or embedded webviews.
- Provide reliable behavior when `ResizeObserver` is unavailable, including an **explicit `resize()`** API and any fallback explicitly approved by the architecture. Do not require polling or new dependencies merely to support older hosts.
- Handle delayed initial layout, zero-width/zero-height containers, hidden hosts, and attachment after initial creation without non-finite SVG dimensions or runaway relayout.
- Do not use DOM measurements inside pure geometry/scene functions: pass validated numeric dimensions into them.

### 3.2 Fixed mode and dimensions

- Implement or complete fixed sizing using the **accepted Phase 0 sizing/coordinate contract**.
- Support the approved explicit keyboard width/height and white/black key sizing options, including relevant min/max constraints.
- Honor documented precedence among fixed dimensions, per-key dimensions, container bounds, and fit rules. Do **not** invent a second, incompatible fitting algorithm.
- Preserve the established behavior for partial note ranges, black-key endpoints, horizontal/vertical orientation, and the numeric geometry fixtures from Phase 2.
- Keep SVG `viewBox`, physical dimensions, and container overflow behavior consistent with the chosen sizing contract. Distinguish SVG intrinsic geometry from CSS display scaling.
- Support fit, clipping, scrolling, and CSS-constrained dimensions **only to the extent specified by accepted decisions**; clearly document unsupported/deferred variants instead of silently adding unstable public options.

### 3.3 Efficient resize/update behavior

- Preserve MIDI identity, logical pressed-note state (including off-range notes), selected skin, and appearance overrides during resizes and orientation switches.
- Skip unnecessary work when effective size is unchanged; normalize or compare measurements carefully to avoid floating-point noise causing continual rerenders.
- Coalesce bursts of observer notifications where appropriate (e.g., one scheduled render per animation frame) without losing the final dimensions.
- Avoid `ResizeObserver` feedback loops: do not repeatedly resize the observed element as a side effect of its own measured dimensions.
- Preserve key DOM node identity when only presentation or outer SVG dimensions change **if supported by the existing adapter**; when geometry changes necessitate repositioning or structural updates, reuse key elements where practical and justify any full rebuild.
- Make `resize()` safe when called repeatedly and after partial initialization; follow the existing `destroy()` contract on calls after destruction.

## 4. Scope: animation and motion preferences

### 4.1 Public options

Implement the **approved** animation configuration using existing constructor/`setOptions(...)` patterns. Support, as finalized by the architecture:

- `enabled` (explicit `false` means no animation).
- `duration` (documented unit, bounded nonnegative finite value).
- `easing` (validated safe, supported value or constrained easing grammar).
- Skin-specific defaults **if already approved**, with deterministic precedence for user overrides.

Preserve existing configuration semantics (merge versus replace, reset handling, validation and atomic rollback). Invalid settings must not partially update the controller, scene, DOM, or styling.

### 4.2 Pressed-key transitions

- Animate **press/release visual color changes** via lightweight, component-scoped CSS/SVG presentation, using the existing Phase 4 pressed-key visual state and Phase 5 appearance tokens.
- If an **indicator already exists in the shipped code**, transitions for it may be added without changing its API. Otherwise, **do not build indicator shapes, indicator modes, or overlay layers**; these belong to Phase 7.
- Allow transitions to use appropriate Minimal/Classic defaults without coupling animation behavior to key geometry or state updates.
- Prevent global CSS side effects. Ensure instance-level settings don't unintentionally affect another keyboard on the same page.
- Avoid JS animation timers as a source of truth for key state. Quick press/release sequences, rapid configuration changes, skin switches, and immediate `destroy()` must remain correct.

### 4.3 Reduced motion

- Respect `prefers-reduced-motion: reduce` in mounted browser environments.
- Define and test precedence: **explicit `enabled: false` always disables animation**; reduced-motion preferences must not be bypassed accidentally by skin defaults. Follow accepted ADRs for any explicit opt-in behavior; otherwise favor reduced motion.
- Feature-detect `matchMedia` and degrade safely in embedded hosts. Clean up any listeners when replacing settings or destroying the instance.
- If the OS preference changes while the keyboard is mounted, react without losing pressed state or requiring remounting where supported.
- Static SVG serialization should represent **final-state appearance** and remain independent of browser motion settings; do not require animation assets, external CSS, or runtime scripts to view it.

## 5. Host compatibility and lifecycle

- Keep `@pianorealm/keyboard` framework-independent and rendering-only. **Do not** add pointer, touch, computer keyboard, MIDI, or audio handling.
- Ensure multiple simultaneous piano instances resize and animate independently, with instance-scoped resources and SVG identifiers.
- Support component reinitialization, host removal, and `destroy()` without observer/listener/RAF/timer leaks.
- Cancel outstanding resize work and detach optional `ResizeObserver` / media-query subscriptions during destruction.
- Avoid `document.write()`, external runtime assets, global styles, unguarded `window`/`document` access in DOM-independent modules, and any requirement for network access.
- Maintain safe behavior in embedded/webview hosts that lack optional APIs. Document fallback limitations rather than claiming unverified Anki-client compatibility.

## 6. Strictly out of scope

- Phase 7 labels, configurable press-indicator modes/shapes, custom highlights, notes, and overlays.
- Phase 8 event system or extension lifecycle (other than respecting an already existing event contract).
- Phase 9 public static SVG API, UMD/standalone release pipeline, and Anki integration completion.
- Phase 10 full playground, new skins beyond Minimal/Classic, or new visual-regression infrastructure.
- Any framework or interaction, MIDI, or audio library.
- Rewriting Phase 2 geometry, duplicating SVG rendering, adding extra runtime dependencies, or changing accepted ADR contracts without documented approval.

## 7. Required verification

Add focused unit/integration tests and, where available, **real-browser** verification. Include at minimum:

### Sizing and responsiveness

1. Default container mode and valid fixed mode use the approved dimensions and layout policy.
2. Horizontal/vertical sizes, including partial ranges and black-key endpoints, preserve geometry invariants and all Phase 2 reference fixtures.
3. Initial zero/tiny/hidden containers and recovery after becoming visible never yield `NaN`, negative dimensions, invalid SVG, or uncaught errors.
4. Fractional and near-identical measurements do not trigger endless updates or unexpected jitter.
5. Multiple rapid resizes settle on the latest measured dimensions and avoid unnecessary repeated geometry work; test using an observer mock where appropriate.
6. Repeated explicit `resize()` works with and without `ResizeObserver`; no-observer fallback is documented.
7. Resizing, orientation changes, and fixed/container mode switches preserve pressed notes, including notes outside the visible range, plus skins and overrides.
8. Two independent keyboards use their own host measurements and styling; one instance's resize or destruction does not affect the other.
9. Observer callbacks after destruction and pending scheduled callbacks are harmless and resources are released.

### Animations and accessibility

10. Default, explicitly enabled, disabled, and skin-derived motion settings produce the documented transition declarations and timing.
11. Invalid duration/easing/options fail atomically without changing visible state or accepted configuration.
12. `prefers-reduced-motion` suppresses transitions; preference changes are respected where supported; missing `matchMedia` degrades safely.
13. Repeated rapid press/release toggles never alter logical pressed state incorrectly or leave stale presentation.
14. Changing skins or animation options mid-transition preserves correct final-state styling, pressed keys, and unrelated DOM node identities where applicable.
15. Mounted and serialized SVG agree on final geometry and appearance; static SVG does not require a browser animation engine or remote CSS.
16. Existing Phase 1–5 tests and package public ESM declarations/imports still pass.

**Testing honesty:** Mocked observer or media-query tests prove logic, not actual responsiveness or motion across browsers. If possible, use the existing demo in a real browser to check container resizing, mobile-width behavior, fixed dimensions, vertical orientation, reduced motion, and CSS isolation. Record which checks were manual, automated, or **not performed**; do not claim Anki platform compatibility without testing those clients.

## 8. Implementation order

1. Read the documents/ADRs, check prerequisites, inspect repository, and record baseline verification.
2. Map current layout and `setOptions` contracts and find missing sizing behavior.
3. Implement or refine pure dimension normalization and fit calculations using the existing geometry engine.
4. Add the container measurement/observer coordinator and fixed-size handling in the mounted controller.
5. Ensure reliable explicit resize, coalescing, stable state, and lifecycle cleanup.
6. Implement a validated animation options model using Phase 5's appearance resolution.
7. Add scoped pressed-state transitions and motion preference handling.
8. Verify static SVG remains final-state and self-contained; do not expose additional static APIs merely to satisfy this check.
9. Add unit/integration tests and perform bounded browser smoke checks if available.
10. Update only relevant API/configuration documentation and the existing development demo if the changes are small and useful. Do not build a full playground.
11. Run the actual package scripts for tests, typecheck, and build; correct regressions.
12. Update `packages/keyboard/PROJECT_STATE.md` with accurate status, commands/results, known limitations, and the next task. Leave Phase 6 **In Progress** if any required gate is unmet.

Keep changes focused, reviewable, and compatible with accepted contracts. If implementation cannot fit a single session, complete a coherent subset and report exact remaining items rather than claiming the phase is complete.

## 9. Completion gate

Mark **Phase 6 Complete** only when all of the following are true:

- [ ] Container and fixed sizing follow the accepted dimensions, fit, and range policies.
- [ ] Observer behavior, supported fallbacks, zero-size handling, and explicit `resize()` are reliable.
- [ ] Changes in size or orientation preserve pressed-note state and appearance configuration.
- [ ] Resize notifications do not cause infinite loops or unnecessary excessive work.
- [ ] Optional, validated pressed-state animation is implemented without expanding into Phase 7.
- [ ] Explicit animation disabling and `prefers-reduced-motion` work as documented.
- [ ] Multiple instances remain isolated; destruction releases observers, listeners, and pending work.
- [ ] The existing shared scene and static serializer remain deterministic and aligned with mounted final-state output.
- [ ] New regression tests plus the existing suite, typecheck, and build pass with recorded actual results.
- [ ] Any required real-browser checks and host limitations are explicitly documented.
- [ ] `PROJECT_STATE.md` accurately records completion and identifies **Phase 7 — Labels, Indicators, and Layered Overlays** as next.

## 10. Completion report

Return a concise, evidence-based report with:

1. **Prerequisites:** actual Phase 5 status and baseline test/build outcomes.
2. **Implemented APIs and policies:** sizing modes, fit rules, `resize()` fallback, animation settings, reduced-motion precedence.
3. **Files changed:** grouped into library, tests, documentation, and demo.
4. **Verification results:** exact commands, passing/failing counts when available, plus browser/manual checks separately.
5. **Behavior preservation:** state, geometry fixtures, scene/serializer parity, multiple instances, and teardown.
6. **Open issues and deferred work:** unsupported hosts, unavailable verification, and explicit Phase 7/9/10 exclusions.
7. **Phase status:** Complete or In Progress with reasons, and the next recommended action.

**Do not commit, push, publish, or tag.** Leave changes for review in IntelliJ IDEA / JetBrains Air.
