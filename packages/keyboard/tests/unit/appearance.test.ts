import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../../src/config/normalize.js';
import type { AppearanceOptions } from '../../src/index.js';
import { findSkin, minimalAppearance, normalizeAppearance, resolveAppearance } from '../../src/skins/appearance.js';

describe('appearance resolution', () => {
  it('resolves the Realistic finish immutably and gives explicit paints precedence', () => {
    const config = normalizeConfig({ skin: 'realistic' });
    const lighting = config.appearance.edgeLighting!;
    expect(lighting.white?.stops).toHaveLength(5);
    expect(lighting.black?.stops).toHaveLength(5);
    expect(Object.isFrozen(lighting)).toBe(true);
    expect(Object.isFrozen(lighting.white?.stops[0])).toBe(true);
    const customized = normalizeConfig({ appearance: { white: 'transparent', pressed: '#120' } }, config);
    expect(customized.appearance).toMatchObject({
      white: 'transparent', pressed: '#120', edgeLighting: { white: undefined, black: lighting.black, pressed: false },
    });
    expect(normalizeConfig({ appearance: { white: undefined, pressed: undefined } }, customized).appearance)
      .toEqual(config.appearance);
    expect(normalizeConfig({ skin: 'realistic' }).appearance.edgeLighting).toEqual(lighting);
    expect(normalizeConfig({ skin: 'classic' }).appearance.edgeLighting).toBeUndefined();
  });

  it('uses immutable Minimal defaults and deeply frozen Classic definitions', () => {
    const classic = normalizeConfig({ skin: 'classic' }).appearance;
    expect(normalizeConfig().appearance).toEqual(minimalAppearance);
    expect(classic).toEqual(normalizeConfig({ skin: 'classic' }).appearance);
    expect(classic.white).not.toEqual(minimalAppearance.white);
    expect(classic.black).not.toEqual(minimalAppearance.black);
    expect(classic.strokeWidth).toBe(minimalAppearance.strokeWidth);
    expect(classic.blackKeyShadow).toBeGreaterThan(0);
    expect(Object.isFrozen(findSkin('minimal'))).toBe(true);
    expect(Object.isFrozen(findSkin('classic'))).toBe(true);
    expect(Object.isFrozen(classic)).toBe(true);
    for (const paint of [classic.white, classic.black]) {
      if (typeof paint === 'string') throw new Error('Expected a gradient');
      expect(Object.isFrozen(paint) && Object.isFrozen(paint.stops)).toBe(true);
      expect(paint.stops.every(Object.isFrozen)).toBe(true);
    }
  });

  it('retains overrides across skin changes and resets fields or the whole record', () => {
    const original = normalizeConfig({
      skin: 'classic',
      appearance: { white: '#1234', strokeWidth: 0, background: 'transparent' },
    });
    const minimal = normalizeConfig({ skin: undefined, appearance: { strokeWidth: undefined } }, original);
    expect(minimal.skin).toBe('minimal');
    expect(minimal.overrides).toEqual({ white: '#1234', background: 'transparent' });
    expect(minimal.appearance).toMatchObject({ white: '#1234', strokeWidth: 1, background: 'transparent' });
    const classic = normalizeConfig({
      skin: 'classic', appearance: { white: undefined, blackKeyShadow: 0 },
    }, minimal);
    const classicDefaults = normalizeConfig({ skin: 'classic' }).appearance;
    expect(classic.appearance).toEqual({ ...classicDefaults, background: 'transparent', blackKeyShadow: 0 });
    expect(normalizeConfig({ appearance: undefined }, classic).appearance).toEqual(classicDefaults);
    expect(original.overrides).toEqual({ white: '#1234', strokeWidth: 0, background: 'transparent' });
  });

  it('copies inline skin gradients and replaces the whole paint token when overridden', () => {
    const stops = [{ offset: 0, color: '#123' }, { offset: 0.9, color: '#11223388' }];
    const inline = normalizeAppearance({ white: { stops }, black: '#000' });
    stops[0].color = '#fff';
    stops.push({ offset: 1, color: '#abcdef' });
    expect(resolveAppearance(inline, {}).white).toEqual({
      stops: [{ offset: 0, color: '#123' }, { offset: 0.9, color: '#11223388' }],
    });
    expect(resolveAppearance(inline, normalizeAppearance({ white: '#fff' })))
      .toEqual({ ...minimalAppearance, white: '#fff', black: '#000' });
  });

  it.each([
    [null, TypeError],
    [{ background: false }, TypeError],
    [{ background: 'red' }, TypeError],
    [{ boundary: '#fff\n' }, TypeError],
    [{ white: 'url(https://example.org/paint.svg#paint)' }, TypeError],
    [{ black: 'url(#some-host-paint)' }, TypeError],
    [{ pressed: '#fff" onload="alert(1)' }, TypeError],
    [{ strokeWidth: '0' }, TypeError],
    [{ strokeWidth: NaN }, RangeError],
    [{ strokeWidth: -0.5 }, RangeError],
    [{ cornerRadius: Infinity }, RangeError],
    [{ cornerRadius: -1 }, RangeError],
    [{ blackKeyShadow: -1 }, RangeError],
    [{ blackKeyShadow: 1.1 }, RangeError],
    [{ black: { stops: [] } }, TypeError],
    [{ white: { stops: Array(2) } }, TypeError],
    [{ white: { stops: Array(9).fill({ offset: 0, color: '#fff' }) } }, TypeError],
    [{ white: { stops: [{ offset: 0, color: '#123' }, { offset: 2, color: '#fff' }] } }, RangeError],
    [{ white: { stops: [{ offset: 0.5, color: '#123' }, { offset: 0.4, color: '#fff' }] } }, RangeError],
    [{ black: { stops: [{ offset: 0, color: '#fff', style: 'fill: red' }, { offset: 1, color: '#123' }] } }, TypeError],
    [{ black: { stops: [{ offset: 0, color: '<script/>' }, { offset: 1, color: '#123' }] } }, TypeError],
    [{ whiteKeyWidth: 30 }, TypeError],
  ])('rejects invalid or unsupported appearance %j', (appearance, error) => {
    expect(() => normalizeConfig({ appearance: appearance as AppearanceOptions })).toThrow(error);
  });
});
