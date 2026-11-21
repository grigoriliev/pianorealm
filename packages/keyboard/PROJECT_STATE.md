# `@pianorealm/keyboard` — Project State

> **Status:** Implementation · **Last completed phase:** Phase 2 · **Phase 2:** Complete
> **Last verified:** 2026-11-21 · **Maintainer:** Project contributors

## Completion and implementation decisions

- Phase 0 is complete. The review records the approved baseline and expected results for the geometry tests. [Phase 0 review](docs/PHASE_0_REVIEW.md) · [Accepted ADRs](ARCHITECTURE.md#phase-0-review-references)
- Phase 1 meets the [completion gate](DEVELOPMENT_PLAN.md#6-phase-1--tooling-note-utilities-and-configuration). The keyboard package installs independently from a package-local lockfile and uses strict TypeScript, Vite, and Vitest. The private package has no runtime dependencies. Its root export map exposes ESM and declarations for `normalizeNote`, `formatNote`, `classifyNote`, and their public types. [Repository topology ADR](../../docs/decisions/0001-repository-topology.md) · [Distribution ADR](../../docs/decisions/0002-standalone-global-namespace.md)
- MIDI integers 0–127 are canonical. Note names use C4 = 60 by default and accept enharmonic spellings across octave boundaries. The implementation requires safe-integer octave offsets and uses exact integer arithmetic so extreme valid offsets still round-trip. Ranges are inclusive and accept a single note. [Note and configuration ADR](docs/decisions/0001-notes-configuration-and-state.md) · [Package README](README.md)
- Internal configuration returns a frozen snapshot after validation. A patch replaces the range as a pair, merges declared notation and sizing fields, and uses explicit `undefined` to reset values. Patched notation applies to new range names. Existing MIDI endpoints retain their identity. Dimensions live under sizing. Defaults are horizontal, MIDI 21–108, container sizing, and white/black pitch widths and depths of 20 × 100 and 12 × 60. [Note and configuration ADR](docs/decisions/0001-notes-configuration-and-state.md) · [Layout and sizing ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
- Phase 2 adds `src/geometry/layout.ts` and `src/geometry/hit-testing.ts`. Configuration and geometry share validation from `src/config/normalize.ts`, `src/notes/notation.ts` and `src/notes/ranges.ts`. The private layout takes a normalized MIDI range, an orientation and key dimensions in SVG user units. It counts white-key slots, centers black keys on their seams and keeps the full pitch-axis union of visible rectangles. The viewport always retains full white-key depth. The vertical layout applies the A-03 transform to the horizontal bounds. Its frozen keys are ordered whites before blacks, each in ascending MIDI order. [Layout and query ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
- The private point query uses half-open rectangles in intrinsic coordinates and returns the topmost MIDI note or `null`. Nonnumeric coordinates throw `TypeError` and non-finite coordinates throw `RangeError`. The root package exports remain the Phase 1 note utilities.

## Phase 2 completion gate

- **Passed** — The geometry fixture suite verifies white slots, black seams, endpoint unions, full viewport depth, draw order, and vertical rotation. The all-ranges checks verify complete, unique notes with finite, nonnegative bounds at default sizing.
- **Passed** — The suite covers deterministic frozen results, fractional and extreme representable dimensions, invalid inputs, and half-open logical point lookup with black-key precedence. The plain Node invocation and root export check verified DOM independence and package privacy.
- **Passed** — All package checks passed on the handoff checkout, including the Phase 1 regression suite. The matching development plan marks Phase 2 complete and Phase 3 pending. [Phase 2 gate](DEVELOPMENT_PLAN.md#7-phase-2--deterministic-keyboard-geometry)

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
- The declared Node 22 development baseline, browser and Anki compatibility, and classic-script loading remain unverified. Standalone packaging, CommonJS, and optional public key bounds remain deferred.
- Scene/SVG output and mounted lifecycle are Phase 3 work. The mounted adapter owns host fitting and measurement, including centered uniform contain scaling. Browser rendering and host-fit behavior remain unverified. Public hit testing and client-coordinate conversion remain Phase 8 work.

## Next task

Begin [Phase 3](DEVELOPMENT_PLAN.md#8-phase-3--shared-scene-model-and-minimal-mounted-svg) with a DOM-independent scene builder that consumes the frozen layout and uses its existing bounds and draw order. Verify both orientations at the scene boundary before mounting minimal SVG. [Shared scene ADR](docs/decisions/0003-scene-safe-svg-and-identifiers.md)
