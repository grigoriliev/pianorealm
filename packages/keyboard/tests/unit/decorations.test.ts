import { describe, expect, it } from 'vitest';
import type { KeyboardOptionsPatch } from '../../src/index.js';
import { normalizeConfig } from '../../src/config/normalize.js';
import { calculateLayout } from '../../src/geometry/layout.js';
import { findNoteAtPoint } from '../../src/geometry/hit-testing.js';
import { buildScene } from '../../src/scene/build-scene.js';
import { serializeScene } from '../../src/svg/serialize.js';

function sceneFor(options: KeyboardOptionsPatch, pressed: readonly number[] = []) {
  const config = normalizeConfig(options);
  const layout = calculateLayout(config.range, config.orientation, config.sizing);
  return { layout, scene: buildScene(config, layout, config.appearance, new Set(pressed)) };
}

it('merges label and indicator fields, replaces note maps and keeps normalized identities', () => {
  const config = normalizeConfig({
    notation: { accidentalPreference: 'flat', octaveOffset: 1 },
    labels: { mode: 'note', custom: { C5: 'Middle C', 61: 'Db' }, emphasizeC: true },
    highlights: { 'B#4': '#123' },
    indicator: { size: 4, stroke: '#123', opacity: 0.7 },
  });
  expect(config.labels.custom).toEqual(new Map([[60, 'Middle C'], [61, 'Db']]));
  expect(config.highlights.get(60)).toBe('#123');
  const updated = normalizeConfig({
    notation: undefined,
    labels: { emphasizeC: undefined },
    indicator: { size: undefined, opacity: 0.5 },
  }, config);
  expect(updated.labels).toEqual({ ...config.labels, emphasizeC: false });
  expect(updated.indicator).toEqual({ size: undefined, stroke: '#123', opacity: 0.5 });
  expect(normalizeConfig({ labels: { custom: { C5: 'High C' } } }, updated).labels.custom)
    .toEqual(new Map([[72, 'High C']]));
  expect(normalizeConfig({ labels: undefined, indicator: undefined }, updated).labels.mode).toBe('none');
});

it.each([
  ['note', ['B3', 'C4', 'C#4']],
  ['midi', ['59', '60', '61']],
  ['octave', ['3', '4', '4']],
] as const)('renders %s labels and C-note emphasis', (mode, expected) => {
  const { scene } = sceneFor({ range: { from: 59, to: 61 }, labels: { mode, emphasizeC: true } });
  expect(scene.keys.map(key => key.decorations.labels[0]?.text)).toEqual(expected);
  expect(scene.keys[1].decorations.labels[0].attributes['font-weight']).toBe(700);
  expect(scene.keys[1].decorations.highlights[0].attributes.fill).toBe('#167286');
  expect(scene.keys[0].decorations.highlights).toHaveLength(0);
});

it('spells flats with the configured octave and honors custom labels and explicit highlights', () => {
  const { scene } = sceneFor({
    range: { from: 60, to: 62 },
    notation: { accidentalPreference: 'flat', octaveOffset: 1 },
    labels: { mode: 'note', emphasizeC: true, custom: { 60: 'Do', 62: '', 127: 'Absent' } },
    highlights: { C5: '#fa0', 127: '#fa0' },
  });
  expect(scene.keys.map(key => [key.note, key.decorations.labels[0]?.text])).toEqual([
    [60, 'Do'], [62, undefined], [61, 'Db5'],
  ]);
  expect(scene.keys[0].decorations.highlights[0].attributes.fill).toBe('#fa0');
  expect(scene.definitions.map(definition => definition.slot)).toEqual(['key-clip-60', 'key-clip-61']);
});

describe.each(['horizontal', 'vertical'] as const)('%s decorated scene', orientation => {
  it('clips both sides of a fractional white key between full-depth black endpoints', () => {
    const { layout, scene } = sceneFor({
      range: { from: 61, to: 63 }, orientation,
      sizing: { whiteKeyWidth: 19.5, blackKeyWidth: 12.25, whiteKeyHeight: 60.5, blackKeyHeight: 60.5 },
      overlays: { 62: [{ type: 'circle', size: 100, pitch: 0, depth: 0.25 }] },
      labels: { mode: 'midi' },
      indicator: { shape: 'square', pitch: 0, depth: 1, stroke: '#abc', strokeWidth: 2 },
    }, [61, 62, 63]);
    const clip = scene.definitions.find(definition => definition.slot === 'key-clip-62');
    expect(clip?.kind).toBe('clip');
    if (clip?.kind !== 'clip') throw new Error('Missing white-key clip');
    expect(clip.bounds).toHaveLength(1);
    const [{ x, y, width, height }] = clip.bounds;
    expect(orientation === 'horizontal' ? width : height).toBe(7.25);
    for (const [dx, dy] of [[0.001, 0.001], [width - 0.001, height - 0.001]]) {
      expect(findNoteAtPoint(layout, x + dx, y + dy)).toBe(62);
    }
    expect(findNoteAtPoint(layout, orientation === 'horizontal' ? x - 0.01 : x + 0.01,
      orientation === 'horizontal' ? y + 0.01 : y - 0.01)).toBe(orientation === 'horizontal' ? 61 : 63);
    expect(scene.keys.every(key => key.decorations.labels[0]?.attributes['text-anchor'] === 'middle')).toBe(true);
    for (const key of scene.keys) {
      const indicator = key.indicator;
      const edge = indicator.r + (indicator['stroke-width'] ?? 0) / 2;
      for (const [dx, dy] of [[-edge, -edge], [edge, edge]]) {
        expect(findNoteAtPoint(layout, indicator.cx + dx * 0.99, indicator.cy + dy * 0.99)).toBe(key.note);
      }
    }
  });

  it('omits cramped text and keeps geometry finite for tiny keys', () => {
    const { scene } = sceneFor({
      range: { from: 61, to: 63 }, orientation, labels: { mode: 'note' },
      sizing: { whiteKeyWidth: 0.25, whiteKeyHeight: 0.5, blackKeyWidth: 0.2, blackKeyHeight: 0.5 },
      overlays: { 62: [{ type: 'badge', text: 1 }] },
      indicator: { size: Number.MAX_VALUE, stroke: '#fff', strokeWidth: Number.MAX_VALUE },
    }, [62]);
    expect(scene.keys.every(key => !key.decorations.labels.length && !key.decorations.overlays.length)).toBe(true);
    for (const { indicator } of scene.keys) expect(indicator.r).toBeGreaterThan(0);
    expect(serializeScene(scene)).not.toMatch(/Infinity|NaN/);
  });
});

it('generates deterministic, standalone decorated XML without browser globals', () => {
  expect(typeof document).toBe('undefined');
  const { scene } = sceneFor({
    range: { from: 60, to: 61 }, orientation: 'vertical',
    labels: { custom: { C4: '<&" 🐈\r' } },
    overlays: { 61: [{ type: 'badge', text: 2 }] },
  }, [60, 61]);
  const markup = serializeScene(scene, scene, 'example');
  expect(serializeScene(scene, scene, 'example')).toBe(markup);
  expect(serializeScene(scene)).not.toBe(serializeScene(scene));
  expect(markup).toContain('&lt;&amp;" 🐈&#13;');
  expect(markup).toContain('clip-path="url(#example-key-clip-60)"');
  expect(markup).toContain('id="example-key-clip-60"');
  expect(markup).not.toMatch(/<style|<script|\bhref=/);
});

it.each([
  { labels: { mode: 'other' } }, { labels: { emphasizeC: 'yes' } },
  { labels: { custom: { 61: 'Db', 'C#4': 'C#' } } },
  { labels: { custom: { H4: 'Bad note' } } },
  { labels: { custom: { 60: 'x'.repeat(65) } } },
  { labels: { custom: { 60: '\uD800' } } },
  { highlights: { 128: '#fff' } },
  { highlights: { 61: 'url(https://example.test/paint)' } },
  { pressedMode: 'other' }, { pressedMode: null },
  { indicator: { shape: 'path' } }, { indicator: { pitch: -1 } }, { indicator: { depth: 1.1 } },
  { indicator: { size: Infinity } }, { indicator: { strokeWidth: -1 } }, { indicator: { opacity: NaN } },
  { indicator: { color: '#000" onload="x' } }, { indicator: { stroke: 'currentColor' } },
  { overlays: { '00': [] } },
  { overlays: { 'C#4': [], Db4: [] } },
  { overlays: { C4: { type: 'circle' } } },
  { overlays: { C4: Array(1) } },
  { overlays: { C4: Array.from({ length: 17 }, () => ({ type: 'circle' })) } },
  { overlays: { C4: [{ type: 'path', d: 'M 0 0' }] } },
  { overlays: { C4: [{ type: 'circle', onload: 'x' }] } },
  { overlays: { C4: [{ type: 'text', text: '\u0000' }] } },
  { overlays: { C4: [{ type: 'number', value: Infinity }] } },
  { overlays: { C4: [{ type: 'badge', text: 'x', background: 'url(#foo)' }] } },
  { overlays: { C4: [{ type: 'circle', size: -1 }] } },
  { overlays: { C4: [{ type: 'circle', pitch: 1.01 }] } },
])('rejects invalid decorations %j', patch => {
  expect(() => normalizeConfig(patch as KeyboardOptionsPatch)).toThrow();
});
