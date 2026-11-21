# @pianorealm/keyboard

The Pianorealm keyboard package renders a display-only piano as SVG. The private package provides an ESM entry with TypeScript declarations for the mounted keyboard and note utilities. [Project state](PROJECT_STATE.md)

## Development

Run these commands in `packages/keyboard` with Node 22.12+ on the 22.x line or Node 24.x. The package lockfile was verified with Node 24.22.1 and npm 11.19.1.

```sh
npm ci
npm run typecheck
npm test
npm run build
```

The build generates `dist/pianorealm-keyboard.esm.js` and `dist/index.d.ts`. From the package directory, verify the built package entry with:

```sh
node --input-type=module -e 'import { normalizeNote } from "@pianorealm/keyboard"; console.log(normalizeNote("C4"))'
```

## Development demo

Run `npm ci` if dependencies are missing, then start the demo from `packages/keyboard`:

```sh
npm run dev:demo
```

Open [http://127.0.0.1:5173/demo/](http://127.0.0.1:5173/demo/), or use the port Vite prints if 5173 is busy. The page mounts horizontal and vertical C3–C5 keyboards and a full A0–C8 keyboard. All three render at their intrinsic size. Scroll inside a card if the keys exceed its width.

Use **Highlight C major** (C4, E4, G4) or **Highlight F♯ minor** (F♯3, A3, C♯4) to replace the selection on all three keyboards. **Clear highlights** releases all notes. The **Skin** selector and appearance checkboxes apply to all three examples. Turn off **Animate highlights** to apply fills and pressed dots immediately. Each **Download SVG** button saves the final appearance, including the selected skin and highlights. The demo uses the source entry point, so it works without a prior build. It lives under `demo/` and is excluded from the production library bundle.

To check skin switching and export, highlight F♯ minor, choose **Classic**, and confirm each example keeps three pressed dots. Download a Classic SVG and open it on its own to check the gradient, shadow and highlights. Choose **Minimal** to restore the flat fills while keeping the same notes pressed.

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

The constructor accepts `container`, `range`, `orientation`, `notation`, `sizing`, `skin`, `appearance` and `animation` through `KeyboardOptions`. The `Orientation` type is `'horizontal' | 'vertical'`. Range and orientation updates validate before replacing the current drawing. Each host allows one live keyboard, and `destroy()` removes that keyboard's content while preserving the host's other children and styles. Repeated `destroy()` calls are safe. The other instance methods throw after destruction.

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

`setOptions(patch: KeyboardOptionsPatch)` merges individual fields in `notation`, `sizing`, `appearance` and `animation`, and replaces a `range` as a whole. New range names use the patched notation, while existing ranges retain their MIDI identities. An omitted field keeps its current value. Explicit `undefined` resets an optional field. An invalid patch leaves the current configuration, pressed notes and drawing intact. The container is selected at construction.

Dimensions must be positive and finite. Black keys must be narrower than white keys and may be equally deep. Optional viewport dimensions apply in fixed sizing mode. To return to default container sizing and remove fixed viewport dimensions, use `piano.setOptions({ sizing: undefined })`.

## Skins and appearance

Choose `skin: 'minimal'` (default) or `skin: 'classic'` at construction, or call `piano.setSkin(name)` after mounting. Minimal uses flat fills and blue pressed keys. Classic uses ivory and dark gradients, small corner radii, a subtle black-key shadow, and brown pressed keys. Both show a white dot on pressed keys. Skin and appearance changes preserve the SVG root, key nodes, geometry and pressed notes, including notes outside the range.

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

Resolution starts with Minimal defaults, applies the selected skin's tokens, and then applies explicit instance overrides. Skin selection keeps current overrides. Use `setOptions({ skin: undefined })` to return to Minimal. Custom colors may require contrast checks in the target host. An explicit high-contrast policy is planned for Phase 10.

| `AppearanceOptions` field | Accepted value |
| --- | --- |
| `background` | Color. Use `'transparent'` to show the host background. |
| `white`, `black` | Color or `{ stops: [{ offset, color }, ...] }`. A gradient takes 2–8 stops in nondecreasing order, with numeric offsets from 0 through 1. It runs from the rear to the front of each key. An override replaces the entire paint. |
| `boundary` | Key border color. |
| `strokeWidth`, `cornerRadius` | Finite nonnegative numbers in SVG user units. Zero disables the corresponding effect. SVG limits the rendered radius to the rectangle's bounds. |
| `pressed` | Solid pressed-key color for both white and black keys. |
| `blackKeyShadow` | Shadow opacity from 0 through 1. The renderer supplies the offset and blur. Zero disables the shadow. |

Colors accept `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA` and `'transparent'`. Unknown names and fields, unsupported paint syntax and malformed tokens throw `TypeError`. Out-of-range numeric tokens throw `RangeError`. The root exports `BuiltInSkin`, `AppearanceOptions`, `AppearanceColor`, `KeyPaint`, `KeyGradient` and `GradientStop`.

Gradient and shadow definitions travel with the SVG and use instance-specific IDs. The public static SVG API and its inline custom-skin options are scheduled for Phase 9.

## Pressed-key motion

```ts
piano.setOptions({ animation: { duration: 180, easing: 'ease-in-out' } });
piano.setOptions({ animation: { enabled: false } });
piano.setOptions({ animation: undefined }); // Restore the selected skin's motion defaults
```

Motion is enabled by default. Minimal and custom skins use 120 ms with `ease-out`. Classic uses 160 ms with `ease-in-out`. The exported `AnimationOptions` accepts a finite duration from 0 through 1000 ms and an `AnimationEasing` of `linear`, `ease`, `ease-in`, `ease-out` or `ease-in-out`. Overrides survive skin changes. Reset an individual field with `undefined` to use the current skin's default.

Mounted keyboards fade the existing pressed dot and transition between solid key fills. Classic's gradient-to-color fill changes are immediate, with its dot still fading. Logical note state and SVG attributes update immediately. The motion stylesheet belongs to the mounted instance, so exported SVG shows the final appearance on its own.

`enabled: false` or a zero duration disables motion. Otherwise, the CSS media query enables transitions only when `prefers-reduced-motion: no-preference` matches. Preference changes take effect while mounted without JavaScript media-query listeners. Hosts that lack the CSS media feature show the final appearance immediately, and the JavaScript `matchMedia` API is optional. Anki clients remain unverified.

## Internal geometry

The engine takes a normalized MIDI range, orientation, and key dimensions in SVG user units. It returns frozen bounds for each included MIDI note in draw order, with whites before blacks. It keeps the full rectangle of each endpoint black key and the full white-key depth of the viewport. The vertical layout rotates those bounds so lower notes are at the bottom. Logical point lookup reads the same bounds. The mounted renderer and private SVG serializer use the same scene derived from this layout and the resolved appearance. [Layout ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
