import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../../src/config/normalize.js';
import { calculateLayout } from '../../src/geometry/layout.js';
import { findNoteAtPoint } from '../../src/geometry/hit-testing.js';
import { buildScene } from '../../src/scene/build-scene.js';
import { minimalAppearance } from '../../src/skins/appearance.js';
import { serializeScene } from '../../src/svg/serialize.js';

const ranges = [
  ['C4', 'B4'],
  ['C3', 'C5'],
  ['C4', 'C#4'],
  ['C#4', 'D#4'],
  ['C4', 'C4'],
  ['C#4', 'C#4'],
] as const;

describe.each(['horizontal', 'vertical'] as const)('%s scene', orientation => {
  it.each(ranges)('preserves the layout and ordering for %s–%s', (from, to) => {
    const config = normalizeConfig({ range: { from, to }, orientation });
    const layout = calculateLayout(config.range, config.orientation, config.sizing);
    const scene = buildScene(config, layout, minimalAppearance);
    const { from: first, to: last } = config.range;

    expect(scene).toEqual(buildScene(config, layout, minimalAppearance));
    expect(scene).toMatchObject({ width: layout.width, height: layout.height });
    expect(scene.keys.map(({ note, kind, bounds }) => ({ note, kind, bounds }))).toEqual(layout.keys);
    expect(scene.keys.map(key => key.note).sort((a, b) => a - b))
      .toEqual(Array.from({ length: last - first + 1 }, (_, index) => first + index));
    const whites = scene.keys.filter(key => key.kind === 'white');
    const blacks = scene.keys.filter(key => key.kind === 'black');
    expect(scene.keys).toEqual([...whites, ...blacks]);
    for (const layer of [whites, blacks]) {
      const notes = layer.map(key => key.note);
      expect(notes).toEqual([...notes].sort((a, b) => a - b));
    }
    expect(scene.keys.every(key => key.fill === minimalAppearance[key.kind])).toBe(true);
    expect(Object.isFrozen(scene) && Object.isFrozen(scene.keys)).toBe(true);
    expect(scene.keys.every(Object.isFrozen)).toBe(true);
  });

  it('keeps pressed indicators inside visible key faces even when black keys extend to full depth', () => {
    const config = normalizeConfig({
      range: { from: 61, to: 63 },
      orientation,
      sizing: { blackKeyHeight: 100, blackKeyWidth: 18 },
    });
    const layout = calculateLayout(config.range, config.orientation, config.sizing);
    const scene = buildScene(config, layout, minimalAppearance, new Set([0, 61, 62, 127]));
    expect(scene.keys.filter(key => key.fill === minimalAppearance.pressed).map(key => key.note))
      .toEqual([62, 61]);
    for (const { note, indicator: { cx, cy, r } } of scene.keys) {
      expect(r).toBeGreaterThan(0);
      for (const [x, y] of [[cx - r, cy], [cx + r, cy], [cx, cy - r], [cx, cy + r]]) {
        expect(findNoteAtPoint(layout, x, y)).toBe(note);
      }
    }
  });
});

it('builds and serializes a named scene in Node without browser globals', () => {
  expect(typeof window).toBe('undefined');
  expect(typeof document).toBe('undefined');
  const config = normalizeConfig({
    range: { from: 61, to: 61 },
    orientation: 'vertical',
    notation: { accidentalPreference: 'flat' },
  });
  const layout = calculateLayout(config.range, config.orientation, config.sizing);
  const scene = buildScene(config, layout, minimalAppearance, new Set([60, 61, 127]));

  expect(scene.label).toBe('Vertical piano keyboard, Db4');
  const svg = serializeScene(scene);
  expect(svg).toBe(serializeScene(scene));
  expect(svg).toContain('width="100" height="12" viewBox="0 0 100 12"');
  expect(svg).toContain('data-note="61" x="0" y="0" width="60" height="12"');
  expect(svg).toContain(`fill="${minimalAppearance.pressed}"`);
  expect(svg).toContain('display="inline"');
  expect(() => serializeScene(scene, { width: Infinity, height: 12 })).toThrow(RangeError);
});
