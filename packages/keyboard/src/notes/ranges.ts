import { validateRecord } from '../internal/validate-record.js';
import { normalizeNote } from './notation.js';
import type { NotationOptions, NoteInput } from './notation.js';

export type NoteRange = Readonly<{ from: NoteInput; to: NoteInput }>;
export type MidiRange = Readonly<{ from: number; to: number }>;

export function normalizeRange(range: NoteRange, notation: NotationOptions): MidiRange {
  validateRecord(range, ['from', 'to'], 'range');
  const from = normalizeNote(range.from, notation);
  const to = normalizeNote(range.to, notation);
  if (from > to) {
    throw new RangeError('Range "from" must be less than or equal to "to"');
  }
  return Object.freeze({ from, to });
}
