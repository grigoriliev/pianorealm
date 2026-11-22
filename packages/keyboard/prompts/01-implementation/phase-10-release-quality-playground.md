# Phase 10 — Release Quality, Documentation, and Playground

> **Project:** Pianorealm  
> **Package:** `@pianorealm/keyboard`  
> **Prompt type:** Implementation and release-readiness verification  
> **Phase:** 10 (requires verified Phase 9)  
> **Working directory:** Pianorealm repository root  
> **Scope:** Remaining built-in skins, accessibility, playground, documentation, visual regression, packaging audit, and release preparation  
> **Explicitly excluded:** Publishing to npm, creating releases/tags, pushing commits, and implementing other Pianorealm packages

## Objective

Bring `@pianorealm/keyboard` to the **initial-release acceptance criteria** in `packages/keyboard/PROJECT_SPEC.md` §21 and the **Phase 10 gate** in `packages/keyboard/DEVELOPMENT_PLAN.md` §15. Complete genuinely missing release features, verify the resulting package using **built artifacts**, and produce accurate user-facing documentation and a release-readiness report.

The package remains a **framework-independent, visualization-only** library. Do not add pointer/mouse/touch/computer-keyboard interaction, MIDI input/output, audio playback, or dependencies on future Pianorealm packages.

Do **not** infer that this is ready for publication merely because Phase 10 code has been written. Document any incomplete verification or deliberately reduced release scope.

## 1. Read the authoritative repository context

Inspect the **local Git checkout**, which may be newer than public GitHub:

1. Root and package `AGENTS.md` files.
2. `docs/ECOSYSTEM.md` and `docs/ARCHITECTURE.md`.
3. `packages/keyboard/PROJECT_SPEC.md`, especially initial-release acceptance criteria, visual themes, accessibility, documentation, packaging, and embedded/Anki support.
4. `packages/keyboard/ARCHITECTURE.md` and `packages/keyboard/DEVELOPMENT_PLAN.md`, particularly Phase 10 and its cross-cutting verification matrix.
5. `packages/keyboard/PROJECT_STATE.md` and the Phase 9 completion report or evidence.
6. All relevant **accepted** ecosystem- and keyboard-level ADRs in their respective `docs/decisions/` directories. In particular verify contracts for note/configuration behavior, geometry, safe scene/SVG identifiers, embedded lifecycle, events/extensions, package exports, and classic-script global registration.
7. Existing source code, public TypeScript exports, demo/playground, tests, documentation, build scripts, distribution artifacts, and CI configuration (if any).

**Precedence:** Accepted ADRs and implemented public contracts take precedence over illustrative snippets in this prompt. If an example conflicts with the current approved API, use the approved API and explain the discrepancy. Do not silently invent or replace architectural decisions.

## 2. Preflight, baseline, and bounded work plan

Before editing:

- Check `git status`; do not discard, reset, or overwrite unrelated local changes.
- Confirm **Phase 9 is actually complete**: check implementation, package metadata, ESM/UMD outputs, static `renderToSVG()`, Anki documentation, and recorded verification. Do not trust phase labels alone.
- Run available baseline checks: type checking, unit/integration tests, production builds, and package smoke tests; record exact commands, counts, results, and environment.
- Inventory current built-in skins, appearance tokens, label/indicator/overlay support, demos, accessibility affordances, visual tests, existing documentation, and release metadata.
- Identify missing Phase 10 requirements and split work into **small, independently verifiable increments**. Briefly present the proposed order and files likely to change.

**If Phase 9 is materially incomplete, stop and report the blocker rather than implementing Phase 9 inside this phase.** If Phase 10 cannot be completed in one agent session, finish a bounded increment, run its checks, document remaining work in `PROJECT_STATE.md`, and provide a handoff. Never declare the entire phase complete prematurely.

Suggested incremental order: (A) skins/accessibility → (B) playground → (C) docs/package metadata → (D) visual and cross-cutting verification → (E) release audit.

## 3. Complete built-in skins and appearance verification

Implement the remaining promised built-ins if not already implemented:

- `modern`: contemporary appearance with restrained corner rounding, shadows, and transitions.
- `neon`: dark styling with clear active-key color/glow, while remaining legible without effects.
- `dark`: coherent dark-mode styling with readable keys, labels, and indicators.
- Provide the **high-contrast skin or explicitly documented accessibility appearance mode** required by the approved architecture and current spec. Do not quietly omit the accessibility strategy.

Retain and regression-test `minimal`, `classic`, and the existing custom-skin mechanism. Use the **current resolved appearance/token pipeline** and the approved precedence for skin defaults, user overrides, and accessibility rules.

Requirements:

- Skins control visual presentation only; never change MIDI identity, geometry, note state, event semantics, or hit-testing.
- Existing pressed notes, overlays, highlights, and labels survive skin changes.
- Pressed visualization modes (`color`, `indicator`, `both`) remain distinguishable across supported skins; accessible non-color-only indication must remain possible.
- Ensure adequate contrast for labels on white/black keys and in active states. Record verified contrast ratios where meaningful and report exceptions; don't claim blanket WCAG compliance based only on visual inspection.
- SVG gradients, filters, masks, `url(#...)` references, and accessible IDs remain isolated between instances and static renders; keep internal IDs deterministic with explicit approved `idPrefix` where specified.
- Styles and definitions must remain self-contained in static SVG, scoped to component instances in mounted SVG, and independent of network resources.
- Animation defaults are optional, overrideable, and respect explicit disable and reduced-motion settings. Static SVG must not depend on runtime animation.
- Validate custom style values and reject unsafe or malformed inputs; preserve atomic configuration updates.
- Test skins in both orientations, partial/black-endpoint ranges, normal/pressed keys, compact sizing, and multiple instances.

Use the established scene/renderer and style resolution modules; **do not create separate rendering code for each skin**.

## 4. Accessibility and embedded-environment hardening

Review the entire rendering and demo experience, including:

- Root SVG accessible name and description; appropriate decorative mode when configured.
- Correct labeling for a *display-only* keyboard, without misleading interactive button semantics or unintended focus/keyboard handlers.
- Orientation, pressed-state, and overlay information conveyed sufficiently for the documented accessibility contract.
- Non-color-only pressed-key indication, high-contrast mode, legible labels, compact layouts, and `prefers-reduced-motion` behavior.
- Both mounted and static SVG outputs, with safe and resolvable `aria-labelledby` / `aria-describedby` references where used.
- Multiple instances, CSS isolation, night-mode integration by host configuration, and absence of external assets or network assumptions.
- Graceful behavior when optional browser APIs (for example `ResizeObserver`) are unavailable; repeated mount/update/destroy must not leak resources.

Use automated accessibility checks where available **and** conduct representative real-browser inspection. Record the browser version, environment, tooling, screenshots/observations, and unresolved issues. Do not claim screen-reader compatibility without actual assistive-technology testing.

## 5. Build a practical interactive development playground

Inspect and **extend the existing development demo** when practical; do not create a duplicate application without a clear reason. The playground must **import and use the real package** (or the existing package source through the established development setup), not recreate piano geometry or visual rendering.

Provide usable controls for currently supported public features:

- Select built-in skins and, if practical, demonstrate custom appearance overrides.
- Toggle horizontal/vertical orientation and choose representative note ranges (`C3–C5`, partial black endpoints, full `A0–C8`).
- Change container/fixed sizing, within the public sizing contract.
- Select and clear multiple pressed notes and try simple chord presets.
- Switch pressed-key visualization modes; adjust animation enablement/duration where supported.
- Toggle note/MIDI/octave labels and sample highlights/overlays.
- Display a **copyable configuration example** that matches the current public constructor/static API and the visible controls; never print unvalidated executable code or accidentally expose private APIs.
- Export SVG using the **public** `PianoKeyboard.renderToSVG()` when it correctly reflects the configuration, or clearly distinguish mounted-SVG export when needed; use distinct `idPrefix` values for concurrently embedded exports.

Playground requirements:

- Keep the production npm/library bundle free of demo-specific dependencies, HTML, and styling.
- Avoid default behavior that suggests clicking piano keys is part of `@pianorealm/keyboard`; **control-panel interactions are demo UI**, not a new library interaction API.
- Accessible form labels, responsive panel layout, understandable errors, and no console errors on normal workflows.
- Provide documented run instructions using actual package scripts.
- Reuse, rather than replace, existing demo features that already work.
- Add focused smoke tests for configuration generation and playground workflows where feasible; otherwise record manual browser checks precisely.

## 6. Public API, packaging, and distribution audit

Review the package from a **consumer's** perspective and make narrowly scoped corrections:

- `package.json` name (`@pianorealm/keyboard`), version, description, license, repository links, keywords, package manager/tooling compatibility, engines policy if documented, and `files` allowlist.
- Correct ESM root exports, TypeScript declaration files and types resolution, source maps, and required classic-script/UMD artifacts (including minified variant).
- Verify the approved `Pianorealm.Keyboard` global installer, same-version reload policy, sibling namespace preservation, and conflicting-load failure behavior against the accepted ADR.
- Consistent public type surface: `PianoKeyboard`, accepted option types, pressed-state APIs, skins, labels/overlays, events, hit testing, extension interfaces, and `renderToSVG()`.
- Do not expose mutable internal scene/DOM structures or undocumented private modules as public API.
- Avoid extra runtime dependencies, remote resources, Node built-ins in standalone browser output, and import-time access to `window` or `document` on Node-safe code paths.
- Do not add CommonJS merely as a generic compatibility enhancement; follow the accepted build-format decision.

**Verify actual built artifacts**, not just source imports:

1. Build package, then inspect generated files and package contents (for example, `npm pack --dry-run --json`, if npm is the current toolchain).
2. Create an **isolated consumer smoke test** from the packed package or built output: import ESM at package root, type-check a small TypeScript consumer, and run static SVG rendering in Node without DOM globals.
3. Load both minified and unminified classic scripts in a browser-like context without a module loader; verify namespace collision policies.
4. Verify offline behavior and no network assets for the supported standalone/static modes.
5. Check that the published tarball would exclude tests, development demo, internal prompts/state documents, local environment data, and unnecessary build artifacts unless explicitly intended.

Do not change license terms or assign a version number without confirming the repository's current license and the owner's intended release policy. If a version choice needs owner approval, propose it rather than inventing approval.

## 7. Documentation and examples

Create or update the docs in their established repository locations. Keep the **root ecosystem README** about Pianorealm, and the package README about `@pianorealm/keyboard`.

Required user-facing material:

- Package overview and clear development/release status.
- Installation via npm **only if actually published**, otherwise mark as planned; local workspace / packed-artifact usage instructions should be runnable now.
- Quick-start JavaScript and TypeScript examples using the actual supported public API.
- API reference with types/methods, validation/errors, and destruction/lifecycle behavior.
- Configuration reference (defaults, ranges, sizing, orientation, state, skin/appearance, animation, labels, indicators, overlays, static SVG).
- Custom skin and appearance override guide; overlays and extensions guide; public events and hit-testing guide.
- Browser, Node static SVG, standalone script, and Anki examples using actual artifact names and public signatures.
- Dedicated Anki integration guide with front/back templates, media deployment, night mode, repeated initialization, platform caveats, and **tested versus untested** client matrix.
- Playground startup instructions and explanation that control-panel interactions do not imply an interactive core library.
- Known limitations, support/environment policy, license, and intended contribution workflow.

Verify copy/paste examples against compiled code or dedicated example tests where practical. Avoid links to nonexistent docs and do not state that a package is on npm unless verified.

## 8. Visual regression and browser verification

Introduce or complete a **small, maintainable visual regression matrix**. Prefer existing test tooling if suitable; add a browser screenshot tool only when justified and keep added dependencies in development scope.

Capture representative, deterministic cases covering:

- Every built-in skin (including high contrast/mode).
- Both orientations and normal/partial ranges (including black-key endpoints and full 88 keys).
- Pressed/unpressed notes, visualization modes, labels, multiple overlays, and custom appearance.
- Fixed and responsive dimensions, including compact/mobile-like viewports.
- Both mounted and static SVG output where visual parity is part of the public contract.

Make baseline generation **explicit** and documented; do not auto-accept changed screenshots as a way to silence failures. Pin or record browser/rendering environment where possible. Add deterministic IDs, fonts, motion-disabling/test timing, and stable viewport dimensions for reproducibility.

Also test structural/performance invariants (not screenshot-only):

- Press/release changes only affected key presentation, without replacing unrelated SVG DOM nodes.
- State survives resize, orientation, range, and skin updates per approved contracts.
- Hit testing retains black-key precedence under scaling and both orientations.
- Repeated initialization/destruction and multi-instance use clean up observers, listeners, events, extensions, and SVG definitions.
- Adversarial overlay/text/appearance inputs are validated/escaped, without unsafe SVG markup or external URL injection.
- Generated static SVG is XML-valid, self-contained, deterministic with explicit `idPrefix`, and structurally equivalent to mounted output under documented normalization.

For browser or Anki platforms that cannot be tested in the current environment, record **Not tested** with reason and a manual verification procedure; never substitute a DOM emulator for evidence of real-browser appearance or Anki-client compatibility.

## 9. End-to-end verification and acceptance audit

Run all relevant checks using the **repository's actual scripts and toolchain**, including as applicable:

- TypeScript checking and declaration generation.
- Unit and integration tests.
- Production package build.
- Packed-artifact consumer/import checks.
- Node DOM-free static SVG check.
- Classic-script/minified bundle smoke tests.
- Browser/playground/visual regression and accessibility checks.
- Offline/static/embedded lifecycle checks.

Record each command, environment and outcome; do not invent totals or claim tests passed if not run. Report preexisting failures separately from failures introduced during this phase.

Audit **every acceptance criterion in `PROJECT_SPEC.md` §21** and the **Phase 10 gate in `DEVELOPMENT_PLAN.md` §15** using a concise evidence table:

| Requirement | Status (Pass / Fail / Unverified / Deferred) | Evidence | Follow-up |
| --- | --- | --- | --- |

- A feature is **Pass** only if implementation and the appropriate verification exist.
- **Unverified** is different from **Pass** and is not an acceptable basis for claiming a specific platform has been tested.
- A **Deferred** feature must have an explicit owner-approved release-scope adjustment and public documentation of the impact; never silently drop a promised feature.
- If a hard release gate fails, mark Phase 10 **In progress** or **Blocked** in the project state—not Complete.

## 10. Release preparation (no release action)

Prepare or update:

- Package `CHANGELOG.md` or established changelog location; summarize the features and known limitations without fabricating published version history.
- A proposed semantic version and brief rationale, explicitly identifying any approval needed.
- A release checklist covering license, artifacts, docs, API review, verification evidence, compatibility caveats, and provenance.
- Migration/breaking-change policy appropriate for the initial release; don't fabricate previous stable versions.
- Optional CI automation for repeatable build/test/pack checks if it fits the existing setup; avoid major infrastructure expansion.

**Never run `npm publish`, create a Git tag, create a GitHub release, push branches, or commit changes** without separate explicit user authorization. Do not trigger deployment, publication, or external account actions.

## 11. Update project records and completion report

Update `packages/keyboard/PROJECT_STATE.md` with **verified** Phase 10 progress:

- Actual completed work and any deferred/unverified items.
- Files and public APIs changed.
- Actual test/build/browser/Anki evidence and environment versions.
- Outstanding risks, regressions, release blockers, and next recommended task.
- Whether Phase 10 is **Complete**, **In progress**, or **Blocked**, applying the release gate strictly.

Update `DEVELOPMENT_PLAN.md`, architecture docs, or ADRs **only when necessary to reflect approved changes**; do not rewrite accepted decisions casually. Follow the repository's ADR naming/numbering convention for any newly required decisions.

End with a concise report containing:

1. Baseline and preflight findings.
2. Work completed by area (skins, accessibility, playground, docs, packaging, regression/release checks).
3. Files created/modified and intentional API changes.
4. Exact verification commands and outcomes (with counts where available).
5. Release acceptance audit (Pass / Fail / Unverified / Deferred), including Anki client coverage.
6. Remaining problems, owner approvals, and recommended next actions.
7. Explicit confirmation that **no commit, push, package publication, or release was performed**.

## Definition of done

Phase 10 is complete **only** when:

- All promised initial-release features, including remaining built-in skins/accessibility policy, have been implemented or explicitly and transparently deferred with approval.
- A working playground uses the real library, and user-facing examples match the real API.
- Type declarations, package contents, ESM/classic-script builds and offline/static paths work from built artifacts.
- Representative real-browser visual and accessibility verification has been completed, or any environment gap is clearly documented without claiming support has been proven.
- Full applicable regression suites pass, or each known failure and its release impact is documented and resolved through an explicit release decision.
- The release audit demonstrates satisfaction of `PROJECT_SPEC.md` §21 and `DEVELOPMENT_PLAN.md` §15; `PROJECT_STATE.md` reflects evidence rather than assumptions.
- No publication, tag, push, or commit has been made without user authorization.

If any of these conditions is not met, **report partial completion with a prioritized handoff; do not claim Phase 10 is done**.
