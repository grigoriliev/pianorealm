import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../../src/config/normalize.js';
import type { ConfigOptions } from '../../src/config/normalize.js';
import { minimalAppearance } from '../../src/skins/appearance.js';

describe('configuration normalization', () => {
  it('resolves the approved core defaults', () => {
    expect(normalizeConfig()).toEqual({
      range: { from: 21, to: 108 },
      orientation: 'horizontal',
      skin: 'minimal',
      overrides: {},
      appearance: minimalAppearance,
      animationOverrides: {},
      animation: { enabled: true, duration: 120, easing: 'ease-out' },
      notation: { accidentalPreference: 'sharp', octaveOffset: 0 },
      sizing: {
        mode: 'container',
        whiteKeyWidth: 20, whiteKeyHeight: 100,
        blackKeyWidth: 12, blackKeyHeight: 60,
      },
    });
  });

  it('normalizes mixed range endpoints and accepts equal black endpoints', () => {
    expect(normalizeConfig({ range: { from: 'C-1', to: 127 } }).range).toEqual({ from: 0, to: 127 });
    expect(normalizeConfig({ range: { from: 61, to: 'Db4' } }).range).toEqual({ from: 61, to: 61 });
  });

  it('uses patched notation for new ranges and retains MIDI identity for existing ranges', () => {
    const previous = normalizeConfig({
      notation: { accidentalPreference: 'flat', octaveOffset: 1 },
      range: { from: 'C5', to: 'Db5' },
    });
    expect(previous.range).toEqual({ from: 60, to: 61 });

    const updated = normalizeConfig({ notation: { octaveOffset: undefined } }, previous);
    expect(updated.range).toEqual(previous.range);
    expect(updated.notation).toEqual({ accidentalPreference: 'flat', octaveOffset: 0 });
    expect(normalizeConfig({ notation: undefined }, updated).notation).toEqual(normalizeConfig().notation);
  });

  it.each([
    [{ range: { from: 'D4', to: 'C4' } }, RangeError],
    [{ range: { from: 0, to: 128 } }, RangeError],
    [{ range: { from: 'bad', to: 60 } }, TypeError],
    [{ range: { from: 10 } }, TypeError],
    [{ range: { from: 10, to: 12, extra: true } }, TypeError],
    [{ notation: { extra: true } }, TypeError],
    [{ notation: { octaveOffset: Infinity } }, RangeError],
    [{ orientation: 'diagonal' }, TypeError],
    [{ skin: 'Minimal' }, TypeError],
    [{ sizing: { mode: 'stretch' } }, TypeError],
    [{ sizing: { whiteKeyWidth: 12 } }, RangeError],
    [{ sizing: { blackKeyHeight: 101 } }, RangeError],
    [{ sizing: { blackKeyHeight: 0 } }, RangeError],
    [{ sizing: { whiteKeyHeight: Infinity } }, RangeError],
    [{ sizing: { blackKeyWidth: '12' } }, TypeError],
    [{ sizing: { width: 250 } }, RangeError],
    [{ sizing: { mode: 'fixed', width: NaN } }, RangeError],
    [{ sizing: { extra: 10 } }, TypeError],
    [{ sizing: null }, TypeError],
    [{ animation: false }, TypeError],
    [{ animation: null }, TypeError],
    [{ animation: { enabled: 1 } }, TypeError],
    [{ animation: { duration: '120' } }, TypeError],
    [{ animation: { duration: -1 } }, RangeError],
    [{ animation: { duration: 1001 } }, RangeError],
    [{ animation: { duration: NaN } }, RangeError],
    [{ animation: { duration: Infinity } }, RangeError],
    [{ animation: { easing: 'linear; fill:red' } }, TypeError],
    [{ animation: { delay: 0 } }, TypeError],
    [null, TypeError],
  ])('rejects invalid configuration %j', (patch, error) => {
    expect(() => normalizeConfig(patch as ConfigOptions)).toThrow(error);
  });

  it('merges declared nested sizing fields and supports explicit resets', () => {
    const previous = normalizeConfig({
      orientation: 'vertical',
      range: { from: 61, to: 61 },
      sizing: { mode: 'fixed', width: 500, blackKeyHeight: 100 },
    });
    const updated = normalizeConfig({
      orientation: undefined,
      range: undefined,
      sizing: { width: undefined, whiteKeyWidth: 24 },
    }, previous);
    expect(updated).toEqual({
      ...normalizeConfig(),
      sizing: { ...normalizeConfig().sizing, mode: 'fixed', whiteKeyWidth: 24, blackKeyHeight: 100 },
    });
    expect(normalizeConfig({ sizing: undefined }, updated)).toEqual(normalizeConfig());
  });

  it('leaves the previous frozen snapshot intact when a mixed patch fails', () => {
    const previous = normalizeConfig({ range: { from: 60, to: 61 } });
    expect(() => normalizeConfig({
      orientation: 'vertical',
      notation: { octaveOffset: 1 },
      range: { from: 'C6', to: 'D6' },
      sizing: { blackKeyWidth: 21 },
    }, previous)).toThrow(RangeError);

    expect(previous).toEqual({ ...normalizeConfig(), range: { from: 60, to: 61 } });
    for (const value of [previous, previous.range, previous.notation, previous.sizing]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
  });

  it('merges motion overrides and resets fields to the currently selected skin defaults', () => {
    const previous = normalizeConfig({ animation: { duration: 1000, easing: 'linear' } });
    const classic = normalizeConfig({ skin: 'classic', animation: { enabled: false } }, previous);
    expect(classic.animation).toEqual({ enabled: false, duration: 1000, easing: 'linear' });
    const reset = normalizeConfig({ animation: { duration: undefined, easing: undefined } }, classic);
    expect(reset.animation).toEqual({ enabled: false, duration: 160, easing: 'ease-in-out' });
    expect(normalizeConfig({ animation: undefined }, reset).animation)
      .toEqual({ enabled: true, duration: 160, easing: 'ease-in-out' });
    expect(normalizeConfig({ animation: { duration: 0 } }).animation.duration).toBe(0);
    expect(Object.isFrozen(classic.animation)).toBe(true);
    expect(Object.isFrozen(classic.animationOverrides)).toBe(true);
  });
});
