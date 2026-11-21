import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../../src/config/normalize.js';
import type { KeyDimensions, Orientation } from '../../src/config/normalize.js';
import { findNoteAtPoint } from '../../src/geometry/hit-testing.js';
import { calculateLayout } from '../../src/geometry/layout.js';
import type { KeyboardLayout } from '../../src/geometry/layout.js';
import { classifyNote } from '../../src/notes/notation.js';
import type { MidiRange, NoteRange } from '../../src/notes/ranges.js';

const defaultDimensions = normalizeConfig().sizing;

function layoutFor(range: NoteRange, orientation: Orientation = 'horizontal'): KeyboardLayout {
  const config = normalizeConfig({ range, orientation });
  return calculateLayout(config.range, config.orientation, config.sizing);
}

describe('accepted keyboard geometry', () => {
  it.each([
    { from: 'C4', to: 'B4', width: 140, count: 12 },
    { from: 'C3', to: 'C5', width: 300, count: 25 },
    { from: 'A0', to: 'C8', width: 1040, count: 88 },
    { from: 0, to: 127, width: 1500, count: 128 },
    { from: 'C#4', to: 'Eb4', width: 32, count: 3 },
    { from: 'C4', to: 'C#4', width: 26, count: 2 },
    { from: 'Db4', to: 'D4', width: 26, count: 2 },
    { from: 'C4', to: 'C4', width: 20, count: 1 },
    { from: 'C#4', to: 'C#4', width: 12, count: 1 },
  ])('lays out $from–$to in both orientations', ({ from, to, width, count }) => {
    const horizontal = layoutFor({ from, to });
    const vertical = layoutFor({ from, to }, 'vertical');

    expect(horizontal).toMatchObject({ orientation: 'horizontal', width, height: 100 });
    expect(horizontal.keys).toHaveLength(count);
    expect(vertical).toEqual({
      orientation: 'vertical',
      width: 100,
      height: width,
      keys: horizontal.keys.map(({ note, kind, bounds }) => ({
        note,
        kind,
        bounds: {
          x: bounds.y,
          y: width - bounds.x - bounds.width,
          width: bounds.height,
          height: bounds.width,
        },
      })),
    });
  });

  it('places an octave on consecutive white slots and centers blacks over the seams', () => {
    const { keys } = layoutFor({ from: 'C4', to: 'B4' });
    expect(keys).toEqual([
      ...[60, 62, 64, 65, 67, 69, 71].map((note, slot) => ({
        note, kind: 'white', bounds: { x: slot * 20, y: 0, width: 20, height: 100 },
      })),
      ...[[61, 14], [63, 34], [66, 74], [68, 94], [70, 114]].map(([note, x]) => ({
        note, kind: 'black', bounds: { x, y: 0, width: 12, height: 60 },
      })),
    ]);
  });

  it('keeps the full black rectangles at both endpoints', () => {
    const range = { from: 'Db4', to: 'D♯4' };
    expect(layoutFor(range).keys).toEqual([
      { note: 62, kind: 'white', bounds: { x: 6, y: 0, width: 20, height: 100 } },
      { note: 61, kind: 'black', bounds: { x: 0, y: 0, width: 12, height: 60 } },
      { note: 63, kind: 'black', bounds: { x: 20, y: 0, width: 12, height: 60 } },
    ]);
    expect(layoutFor(range, 'vertical').keys).toEqual([
      { note: 62, kind: 'white', bounds: { x: 0, y: 6, width: 100, height: 20 } },
      { note: 61, kind: 'black', bounds: { x: 0, y: 20, width: 60, height: 12 } },
      { note: 63, kind: 'black', bounds: { x: 0, y: 0, width: 60, height: 12 } },
    ]);
  });

  it('keeps full white depth in the viewport of a single black key', () => {
    const range = { from: 'Db4', to: 'C#4' };
    expect(layoutFor(range).keys).toEqual([
      { note: 61, kind: 'black', bounds: { x: 0, y: 0, width: 12, height: 60 } },
    ]);
    expect(layoutFor(range, 'vertical').keys).toEqual([
      { note: 61, kind: 'black', bounds: { x: 0, y: 0, width: 60, height: 12 } },
    ]);
  });
});

describe('layout invariants', () => {
  const notes = Array.from({ length: 128 }, (_, note) => note);
  const whiteNotes = notes.filter((note) => classifyNote(note) === 'white');
  const blackNotes = notes.filter((note) => classifyNote(note) === 'black');

  it.each(['horizontal', 'vertical'] as const)(
    'covers every inclusive MIDI range in %s draw order with bounds inside its viewport',
    (orientation) => {
      for (const from of notes) {
        for (let to = from; to < notes.length; to++) {
          const layout = calculateLayout({ from, to }, orientation, defaultDimensions);
          const expected = [...whiteNotes, ...blackNotes].filter((note) => note >= from && note <= to);
          if (layout.keys.length !== to - from + 1 || layout.keys.some((key, index) => {
            const { x, y, width, height } = key.bounds;
            return key.note !== expected[index] || key.kind !== classifyNote(key.note) ||
              ![x, y, width, height].every(Number.isFinite) ||
              x < 0 || y < 0 || width <= 0 || height <= 0 ||
              x + width > layout.width || y + height > layout.height;
          })) {
            throw new Error(`Invalid ${orientation} geometry for MIDI ${from}–${to}`);
          }
        }
      }
    },
  );

  it('is deterministic, leaves inputs intact, and freezes the entire result', () => {
    const range = Object.freeze({ from: 61, to: 66 });
    const dimensions = Object.freeze({
      whiteKeyWidth: 17, whiteKeyHeight: 90, blackKeyWidth: 9, blackKeyHeight: 67,
    });
    const layout = calculateLayout(range, 'horizontal', dimensions);
    expect(layout).toEqual(calculateLayout({ ...range }, 'horizontal', { ...dimensions }));
    expect(range).toEqual({ from: 61, to: 66 });
    expect(dimensions).toEqual({
      whiteKeyWidth: 17, whiteKeyHeight: 90, blackKeyWidth: 9, blackKeyHeight: 67,
    });
    expect(Object.isFrozen(layout)).toBe(true);
    expect(Object.isFrozen(layout.keys)).toBe(true);
    for (const key of layout.keys) {
      expect(Object.isFrozen(key)).toBe(true);
      expect(Object.isFrozen(key.bounds)).toBe(true);
    }
  });

  it('uses fractional key dimensions and keeps host viewport dimensions out of intrinsic bounds', () => {
    const { range, sizing } = normalizeConfig({
      range: { from: 'Db4', to: 'Eb4' },
      sizing: {
        mode: 'fixed', width: 400, height: 200,
        whiteKeyWidth: 0.3, whiteKeyHeight: 0.9, blackKeyWidth: 0.1, blackKeyHeight: 0.6,
      },
    });
    const horizontal = calculateLayout(range, 'horizontal', sizing);
    const vertical = calculateLayout(range, 'vertical', sizing);

    // Compare calculated sums at 12 decimal digits to allow binary rounding.
    expect(horizontal.width).toBeCloseTo(0.4, 12);
    expect(horizontal.height).toBe(0.9);
    expect(horizontal.keys.map(({ bounds }) => bounds.x)).toEqual([0.05, 0, 0.3]);
    expect(horizontal.keys.map(({ bounds }) => bounds.width)).toEqual([0.3, 0.1, 0.1]);
    expect(horizontal.keys.map(({ bounds }) => bounds.height)).toEqual([0.9, 0.6, 0.6]);
    expect(vertical.width).toBe(0.9);
    expect(vertical.height).toBeCloseTo(0.4, 12);
    expect(vertical.keys[0].bounds.y).toBeCloseTo(0.05, 12);
    expect(vertical.keys[1].bounds.y).toBeCloseTo(0.3, 12);
    expect(vertical.keys[2].bounds.y).toBe(0);
  });

  it('keeps the rotated bottom edge inside the viewport when subtraction rounds up', () => {
    const dimensions = { ...defaultDimensions, whiteKeyWidth: 0.7, blackKeyWidth: 0.3 };
    const layout = calculateLayout({ from: 61, to: 62 }, 'vertical', dimensions);
    const { y, height } = layout.keys[1].bounds;
    expect(layout.height).toBeCloseTo(0.85, 12);
    expect(y).toBeCloseTo(0.55, 12);
    expect(y + height).toBeLessThanOrEqual(layout.height);
  });

  it.each([1e-300, 1e305])('preserves large and small representable layouts at scale %s', (scale) => {
    const dimensions = {
      whiteKeyWidth: 2 * scale, whiteKeyHeight: 4 * scale,
      blackKeyWidth: scale, blackKeyHeight: 3 * scale,
    };
    for (const orientation of ['horizontal', 'vertical'] as const) {
      const layout = calculateLayout({ from: 0, to: 127 }, orientation, dimensions);
      const pitch = orientation === 'horizontal' ? layout.width : layout.height;
      // Compare relative values so the same tolerance applies at either scale.
      expect(pitch / scale).toBeCloseTo(150, 12);
      expect(layout.keys).toHaveLength(128);
      for (const { bounds: { x, y, width, height } } of layout.keys) {
        expect([x, y, width, height].every(Number.isFinite)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(width).toBeGreaterThan(0);
        expect(height).toBeGreaterThan(0);
        expect(x + width).toBeLessThanOrEqual(layout.width);
        expect(y + height).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it('keeps a single black key at the origin even when its half-width underflows', () => {
    const dimensions = {
      ...defaultDimensions, whiteKeyWidth: 2 * Number.MIN_VALUE, blackKeyWidth: Number.MIN_VALUE,
    };
    const layout = calculateLayout({ from: 61, to: 61 }, 'vertical', dimensions);
    expect(layout.height).toBe(Number.MIN_VALUE);
    expect(layout.keys[0].bounds).toEqual({ x: 0, y: 0, width: 60, height: Number.MIN_VALUE });
  });
});

describe('layout input validation', () => {
  it.each([
    [{ from: 61, to: 60 }, RangeError],
    [{ from: -1, to: 60 }, RangeError],
    [{ from: 60, to: 128 }, RangeError],
    [{ from: 60, to: 61.5 }, RangeError],
    [{ from: NaN, to: 60 }, RangeError],
    [{ from: 'C4', to: 60 }, TypeError],
  ])('rejects invalid normalized ranges %j', (range, error) => {
    expect(() => calculateLayout(range as MidiRange, 'horizontal', defaultDimensions)).toThrow(error);
  });

  it.each([
    [{ whiteKeyWidth: -1 }, RangeError],
    [{ whiteKeyHeight: Infinity }, RangeError],
    [{ blackKeyWidth: 0 }, RangeError],
    [{ blackKeyWidth: 20 }, RangeError],
    [{ blackKeyHeight: 101 }, RangeError],
    [{ blackKeyHeight: NaN }, RangeError],
    [{ blackKeyHeight: '60' }, TypeError],
  ])('rejects invalid key dimensions %j', (patch, error) => {
    const dimensions = { ...defaultDimensions, ...patch };
    expect(() => calculateLayout({ from: 60, to: 60 }, 'horizontal', dimensions as KeyDimensions))
      .toThrow(error);
  });

  it('rejects unsupported orientations', () => {
    expect(() => calculateLayout({ from: 60, to: 60 }, 'diagonal' as Orientation, defaultDimensions))
      .toThrow(TypeError);
  });

  it('reports overflow for the selected range while allowing a representable single key', () => {
    const dimensions = { ...defaultDimensions, whiteKeyWidth: Number.MAX_VALUE };
    expect(calculateLayout({ from: 60, to: 60 }, 'horizontal', dimensions).width).toBe(Number.MAX_VALUE);
    expect(() => calculateLayout({ from: 60, to: 62 }, 'horizontal', dimensions)).toThrow(RangeError);
  });
});

describe('logical hit testing', () => {
  const range = { from: 'C#4', to: 'D#4' };
  const horizontal = layoutFor(range);
  const vertical = layoutFor(range, 'vertical');

  it.each([
    [0, 0, 61], [7, 10, 61], [7, 60, 62], [12, 10, 62], [20, 10, 63],
    [0, 60, null], [26, 60, null], [32, 10, null], [7, 100, null], [-1, 5, null],
  ])('looks up horizontal point (%s, %s)', (x, y, note) => {
    expect(findNoteAtPoint(horizontal, x, y)).toBe(note);
  });

  it.each([
    [0, 0, 63], [10, 11, 63], [10, 12, 62], [10, 20, 61], [60, 25, 62],
    [60, 3, null], [60, 26, null], [10, 32, null], [100, 15, null],
  ])('looks up vertical point (%s, %s)', (x, y, note) => {
    expect(findNoteAtPoint(vertical, x, y)).toBe(note);
  });

  it('assigns a shared white edge to the rectangle that starts there', () => {
    const layout = layoutFor({ from: 'C4', to: 'D4' });
    expect(findNoteAtPoint(layout, 19.99, 60)).toBe(60);
    expect(findNoteAtPoint(layout, 20, 60)).toBe(62);
  });

  it.each([[NaN, 2], [2, Infinity], [-Infinity, 2]])('rejects non-finite coordinates', (x, y) => {
    expect(() => findNoteAtPoint(horizontal, x, y)).toThrow(RangeError);
  });

  it('rejects nonnumeric coordinates', () => {
    expect(() => findNoteAtPoint(horizontal, '7' as unknown as number, 10)).toThrow(TypeError);
  });
});
