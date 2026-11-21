import { validateRecord } from '../internal/validate-record.js';

export type NoteInput = number | string;
export type KeyKind = 'white' | 'black';

export interface NotationOptions {
  readonly accidentalPreference?: 'sharp' | 'flat' | undefined;
  readonly octaveOffset?: number | undefined;
}

export const defaultNotation = Object.freeze({
  accidentalPreference: 'sharp',
  octaveOffset: 0,
} satisfies Required<NotationOptions>);

const NATURALS = new Map([
  ['C', 0], ['D', 2], ['E', 4], ['F', 5], ['G', 7], ['A', 9], ['B', 11],
]);
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_NAME = /^([A-Ga-g])([#b♯♭]?)(-?[0-9]+)$/;

export function validateNotation(options: NotationOptions) {
  validateRecord(options, ['accidentalPreference', 'octaveOffset'], 'notation');
  const { accidentalPreference = defaultNotation.accidentalPreference, octaveOffset = defaultNotation.octaveOffset } = options;

  if (accidentalPreference !== 'sharp' && accidentalPreference !== 'flat') {
    throw new TypeError('Notation accidentalPreference must be "sharp" or "flat"');
  }
  if (typeof octaveOffset !== 'number') {
    throw new TypeError('Notation octaveOffset must be a number');
  }
  if (!Number.isSafeInteger(octaveOffset)) {
    throw new RangeError('Notation octaveOffset must be a safe integer');
  }
  return Object.freeze({ accidentalPreference, octaveOffset });
}

function validateMidi(note: unknown): number {
  if (typeof note !== 'number') {
    throw new TypeError('A MIDI note must be a number');
  }
  if (!Number.isInteger(note) || note < 0 || note > 127) {
    throw new RangeError('A MIDI note must be an integer from 0 to 127');
  }
  return note === 0 ? 0 : note;
}

/** Normalize a MIDI integer or a scientific note name to MIDI identity. */
export function normalizeNote(note: NoteInput, notation: NotationOptions = {}): number {
  const { octaveOffset } = validateNotation(notation);
  if (typeof note === 'number') return validateMidi(note);
  if (typeof note !== 'string') {
    throw new TypeError('A note must be a MIDI number or a note-name string');
  }

  const match = NOTE_NAME.exec(note.trim());
  if (!match) {
    throw new TypeError('Expected a note name such as C4, F#3, or C-1');
  }
  const [, letter, sign, octave] = match;
  const pitch = NATURALS.get(letter.toUpperCase())!;
  const accidental = sign === '' ? 0 : sign === '#' || sign === '♯' ? 1 : -1;
  const midi = 12n * (BigInt(octave) + 1n - BigInt(octaveOffset)) + BigInt(pitch + accidental);
  return validateMidi(Number(midi));
}

/** Format a MIDI note using the selected accidental spelling and display octave. */
export function formatNote(note: number, notation: NotationOptions = {}): string {
  const { accidentalPreference, octaveOffset } = validateNotation(notation);
  const midi = validateMidi(note);
  const names = accidentalPreference === 'flat' ? FLAT_NAMES : SHARP_NAMES;
  const octave = BigInt(Math.floor(midi / 12) - 1) + BigInt(octaveOffset);
  return `${names[midi % 12]}${octave}`;
}

/** Classify a validated MIDI note by pitch class. */
export function classifyNote(note: number): KeyKind {
  return SHARP_NAMES[validateMidi(note) % 12].length === 1 ? 'white' : 'black';
}
