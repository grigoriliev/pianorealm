# `@pianorealm/keyboard` — Project State

> **Status:** Phase 10 complete, release approval pending · **Last completed phase:** Phase 10
> **Last verified:** 2026-11-22 · **Maintainer:** Project contributors

## Completion and implementation decisions

- Phase 0 is complete. The review records the approved baseline and expected results for the geometry tests. [Phase 0 review](docs/PHASE_0_REVIEW.md) · [Accepted ADRs](ARCHITECTURE.md#phase-0-review-references)
- Phase 1 meets the [completion gate](DEVELOPMENT_PLAN.md#6-phase-1--tooling-note-utilities-and-configuration). The keyboard package installs independently from a package-local lockfile and uses strict TypeScript, Vite, and Vitest. The private package has no runtime dependencies. Phase 1 established the ESM entry point and declarations for `normalizeNote`, `formatNote`, `classifyNote`, and their public types. [Repository topology ADR](../../docs/decisions/0001-repository-topology.md) · [Distribution ADR](../../docs/decisions/0002-standalone-global-namespace.md)
- MIDI integers 0–127 are canonical. Note names use C4 = 60 by default and accept enharmonic spellings across octave boundaries. The implementation requires safe-integer octave offsets and uses exact integer arithmetic so extreme valid offsets still round-trip. Ranges are inclusive and accept a single note. [Note and configuration ADR](docs/decisions/0001-notes-configuration-and-state.md) · [Package README](README.md)
- Internal configuration returns a frozen snapshot after validation. A patch replaces the range as a pair, merges declared notation and sizing fields, and uses explicit `undefined` to reset values. Patched notation applies to new range names. Existing MIDI endpoints retain their identity. Dimensions live under sizing. Defaults are horizontal, MIDI 21–108, container sizing, and white/black pitch widths and depths of 20 × 100 and 12 × 60. [Note and configuration ADR](docs/decisions/0001-notes-configuration-and-state.md) · [Layout and sizing ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
- Phase 2 adds `src/geometry/layout.ts` and `src/geometry/hit-testing.ts`. Configuration and geometry share validation from `src/config/normalize.ts`, `src/notes/notation.ts` and `src/notes/ranges.ts`. The private layout takes a normalized MIDI range, an orientation and key dimensions in SVG user units. It counts white-key slots, centers black keys on their seams and keeps the full pitch-axis union of visible rectangles. The viewport always retains full white-key depth. The vertical layout applies the A-03 transform to the horizontal bounds. Its frozen keys are ordered whites before blacks, each in ascending MIDI order. [Layout and query ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
- The private point query uses half-open rectangles in intrinsic coordinates and returns the topmost MIDI note or `null`. Nonnumeric coordinates throw `TypeError` and non-finite coordinates throw `RangeError`. Phase 2 left the package root exports unchanged.

## Playground pressed-color preview

- **Override pressed color** enables a live picker for the pressed fill in all playground previews. The mounted and static snippets and SVG downloads carry the override. Clearing the checkbox restores the selected skin's default.
- `npm run typecheck` and `npm run build` passed. The Firefox 160.0.1 playground check in `tests/artifacts/firefox-release.py` passed when run directly with local loopback. It exercised live color updates, restoration of the skin default, and the generated static options. `npm test` passed 273 of 274 tests. The committed Realistic pressed palette (`#5582ad`) yields 4.05:1 against white, below the existing 4.5:1 test threshold. The earlier Realistic evidence below applies to its original palette.
- The next bounded verification task is to review the committed Realistic palette against the contrast target, then rerun the full test suite and visual regression.

## Realistic skin handoff

- Select `skin: 'realistic'` with the mounted or static API, or call `setSkin('realistic')` on an existing instance. The playground keeps the same range, dimensions and annotations when comparing skins. [Usage and overrides](README.md#skins-and-appearance)
- `src/skins/appearance.ts` defines immutable materials. The shared scene and SVG adapters add two scoped pitch-axis gradients and one optional edge rectangle per visible key. Depth gradients create a soft rear falloff and front bevels. The existing optional black-key filter supplies the contact shadow. Paint overrides retain precedence and the default pressed color keeps edge shading. The existing geometry, hit test, layer order and animation settings govern the new skin. The public change is the additional `BuiltInSkin` value.
- Inspected both Firefox captures. The compact comparison shows warm white keytops and charcoal keys with narrow reflections and defined front faces. At the narrow full-range size, separators and selection cues remain visible while bevels recede. The annotated partial-range captures show pressed and indicator-only treatments in both orientations. [Desktop capture](tests/artifacts/visual-baselines/firefox-realistic-956.png) · [Narrow capture](tests/artifacts/visual-baselines/firefox-realistic-500.png)

Commands ran from `packages/keyboard` on Debian 13.8 x86-64 with Node 24.22.1 and npm 11.19.1.

| Command | Observed result |
| --- | --- |
| `npm run typecheck && npm test && npm run build && npm run test:artifacts` before edits | Type checking, 270 tests and all builds passed. The artifact suite passed 14 of 15 checks. The nested npm pack produced empty stdout inside the sandbox, causing a JSON parse error in the packed-consumer check. |
| `npm run typecheck && npm test && npm run build` | Passed. 274 tests across eight files and all ESM and standalone bundles and declarations. Tests cover geometry and hit-test invariance, skin switches with off-range notes and annotations, atomic override rejection, local press updates and live/static parity. |
| `npm run test:artifacts` | All 15 checks passed with local process permissions, including the packed consumer. Realistic SVG checks cover C3–C5, A0–C8, a black-endpoint range and a single black key in both orientations, with local ID references and deterministic static output. |
| `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 -B tests/artifacts/firefox-release.py --output /tmp/pianorealm-realistic-visual` | Passed in Firefox 160.0.1 after adding and reviewing two Realistic baselines using the same command with `--update-baselines`. The original two baselines matched byte for byte. The 500 px playground run verified Realistic selection, annotations and SVG export. |
| `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 -B tests/artifacts/firefox-offline.py` | Both standalone bundles passed. This includes rasterizing a single vertical Realistic black key at 25 × 12 px with the shadow disabled. |
| `python3 -B -m unittest discover -s tests/anki` | Four runner tests passed. |
| `python3 -B tests/anki/run.py --anki /tmp/pianorealm-anki26/anki-26.9.3-linux-x86_64.tar/anki --report /tmp/pianorealm-realistic-anki.jsonl` | Passed on Anki Desktop 26.09.3, QtWebEngine 6.11.2 / Chromium 140. Verified two live orientations and isolated IDs in the reviewer, plus rasterized Realistic SVG with and without the filter in the offline profile. |
| `git diff --check` and `git status --short --untracked-files=all` from the repository root | Whitespace check passed. The pre-existing untracked package `.gitignore` was preserved. The two new PNGs are test baselines. |

The finish is vector-based and its scale detail depends on available pixels. The added geometry is presentation-only. The default A0–C8 export measured about 43 KB of raw SVG versus 28 KB for Classic, and Realistic adds up to 88 edge rectangles for that range. Render-time performance was not benchmarked. Representative default paint samples in Anki give contrast ratios of 17.78:1 for dark label paint over a white key, 13.35:1 for white label paint over a black key and 8.38:1 for white against the pressed blue. These ratios describe sampled paint pairs. Tiny labels, arbitrary overrides, assistive technologies, other browser engines and other Anki platforms remain unverified.

## Phase 10 handoff

- `src/skins/appearance.ts` adds Modern, Neon, Dark and High Contrast through the existing token pipeline, expanding `BuiltInSkin`. Modern has a 150 ms default transition. Neon uses a vivid fill in the default palette.
- `src/config/accessibility.ts`, the shared scene and both SVG adapters add the optional `AccessibilityOptions` record for labels, scoped literal descriptions and decorative mode. Defaults preserve the existing image name and display semantics. Existing state, geometry, event and lifecycle contracts still apply.
- `demo/` extends the existing demo with layout, sizing, selection, appearance, and motion controls. The preview produces mounted and static JavaScript snippets and exports the final scene through the public static API.
- The manifest limits the archive to production artifacts, the license, user-facing guides and changelog. The packed consumer compiles the README TypeScript example and renders in Node with browser globals blocked. The package remains private at `0.0.0`.
- The release audit checks every criterion in the specification and development plan, with default-palette contrast measurements, reproducible visual checks and a proposed version. [Release audit](docs/RELEASE_READINESS.md)

### Verification

Commands ran from `packages/keyboard` on Debian 13.8 x86-64 with Node 24.22.1, npm 11.19.1, TypeScript 5.9.3, Vite 7.3.8, Vitest 4.1.12 and Python 3.13.5.

| Command | Observed result |
| --- | --- |
| `npm run typecheck && npm test && npm run build && npm run test:artifacts` before Phase 10 edits | Passed. 263 tests in eight files, all three bundles and declarations, and 15 built-artifact checks. |
| `npm run typecheck && npm test && npm run build` | Passed. 270 tests in eight files. ESM, both classic scripts, sourcemaps and declarations emitted. |
| `npm run test:artifacts` | Passed all 15 checks. Installed a locally packed tarball offline, compiled the TypeScript consumer and README example, and verified DOM-free static output and classic-script load policies. |
| `npm pack --dry-run --json --offline --ignore-scripts --cache /tmp/pianorealm-phase10-pack/cache` | Inspected the package allowlist. The final artifact suite also checks the actual packed file list. |
| `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 -B tests/artifacts/firefox-release.py --output /tmp/pianorealm-phase10-visual` | Passed on Firefox 160.0.1. Both screenshots matched their reviewed baselines. Firefox verified computed roles and names, SVG descriptions, transformed hit tests and the playground controls, validation, generated static example and SVG download payloads. |
| `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 -B tests/artifacts/firefox-offline.py` | Both classic bundles passed in Firefox 160.0.1. Verified offline local media, reduced motion, fallback resizing, multiple instances, repeated mounting and static SVG rasterization. |
| `python3 -B -m unittest discover -s tests/anki` | Passed four runner tests. |
| `python3 tests/anki/run.py --anki /tmp/pianorealm-anki26/anki-26.9.3-linux-x86_64.tar/anki --report /tmp/pianorealm-phase10-anki.jsonl` | Passed on Anki Desktop 26.09.3, QtWebEngine 6.11.2 / Chromium 140. The clean-profile run checked card setup, review, remount, night mode, narrow sizing, scriptless rendering and diagnostics. |
| `cmp LICENSE ../../LICENSE` and `git diff --check` | Passed. The package license matches the root license. The pre-existing untracked package `.gitignore` was preserved. |

The sandbox restricted nested npm processes, Firefox loopback, and Anki's network namespace. The passing runs used the required local permissions. Screen readers, OS forced colors, browser engines outside the Firefox and Anki fixtures, Node 22 tooling, other Anki clients, and media sync remain unverified.

## Phase 9 handoff

- The public `PianoKeyboard.renderToSVG(options?: StaticKeyboardOptions)` in `src/public/PianoKeyboard.ts` shares configuration, pressed-note normalization, intrinsic layout, fixed viewport resolution, and the scene with mounted SVG. It uses built-in skins and inline appearance tokens, then serializes the final scene without browser APIs. The package root exports the options type. The serializer's explicit-prefix validation and per-copy default allocator continue to isolate definition IDs. [Static API and embedding](README.md#generate-static-svg)
- `vite.config.ts` builds `pianorealm-keyboard.esm.js` and separate `pianorealm-keyboard.umd.js` and `pianorealm-keyboard.umd.min.js` IIFEs. The classic-only installer in `src/standalone.ts` uses the manifest version and a stable own marker. It preserves namespace siblings and rejects conflicting bindings. The accepted ADR supersedes earlier Phase 0 wording that described the global and filenames as open. [Standalone policy](../../docs/decisions/0002-standalone-global-namespace.md)
- `tests/integration/mount.test.ts` compares the public SVG output to the mounted final state in both orientations after normalizing definition prefixes and excluding the namespace declaration and motion-scope attribute. `tests/artifacts/` checks the built distribution, parsed XML, accessible names and overlays, the isolated declaration consumer, global collisions, and Firefox lifecycle and offline rendering.
- The Anki developer guide covers note type and media setup, horizontal and vertical templates, a local card helper that disposes template-owned instances, theme selection, static SVG media, customization, and troubleshooting. The guide's Firefox fixture uses substituted note text and ordinary local browser script loading. [Anki guide and compatibility matrix](docs/guides/anki-integration.md)

### Verification

Run from `packages/keyboard` with Node 24.22.1, npm 11.19.1, TypeScript 5.9.3, Vitest 4.1.12, and Vite 7.3.8. The Firefox check uses Python 3.13.5.

| Command | Observed result |
| --- | --- |
| `npm run typecheck && npm test && npm run build` before edits | Passed. 263 tests across eight files verified the Phase 8 baseline, including events, hit testing, and extension cleanup. The ESM and declaration build passed. |
| `npm run typecheck && npm test && npm run build && npm run test:artifacts` | Exit 0. Typecheck passed, all 263 tests across eight files passed, and the build emitted all three named artifacts, sourcemaps and ESM declarations. All 15 artifact checks passed, including an isolated external ES2022-only declaration consumer and Node import/render with browser-global accessors that throw. |
| `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 tests/artifacts/firefox-offline.py` | Both classic artifacts passed in headless Firefox 160.0.1. Marionette used local loopback automation. Firefox loaded only fixture-local media with its network service offline and CSP blocking remote resources. Verified chord and theme updates, duplicate load, same-realm remount, separate instances, observer cleanup, hidden-host resize fallback, reduced motion, and rasterized static SVG. The default sandbox blocked the loopback socket. |
| `git diff --check` and `git status --short --untracked-files=all` from the repository root | Whitespace check passed. The pre-existing untracked `packages/keyboard/.gitignore` was preserved. Build artifacts are ignored. |

### Anki Desktop checklist

On 2026-11-22, the official Anki Desktop 26.09.3 client passed the checklist on Debian 13.8 x86-64. Its WebView reported QtWebEngine 6.11.2 and Chromium 140. A temporary profile add-on drove Anki's Cards preview and normal reviewer and inspected the live WebView. `unshare --map-root-user --net /tmp/pianorealm-anki26/run.sh` exited 0 and the local assertion log at `/tmp/pianorealm-anki26/report.jsonl` ended in `PASS`. The client ran offscreen with only the loopback interface and no external routes, so the client could serve local media during offline review. [Anki release](https://github.com/ankitects/anki/releases/tag/26.09.3)

| Check | Observed result |
| --- | --- |
| Media and preview | With the media in place, Anki's media checker reported 0 missing and 0 unused files. Preview showed one horizontal keyboard on the front and one vertical and one horizontal keyboard on the back, each marking MIDI 60, 64, and 67. |
| Review and lifecycle | The reviewer flipped and advanced from C4/E4/G4 to D4/F4/A4 in the same WebView realm. Leaving review, undoing the rating, and re-entering returned to the first chord. There was one SVG per host, and all Classic definition IDs were unique within the rendered card. |
| Theme and sizing | Light mode used Classic gradients. Night mode selected Minimal with the guide's pressed color and visible shape markers. The horizontal viewport resized from 300 × 100 to 210 × 100 on both sides. The vertical viewport stayed at its configured 92 × 276. |
| Static and diagnostics | The scriptless templates displayed the 240 × 80 media image with the expected pressed-key pixel and an inline SVG with three visible markers. Withholding the bundle and entering an invalid note separately produced the expected messages. Restoring the bundle restored preview rendering. |

The clean-profile developer walkthrough also passed on the same Desktop client. `npm ci && npm run build` succeeded in a disposable checkout with Node 24.22.1 and npm 11.19.1. After copying the generated media, `TMPDIR=/tmp/pianorealm-anki26/guide-check-tmp unshare --map-root-user --net /tmp/pianorealm-anki26/run-guide-check.sh` exited 0. Automation used the real Manage Note Types, Fields, Cards, and Add windows in an initially empty collection. Each sample note generated one card with the Back field empty. Review, the scriptless image question and text answer, inline SVG, and the customization example with note labels and three square markers all passed. With the template-only bundle deliberately removed, Check Media still reported no missing files and the preview showed the helper's missing-bundle message. The temporary run log at `/tmp/pianorealm-anki26/guide-check-report.jsonl` ended in `PASS`.

Media sync and other Anki clients, versions, and platforms remain unverified. Assistive technologies and the Node 22 development baseline remain untested in this phase. On 2026-11-22 the project owner accepted the verified Anki Desktop Linux coverage as sufficient for Phase 9. Windows and macOS Desktop, AnkiDroid, AnkiMobile, AnkiWeb, and media sync remain untested. [Compatibility matrix](docs/guides/anki-integration.md#compatibility-matrix)

The clean-profile walkthrough is reproducible from `tests/anki/`. From `packages/keyboard`, `npm run build && python3 tests/anki/run.py --anki /tmp/pianorealm-anki26/anki-26.9.3-linux-x86_64.tar/anki --report /tmp/pianorealm-repo-anki-results.jsonl` exited 0. The repository runner created its own temporary profile, used the guide's examples, and reported `PASS` on the same Anki Desktop and WebView versions. [Runner prerequisites and commands](docs/guides/anki-integration.md#run-the-clean-profile-desktop-test)

The runner cleanup review added timeouts to profile and SVG setup, process-group cleanup on exit and interruption, normal Anki profile shutdown on success, and separate reporting of launch errors and invalid or unwritable JSONL. The documented `npm ci`, `npm run build`, and `python3 tests/anki/run.py --anki <extracted anki> --report <results.jsonl>` sequence passed in two fresh local clones, first at `722bd4a` and again with the review fixes applied. Both used Anki Desktop 26.09.3 and QtWebEngine 6.11.2 on Debian 13.8. `python3 -B -m unittest discover -s tests/anki` passed four tests. A disposable launch fixture exited with status 23 and supplied malformed JSONL while the requested report path was a directory. The runner returned status 1, printed all three diagnostics, and removed its temporary profile.

## Phase 8 handoff

The [Phase 8 gate](prompts/01-implementation/phase-08-events-hit-testing-extensions.md#11-completion-gate) was reverified for handoff on 2026-11-22 at HEAD `012cf39` with the Phase 8 working-tree changes. Phase 7 is tracked in `00d4db0`. Resume with the full working tree, including the untracked `src/public/events.ts`. The pre-existing untracked package `.gitignore` is separate from Phase 8.

- **Events and extensions.** `src/public/PianoKeyboard.ts`, new `src/public/events.ts`, and `src/index.ts` expose `on()`, `use()`, and the event and extension types. Subscriptions observe frozen or primitive post-commit values, with deterministic transaction order and reentrancy guards. The callback error channel isolates listener, reporter, and cleanup failures. Extensions own setup rollback and use existing skin and overlay APIs. Teardown stops observation, runs active cleanups in reverse order, releases the mount, and delivers the teardown-start listener snapshot. [A-10](docs/decisions/0004-lifecycle-events-and-embedded-hosts.md)
- **Hit testing and viewport tracking.** `src/svg/mount.ts` inverts the mounted SVG screen transform from viewport CSS pixels and reports effective viewport changes through the controller. `src/geometry/hit-testing.ts` reuses coordinate validation and half-open key bounds with black-key precedence. Geometry fixtures retain their established values. [A-09](docs/decisions/0002-layout-sizing-and-hit-testing.md)
- **Tests and docs.** `tests/integration/mount.test.ts` covers payloads and order, no-ops, rejection, subscriptions, reentrancy, error reporting, isolation, observer resizes, both orientations, edge cases and extension teardown. The README documents the contracts and conceptual application composition. The package specification and architecture and the ecosystem documents now point to the accepted hit-test contract. The development plan records the gate. Public key bounds and custom overlay type registration remain deferred.

### Completion criteria

| Criterion | Handoff evidence |
| --- | --- |
| Typed public events | Package-root declarations export `KeyboardEventMap`. Tests verify immutable payloads, commit and delivery order, no-op and invalid updates, subscription changes, reentrant mutation rejection, error isolation and exactly-once destruction. |
| Geometry-backed public hit testing | Integration and geometry tests cover black precedence, half-open bounds, gaps, out-of-bounds points, both orientations, partial and single-key ranges, and fixed and container sizing. The Firefox fixture verifies the inverse screen mapping on actual SVG layout. |
| Extension lifecycle | Integration tests exercise setup through the public API, explicit disposal, extension-owned rollback, independent installs, subscription cleanup, reverse teardown and cleanup errors. The package-root consumer compiles with `KeyboardExtension`. |
| Regressions and package boundary | The full suite passed, including the Phase 2 geometry fixtures and Phase 7 scene and overlay regressions. The source and manifest review confirmed the keyboard remains visualization-only and retains zero runtime dependencies. |
| Documentation and build evidence | The README, specification, architecture and development plan agree with the implemented public contract. The rerun results below cover the package checks, emitted declarations and browser smoke. |

### Verification

Package commands ran from `packages/keyboard` with IntelliJ IDEA's Node 24.22.1 and npm 11.19.1 on `PATH`. Firefox and Git commands ran from the repository root.

| Command | Observed result |
| --- | --- |
| `npm run typecheck && npm test && npm run build` before edits | Passed. Vitest ran 249 tests across eight files. |
| `npm run typecheck && npm test && npm run build` rerun for this handoff | Exit 0. TypeScript 5.9.3 reported no diagnostics. Vitest 4.1.12 passed 263 tests across eight files. Vite 7.3.8 built the ESM bundle and sourcemap, and TypeScript emitted declarations. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022,DOM --module NodeNext /tmp/pianorealm-phase8/consumer/browser.mts` | Passed against package-root declarations. The consumer checked event inference, readonly payloads, extension setup and invalid listener arguments. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022 --module NodeNext /tmp/pianorealm-phase8/consumer/node.mts` and `node /tmp/pianorealm-phase8/consumer/runtime.mjs` | Passed. Node imported the built package without DOM globals and verified its four named runtime exports and the three new instance methods. |
| `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 /tmp/pianorealm-phase8/firefox-smoke.py packages/keyboard/dist/pianorealm-keyboard.esm.js 1` and the same command with argument `2` | Passed in headless Firefox 160.0.1 at device pixel ratios 1 and 2. Verified black precedence, exact half-open edges, letterboxing, padding, page and ancestor scroll, CSS translation/rotation/scaling, both orientations, observer resize, hidden recovery, singular transforms and fixed CSS sizing. Exercised the built ESM bundle. |
| `git diff --check` and `git status --short --untracked-files=all` | Whitespace check passed. Status showed only Phase 8 source, tests and documentation, plus the pre-existing package `.gitignore`. |

The browser and consumer checks were rerun against the handoff build. Their fixtures live under `/tmp/pianorealm-phase8` and are local to this environment. The Firefox driver requires local loopback access. Other browser engines, physical devices, and Anki clients remain unverified. `resized` reports keyboard-managed viewport dimensions before host CSS overrides. Hit testing uses the actual screen transform when queried, and unrelated host clipping and occlusion are outside the query contract.

## Phase 7 handoff

The [Phase 7 gate](prompts/01-implementation/phase-07-labels-indicators-overlays.md#7-phase-7-completion-gate) was reverified on 2026-11-22 at HEAD `6ce8d9a` with the Phase 7 working-tree changes. Phase 7 is now tracked in `00d4db0` and Phase 6 is tracked in `8418d1f`. The pre-existing untracked package `.gitignore` is unrelated.

- **Configuration and API.** New `src/config/decorations.ts` defines label, indicator, and overlay options. `normalize.ts`, `PianoKeyboard.ts`, and `index.ts` wire the settings into construction, `setOptions`, and `setKeyOverlays`. Per-note maps replace atomically, reject duplicate normalized MIDI notes, and retain valid off-range entries. The default remains pressed fill plus a white circle, with labels, highlights and overlays opt-in. [API and defaults](README.md#labels-highlights-and-overlays)
- **Scene and SVG.** New `src/scene/key-decorations.ts` resolves positions and the visible geometric face of each decorated key. `build-scene.ts`, `svg/attributes.ts`, `definitions.ts`, and new `svg/node.ts` supply shared descriptions to `dom-renderer.ts` and `serialize.ts`. The drawing orders white and black key bodies, highlight strips, upright labels, indicators, then overlays. The white clip subtracts black footprints. The DOM adapter preserves key bodies and equivalent per-note decoration groups during presentation changes. `mount.ts`, `motion.ts`, and `identifiers.ts` handle targeted pressed updates, fades and isolated clip IDs. [Layer order](ARCHITECTURE.md#73-stacking-and-overlays)
- **Validation and accessibility.** `skins/appearance.ts` exposes its existing paint and numeric validators internally and new `src/internal/xml-text.ts` shares XML character checks. Literal text is emitted as DOM text nodes or escaped SVG. The SVG remains a single named image and hides decorative subtrees from assistive technology. The README documents the geometry-based text floor, opt-in color-only mode and host text for meaningful annotations.
- **Tests and docs.** New `tests/unit/decorations.test.ts` and updated `tests/unit/config.test.ts` and `tests/integration/mount.test.ts` check notation, clips, tiny sizes, pressed modes, replacement, identity, atomic failures, ID isolation, XML text and parsed SVG parity. `README.md`, `ARCHITECTURE.md` and `DEVELOPMENT_PLAN.md` record the contract and phase completion. The existing demo passed regression checks.
- **Demo follow-up.** `demo/index.html`, `main.ts`, and `demo.css` add controls for label mode, C emphasis, pressed mode, indicator shape, and example annotations. The example uses the public API on all three mounts and shows a custom label, an independent highlight and all four overlay primitives. The README documents how to try them. [Development demo](README.md#development-demo)

### Completion criteria

| Criterion | Verified evidence |
| --- | --- |
| Labels and independent highlights | Unit tests check all label modes, C4/MIDI 60, notation, custom label precedence, C emphasis and explicit highlights. Off-range assignments reappear at their original MIDI identity. |
| Pressed modes and overlay replacement | Integration tests switch all three pressed modes on white and black keys while retaining the selection. They verify the four overlay primitives, per-note array order, whole-map replacement and clearing. |
| Layering, geometry and targeted updates | Unit tests cover fractional and tiny keys and black endpoints in both orientations. Integration tests verify that range-preserving updates reuse key bodies and equivalent decoration groups. Firefox checks pixels on either side of a white-key clip, marker contrast and upright label bounds. |
| Atomic validation and serialization | Unit tests reject invalid notes, dimensions, paints, event attributes and XML characters. Integration tests observe no DOM writes on rejected patches and compare parsed live and static output, including literal text and clip references. Pure generation runs without browser globals. |
| Accessibility, motion and lifecycle | Integration tests verify image naming, hidden decorative subtrees, cross-mount ID isolation, host ID collision avoidance and teardown. Firefox checks custom indicator opacity and live reduced-motion changes. |
| Package and documentation | The package checks below passed. The README and architecture describe the implemented options, replacement semantics, limits and layer order. The development plan records Phase 7 as complete. |

### Verification

Package commands ran from `packages/keyboard` with IntelliJ IDEA's Node 24.22.1 and npm 11.19.1 on `PATH`. The two standalone Firefox commands and Git checks ran from the repository root.

| Command | Observed result |
| --- | --- |
| `npm run typecheck && npm test && npm run build` before edits | Passed with 203 tests in 7 files. |
| `npm run typecheck && npm test && npm run build` rerun for this handoff | Exit 0. Typecheck emitted no diagnostics. Vitest 4.1.12 passed 249 tests across 8 files, including the existing geometry fixtures. Vite 7.3.8 built the ESM bundle and source map. TypeScript 5.9.3 emitted declarations. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022 --module NodeNext /tmp/pianorealm-phase7/consumer/node.mts` and `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022,DOM --module NodeNext /tmp/pianorealm-phase7/consumer/browser.mts` | Both reruns passed against the built package declarations. |
| `node --input-type=module` with inline assertions during Phase 7 implementation | Passed. Verified the four named runtime exports, default C4 normalization, `setKeyOverlays`, and the private serializer boundary. |
| `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 /tmp/pianorealm-phase7/firefox-smoke.py packages/keyboard/dist/pianorealm-keyboard.esm.js` | Rerun passed in headless Firefox 160.0.1. Checked rendered overlay clipping and marker contrast pixels in both orientations, upright label bounds, fractional narrow-host fitting, custom square opacity, live reduced motion, clip isolation and teardown. The standalone raster check used the mounted SVG snapshot. Pure serializer parity was checked in the automated tests. |
| `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 /tmp/pianorealm-phase6/firefox-smoke.py packages/keyboard/dist/pianorealm-keyboard.esm.js` | Passed during Phase 7 implementation in Firefox 160.0.1 for Phase 6 responsive sizing, default motion, isolation and teardown. |
| `python3 /tmp/pianorealm-phase6/demo/demo-smoke.py` | Passed during Phase 7 implementation in Firefox 160.0.1. Vite served the existing demo. The fixture checked all three mounts, controls, Classic rasterization, SVG downloads and narrow-host scrolling. |
| `npm run typecheck && npm test && npm run build` after the demo update | Exit 0. All 249 tests passed across eight files. Typecheck and the ESM and declaration build passed. |
| `python3 /tmp/pianorealm-phase7/demo/demo-smoke.py` | Passed in Firefox 160.0.1. Checked the annotation controls, retention through chord release and skin changes, and byte-identical annotated SVG downloads from all three mounts. The existing Classic raster and narrow-scroll checks also passed. |
| `git diff --check` and `git status --short --untracked-files=all` | Whitespace check passed. Changes are confined to the keyboard package. The pre-existing untracked package `.gitignore` was preserved. |

Browser and consumer fixtures are temporary files outside the repository. Browser checks used local loopback access. Text uses an intrinsic-size estimate and can still become small under container scaling. Assistive technologies, other browser engines, physical mobile devices and Anki clients remain untested for Phase 7. The initial overlay set covers circle, text, number and badge. Typed path commands remain outside this phase's initial primitives.

## Phase 6 handoff

The [Phase 6 completion gate](prompts/01-implementation/phase-06-responsive-sizing-animation.md#9-completion-gate) passed on HEAD `e0bb20a` with the local Phase 6 working-tree changes. Keep the working tree when resuming, including the new `src/config/animation.ts` and `src/svg/motion.ts` files. The pre-existing untracked package `.gitignore` is separate from Phase 6. This section records the Phase 6 checkpoint.

- `src/svg/mount.ts` batches ResizeObserver work to a single measurement per frame, drops floating-point noise, and cancels pending work during explicit resize, mode switches, and teardown. A hidden or zero-size host can recover with the same drawing. Without observation the constructor and explicit `resize()` measure the host. Fixed sizing uses explicit axes or the oriented intrinsic extent. Both modes retain the accepted centered contain and clipping rules. [A-04](docs/decisions/0002-layout-sizing-and-hit-testing.md) · [A-12](docs/decisions/0004-lifecycle-events-and-embedded-hosts.md)
- `src/public/PianoKeyboard.ts` and `src/svg/dom-renderer.ts` reuse key nodes for viewport, orientation and key-dimension updates with the same range. A range change replaces the ordered key layers and their MIDI lookup. Pressed notes, including off-range notes, skin and overrides survive resizing and orientation changes. Geometry and the private serializer retain their existing coordinate and final-state attribute contracts.
- `src/config/animation.ts`, `src/config/normalize.ts` and `src/index.ts` add the validated `animation` option and its public types. Minimal and custom skins default to 120 ms ease-out, and Classic defaults to 160 ms ease-in-out. Fields merge and reset under A-06. `src/svg/motion.ts` scopes mounted solid-fill and dot transitions to one instance, honors explicit off and zero duration, and uses CSS to respond to live motion-preference changes. Gradient-to-solid changes apply immediately. Static SVG carries the final fill and dot state with no stylesheet. [Motion API](README.md#pressed-key-motion)
- The unit and integration tests cover invalid patches, node reuse, observer coalescing and cancellation, fractional and tiny sizes, multiple mounted instances, and static parity after live updates. The demo adds **Animate highlights** while keeping its standalone SVG downloads.

### Completion criteria

| Criterion | Evidence |
| --- | --- |
| Sizing and geometry | Phase 2 geometry fixtures pass. Mount tests cover explicit and intrinsic fixed axes, custom key dimensions, partial ranges with black-key endpoints, both orientations, and independent container measurements. Firefox checked centered contain fit in both orientations and fixed/container mode changes. |
| Resize recovery and cost | Mount tests verify latest-size frame coalescing, equivalent-size no-ops, cancellation on explicit resize or mode switch, and safe stale callbacks. Firefox exercised tiny, fractional, hidden, and disconnected hosts and the explicit fallback without observation. |
| State, isolation, and teardown | Mount tests verify retained skin and appearance overrides, retained off-range notes, key identity, mount rollback, and removal of instance resources. The Firefox fixture checked a second instance during resize and teardown. |
| Motion and accessibility | Tests verify skin defaults, override merging and resets, and atomic rejection of unsafe or out-of-range options. Firefox verified interpolated solid fills, dot opacity, explicit motion-off, and live reduced-motion changes. The current fixed dot remains the pressed-state shape cue. |
| Shared scene and static output | Parsed SVG matches mounted final-state attributes, including after an orientation update. Firefox verified transition-free SVG serialization, byte-identical downloads for all three demo mounts, and standalone rasterization of the Classic horizontal example. |
| Package and handoff | The checks below passed. The development plan records Phase 6 as complete and identifies Phase 7 as the next milestone. |

### Verification

Commands ran from `packages/keyboard` with IntelliJ IDEA's Node 24.22.1 and npm 11.19.1 on `PATH`, except the Git checks ran from the repository root.

| Command | Observed result |
| --- | --- |
| `npm test && npm run typecheck && npm run build` before edits | Passed. Vitest 4.1.12 ran 188 tests across seven files. TypeScript and Vite built the ESM and declarations. |
| `npm test && npm run typecheck && npm run build` rerun for this handoff | Exit 0. Vitest 4.1.12 passed all 203 tests across seven files, including the Phase 2 geometry fixtures. TypeScript emitted no diagnostics. Vite 7.3.8 built `dist/pianorealm-keyboard.esm.js` and its source map, and TypeScript emitted declarations. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022 --module NodeNext /tmp/pianorealm-phase6/consumer/node.mts` and `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022,DOM --module NodeNext /tmp/pianorealm-phase6/consumer/browser.mts` | Passed against built declarations for Node without DOM types and for a browser consumer of the animation options. |
| `node --input-type=module` with inline assertions against the built package | Passed. Verified the four named runtime exports, C4 normalization, public instance methods, and private serializer boundary. |
| `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 /tmp/pianorealm-phase6/firefox-smoke.py dist/pianorealm-keyboard.esm.js` | Passed in headless Firefox 160.0.1. Verified a narrow padded host, fixed/container changes, centered black-endpoint fits in both orientations, fractional and subpixel observer sizing, hidden and detached recovery, explicit fallback, interpolated solid fill and dot opacity, live reduced-motion changes, CSS isolation and teardown. |
| `python3 /tmp/pianorealm-phase6/demo/demo-smoke.py` | Passed in headless Firefox 160.0.1. Verified all three Vite demo samples, the animation checkbox, skin and appearance controls, narrow fixed-mode scrolling, and all three standalone SVG downloads. |
| `git diff --check` and `git status --short --untracked-files=all` | Whitespace check passed. Changes are confined to the keyboard package. The pre-existing untracked package `.gitignore` was preserved. |

Both Firefox checks were rerun for this handoff using temporary fixtures and local loopback access. The built ESM and declaration checks above are from the Phase 6 implementation run. Other browsers, Anki clients, assistive technologies and physical mobile devices remain untested.

## Phase 5 handoff

The [Phase 5 prompt gate](prompts/01-implementation/phase-05-skins-appearance.md#7-phase-5-completion-gate) passed again at handoff on 2026-11-22. The verified snapshot is HEAD `9a836eb` plus the Phase 5 working-tree changes. Phase 4 is present in `81dc791`. All five pressed-note methods and targeted DOM updates passed the 157-test baseline before Phase 5 edits.

Keep the working tree when resuming. The new Phase 5 files are `src/skins/appearance.ts`, `src/svg/definitions.ts`, `src/svg/identifiers.ts` and `tests/unit/appearance.test.ts`. The pre-existing untracked package `.gitignore` is separate from Phase 5.

- `src/skins/appearance.ts` and `src/config/normalize.ts` validate and freeze paint, stroke, radius and shadow tokens. Resolution applies Minimal defaults, selected skin tokens and explicit overrides in that order. `undefined` resets optional configuration, including single appearance fields and the entire override record. Custom colors require contrast checks in the target host. [Configuration ADR](docs/decisions/0001-notes-configuration-and-state.md)
- `src/public/PianoKeyboard.ts` and `src/index.ts` add constructor skin and appearance options, `setSkin`, `setOptions`, `registerSkin` and their public types. Registered tokens are copied and scoped to one instance. Invalid patches preserve the prior appearance, SVG and pressed notes.
- `src/scene/build-scene.ts` and `src/svg/` share appearance, key-state fills, gradient and shadow definitions across mounted and serialized SVG. Appearance-only changes reuse layout, root, key bodies, dots and the current observer. State-only updates still address the affected visible keys. Live mounts reserve prefixes across module copies, check existing document IDs and release reservations on destroy. The private serializer accepts explicit validated prefixes for reproducible output, and generates separate default prefixes when definitions are present. [Shared scene ADR](docs/decisions/0003-scene-safe-svg-and-identifiers.md)
- `tests/unit/appearance.test.ts` and the updated configuration, scene and mount tests cover precedence, resets, validation, isolation, sizing transitions, retained state, targeted writes, cleanup and SVG parity for both orientations and black-key endpoints. The README and demo now cover the new public options.

### Completion criteria

| Criterion | Handoff evidence |
| --- | --- |
| Minimal and Classic across orientations, ranges and sizing modes | Mount tests exercise the default range, black-key endpoints, fixed and container sizing, and mode transitions. Firefox renders both skins on both C3–C5 orientations and the full A0–C8 demo. |
| Documented and validated customization | Appearance and mount tests cover immutable tokens, override precedence and resets, invalid values, and per-instance registration. The README documents accepted values and reset semantics. |
| Geometry, MIDI identity and logical state continuity | Mount tests compare node identities, bounds and MIDI order through repeated skin switches, verify off-range note retention, and assert writes only to the affected key fill and dot during a state-only update. |
| Shared SVG, isolated definitions and cleanup | Parsed Classic SVG matches the mounted drawing after prefix normalization in both orientations. Tests cover host ID collisions, separate module copies, repeatable explicit static prefixes, definition removal, and observer cleanup. Firefox verifies gradient and shadow pixels and byte-identical downloads. |
| Atomic updates and compatibility | Rejected mixed patches produce zero observed DOM mutations. Tests cover observer setup rollback, and package checks preserve existing APIs and build declarations. |
| Phase boundaries and handoff | Phase 5 assigned the remaining skins and contrast strategy to Phase 10. The Phase 5 handoff identified Phase 6 as the next milestone. |

### Verification

Package commands ran from `packages/keyboard` with Node 24.22.1 and npm 11.19.1 from the IntelliJ IDEA runtime.

| Command | Observed result |
| --- | --- |
| `npm run typecheck && npm test && npm run build` before edits | Passed. Vitest ran 157 tests across six files. Vite and TypeScript built the ESM bundle and declarations. |
| `npm run typecheck && npm test && npm run build` at handoff | Exit 0. TypeScript emitted no diagnostics. Vitest 4.1.12 passed 188 tests across seven files. Vite 7.3.8 and TypeScript built the ESM bundle, source map and declarations. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022 --module NodeNext /tmp/pianorealm-phase5/consumer/node.mts` | Passed against the built declarations for a consumer without the DOM library. |
| `./node_modules/.bin/tsc --noEmit --strict --target ES2022 --lib ES2022,DOM --module NodeNext /tmp/pianorealm-phase5/consumer/browser.mts` | Passed for the new skin APIs and public types. |
| `node --input-type=module` with inline assertions against the built package | Passed. The four root runtime exports and all five pressed-note methods remained available. The three new instance methods were present and the serializer stayed private. |
| `python3 /tmp/pianorealm-phase5/demo-smoke.py` at handoff | Exit 0 in headless Firefox 160.0.1 with loopback access for Vite and Marionette. Verified skin switching, pressed highlights, controls, isolated paint references, visible gradient and shadow in the rasterized standalone SVG, and byte-identical Classic SVG downloads for all three demo fixtures. The script is a temporary fixture outside the repository. |
| `git diff --check` and `git status --short --untracked-files=all` from the repository root | Whitespace check passed. Phase 5 changes are confined to the keyboard package. The pre-existing untracked package `.gitignore` was preserved. |

## Phase 4 handoff

The [Phase 4 gate](DEVELOPMENT_PLAN.md#9-phase-4--programmatic-pressed-key-state) passed. The package root's existing `PianoKeyboard` class now provides `setPressedKeys`, `pressKey`, `releaseKey`, `clearPressedKeys`, and `getPressedKeys`. The README documents the array-only batch input, note normalization, ascending detached snapshots and visual-only behavior. Existing package exports and dependencies are unchanged.

The original handoff was verified on `main` at `81a78e2` with the Phase 4 changes in the working tree. The state module and its unit tests are now tracked in `81dc791`. The pre-existing package `.gitignore` remains untracked.

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
- Firefox 160.0.1 was the only real browser checked for Phases 5 and 6. The Phase 6 smoke adds browser evidence for mode switching. Observer setup rollback is covered by DOM integration tests. Other browsers, assistive technologies and Anki clients remain unverified.
- Classic gradient-to-solid changes apply immediately. Hosts without ResizeObserver need explicit `resize()` after layout changes. Hosts without the reduced-motion CSS feature show the stable final state.
- Anki Desktop Linux has one verified client version. Additional clients and media sync remain unverified. CommonJS, optional public key bounds, and registration of custom overlay types remain deferred under the existing API scope.

## Next task

Review the proposed `1.0.0` version and release metadata. With approval, build the candidate from an identified source revision and rerun the release checklist. Repeat the Anki checklist on additional clients as environments become available. [Anki test checklist](docs/guides/anki-integration.md#test-on-each-client)
