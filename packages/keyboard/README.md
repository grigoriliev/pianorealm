# @pianorealm/keyboard

The Pianorealm keyboard package renders a display-only piano as SVG. It provides the mounted keyboard, a DOM-free SVG generator, and note utilities through ESM with TypeScript declarations. Standalone classic scripts run offline. The package is in release preparation. This checkout builds a private development package for local use.

## Development

Run these commands in `packages/keyboard` with Node 22.12+ on the 22.x line or Node 24.x. The package lockfile was verified with Node 24.22.1 and npm 11.19.1.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:artifacts
```

The build generates `dist/pianorealm-keyboard.esm.js`, `dist/index.d.ts`, `dist/pianorealm-keyboard.umd.js`, and `dist/pianorealm-keyboard.umd.min.js`. The package-root import `@pianorealm/keyboard` uses ESM and its declarations. From the package directory, verify the built package entry with:

```sh
node --input-type=module -e 'import { normalizeNote } from "@pianorealm/keyboard"; console.log(normalizeNote("C4"))'
```

To repeat the offline smoke test with Python 3 and Firefox, run `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 python3 tests/artifacts/firefox-offline.py`. It creates a temporary Firefox profile and uses loopback for browser automation. Firefox loads the fixture and both scripts from local files with its network service offline.

To run the guide's templates in Anki Desktop on Linux, use the [clean-profile Desktop test](docs/guides/anki-integration.md#run-the-clean-profile-desktop-test).

## Install from a local build

Run `npm ci`, `npm run build`, then `npm pack` from the checked-out `packages/keyboard` directory. npm prints the archive filename. In your own npm project, run `npm install /absolute/path/to/pianorealm-keyboard-0.0.0.tgz`, using the path and filename from your build. The packed package includes both browser scripts in `dist/`. Registry installation is planned.

In a TypeScript app with DOM types, give the host CSS dimensions and mount after the element exists.

```ts
import { PianoKeyboard } from '@pianorealm/keyboard';
import type { KeyboardOptions } from '@pianorealm/keyboard';

const container = document.getElementById('piano');
if (!container) throw new Error('Missing #piano');

const options: KeyboardOptions = {
  container,
  range: { from: 'C3', to: 'C5' },
  labels: { mode: 'note' },
};
const piano = new PianoKeyboard(options);
piano.setPressedKeys(['C4', 'E4', 'G4']);
// Call piano.destroy() when you remove the host.
```

## Generate static SVG

```ts
import { PianoKeyboard } from '@pianorealm/keyboard';
import type { StaticKeyboardOptions } from '@pianorealm/keyboard';

const options: StaticKeyboardOptions = {
  range: { from: 'C3', to: 'C5' },
  orientation: 'horizontal',
  skin: 'classic',
  sizing: { width: 300, height: 100 },
  pressedKeys: ['C4', 'E4', 'G4'],
  idPrefix: 'chart-c-major',
};
const svg = PianoKeyboard.renderToSVG(options);
```

`renderToSVG(options?)` works in Node without a DOM and in modern browsers. It takes the normal range, notation, orientation, key dimensions, appearance, labels, highlights, indicators and overlays. Use a built-in skin and inline `appearance` tokens to customize static paint. The static options describe final state and accept only fixed sizing. Each omitted viewport axis uses the oriented intrinsic dimension. With no options the result is a horizontal Minimal keyboard spanning A0–C8. The mounted and static APIs share note normalization and validation. Pressed notes may use MIDI integers or note names, and only visible notes are drawn. Invalid options throw without modifying the input.

The SVG includes an XML namespace, dimensions, a `viewBox`, an accessible image name, and any gradients, shadows or clips it uses. It needs no runtime JavaScript, stylesheets, or remote assets. Add accompanying text where the selection or annotations carry meaning, or supply equivalent alt text when using an image element. Mounted and static output share the same final-state scene. Parity tests normalize definition prefixes and ignore the XML namespace declaration and mount-only motion scope.

An explicit `idPrefix` must start with an ASCII letter, followed by up to 63 ASCII letters, digits, hyphens or underscores. Identical normalized inputs and an explicit prefix produce identical bytes. Default prefixes isolate generated definitions within one loaded library copy. Assign distinct prefixes when embedding inline SVGs from independent library copies or processes, or when repeating a diagram in the same document. To reuse the exact SVG bytes, embed each occurrence as a separate image.

## Use a standalone classic script

Place either `pianorealm-keyboard.umd.js` or `pianorealm-keyboard.umd.min.js` next to the page. Both have the same global API and bundle all runtime code and styling. Mounting requires a browser with a DOM, SVG and modern JavaScript (ES2022). See the [Anki integration guide](docs/guides/anki-integration.md) for local media, card templates, theme selection, and client verification status.

```html
<div id="piano"></div>
<script src="./pianorealm-keyboard.umd.min.js"></script>
<script>
  const piano = new Pianorealm.Keyboard({
    container: document.getElementById('piano'),
    range: { from: 'C3', to: 'C5' },
    sizing: { mode: 'fixed', width: 300, height: 100 },
  });
  piano.setPressedKeys(['C4', 'E4', 'G4']);
  // Call piano.destroy() when the host is disposed.
</script>
```

The classic entry installs `globalThis.Pianorealm.Keyboard`, including `renderToSVG()`. It creates an absent namespace, preserves existing sibling properties, and reuses the constructor when the same package version is already installed. An incompatible namespace, a differently versioned or unrecognized `Keyboard` binding, or a blocked installation raises an error and preserves the existing bindings. The `.umd.js` filenames identify self-contained browser scripts built as IIFEs. The package-root types describe the ESM API.

## Development demo

Run `npm ci` if dependencies are missing, then start the demo from `packages/keyboard`:

```sh
npm run dev:demo
```

Open [the playground](http://127.0.0.1:5173/demo/) or use the port Vite prints. **Preview layout** changes the first diagram. The vertical C3–C5 and full A0–C8 diagrams show the same appearance and pressed selection at fixed intrinsic sizes. Scroll within a preview when its drawing exceeds the card width.

Enter note names or integer MIDI numbers separated by spaces or commas, or try the C major and F♯ minor presets. **Show example annotations** adds a “Do” label, a circle and badge on C4, a highlight and text overlay on E4, and a number on G4. **Indicator only** and **Square** make the pressed state distinguishable by shape. The controls belong to the playground. The piano drawing itself is display-only.

Copy the mounted or static JavaScript example for the current preview. Each **Download SVG** uses `PianoKeyboard.renderToSVG()` and captures the current diagram at its fixed or measured viewport size. Downloads use distinct prefixes for definition IDs. Static examples and downloads show the final appearance immediately.

The playground uses the public source entry point. The production bundle contains only library code.

## Note utilities

- `normalizeNote(note, notation?)` returns a MIDI integer from 0 through 127. It accepts a MIDI number or a trimmed string with an ASCII letter A–G (case-insensitive), one optional accidental (`#`, `b`, `♯`, or `♭`), and a decimal octave with an optional leading minus. The accidental is applied before range validation. For example, B#3 maps to 60 and Cb4 maps to 59. Numeric strings, a leading plus, and double accidentals are invalid.
- `formatNote(midi, notation?)` defaults to scientific pitch notation (C4 = 60) and ASCII sharps. Use `accidentalPreference: 'flat'` for ASCII flats. Either spelling is accepted on input. A positive integer `octaveOffset` raises displayed octaves. With offset 1, MIDI 60 formats as C5, and C5 parses to 60. Offsets must be safe integers and leave numeric MIDI inputs unchanged.
- `classifyNote(midi)` returns `'white'` or `'black'` based on pitch class.

The root also exports the types `NoteInput`, `NotationOptions`, and `KeyKind`. Malformed syntax, unsupported argument types, and unknown option fields throw `TypeError`. Numeric domain violations throw `RangeError`.

## Mount a keyboard

Give the HTML host an available content-box width and height for the default container sizing mode. For example, put the following markup in a page served over local HTTP:

```html
<div id="piano" style="width: 320px; height: 160px;"></div>
<script type="module">
  import { PianoKeyboard } from './dist/pianorealm-keyboard.esm.js';

  const piano = new PianoKeyboard({
    container: document.getElementById('piano'),
    range: { from: 'C#4', to: 'D#4' },
  });

  piano.setRange('C3', 'C5');
  piano.setOrientation('vertical');
  piano.resize();
  // Call piano.destroy() when the host is disposed.
</script>
```

`KeyboardOptions` accepts the host `container`, range, orientation, notation, sizing, skin, appearance, motion, and the visual annotations documented below. The `Orientation` type is `'horizontal' | 'vertical'`. Range and orientation updates validate before replacing the current drawing. Each host allows one live keyboard, and `destroy()` removes that keyboard's content while preserving the host's other children and styles. Repeated `destroy()` calls are safe. The other instance methods throw after destruction.

Container mode fits the intrinsic geometry inside the content box with uniform scaling and centered letterboxing. A disconnected host or one without a positive layout box waits for a usable viewport. Set the host's dimensions through CSS. The drawing contributes no intrinsic size to the host in container mode. The adapter observes size changes with `ResizeObserver` and batches notifications into one measurement per frame when frame scheduling is available. For hosts without observation, call `resize()` after attachment, visibility, or size changes. `resize()` measures synchronously in either environment.

In fixed mode, `sizing.width` and `sizing.height` set the viewport in CSS pixels, with each omitted dimension taken from the oriented geometry. Fixed keyboards can be constructed while their host is detached. Both modes use the same intrinsic SVG `viewBox` and centered contain fit, and clip decorative paint at the SVG boundary. Hosts can wrap fixed drawings in a CSS scroller. The package exposes no alternate fit, automatic scrolling, or configurable minimum/maximum size options. Updates to the viewport, sizing mode, orientation, and key dimensions preserve the key nodes when the range stays the same.

To check fitting manually, leave the C♯4–D♯4 range horizontal and set the host content box to 100 × 100 px. The 32 × 100 keyboard is centered with 34 px on either side. Switch to vertical and check that the 100 × 32 keyboard is centered with 34 px above and below. Set the host height to zero, call `resize()`, then restore the height and call `resize()` again. Mount a second keyboard in a separate host and verify that destroying the first leaves the second visible.

## Visually press keys

```ts
piano.setPressedKeys(['G4', 'E4', 'B#3', 60]);
piano.getPressedKeys(); // [60, 64, 67]
piano.pressKey('C#4');
piano.releaseKey('E4');
piano.clearPressedKeys();
```

These methods control the drawing only. Minimal shows pressed keys with a blue fill and a dot. `setPressedKeys` accepts an array (including a readonly array in TypeScript) of MIDI numbers and note names. Other collections, such as sets and generators, are unsupported. Names are interpreted using the keyboard's notation when passed in. Equivalent notes share one MIDI identity, and an invalid item leaves the entire selection and drawing unchanged.

`getPressedKeys()` returns a new array in ascending MIDI order. It includes any valid MIDI note still pressed outside the displayed range. Changing the visible range, flipping orientation, switching skins, or resizing preserves that selection. `pressKey` adds one note, `releaseKey` removes one note, and `clearPressedKeys` releases all notes. Repeating a command with the same result leaves the drawing untouched.

## Configuration

Ranges are inclusive. Their endpoints accept the same inputs as `normalizeNote`, and equal endpoints are valid, including a single black key. Reversed ranges throw `RangeError`. Defaults are A0–C8 (MIDI 21–108), horizontal orientation, default notation, and container sizing with white keys 20 × 100 and black keys 12 × 60 in pitch-axis width × depth.

`setOptions(patch: KeyboardOptionsPatch)` merges fields in `notation`, `sizing`, `appearance`, `animation`, `labels`, `indicator`, and `accessibility`. It replaces the whole `range` or note map (`labels.custom`, `highlights`, `overlays`) when supplied. New range and map names use the notation in the same patch. Previously ingested notes retain their MIDI identities. An omitted field keeps its current value. Explicit `undefined` resets an optional field. An invalid patch leaves the current configuration, pressed notes and drawing intact. The container is selected at construction.

Dimensions must be positive and finite. Black keys must be narrower than white keys and may be equally deep. Optional viewport dimensions apply in fixed sizing mode. To return to default container sizing and remove fixed viewport dimensions, use `piano.setOptions({ sizing: undefined })`.

## Skins and appearance

Choose a built-in at construction or call `piano.setSkin(name)` after mounting. Skin and appearance changes preserve the SVG root, key nodes, geometry, and annotations and pressed notes, including those outside the range.

| Skin | Appearance |
| --- | --- |
| `minimal` (default) | Flat ivory and dark keys with blue pressed fill |
| `classic` | Ivory and dark gradients, rounded edges, a shadow, and brown pressed fill |
| `modern` | Cool tones, restrained rounding and shadows, and a 150 ms transition |
| `neon` | Dark violet host and vivid magenta pressed fill |
| `dark` | Slate gray keys on a dark background with teal pressed fill |
| `high-contrast` | Flat white and black keys and deep blue pressed fill |

Use High Contrast with `pressedMode: 'both'` (the default) or `'indicator'` to distinguish the selected notes by a shape. Keep the default paints and indicator values to preserve the tested contrast. The default palettes use an outlined label so the label keeps a contrasting edge when the key is filled. Overrides, overlays, and colors inherited from a host require checking in context.

```ts
piano.setSkin('classic');
piano.setOptions({ appearance: { background: 'transparent', white: '#fff8e9' } });
piano.setOptions({ appearance: { white: undefined } }); // Restore the selected skin's white-key paint
piano.setOptions({ appearance: undefined });           // Remove all instance overrides

piano.registerSkin('studio', {
  white: { stops: [{ offset: 0, color: '#dce3ee' }, { offset: 1, color: '#fff' }] },
  pressed: '#205598',
  cornerRadius: 1.5,
});
piano.setSkin('studio');
```

`registerSkin(name, appearance)` copies and validates the tokens for the lifetime of the instance. Names start with a lowercase ASCII letter. The remaining characters may be lowercase ASCII letters, digits or hyphens. Registration leaves the selected skin unchanged. Built-in names and names already registered on the same instance are reserved. Custom skins can be selected after registration. Each new instance starts with the built-ins.

Resolution starts with Minimal defaults, applies the selected skin's tokens, and then applies explicit instance overrides. Skin selection keeps current overrides. Use `setOptions({ skin: undefined })` to return to Minimal. Custom colors may require contrast checks in the target host.

| `AppearanceOptions` field | Accepted value |
| --- | --- |
| `background` | Color. Use `'transparent'` to show the host background. |
| `white`, `black` | Color or `{ stops: [{ offset, color }, ...] }`. A gradient takes 2–8 stops in nondecreasing order, with numeric offsets from 0 through 1. It runs from the rear to the front of each key. An override replaces the entire paint. |
| `boundary` | Key border color. |
| `strokeWidth`, `cornerRadius` | Finite nonnegative numbers in SVG user units. Zero disables the corresponding effect. SVG limits the rendered radius to the rectangle's bounds. |
| `pressed` | Solid pressed-key color for both white and black keys. |
| `blackKeyShadow` | Shadow opacity from 0 through 1. The renderer supplies the offset and blur. Zero disables the shadow. |

Colors accept `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA` and `'transparent'`. Unknown names and fields, unsupported paint syntax and malformed tokens throw `TypeError`. Out-of-range numeric tokens throw `RangeError`. The root exports `BuiltInSkin`, `AppearanceOptions`, `AppearanceColor`, `KeyPaint`, `KeyGradient` and `GradientStop`.

Gradient and shadow definitions travel with the SVG and use instance-specific IDs. Static diagrams select a built-in skin and apply inline appearance options. [Generate static SVG](#generate-static-svg)

## Labels, highlights, and overlays

```ts
piano.setOptions({
  labels: { mode: 'note', emphasizeC: true, custom: { 'F#4': 'Sol' } },
  highlights: { 64: '#e69534' },
  pressedMode: 'indicator',
  indicator: { shape: 'square', size: 6, opacity: 0.85 },
});

piano.setKeyOverlays({
  C4: [
    { type: 'circle', color: '#3498db', depth: 0.25 },
    { type: 'badge', text: 1, color: '#fff', background: '#25344a', depth: 0.48 },
  ],
  E4: [{ type: 'text', text: 'Mi' }],
  G4: [{ type: 'number', value: 5 }],
});

piano.setKeyOverlays({}); // Clear all user overlays
```

### Labels and highlights

| Setting | Behavior |
| --- | --- |
| `labels.mode` | `'none'` (default), `'note'` for scientific pitch names such as C4, `'midi'` for 60, or `'octave'` for 4. Names and octaves follow the current notation. |
| `labels.custom` | Per-note text takes precedence over the generated label, including in `'none'` mode. Use an empty string to suppress an individual label. |
| `labels.emphasizeC` | Defaults to false. When enabled, C notes have bold labels if present and a teal strip at the front of the key. |
| `highlights` | Per-note colors for the front strips. An explicit color takes precedence over C emphasis. A strip stays visible when the key is pressed. |

### Pressed indicators

`pressedMode` defaults to `'both'` (the skin's pressed fill and a white circle). Use `'color'` for pressed fill alone, or `'indicator'` to preserve the normal key fill and show a marker. Indicator-only mode uses a dark marker with a white outline on white keys and a white marker with a dark outline on black keys. The selection remains the same when switching modes.

| `IndicatorOptions` field | Values |
| --- | --- |
| `shape` | `'circle'` (default) or `'square'`. |
| `color`, `stroke` | Optional color overrides. Setting a stroke or stroke width in `'both'` mode adds an outline. |
| `size`, `strokeWidth` | Finite nonnegative SVG user units. Size is the requested diameter or side, including the outline. The default size is fitted to the key. The default outline width, when present, is 1. Both dimensions are capped to fit. Zero size hides the marker and zero width removes the outline. |
| `pitch`, `depth` | Fractions in [0, 1]. Defaults are 0.5 and 0.75. Pitch is relative to the clear center strip and anchors stay inset so the marker fits. |
| `opacity` | Fraction in [0, 1], default 1. Mounted fades use this value as their visible endpoint. |

### Overlay maps and placement

`setKeyOverlays(map: KeyOverlays)` and the `overlays` option replace the complete map. Omitted notes and empty arrays have no overlays. Use `{}` or `setOptions({ overlays: undefined })` to clear all assignments. The package copies and validates the input before changing the drawing.

All note maps accept keys such as `60` and `'C4'`. Numeric properties use canonical decimal MIDI spelling, with no leading zeros. Note names use the notation in effect at ingestion. Multiple spellings of the same MIDI note in one map are an error. Valid off-range entries remain assigned through range, orientation, notation, skin and viewport changes. Destroying the keyboard discards the assignments.

| `KeyOverlay` type | Content |
| --- | --- |
| `'circle'` | A filled dot. `size` is the requested diameter in SVG user units, default 5, capped to fit the key. |
| `'text'` | Literal `text`. |
| `'number'` | Finite `value`, displayed using JavaScript's number formatting. |
| `'badge'` | Text or a finite number in `text`, on a rounded rectangle with configurable `background` (default dark blue). The default text color is white. |

All overlays support `color`, optional `pitch` and `depth` in [0, 1], and finite nonnegative `size`. For text, number and badge, `size` is the maximum font size in user units (default 8). Pitch defaults to 0.5 and depth to 0.4. Pitch increases left to right in horizontal layouts and bottom to top in vertical layouts. Depth increases rear to front, downward in horizontal layouts and rightward in vertical layouts. Overlay anchors use the full geometric key bounds.

The SVG draws white bodies, black bodies, highlights, labels, pressed indicators, then overlays. Overlay groups are in ascending MIDI order. Items for one note paint in array order, so later items can cover earlier ones. Highlight, label and overlay paint clips to the owning key's geometric face. White-key clips exclude the areas occupied by black keys. Overlays near the edge can be partially or fully clipped. Labels and overlay text stay upright, shrink against an intrinsic geometry-based estimate, and are omitted below 3 user units. Container fitting scales the whole drawing, so extremely narrow hosts may still show small text. Use separate positions for marks that should remain visible together.

Colors use the same hex or transparent format as `appearance`. Each note map accepts up to 128 entries, with at most 16 overlays per note. Text is limited to 64 Unicode code points and must contain valid XML characters. Markup-like characters are rendered literally. Paint URLs, unknown properties, and raw markup or arbitrary SVG elements supplied as overlay definitions are rejected. The SVG is exposed as a single named image. Decorations are hidden from assistive technology. Supply accompanying accessible text in the host when annotations convey information the reader needs.

The package exports `LabelOptions`, `LabelMode`, `PressedMode`, `IndicatorOptions`, `KeyOverlay`, `KeyOverlays` and `NoteMap` as types.

## Pressed-key motion

```ts
piano.setOptions({ animation: { duration: 180, easing: 'ease-in-out' } });
piano.setOptions({ animation: { enabled: false } });
piano.setOptions({ animation: undefined }); // Restore the selected skin's motion defaults
```

Motion is enabled by default. Classic uses 160 ms with `ease-in-out`. Modern uses 150 ms with `ease-out`. The other built-ins and custom skins use 120 ms with `ease-out`. The exported `AnimationOptions` accepts a finite duration from 0 through 1000 ms and an `AnimationEasing` of `linear`, `ease`, `ease-in`, `ease-out` or `ease-in-out`. Overrides survive skin changes. Reset an individual field with `undefined` to use the current skin's default.

Mounted keyboards fade pressed indicators and transition between solid key fills. Classic's gradient-to-color fill changes are immediate, with its indicator still fading. Logical note state and SVG attributes update immediately. The motion stylesheet belongs to the mounted instance, so exported SVG shows the final appearance on its own.

`enabled: false` or a zero duration disables motion. Otherwise, the CSS media query enables transitions only when `prefers-reduced-motion: no-preference` matches. Preference changes take effect while mounted without JavaScript media-query listeners. Hosts that lack the CSS media feature show the final appearance immediately, and the JavaScript `matchMedia` API is optional. [Anki client test results](docs/guides/anki-integration.md#compatibility-matrix)

## Accessible diagrams

The mounted and static APIs expose a single SVG image with a name derived from its orientation and visible range. Set `accessibility.label` to provide your own name. Use `accessibility.description` for meaningful context such as the selected chord or an explanation of the overlays. The description is literal text, linked through an instance-scoped SVG ID. Both fields accept nonblank strings. Use `accessibility.decorative: true` when adjacent accessible text already conveys the diagram. In decorative mode the SVG is hidden from assistive technology. This never affects how the keys look.

```ts
piano.setOptions({
  skin: 'high-contrast',
  pressedMode: 'both',
  accessibility: {
    label: 'C major triad',
    description: 'C4, E4 and G4 are pressed.',
  },
});
```

Update the description or adjacent text when a changed selection conveys new information. Pressing keys changes the SVG presentation without making an announcement. When using generated SVG as an image source, put the text alternative on the HTML image. At compact sizes, shorten the range or provide nearby text when key labels become too small. Choose the skin explicitly for dark mode. See the tested Anki configurations in the [compatibility matrix](docs/guides/anki-integration.md#compatibility-matrix).

## Visualization events

`piano.on(event, handler)` returns an idempotent unsubscribe function. The exported `KeyboardEventMap` infers the handler argument from the event name.

| Event | Payload |
| --- | --- |
| `rangeChanged` | Frozen `{ from, to }` with inclusive MIDI endpoints. |
| `orientationChanged` | `'horizontal'` or `'vertical'`. |
| `skinChanged` | Active built-in or custom skin name. |
| `pressedKeysChanged` | Frozen ascending MIDI array, including off-range notes. |
| `resized` | Frozen `{ width, height }` for the effective SVG viewport in CSS pixels, or `null` when unavailable. These are the dimensions applied by keyboard sizing before host CSS transforms or overrides. |
| `destroyed` | `undefined`. |

Events fire synchronously after the state and SVG update. Within one operation, changes are delivered in the order shown above. Each event takes a fresh snapshot of listeners in subscription order. Adding or removing a subscription during delivery takes effect on the next event. Callback code can read the mounted instance and change subscriptions. Reentrant keyboard mutations and calls to `destroy()` throw `Error` during delivery.

Equivalent values and rejected updates emit no events. Appearance overrides, skin registration, and overlays do not change the selected skin. Moving notes in or out of the visible range does not change the pressed set. Explicit and observed resizes emit only when the effective viewport changes, including transitions to or from an unavailable container viewport.

The constructor accepts `onCallbackError(error)` for listener and extension cleanup failures. By default the host console reports them. Delivery and cleanup continue if a callback or the error reporter throws. Destroy stops observation, marks the instance destroyed, runs extension cleanups, removes its SVG, and releases ownership of the container. It then delivers `destroyed` once to the listeners present at teardown start and clears all subscriptions. Instance methods throw after destruction. Returned disposers remain safe to call, and repeated `destroy()` is a no-op outside of event delivery.

## Hit testing

`piano.getNoteAtPoint(clientX, clientY): number | null` takes viewport CSS pixels, with `(0, 0)` at the top-left of the viewport. These are the same coordinates as a browser event's `clientX` and `clientY`. The query maps through the current SVG screen transform in either sizing mode and orientation. Pass the coordinates directly, including under scrolling, CSS transforms and high-DPI displays.

Black keys win wherever their rectangles overlap white keys. Bounds include the top and left edges and exclude the bottom and right edges. Gaps, letterboxing, points outside the keys and unavailable or singular transforms return `null`. Overlays, corner radii, and unrelated host occlusion or clipping leave the geometric hit regions unchanged. Nonnumeric inputs throw `TypeError` and non-finite numbers throw `RangeError`.

**Conceptual composition.** An application or future interaction adapter can take client coordinates from a gesture it owns and query the keyboard. If the query yields a note, the application can choose to mark it visually pressed. The application separately decides whether to invoke any MIDI or audio APIs.

## Extensions

`piano.use(extension)` runs a synchronous `KeyboardExtension` setup function with the public keyboard instance. Setup returns a cleanup function or `undefined`. The removal handle is idempotent. Each install runs independently, including repeated use of the same function. Reinstallation follows the same setup contract. Destroy runs active cleanups in reverse order of successful installation.

```ts
import type { KeyboardExtension } from '@pianorealm/keyboard';

const reportPressed: KeyboardExtension = keyboard =>
  keyboard.on('pressedKeysChanged', notes => console.log(notes));

const removeReporter = piano.use(reportPressed);
removeReporter();
```

Cleanup is responsible for the extension's resources, including calling its retained unsubscribe functions. Handle setup failures inside setup, release partial resources, then rethrow the error. Setup errors propagate to the caller. A non-function extension or a setup result other than a function or `undefined` throws `TypeError`. When removed during event delivery, cleanup runs immediately and subscription changes affect the next event. During keyboard teardown, cleanup can use retained disposers to release resources. If setup destroys the keyboard before returning its cleanup, the cleanup runs as soon as setup returns.

Extensions can use `registerSkin()` and `setKeyOverlays()` through their existing public contracts. Registered skins belong to the keyboard instance, and overlays use whole-map replacement. Public key bounds and registration of custom overlay types are deferred.

## Internal geometry

The engine takes a normalized MIDI range, orientation, and key dimensions in SVG user units. It returns frozen bounds for each included MIDI note in draw order, with whites before blacks. It keeps the full rectangle of each endpoint black key and the full white-key depth of the viewport. The vertical layout rotates those bounds so lower notes are at the bottom. Logical point lookup reads the same bounds. The mounted renderer and private SVG serializer use the same scene derived from this layout and the resolved appearance. [Layout ADR](https://github.com/grigoriliev/pianorealm/blob/main/packages/keyboard/docs/decisions/0002-layout-sizing-and-hit-testing.md)


## Support, contributions, and license

Development commands use the Node versions in `package.json`. The release checks currently use Node 24.22.1 and Firefox 160.0.1. Anki client results are documented per version. The built ESM API and offline browser scripts target ES2022. Hosts without `ResizeObserver` can call `resize()` explicitly after changing a container's size. For night mode choose the skin in your host application.

Compose through the documented exports and use `getNoteAtPoint()` to map a viewport point to a MIDI note when your application owns the input. Human input, MIDI transport, and audio have separate roles in the Pianorealm ecosystem.

For changes to the library, run the development checks and review the package specification and accepted decisions in the source checkout. For library integration, use the package root and the documented classic-script constructor. Private module paths, DOM and CSS internals can change before or after the first release. Corrections and breaking changes to published contracts will be recorded in the changelog with migration guidance.

Apache License 2.0. [License](LICENSE) · [Changelog](CHANGELOG.md)
