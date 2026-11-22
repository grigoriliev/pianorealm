# Keyboard initial-release audit

Phase 9 covers Anki Desktop Linux by maintainer decision on 2026-11-22. Phase 10 uses that coverage and checks the rebuilt packages again. The private development version remains `0.0.0`.

## Specification §21

| Requirement | Status | Evidence | Follow-up |
| --- | --- | --- | --- |
| 1. Standalone installation as `@pianorealm/keyboard` | Pass | Offline install of the packed archive into an isolated npm project. The root ESM import exposes four runtime exports with zero runtime dependencies. | Confirm npm scope access before publication. |
| 2. Orientations and valid ranges | Pass | Exhaustive geometry tests, compact black-endpoint fixtures in both orientations, and a responsive 88-key Firefox fixture. | Repeat visual checks on each browser and device claimed in support notes. |
| 3. Programmatic state and invariant preservation | Pass | DOM tests verify atomic validation, retained MIDI identity, stable nodes for style and state changes, retained off-range state, and state across sizing and layout changes. | — |
| 4. Display-only API | Pass | Source, public exports, and artifact audit. Visual methods update SVG and geometry queries return MIDI identities. The playground owns its controls. | — |
| 5. Built-in and custom appearance | Pass | Six built-ins. Both orientations and all three pressed modes checked per skin, with custom token precedence, validation, and state preservation. | Check overrides against the consumer's own background and palette. |
| 6. Overlays, labels, reduced motion, and accessibility | Pass | Literal descriptions, decorative mode, ARIA reference checks, Firefox computed roles and names, default-palette contrast checks, and reduced motion in real Firefox. | Screen readers, OS forced colors, and other engines remain untested. |
| 7. Shared rendering and self-contained SVG | Pass | Mounted/static parity for every built-in with annotations. Built ESM static rendering runs in Node without DOM globals. Firefox rasterizes static SVG offline. | — |
| 8. ESM, declarations, and offline classic scripts | Pass | The actual tarball compiles the README's TypeScript example and a DOM-free consumer. Both classic variants pass global installation, collision, duplicate-load, and offline Firefox checks. | Rerun after setting an approved version. |
| 9. Cleanup, coexistence, and isolation | Pass | Tests cover key-only state updates, resize coalescing, observer and extension disposal, and isolated IDs and motion CSS. Firefox and Anki cover remounts. | — |
| 10. Composability, Anki setup, and support evidence | Pass | Package README and Anki guide document public APIs, local deployment, offline mode, sizing fallbacks and verified hosts. Clean-profile Anki Desktop rerun passed on Linux. | Windows and macOS Desktop, mobile clients, AnkiWeb, and sync are untested. |
| 11. Unit, build, and representative browser/visual verification | Pass | 270 tests, three production scripts and declarations, 15 artifact checks, two Firefox screenshots, and a Firefox playground workflow. | Node 22 tooling and other browser engines are untested. |

## Development plan §15

| Requirement | Status | Evidence | Follow-up |
| --- | --- | --- | --- |
| Built-in skins and contrast strategy | Pass | Modern, Neon, Dark, and High Contrast use the shared paint pipeline. Each supported mode has live/static parity tests. | — |
| Types, export map, artifacts, and metadata | Pass | Packed ESM/types, classic scripts, source maps, README, changelog, Anki guide and Apache license. The bundler maps refer only to library source. ESM follows the accepted distribution ADR. | Confirm the release version and rebuild. |
| API docs and examples | Pass | Local install, JS/TS examples, appearance, visual state, configuration, events, extensions, and Anki walkthrough. | — |
| Playground | Pass | Live package preview, configurable layout and appearance, shareable setup code, and public static SVG exports tested in Firefox. | — |
| Visual regression matrix | Pass | Six built-ins with compact black-endpoint ranges and all three display modes across the matrix, plus a responsive full range with custom paint. Two reviewed Firefox baselines. | Use the matching environment for exact comparisons. |
| Accessibility and regression checks | Pass | Firefox computed image and control semantics, no SVG tab stops, local description links, contrast, non-color markers, reduced motion, and CSS isolation. | Verify screen readers before claiming screen-reader support. |
| Lifecycle and performance | Pass | Unit/DOM tests check incremental updates, resize bursts, render range extremes, and repeated initialization and teardown. Real Firefox checks responsive layout, black-key hit testing, and remounts. | This verification covers update invariants. It establishes no time or memory benchmark. |
| Built artifact and embedded consumer checks | Pass | Isolated offline npm consumer, DOM-free Node, both classic scripts in Firefox, and isolated Anki Desktop review with local media. | Repeat for additional platforms as they become available. |
| Changelog, version proposal, and release checklist | Pass | Unreleased changelog and proposed initial version below. | Owner approval required before changing package metadata. |
| Acceptance audit and explicit scope | Pass | This audit and the Anki compatibility matrix record evidence and unverified hosts. | — |

## Label palette measurements

The numbers are sRGB relative luminance contrast ratios for the built-in paints. The white-key column compares the dark label foreground to the unpressed face. The black-key column compares the white foreground to the unpressed face. The pressed column compares white to the active fill. White is the black-key foreground, the white-key label's outline, and the default marker in combined mode. For Classic, the table uses the least favorable gradient stop.

| Skin | White key | Black key | Pressed fill |
| --- | ---: | ---: | ---: |
| Minimal | 17.50 | 15.52 | 4.57 |
| Classic | 11.22 | 10.12 | 6.60 |
| Modern | 17.11 | 13.28 | 5.84 |
| Neon | 10.05 | 14.18 | 7.39 |
| Dark | 9.93 | 13.26 | 7.73 |
| High Contrast | 18.26 | 21.00 | 7.50 |

Outline thickness, rasterization, custom colors and compact text affect readability. In the narrow full-range capture, use accompanying text or shorten the note range when labels carry meaning. These measurements describe paint pairs. Screen reader behavior and overall WCAG conformance require separate evaluation.

## Repeat the visual checks

From `packages/keyboard`:

```sh
npm run build
MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 -B tests/artifacts/firefox-release.py --output /tmp/pianorealm-visual
```

The runner uses loopback for Firefox automation and the local Vite playground. It loads the visual fixture with Firefox offline and compares its screenshots byte for byte with the baselines. It writes current captures to the requested directory even on a mismatch. Baselines use headless Firefox 160.0.1 on Debian 13.8 x86-64, default pixel ratio 1, DejaVu Sans 2.37-8 and Noto Sans 20201225-2. The requested outer widths are 500 and 956 CSS pixels. The full-page captures are 488 × 1059 and 944 × 471 pixels. The test disables fixture motion and uses explicit static ID prefixes.

For intentional visual changes, inspect the captures and run the same command with `--update-baselines`, then rerun with that flag omitted. On another browser, open the playground, compare all six skins and each pressed mode, then try the compact black-endpoint range in both orientations. Verify labels, non-color selection, copyable configuration, fixed/container sizing, and static SVG download. Use the operating system's reduced-motion preference and the browser accessibility inspector to check the accessible name, description and form labels. Use the [Anki client checklist](guides/anki-integration.md#test-on-each-client) for each added client.

## Release preparation

Proposed version **1.0.0** for the first stable public API. The version and removal of the private flag require owner approval. Before the initial release, assume the development build can evolve. After a stable release, publish documented breaking contracts under a new major version and provide migration guidance in the changelog. Internal DOM, CSS, and private module paths fall outside the public API.

- [x] Verify Apache-2.0 license, repository metadata, artifact filenames, package scope, export map and allowlist.
- [x] Audit the documented public API, validate packed exports offline, and check that playground assets and repository-only records stay out of the tarball.
- [x] Record verification evidence, host limitations and reviewed visual baselines.
- [ ] Approve the version and public release metadata, then update the manifest and lockfile together.
- [ ] Build from the approved source revision, rerun typecheck, tests, pack and browser/Anki checks, and record the revision, toolchain and archive integrity for provenance.
- [ ] Confirm distribution authorization and npm scope access before any external release action.
