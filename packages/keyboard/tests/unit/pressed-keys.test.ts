import { expect, it } from 'vitest';
import { normalizeConfig } from '../../src/config/normalize.js';
import { normalizeNote } from '../../src/notes/notation.js';
import { PressedKeys } from '../../src/state/pressed-keys.js';

it('stores canonical MIDI notes in Node and returns sorted, detached snapshots', () => {
  expect(typeof window).toBe('undefined');
  expect(typeof document).toBe('undefined');
  const pressed = new PressedKeys();

  expect(pressed.snapshot()).toEqual([]);
  expect(pressed.press(127)).toBe(true);
  expect(pressed.press(61)).toBe(true);
  expect(pressed.press(0)).toBe(true);
  expect(pressed.press(0)).toBe(false);
  expect(pressed.release(60)).toBe(false);
  expect(pressed.has(61)).toBe(true);
  expect(pressed.snapshot()).toEqual([0, 61, 127]);
  pressed.snapshot().splice(0, 3, 60);
  expect(pressed.snapshot()).toEqual([0, 61, 127]);
  expect(pressed.release(61)).toBe(true);
  expect(pressed.release(61)).toBe(false);
  expect(pressed.snapshot()).toEqual([0, 127]);
});

it('reports only changed notes on replacement and retains its own set', () => {
  const pressed = new PressedKeys();
  const chord = ['G4', 'E4', 'B#3', 60].map(note => normalizeNote(note));
  expect(pressed.replace(new Set(chord))).toEqual([67, 64, 60]);
  expect(pressed.snapshot()).toEqual([60, 64, 67]);
  expect(pressed.replace(new Set([60, 64, 67]))).toEqual([]);
  const next = new Set([60, 61, 67]);
  expect(pressed.replace(next)).toEqual([64, 61]);
  next.clear();
  expect(pressed.snapshot()).toEqual([60, 61, 67]);
  expect(pressed.replace(new Set())).toEqual([60, 61, 67]);
  expect(pressed.replace(new Set())).toEqual([]);
  expect(pressed.snapshot()).toEqual([]);
});

it('preserves MIDI identities when the notation used for new inputs changes', () => {
  const pressed = new PressedKeys();
  const first = normalizeConfig({ notation: { octaveOffset: 1 } });
  pressed.press(normalizeNote('C5', first.notation));
  const next = normalizeConfig({ notation: { octaveOffset: 0 } }, first);

  expect(pressed.snapshot()).toEqual([60]);
  pressed.press(normalizeNote('C5', next.notation));
  expect(pressed.snapshot()).toEqual([60, 72]);
});
