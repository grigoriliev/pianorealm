# Phase 9 — Static SVG, Standalone Builds, and Anki Integration

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation  
> **Phase:** 9 (requires verified Phase 8)  
> **Working directory:** Pianorealm repository root  
> **Scope:** Public DOM-free static SVG API, self-contained standalone browser builds, offline/embedded compatibility, Anki documentation, and verification

## Objective

Complete **Phase 9** for `@pianorealm/keyboard`. Promote the existing shared-scene SVG serialization foundation into a stable, documented **public static SVG API**; produce and verify **ESM and standalone classic-script builds**; and provide realistic, copy-and-paste **Anki integration guidance** with evidence-based compatibility claims.

Keep `@pianorealm/keyboard` a **visualization-only**, framework-independent package. Reuse the existing note normalization, layout, scene, appearance, label/indicator/overlay, and SVG adapter code. Do not introduce a parallel renderer or host-specific logic into the core.

## 1. Read authoritative repository context

Use files in the **local checkout**, which may be newer than GitHub:

1. `AGENTS.md` and `packages/keyboard/AGENTS.md`.
2. `docs/ECOSYSTEM.md` and `docs/ARCHITECTURE.md`.
3. `packages/keyboard/PROJECT_SPEC.md`, especially static output, package builds, embedded environments, and Anki requirements.
4. `packages/keyboard/ARCHITECTURE.md` and `DEVELOPMENT_PLAN.md` (Phase 9 acceptance gate and Phase 10 boundary).
5. `packages/keyboard/PROJECT_STATE.md` (verified progress, limitations, and outstanding work).
6. **Accepted ADRs**, including at minimum:
   - `docs/decisions/0002-standalone-global-namespace.md` — classic-script global, duplicate load, build formats, and no initial CommonJS condition.
   - `packages/keyboard/docs/decisions/0003-scene-safe-svg-and-identifiers.md` — one shared scene, safe serialization, semantic definition IDs, `idPrefix` policy, and static/live parity.
   - `packages/keyboard/docs/decisions/0004-lifecycle-events-and-embedded-hosts.md` — repeated initialization, lifecycle, optional browser APIs, and explicit host-selected night mode.
   - Other relevant accepted decisions concerning notes/configuration, layout, public API and package distribution.
7. Current package source, `src/index.ts`, scene and SVG serializer, controller, build configuration, generated artifacts, tests, demo, README, and existing Anki material.

**Precedence:** Do not override accepted ADRs or established public API contracts with example code from this prompt. If the actual repository has renamed an ADR or made a newer approved decision, use that decision. Identify any material conflict explicitly; do not silently invent a replacement contract.

## 2. Preflight and work plan

Before modifying files:

- Inspect `git status` (including untracked files); preserve unrelated and in-progress work. Do not reset or overwrite user changes.
- Confirm Phase 8 is **implemented and verified**, not merely documented. Check project state, source/tests, and package exports; verify events, public hit testing, and extension cleanup remain working.
- Inventory the current shared scene builder, private static serializer, identifier allocator, SVG definitions, appearance resolution, overlay handling, and environment assumptions. **Extend these components instead of duplicating them.**
- Inspect the actual Vite/TypeScript/package tooling and build scripts. Prefer the existing build system; add the smallest changes necessary.
- Run the currently available type check, full tests, and production build before editing; record exact commands/results.
- Briefly report the implementation approach, proposed public API, affected modules, distribution outputs, test plan, and any known restrictions.

**If Phase 8 or a required architectural contract is missing, stop and report the blocker.** Do not implement missing prior-phase features as part of Phase 9. If the work is too large for one session, complete bounded increments, mark partial status honestly, and hand off the remainder.

## 3. Public, DOM-independent `renderToSVG()`

Expose the approved API at the package's public entry point:

```ts
const svg = PianoKeyboard.renderToSVG({
  range: { from: 'C3', to: 'C5' },
  orientation: 'horizontal',
  skin: 'classic',
  pressedKeys: ['C4', 'E4', 'G4'],
  idPrefix: 'anki-example-1',
});
```

This is **illustrative**; use the actual types, option naming, and public API rules in the accepted architecture. Ensure the public contract specifies:

- Supported range and note-name inputs (canonical MIDI integers internally), orientation, dimensions/sizing, skin and appearance overrides, pressed notes, labels, indicators, and overlays as already implemented.
- Static-only values such as `idPrefix`, if approved, with validation and a clear collision/reproducibility contract.
- Defaults and validation behavior consistent with the mounted controller; inputs must not be mutated. Invalid options should fail **atomically**, with meaningful errors.
- Whether container-based sizing is meaningful without a DOM. Require explicit intrinsic dimensions or use documented defaults when no container can be measured. Never attempt to measure a browser element in Node.
- A self-contained SVG string containing the appropriate `xmlns`, `viewBox`, dimensions (as supported), accessible name/description references, definitions, and final visual state.

**Absolute constraints:**

- `renderToSVG()` must work **without `window`, `document`, `HTMLElement`, `DOMParser`, or `ResizeObserver`** in its execution path. Avoid module-top-level browser-global access so importing the ESM package in Node also works.
- Build the SVG from the **same validated geometry → resolved appearance → scene** pipeline as mounted SVG. Reuse the private serializer; do not duplicate note layout, pressed color, indicator, or overlay logic.
- Static output represents the **final visual state**, without runtime animation dependencies, JavaScript, host CSS, remote fonts/images, or other network resources.
- Follow ADR-0003: text nodes/attributes use correct XML escaping; reject disallowed XML characters and unsafe markup, URL references, event attributes, and arbitrary style injection; use only validated declarative SVG values.
- Prefix all internal IDs and all `url(#...)`, accessible-name, gradient, clip, shadow and other internal references consistently. An **explicit validated `idPrefix`** yields deterministic bytes for identical normalized inputs. Default prefixes must satisfy the accepted uniqueness policy **within one loaded library copy**, with documented cross-copy and repeated-embedding limitations.
- Do not infer that default-prefix allocation makes output globally unique across independent processes or library copies. Document that consumers embedding multiple strings may need their own distinct prefixes.
- Maintain consistent layer order, overlay input order, clipping, and accessibility metadata. Where static and mounted SVG differ only by generated prefixes or host-specific runtime attributes, document the normalization used for parity checks.
- Export only intentional public types and methods; the private serializer and mutable scene internals should stay private.

## 4. Distribution: ESM and standalone classic scripts

Honor the accepted ecosystem distribution ADR and package metadata. Build and verify these **named artifacts** (or document an approved updated naming contract):

```text
pianorealm-keyboard.esm.js
pianorealm-keyboard.umd.js
pianorealm-keyboard.umd.min.js
```

### 4.1 ESM contract

- Preserve `@pianorealm/keyboard` package-root ESM exports and generated TypeScript declarations.
- Preserve `package.json` exports/types semantics; add no CommonJS export condition unless an accepted decision explicitly changes that policy.
- Check that a fresh external consumer can import the built entry point, reference the intended public types, and call the static SVG method in Node without DOM globals.
- Avoid importing a browser-only side-effect module from a Node-safe ESM entry.

### 4.2 Classic-script/UMD contract

- Produce a **self-contained** non-module browser script with no external runtime dependencies, CDN assets, external stylesheet, or remote fonts/images.
- Implement an explicit global installer consistent with the accepted ADR. Expose the constructor at **`globalThis.Pianorealm.Keyboard`** (or equivalent compatible browser global) and make the public static `renderToSVG()` method reachable on it.
- Create the `Pianorealm` namespace only when absent. Preserve preexisting unrelated `Pianorealm` properties and other package siblings.
- A duplicate load of the **same package and version** should reuse the existing constructor, using the agreed stable own build marker. Loading an incompatible version, an occupied unrecognized `Keyboard` member, an incompatible namespace, or a non-writable target must fail clearly **without overwriting existing bindings**.
- Do not assume a simple bundler-generated global is sufficient: test installer behavior explicitly. The minified and unminified artifacts must follow the same collision policy.
- Ensure implementation and declarations distinguish package ESM imports from standalone global usage; do not unexpectedly export the installer as an npm runtime API.
- Verify CSS/gradient/shadow/indicator styling needed by the component is available offline and isolated from host CSS.
- Do not publish or upload a package; publication preparation belongs to Phase 10 and requires explicit authorization.

## 5. Embedded hosts and Anki integration

Create or update a practical Anki guide (for example `packages/keyboard/docs/guides/anki-integration.md`, adjusting location to the repository's documentation conventions). Include:

1. How to build or obtain the standalone **minified classic script**.
2. How to place the artifact in Anki's `collection.media` and reference it from card templates; follow current Anki media naming and template conventions verified from reliable documentation or actual tests. State any platform/client differences.
3. **Complete copy-and-paste front and back template examples** that can render a keyboard using the standalone script and supported public API. Include an example for horizontal layout and one for vertical layout; show pressed-key/chord visualization and how host-provided data is passed safely.
4. A **static SVG alternative** for clients or card contexts where executing JavaScript is unavailable or undesirable, including an example of inserting a self-contained SVG string into a template or preparing it as media without requiring external resources.
5. An explicit **repeated-card-initialization pattern**: retain/dispose only instances owned by the template; call `destroy()` before reinitializing the same owned container; avoid duplicated listeners, leaking observers, duplicate element IDs, and accidental disposal of unrelated instances. Do not assume a fresh JS realm on every card.
6. Multiple independent keyboards on the same card; suitable element scoping and ID discipline; compact/mobile dimensions; fixed vs responsive sizing and zero-size recovery where relevant.
7. Night mode integration using **host-selected skin/appearance**, rather than hard-coding Anki CSS classes into the library. Include a clear fallback for clients with different theme detection behavior.
8. Offline requirements, safe content handling, CSS isolation, feature detection, `ResizeObserver` fallback to explicit `resize()`, and known limitations of embedded WebViews.
9. Precise instructions for testing on supported environments and how to diagnose blank displays, missing media, wrong sizes, duplicate initialization, or script restrictions.

The Anki guide must **not** imply all desktop/mobile clients execute template JavaScript identically. Do not make unsupported claims about specific Anki clients or versions. Where external documentation is needed, verify current behavior; when unverified, label examples as intended/untested rather than guaranteed.

## 6. Automated tests and smoke checks

Add focused unit/integration tests and **built-artifact** smoke tests. At minimum verify:

### 6.1 Static SVG API

- ESM import and `PianoKeyboard.renderToSVG()` invocation in a Node environment with no browser globals (or document supported Node constraints).
- Representative ranges: `C3–C5`, `A0–C8`, black-key endpoints, and single-note ranges; both orientations.
- All currently implemented skins and visual layers: pressed/unpressed notes, indicators, labels, highlights, overlays, custom appearance, gradients, SVG clipping, and accessible names.
- Actual XML parsing of generated SVG where parser tooling is available; test unsafe and malformed user input, invalid XML codepoints, escaping, ID reference resolution, and lack of external URLs/assets.
- Determinism for an explicit `idPrefix`, different prefixes for multiple embedded outputs, and default-prefix uniqueness **within the same library copy**.
- Scene- or attribute-level equivalence to mounted SVG with prefix normalization. Do not rely exclusively on comparing SVG strings if host DOM serialization legitimately differs.
- Repeat calls and malicious/invalid options do not corrupt global state or mutate caller data.

### 6.2 Standalone builds

- Verify that all three named files exist, are nonempty, and represent their intended module formats; test minified and unminified classic builds.
- Import ESM **from the built output** and validate TypeScript consumer imports from generated declarations.
- Load a classic script without a module loader into a fresh browser-like context and access `Pianorealm.Keyboard` and its static method.
- Verify sibling preservation, same-version duplicate load, conflicting/different-version load, occupied global, incompatible/non-writable target and **no mutation on failed installation**.
- Load two independent keyboard instances and verify no shared state or identifier collisions.
- Run a browser smoke test with networking blocked/disabled; ensure the script and appearance assets still work without network calls. Distinguish fixture-local script loading from remote URLs.
- Verify standalone output does not require Node built-ins, source `.ts` files, an external runtime package, or dynamically fetched chunks.

### 6.3 Lifecycle/embedded behavior

- Repeated mount → press/update → destroy → remount in the same document and container; no leaked observers/listeners/IDs or stale global registrations.
- Multiple card-like containers and separate keyboard instances with independent styles/state.
- Both orientations and compact/mobile dimensions; explicit `resize()` fallback when `ResizeObserver` is absent.
- Accessibility attributes and reduced-motion/non-color-only indicators remain valid in live and static output.
- Existing Phase 1–8 regression tests still pass; state-only operations remain targeted and static rendering does not instantiate mounted browser resources.

Run existing **typecheck, tests, and production build**, plus new artifact checks, using actual package scripts. Report exact command lines, pass/fail counts, environment versions, and significant verification limitations. Do not invent browser/Anki results.

## 7. Actual Anki compatibility matrix

Record a small versioned matrix in the Anki guide or a dedicated compatibility test document:

| Client | OS/device | Client version | Test scenario | Outcome | Evidence / limitation |
| --- | --- | --- | --- | --- | --- |
| Anki Desktop Windows | Unverified | — | Load, navigate, night mode, offline | Not tested | Requires actual client |
| Anki Desktop macOS | Unverified | — | Load, navigate, night mode, offline | Not tested | Requires actual client |
| Anki Desktop Linux | Unverified | — | Load, navigate, night mode, offline | Not tested | Requires actual client |
| AnkiDroid | Unverified | — | Load, navigate, night mode, offline | Not tested | Requires actual client |
| AnkiMobile | Unverified | — | Load, navigate, night mode, offline | Not tested | Requires actual client |
| AnkiWeb | Unverified | — | Static/browser behavior if available | Not tested | Separate verification |

Replace placeholders **only with real observed runs**. If Anki cannot be launched in the current environment, provide a reproducible manual test checklist and report the compatibility matrix as **not tested**. Browser/WebView smoke tests provide useful evidence but do **not** substitute for client-specific Anki verification.

## 8. Documentation and demo

- Update the package README with a public static SVG example, Node/browser prerequisites, exact ESM and standalone artifact usage, output filenames, ID-prefix guidance, offline behavior, and an Anki guide link.
- Document the browser-global namespace and **same-version/different-version collision behavior**.
- Show a minimal classic-script example in plain HTML using the real `Pianorealm.Keyboard` constructor.
- Reuse the existing lightweight development demo for a bounded static-SVG/bundle check if helpful; do not redesign it into the Phase 10 playground.
- Document any feature limits or environment-dependent behavior honestly. Keep architecture/package-specific decisions in their authoritative files rather than duplicating them extensively.

## 9. Out of scope for Phase 9

Do **not**:

- Implement `@pianorealm/interaction`, `@pianorealm/midi`, `@pianorealm/audio`, pointer handling, MIDI transport, or sound playback.
- Add React/Vue/Angular adapters, general plugin frameworks, network loaders, remote assets, or Anki-specific runtime dependencies to the core.
- Rewrite the geometry or maintain separate live/static implementations.
- Add the remaining Modern, Neon, Dark, or high-contrast skins solely for this phase (Phase 10), unless an existing accepted gate explicitly requires them.
- Build the complete interactive playground, finalize visual regression infrastructure, publish to npm, create releases, or overhaul unrelated tooling (Phase 10).
- Introduce CommonJS merely because an artifact is called “UMD”; follow the accepted **ESM + classic-script** contract.
- Modify unrelated packages or commit/push changes without explicit authorization.

## 10. Phase 9 completion gate

Mark **Phase 9: Complete** only when all applicable requirements are met and supported by evidence:

- [ ] The public typed `PianoKeyboard.renderToSVG()` exists and runs without a DOM, including supported Node usage.
- [ ] Static SVG is self-contained, safely serialized, accessible, and parity-tested against the mounted scene.
- [ ] The accepted identifier policy (reproducible explicit `idPrefix`, per-copy default isolation and documented limitations) is tested.
- [ ] ESM, unminified classic, and minified classic artifacts build with correct exports/globals and no external runtime dependencies.
- [ ] Global collision, sibling preservation and duplicate-load scenarios behave exactly as the approved ADR requires.
- [ ] Built-artifact import, global script, offline, lifecycle and multi-instance smoke tests have been run, with results recorded.
- [ ] Anki documentation includes runnable front/back templates, horizontal/vertical examples, static fallback, lifecycle/night-mode/offline guidance, and an honest client test matrix.
- [ ] The existing tests, typecheck and production build pass, or remaining blockers are documented and the phase remains **In progress/Blocked**.
- [ ] `PROJECT_STATE.md` records implementation, exact verification evidence, untested environments, limitations, and next tasks; update `DEVELOPMENT_PLAN.md` only for verified criteria.

**Compatibility nuance:** Lack of access to a particular Anki client does not justify claiming support for it. If the adopted release gate requires actual-client verification and none is available, **do not silently mark that verification complete**. Clearly separate code completion from compatibility verification, and record any remaining gate as pending.

## 11. Final handoff report

At the end, report:

1. **Completed versus deferred/blocked scope** and whether the Phase 9 gate is satisfied.
2. **Public API and artifact filenames** actually produced; any deviations from the accepted distribution contract.
3. **Files added/modified** and short reasons.
4. **Checks performed**: exact commands, versions and actual outcomes; distinguish Node, browser and Anki tests.
5. **Compatibility matrix** and remaining untested clients or behaviors.
6. **Architectural/security issues** encountered and resolutions or ADR changes proposed.
7. **Documentation/demo changes** and where Anki examples live.
8. **Next bounded action** (finish missing Phase 9 verification or prepare Phase 10).

Do not claim success for checks you did not run. Do not commit, push, tag, publish, or modify unrelated files without permission.
