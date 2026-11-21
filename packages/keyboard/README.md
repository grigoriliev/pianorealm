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

Use **Highlight C major** (C4, E4, G4) or **Highlight F♯ minor** (F♯3, A3, C♯4) to replace the selection on all three keyboards. **Clear highlights** releases all notes. Each **Download SVG** button saves the SVG currently mounted in that card, including its highlights. The demo uses the source entry point, so it works without a prior build. It lives under `demo/` and is excluded from the production library bundle.

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

The constructor accepts `container`, `range`, `orientation`, `notation` and `sizing` through `KeyboardOptions`. The `Orientation` type is `'horizontal' | 'vertical'`. Range and orientation updates validate before replacing the current drawing. Each host allows one live keyboard, and `destroy()` removes that keyboard's content while preserving the host's other children and styles. Repeated `destroy()` calls are safe. The other instance methods throw after destruction.

Container mode fits the intrinsic geometry inside the content box with uniform scaling and centered letterboxing. A disconnected, hidden, or zero-size host waits for a usable viewport. The adapter observes size changes where `ResizeObserver` is available. Use `resize()` after a host change if observation is unavailable or you need an immediate update. In fixed mode, `sizing.width` and `sizing.height` set the viewport in CSS pixels, with each omitted dimension taken from the oriented geometry. Fixed keyboards can be constructed while their host is detached.

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

`getPressedKeys()` returns a new array in ascending MIDI order. It includes any valid MIDI note still pressed outside the displayed range. Changing the visible range, flipping orientation, or resizing preserves that selection. `pressKey` adds one note, `releaseKey` removes one note, and `clearPressedKeys` releases all notes. Repeating a command with the same result leaves the drawing untouched.

## Configuration

Ranges are inclusive. Their endpoints accept the same inputs as `normalizeNote`, and equal endpoints are valid, including a single black key. Reversed ranges throw `RangeError`. Defaults are A0–C8 (MIDI 21–108), horizontal orientation, default notation, and container sizing with white keys 20 × 100 and black keys 12 × 60 in pitch-axis width × depth.

Internally, configuration patches merge notation and sizing fields and replace a range as a whole. New range names use the patched notation, while existing ranges retain their MIDI identities. An omitted field keeps its current value and an explicit `undefined` resets it. Dimensions must be positive and finite. Black keys must be narrower than white keys and may be equally deep. Optional viewport dimensions apply in fixed sizing mode. Validated configuration is returned as a frozen snapshot, and a rejected patch leaves the previous snapshot unchanged.

## Internal geometry

The engine takes a normalized MIDI range, orientation, and key dimensions in SVG user units. It returns frozen bounds for each included MIDI note in draw order, with whites before blacks. It keeps the full rectangle of each endpoint black key and the full white-key depth of the viewport. The vertical layout rotates those bounds so lower notes are at the bottom. Logical point lookup reads the same bounds. The mounted renderer and private SVG serialization prototype use the same scene derived from this layout. [Layout ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
