import { validateRecord } from '../internal/validate-record.js';
import { normalizeNote, validateMidi } from './notation.js';
import type { NotationOptions, NoteInput } from './notation.js';

export type NoteRange = Readonly<{ from: NoteInput; to: NoteInput }>;
export type MidiRange = Readonly<{ from: number; to: number }>;

function validateRangeOrder(from: number, to: number): void {
  if (from > to) {
    throw new RangeError('Range "from" must be less than or equal to "to"');
  }
}

export function validateMidiRange(range: MidiRange): void {
  validateRecord(range, ['from', 'to'], 'range');
  validateRangeOrder(validateMidi(range.from), validateMidi(range.to));
}

export function normalizeRange(range: NoteRange, notation: NotationOptions): MidiRange {
  validateRecord(range, ['from', 'to'], 'range');
  const from = normalizeNote(range.from, notation);
  const to = normalizeNote(range.to, notation);
  validateRangeOrder(from, to);
  return Object.freeze({ from, to });
}
