import { describe, expect, it } from 'vitest';
import { classifyNote, formatNote, normalizeNote } from '../../src/index.js';
import type { NoteInput } from '../../src/index.js';

describe('normalizeNote', () => {
  it.each([
    ['C4', 60], ['C-1', 0], ['G9', 127], ['F#3', 54], ['Gb3', 54],
    [' f♯3 ', 54], ['G♭3', 54], ['B#3', 60], ['Cb4', 59],
    ['B#-2', 0],
  ] as const)('normalizes %s', (name, midi) => {
    expect(normalizeNote(name)).toBe(midi);
  });

  it.each([-1, 128, 60.5, NaN, Infinity, -Infinity])('rejects invalid MIDI %s', note => {
    expect(() => normalizeNote(note)).toThrow(RangeError);
    expect(() => formatNote(note)).toThrow(RangeError);
    expect(() => classifyNote(note)).toThrow(RangeError);
  });

  it.each(['H4', 'C##4', 'C+4', 'C 4', 'C4.5', '60', '', true, null, undefined, 60n, {}])(
    'rejects malformed input %s', input => {
      expect(() => normalizeNote(input as NoteInput)).toThrow(TypeError);
    },
  );

  it.each(['Cb-1', 'G#9', 'C999999999999999999999999'])('rejects out-of-range %s', name => {
    expect(() => normalizeNote(name)).toThrow(RangeError);
  });

  it('keeps numeric MIDI identity when display notation changes', () => {
    expect(normalizeNote(60, { octaveOffset: 1 })).toBe(60);
  });
});

describe('formatNote', () => {
  it('uses sharps by default and supports flat spellings', () => {
    expect(formatNote(60)).toBe('C4');
    expect(formatNote(61)).toBe('C#4');
    expect(formatNote(61, { accidentalPreference: 'flat' })).toBe('Db4');
    expect(normalizeNote('C#4', { accidentalPreference: 'flat' })).toBe(61);
  });

  it('applies the offset to formatting and parsing', () => {
    expect(formatNote(60, { octaveOffset: 1 })).toBe('C5');
    expect(normalizeNote('C5', { octaveOffset: 1 })).toBe(60);
  });

  it.each([0, 1, -2, Number.MAX_SAFE_INTEGER])('round-trips all MIDI values at offset %s', octaveOffset => {
    for (let midi = 0; midi <= 127; midi++) {
      expect(normalizeNote(formatNote(midi, { octaveOffset }), { octaveOffset })).toBe(midi);
      expect(normalizeNote(formatNote(midi, { octaveOffset, accidentalPreference: 'flat' }), { octaveOffset })).toBe(midi);
    }
  });

  it('validates notation options', () => {
    expect(() => formatNote(60, { octaveOffset: 1.5 })).toThrow(RangeError);
    expect(() => formatNote(60, { accidentalPreference: 'flats' } as never)).toThrow(TypeError);
    expect(() => normalizeNote(60, { extra: 1 } as never)).toThrow(TypeError);
  });
});

it('classifies each pitch class across the entire MIDI range', () => {
  const black = [1, 3, 6, 8, 10];
  for (let midi = 0; midi <= 127; midi++) {
    expect(classifyNote(midi)).toBe(black.includes(midi % 12) ? 'black' : 'white');
  }
});
