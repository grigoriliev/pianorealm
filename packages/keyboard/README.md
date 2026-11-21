# @pianorealm/keyboard

Phase 2 adds a DOM-independent geometry engine and logical point lookup to the Pianorealm keyboard visualization package. The private package builds a local ESM entry with TypeScript declarations for its public note utilities. [Project state](PROJECT_STATE.md)

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

## Note utilities

- `normalizeNote(note, notation?)` returns a MIDI integer from 0 through 127. It accepts a MIDI number or a trimmed string with an ASCII letter A–G (case-insensitive), one optional accidental (`#`, `b`, `♯`, or `♭`), and a decimal octave with an optional leading minus. The accidental is applied before range validation. For example, B#3 maps to 60 and Cb4 maps to 59. Numeric strings, a leading plus, and double accidentals are invalid.
- `formatNote(midi, notation?)` defaults to scientific pitch notation (C4 = 60) and ASCII sharps. Use `accidentalPreference: 'flat'` for ASCII flats. Either spelling is accepted on input. A positive integer `octaveOffset` raises displayed octaves. With offset 1, MIDI 60 formats as C5, and C5 parses to 60. Offsets must be safe integers and leave numeric MIDI inputs unchanged.
- `classifyNote(midi)` returns `'white'` or `'black'` based on pitch class.

The root also exports the types `NoteInput`, `NotationOptions`, and `KeyKind`. Malformed syntax, unsupported argument types, and unknown option fields throw `TypeError`. Numeric domain violations throw `RangeError`.

## Internal configuration

Ranges are inclusive. Their endpoints accept the same inputs as `normalizeNote`, and equal endpoints are valid, including a single black key. Reversed ranges throw `RangeError`. Defaults are A0–C8 (MIDI 21–108), horizontal orientation, default notation, and container sizing with white keys 20 × 100 and black keys 12 × 60 in pitch-axis width × depth.

A patch merges notation and sizing fields and replaces a range as a whole. New range names use the patched notation, while existing ranges retain their MIDI identities. An omitted field keeps its current value and an explicit `undefined` resets it. Dimensions must be positive and finite. Black keys must be narrower than white keys and may be equally deep. Optional viewport dimensions apply in fixed sizing mode. Validated configuration is returned as a frozen snapshot, and a rejected patch leaves the previous snapshot unchanged.

## Internal geometry

The engine takes a normalized MIDI range, orientation, and key dimensions in SVG user units. It returns frozen bounds for each included MIDI note in draw order, with whites before blacks. It keeps the full rectangle of each endpoint black key and the full white-key depth of the viewport. The vertical layout rotates those bounds so lower notes are at the bottom. Logical point lookup reads the same bounds. The next milestone is to use this layout in the shared SVG scene. [Layout ADR](docs/decisions/0002-layout-sizing-and-hit-testing.md)
