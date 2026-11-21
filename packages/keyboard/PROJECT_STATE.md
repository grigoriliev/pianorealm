# `@pianorealm/keyboard` — Project State

> **Status:** Implementation · **Last completed phase:** Phase 4 · **Phase 4:** Complete
> **Last verified:** 2026-11-21 · **Maintainer:** Project contributors

## Completion and implementation decisions

- Phase 0 is complete. The review records the approved baseline and expected results for the geometry tests. [Phase 0 review](docs/PHASE_0_REVIEW.md) · [Accepted ADRs](ARCHITECTURE.md#phase-0-review-references)
- Phase 1 meets the [completion gate](DEVELOPMENT_PLAN.md#6-phase-1--tooling-note-utilities-and-configuration). The keyboard package installs independently from a package-local lockfile and uses strict TypeScript, Vite, and Vitest. The private package has no runtime dependencies. Phase 1 established the ESM entry point and declarations for `normalizeNote`, `formatNote`, `classifyNote`, and their public types. [Repository topology ADR](../../docs/decisions/0001-repository-topology.md) · [Distribution ADR](../../docs/decisions/0002-standalone-global-namespace.md)
- MIDI integers 0–127 are canonical. Note names use C4 = 60 by default and accept enharmonic spellings across octave boundaries. The implementation requires safe-integer octave offsets and uses exact integer arithmetic so extreme valid offsets still round-trip. Ranges are inclusive and accept a single note. [Note and configuration ADR](docs/decisions/0001-notes-configuration-and-state.md) · [Package README](README.md)
- Internal configuration returns a frozen snapshot after validation. A patch replaces the range as a pair, merges declared notation and sizing fields, and uses explicit `undefined` to reset values. Patched notation applies to new range names. Existing MIDI endpoints retain their identity. Dimensions live under sizing. Defaults are horizontal, MIDI 21–108, container sizing, and white/black pitch widths and depths of 20 × 100 and 12 × 60. [Note and configuration ADR](docs/decisions/0001-notes-configuration-and-state.md) · [Layout and sizing ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
- Phase 2 adds `src/geometry/layout.ts` and `src/geometry/hit-testing.ts`. Configuration and geometry share validation from `src/config/normalize.ts`, `src/notes/notation.ts` and `src/notes/ranges.ts`. The private layout takes a normalized MIDI range, an orientation and key dimensions in SVG user units. It counts white-key slots, centers black keys on their seams and keeps the full pitch-axis union of visible rectangles. The viewport always retains full white-key depth. The vertical layout applies the A-03 transform to the horizontal bounds. Its frozen keys are ordered whites before blacks, each in ascending MIDI order. [Layout and query ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
- The private point query uses half-open rectangles in intrinsic coordinates and returns the topmost MIDI note or `null`. Nonnumeric coordinates throw `TypeError` and non-finite coordinates throw `RangeError`. Phase 2 left the package root exports unchanged.

## Phase 4 handoff

The [Phase 4 gate](DEVELOPMENT_PLAN.md#9-phase-4--programmatic-pressed-key-state) passed. The package root's existing `PianoKeyboard` class now provides `setPressedKeys`, `pressKey`, `releaseKey`, `clearPressedKeys`, and `getPressedKeys`. The README documents the array-only batch input, note normalization, ascending detached snapshots and visual-only behavior. Existing package exports and dependencies are unchanged.

The handoff was verified on `main` at `81a78e2` with the Phase 4 changes in the working tree. The new state module and its unit tests are untracked, along with the pre-existing package `.gitignore`.

- `src/state/pressed-keys.ts` stores canonical MIDI notes independently of the displayed range and appearance. The controller validates and normalizes all batch entries before changing state. Names use the instance notation at ingestion. [A-02 and A-05](docs/decisions/0001-notes-configuration-and-state.md)
- The scene and live update path share Minimal's blue fill and fixed shape cue. The SVG adapters place one circle per visible key after the key body layers and hide each circle until its key is pressed. The circle fits inside the key's visible center strip, including with full-depth black keys. [Shared scene ADR](docs/decisions/0003-scene-safe-svg-and-identifiers.md) · [Accessibility and lifecycle ADR](docs/decisions/0004-lifecycle-events-and-embedded-hosts.md)
- An instance-local MIDI map lets state changes update only the changed keys' fill and dot visibility attributes. Off-range changes perform no DOM writes. Range and orientation rebuilds use the existing MIDI state, and resizing preserves it. The five state methods throw after destruction, and a new mount starts empty.
- Coverage in `tests/unit/pressed-keys.test.ts`, `tests/unit/scene.test.ts` and `tests/integration/mount.test.ts` verifies normalization, retained notes, atomic failures, changed attributes, stable node identity, per-instance isolation and parsed SVG parity. The demo includes C major, F♯ minor and clear buttons. The F♯ minor voicing (F♯3, A3, C♯4) fits all three displayed ranges and highlights both black and white keys.

### Completion criteria

| Criterion | Verified evidence |
| --- | --- |
| Five typed, validated and documented methods | The built declarations expose all five methods. Integration tests cover runtime validation, and the package README shows all five calls. |
| Canonical state, ordering and A-05 behavior | State and controller tests verify detached ascending snapshots, enharmonic deduplication, repeated-operation no-ops, atomic replacement and off-range retention. |
| Targeted SVG updates | Integration tests assert root and child identity and check that mutations affect only the changed keys' fill and dot visibility attributes. |
| Structural updates and sizing | Integration tests cover range changes, both orientations, viewport resize and zero-size recovery. |
| Isolation, rejection and lifecycle | Integration tests cover independent instances, rejected batches without writes, throws after destruction and an empty state on remount. |
| Shared scene and private serializer | Node tests verify DOM independence and visible intersection. Parsed output matches mounted key and indicator attributes in both orientations. |
| Package checks and project records | Typecheck, the full test suite and build passed again at handoff. The development plan records the verified gate. |

## Phase 4 verification

Package commands ran from `packages/keyboard` with Node 24.22.1 and npm 11.19.1 from the IntelliJ IDEA runtime. The default shell path did not contain npm.

| Command | Observed result |
| --- | --- |
| `npm run typecheck && npm test && npm run build` before edits | Passed. Vitest ran 148 tests across five files and Vite and TypeScript built the Phase 3 package. |
| `npm run typecheck` | Passed again at handoff with no TypeScript diagnostics. |
| `npm test` | Passed again at handoff with 157 tests across six files. |
| `npm run build` | Passed again at handoff. Vite emitted the ESM bundle and source map, and TypeScript emitted declarations. |
| `node --input-type=module` with inline assertions against the built package | Passed. Verified the five prototype methods, unchanged root exports, privacy of state and serializer paths, and demo exclusion from the production source map. |
| `./node_modules/.bin/tsc -p tsconfig.build.json --emitDeclarationOnly false --declaration false --outDir /tmp/pianorealm-phase4/emit`, then `node --input-type=module` with inline assertions | Passed. The temporary output was marked as ESM. In plain Node without DOM globals, the scene and serializer displayed only the two visible notes in a mixed visible/off-range selection and generated deterministic markup. |
| `python3 /tmp/pianorealm-phase4/demo-smoke.py` | Passed in headless Firefox 160.0.1 with loopback access for Vite and Marionette. Verified rendered C-major fills and dots in all three demo keyboards, clearing with stable roots, byte-identical highlighted SVG downloads, off-range press/hide/restore and orientation changes, and the narrow scrollable layout. The initial sandboxed invocation could not open a loopback socket. |
| `git diff --check` and `git status --short --untracked-files=all` from the repository root | Whitespace check passed. Changes are confined to the keyboard package. The pre-existing untracked package `.gitignore` was preserved. |

The F♯ minor demo update passed `npm run typecheck && npm test && npm run build` with 157 tests across six files. `python3 /tmp/pianorealm-f-sharp-minor/demo-smoke.py` passed in headless Firefox 160.0.1. It verified that F♯ minor replaced C major in all three keyboards, that clearing preserved the roots and that highlighted SVG downloads matched the mounted SVGs.

Firefox was the only real browser checked for Phase 4. Other browsers, assistive technologies and embedded hosts remain unverified for this feature.

## Phase 3 handoff

The Phase 3 implementation and handoff are recorded in `df1dc7b`.

### Implementation decisions

- `src/scene/build-scene.ts` combines the frozen Phase 2 layout with Minimal paint and a generated name. MIDI note numbers are stable scene identities. The scene carries layout bounds and draw order directly. `src/svg/attributes.ts` defines the supported attribute sets for the namespaced DOM adapter and private XML serializer. Solid paint and a direct `aria-label` require no ID references. [Shared scene ADR](docs/decisions/0003-scene-safe-svg-and-identifiers.md)
- The package root adds `PianoKeyboard`, `KeyboardOptions` and `Orientation`. The controller validates and derives structural replacements before committing them. The adapter uses centered uniform SVG fitting, measures container content size, and falls back to oriented intrinsic dimensions for omitted fixed axes. Its zero-footprint slot keeps container-mode SVG from contributing to the host's height. [Sizing ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
- Each HTML host allows one live owner across library copies. The mounted adapter feature-detects `ResizeObserver` and also supports explicit `resize()`. Teardown removes the owned SVG and slot, disconnects observation and releases the host reservation. Repeated `destroy()` is safe, and the other instance methods throw after destruction. [Lifecycle ADR](docs/decisions/0004-lifecycle-events-and-embedded-hosts.md)

### Completion criteria

All eight criteria passed. [Phase 3 prompt](prompts/01-implementation/phase-03-shared-scene-svg-rendering.md#phase-3-completion-gate) · [Development plan](DEVELOPMENT_PLAN.md#8-phase-3--shared-scene-model-and-minimal-mounted-svg)

| Criterion | Evidence |
| --- | --- |
| Mount a Minimal keyboard in a caller-provided element | The DOM integration suite verifies namespaced SVG and the default 88-note mount. The Firefox smoke verified drawing, centered letterboxing and clipping in the caller's content box. |
| Match Phase 2 geometry, ordering and note identity | The scene suite compares all keys against Phase 2 for six ranges in both orientations. The DOM and parsed XML parity fixtures include a vertical black-endpoint range and a single black key. |
| Share a DOM-independent scene | The Node scene suite runs without `window` or `document`. Live SVG and parsed serialization agree on the root attributes and per-key geometry, paint, and MIDI order. |
| Verify range, orientation, resize and destroy | The integration suite covers range and orientation changes, fixed dimensions, container measurement, disconnected and zero-size recovery, and post-destroy errors. Firefox verified real observer recovery and reattachment. |
| Preserve state and isolate instances | Tests cover invalid and overflowing range updates, failed observer setup rollback, duplicate mounts, unrelated host content, independent instances and idempotent cleanup. Firefox confirmed host ownership across two library copies. |
| Produce safe and accessible SVG | Tests verify the image role and accessible name, absence of tab stops and generated IDs, XML attribute escaping, and rejection of invalid XML characters. |
| Execute scene, DOM, parity and regression tests | Vitest passed all 148 tests across five files. |
| Pass type checking and build, and record evidence | Both commands passed at handoff. Verification details and outstanding compatibility checks are recorded below. |

## Phase 3 verification

Commands ran from `packages/keyboard` with Node 24.22.1 and npm 11.19.1 unless a repository-root location is given.

| Command | Observed result |
| --- | --- |
| `npm run typecheck && npm test && npm run build` before edits | Passed. Vitest ran all 124 Phase 1–2 tests across three files. |
| `npm install --save-dev jsdom@26.1.0 @types/jsdom@21.1.7 --ignore-scripts --cache /tmp/pianorealm-npm-cache --fetch-retries=0 --fetch-timeout=8000` | Succeeded with registry access after sandbox DNS failed. The package-local dev dependencies support the declared Node 22.12 floor by their engine ranges. npm reported a transitive `whatwg-encoding` deprecation and zero audit findings. |
| `npm run typecheck` at handoff | Passed with no TypeScript diagnostics. |
| `npm test` at handoff | Passed all 148 tests across five files, including 24 Phase 3 tests and the 124 Phase 1–2 tests. |
| `npm run build` at handoff | Passed. Vite emitted the ESM bundle and source map, and TypeScript emitted declarations. |
| `node --input-type=module -e 'import { normalizeNote } from "@pianorealm/keyboard"; console.log(normalizeNote("C4"))'` at handoff | Printed `60` using the built ESM entry. |
| `node --input-type=module` with inline assertions | Passed. Node imported the built package without DOM globals, exposed the class and three note utilities, and rejected a serializer deep import. The pure serializer also ran under Vitest's Node environment. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022 --module NodeNext "$consumer_dir/node.mts"` and `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022,DOM --module NodeNext "$consumer_dir/browser.mts"` | Both passed against built declarations from temporary note-only and browser consumer files. |
| `python3 /tmp/pianorealm-phase3.a93ck6/firefox-smoke.py packages/keyboard/dist/pianorealm-keyboard.esm.js` from the repository root | Passed during Phase 3 implementation in headless Firefox 160.0.1 using a temporary local HTML fixture and Marionette. Verified a padded and bordered 100 × 100 content box, 34 px letterboxing in both orientations, black-key stacking, viewport clipping, fractional observer resize, zero-size and disconnected recovery, independent instances, cross-copy host ownership, and remount after repeated destruction. The README records a manual fit and lifecycle procedure. |
| `git diff --check`, `git status --short --untracked-files=all` from the repository root | Whitespace check passed. Status showed Phase 3 files, the root README update and the pre-existing untracked `packages/keyboard/.gitignore`. |

## Development demo

The separate `demo/` directory contains a Vite page with horizontal and vertical C3–C5 examples and a horizontal A0–C8 example. It imports `PianoKeyboard` from the public source entry point and uses fixed intrinsic sizing so the rendered SVG can be saved as-is. Each download uses the browser's `XMLSerializer` on the root SVG in the demo's own mount container. The production bundle and declarations still build from `src/`. [Run instructions](README.md#development-demo)

Checks ran from `packages/keyboard` with Node 24.22.1 and npm 11.19.1.

| Command | Observed result |
| --- | --- |
| `npm run typecheck && npm test && npm run build` | Passed. Type checking includes the demo, Vitest passed all 148 tests across five files, and Vite and TypeScript emitted the production ESM bundle, source map, and declarations. The source map and output inspection confirmed that demo files were excluded. |
| `npm run dev:demo -- --strictPort` | The sandbox denied the localhost bind. The browser smoke below started the same dev script with loopback access. |
| `python3 /tmp/pianorealm-demo.OsnVSS/smoke.py` | Passed. The temporary smoke script launched `npm run dev:demo -- --strictPort --port 44051` on loopback and opened `/demo/` in headless Firefox 160.0.1. All three keyboards rendered with the expected MIDI notes and viewBox. Browser clicks saved three standalone SVG files that matched their mounted roots byte for byte. At a 480 px viewport, the full keyboard scrolled within its card. |
| `git diff --check` from the repository root | Passed. |

Download prompts and rendering in other browsers, mobile devices, and embedded webviews remain untested.

## Phase 2 completion gate

- **Passed** — The geometry fixture suite verifies white slots, black seams, endpoint unions, full viewport depth, draw order, and vertical rotation. The all-ranges checks verify complete, unique notes with finite, nonnegative bounds at default sizing.
- **Passed** — The suite covers deterministic frozen results, fractional and extreme representable dimensions, invalid inputs, and half-open logical point lookup with black-key precedence. The plain Node invocation and root export check verified DOM independence and package privacy.
- **Passed** — All package checks passed on the handoff checkout, including the Phase 1 regression suite. Phase 2 was complete at handoff. [Phase 2 gate](DEVELOPMENT_PLAN.md#7-phase-2--deterministic-keyboard-geometry)

## Phase 2 verification

For the 2026-11-21 handoff, the package checks and Node smoke assertions were rerun from `packages/keyboard` with the IntelliJ IDEA Node 24.22.1 runtime and npm 11.19.1 on `PATH`.

| Command | Observed result |
| --- | --- |
| `npm run typecheck`, `npm test`, `npm run build` before edits | All passed. Vitest ran 65 tests across two Phase 1 files. |
| `npm run typecheck` | Passed. |
| `npm test` | All 124 tests passed across three files. `tests/unit/geometry.test.ts` covers all nine approved horizontal viewports and their vertical rotations, all 8,256 inclusive MIDI ranges in both orientations at default sizing, fractional and extreme dimensions, validation, freezing, and logical point lookup. |
| `npm run build` | Passed. Vite produced the ESM bundle and source map, and TypeScript emitted declarations. |
| `./node_modules/.bin/tsc -p tsconfig.build.json --emitDeclarationOnly false --declaration false --outDir "$geometry_smoke_dir"`, then `node --input-type=module - "$geometry_smoke_dir"` with inline assertions | Passed. In plain Node without `window` or `document`, verified the vertical 100 × 32 black-endpoint fixture and two point queries against the temporary JS emit. Verified the built ESM package exposes only the three Phase 1 functions and rejects a geometry deep import. Confirmed the point-query precision limit below. |
| `node --input-type=module -e 'import { normalizeNote } from "@pianorealm/keyboard"; console.log(normalizeNote("C4"))'` | Printed `60` using the built package. |
| `git diff --check`, `git status --short --untracked-files=all` from the repository root | Whitespace check passed. Status showed Phase 2 source and tests, handoff documentation, and the pre-existing keyboard `.gitignore`. |

## Phase 1 verification (historical)

Package commands ran from `packages/keyboard` with Node 24.22.1 and npm 11.19.1. The resolved tools were TypeScript 5.9.3, Vite 7.3.8, and Vitest 4.1.12.

| Command | Observed result |
| --- | --- |
| `npm ci --offline --cache /tmp/pianorealm-npm-cache` | Failed in the sandbox with `EPERM` when the esbuild postinstall tried to spawn its binary. |
| `npm ci --offline --ignore-scripts --cache /tmp/pianorealm-npm-cache` | Succeeded from the populated cache and installed 44 packages. The earlier registry-backed `npm ci --cache /tmp/pianorealm-npm-cache` also succeeded and reported an esbuild postinstall allow-list warning. |
| `npm run typecheck` | Passed. |
| `npm test` | Passed all 65 tests in two files, including the accepted Phase 1 note, range, and atomic patch fixtures. |
| `npm run build` | Passed. Emitted `dist/pianorealm-keyboard.esm.js`, its source map, and TypeScript declarations. |
| `node --input-type=module` with an inline smoke test | Imported the built package by name without `window` or `document`, confirmed the three runtime exports and verified that deep imports are blocked, and checked representative note operations. The README smoke command printed `60`. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022 --module NodeNext "$consumer"` | Passed for a temporary `.mts` file importing all public values and types from the built package and checking that private imports produce errors. |

From the repository root, `git diff --check` passed and `git status --short --untracked-files=all` showed only the Phase 1 changes and handoff documentation. `node_modules/`, `dist/`, coverage output, and IDE files are ignored.

## Known limitations and remaining work

- The sandbox can block the esbuild install script. The offline retry used the existing npm cache and the installed native binary worked for both Vitest and Vite. This checkout also needed the IDE-provided Node runtime added to `PATH`.
- Geometry throws `RangeError` when individually finite sizing values would make the selected range's intrinsic extent overflow. Fractional coordinates use floating-point precision. A rotated edge that rounds beyond the viewport moves inward by one floating-point step. Integer fixture coordinates are exact. With an extreme width ratio, a key's far edge can round to its start, leaving no hittable interval even though the key record retains a positive width. The Node probe reproduced this for C4–C♯4 with a black-key width of `Number.EPSILON`.
- Phase 3 browser evidence covers the headless Firefox fixture. Other browsers and webviews, screen-reader behavior, the Node 22 development baseline, and Anki clients remain untested. The temporary Firefox fixture is outside the repository. The README includes a repeatable manual fitting and lifecycle check.
- Phase 4 uses Minimal paint for both initial rendering and targeted updates. Skin switching and configurable appearance remain Phase 5 work. Configurable pressed indicators are scheduled for Phase 7, and the serializer remains private until the public static SVG work in Phase 9. The Phase 4 Firefox smoke script is temporary and lives outside the repository.
- Later milestones cover customization (Phase 5), advanced sizing and motion (Phase 6), overlays (Phase 7), events and public hit testing (Phase 8), and the public static SVG API, classic-script output, and Anki verification (Phase 9). CommonJS and optional public key bounds remain deferred.

## Next task

Begin Phase 5 by defining typed skin tokens and the accepted resolution order. Pass the same resolved appearance to scene construction and targeted key updates, which currently use Minimal tokens. Verify that switching between Minimal and Classic preserves the layout and both visible and off-range pressed notes. [Phase 5 plan](DEVELOPMENT_PLAN.md#10-phase-5--skins-and-configurable-appearance) · [Configuration ADR](docs/decisions/0001-notes-configuration-and-state.md)
