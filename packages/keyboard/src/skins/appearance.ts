import { validateRecord } from '../internal/validate-record.js';
import type { KeyKind } from '../notes/notation.js';

/** A hexadecimal SVG color or "transparent". */
export type AppearanceColor = string;

export interface GradientStop {
  readonly offset: number;
  readonly color: AppearanceColor;
}

/** A linear gradient along the key depth, from rear to front. */
export interface KeyGradient {
  readonly stops: readonly GradientStop[];
}

export type KeyPaint = AppearanceColor | KeyGradient;

export interface AppearanceOptions {
  readonly background?: AppearanceColor | undefined;
  readonly white?: KeyPaint | undefined;
  readonly black?: KeyPaint | undefined;
  readonly boundary?: AppearanceColor | undefined;
  readonly strokeWidth?: number | undefined;
  readonly cornerRadius?: number | undefined;
  readonly pressed?: AppearanceColor | undefined;
  readonly blackKeyShadow?: number | undefined;
}

type SkinAppearance = AppearanceOptions & {
  readonly edgeLighting?: Readonly<Record<KeyKind, KeyGradient>>;
};

export type ResolvedAppearance = {
  readonly [Field in keyof AppearanceOptions]-?: NonNullable<AppearanceOptions[Field]>;
} & {
  readonly edgeLighting?: Readonly<Record<KeyKind, KeyGradient | undefined> & { pressed: boolean }>;
};

export const minimalAppearance = Object.freeze({
  background: '#e2e2e2',
  white: '#fafafa',
  black: '#242424',
  boundary: '#595959',
  strokeWidth: 1,
  cornerRadius: 0,
  pressed: '#3978bd',
  blackKeyShadow: 0,
} satisfies ResolvedAppearance);

const classic = normalizeAppearance({
  background: '#332922',
  white: { stops: [{ offset: 0, color: '#d9c9ac' }, { offset: 1, color: '#fff5e2' }] },
  black: { stops: [{ offset: 0, color: '#1a1514' }, { offset: 1, color: '#48403c' }] },
  boundary: '#6b5846',
  cornerRadius: 2,
  pressed: '#C5906B',
  blackKeyShadow: 0.28,
});

const realistic = Object.freeze({
  ...normalizeAppearance({
    background: '#383331',
    white: { stops: [
      { offset: 0, color: '#cbc6bd' },
      { offset: 0.09, color: '#eae5da' },
      { offset: 0.38, color: '#f5f2e9' },
      { offset: 0.96, color: '#fffdf6' },
      { offset: 0.98, color: '#efe9dc' },
      { offset: 1, color: '#d5cec1' },
    ] },
    black: { stops: [
      { offset: 0, color: '#191819' },
      { offset: 0.10, color: '#353333' },
      { offset: 0.44, color: '#282628' },
      { offset: 0.87, color: '#171618' },
      { offset: 0.91, color: '#302e30' },
      { offset: 0.94, color: '#222123' },
      { offset: 1, color: '#111012' },
    ] },
    boundary: '#423d38',
    strokeWidth: 0.65,
    cornerRadius: 0.75,
    pressed: '#5582ad',
    blackKeyShadow: 0.5,
  }),
  // Translucent pitch-axis reflections rotate with the keys and can shade a solid pressed fill.
  edgeLighting: Object.freeze({
    white: gradient({ stops: [
      { offset: 0, color: '#67605654' },
      { offset: 0.04, color: '#ffffff80' },
      { offset: 0.16, color: '#ffffff00' },
      { offset: 0.88, color: '#72695d00' },
      { offset: 1, color: '#72695d65' },
    ] }, 'realistic.white edge'),
    black: gradient({ stops: [
      { offset: 0, color: '#0a090b75' },
      { offset: 0.10, color: '#e2dbd746' },
      { offset: 0.25, color: '#e2dbd70a' },
      { offset: 0.68, color: '#08070a00' },
      { offset: 1, color: '#08070aae' },
    ] }, 'realistic.black edge'),
  }),
} satisfies SkinAppearance);

const builtInSkins = {
  minimal: minimalAppearance,
  classic,
  realistic,
  modern: normalizeAppearance({
    background: '#cbd5df', white: '#f4f8fc', black: '#203143', boundary: '#536577',
    cornerRadius: 2.5, blackKeyShadow: 0.18, pressed: '#306997',
  }),
  neon: normalizeAppearance({
    background: '#121527', white: '#b4c0e0', black: '#292844', boundary: '#6e79a6',
    cornerRadius: 1, pressed: '#9b226d',
  }),
  dark: normalizeAppearance({
    background: '#16191d', white: '#b9c0c6', black: '#2c3036', boundary: '#505962',
    pressed: '#275968',
  }),
  'high-contrast': normalizeAppearance({
    background: '#000000', white: '#ffffff', black: '#000000', boundary: '#737373',
    pressed: '#005a85',
  }),
} satisfies Record<string, SkinAppearance>;

export type BuiltInSkin = keyof typeof builtInSkins;

export function findSkin(name: string, customSkins?: ReadonlyMap<string, AppearanceOptions>): SkinAppearance | undefined {
  return Object.hasOwn(builtInSkins, name) ? builtInSkins[name as BuiltInSkin] : customSkins?.get(name);
}

export function validateColor(value: unknown, field: string): AppearanceColor {
  if (typeof value !== 'string' || (value !== 'transparent' && !/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value))) {
    throw new TypeError(`${field} must be a hex color (#RGB, #RGBA, #RRGGBB or #RRGGBBAA) or "transparent"`);
  }
  return value;
}

export function validateNonnegative(value: unknown, field: string, max = Number.MAX_VALUE): number {
  if (typeof value !== 'number') throw new TypeError(`${field} must be a number`);
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new RangeError(`${field} must be finite and non-negative${max === 1 ? ' and at most 1' : ''}`);
  }
  return value;
}

function paint(value: unknown, field: string): KeyPaint {
  if (typeof value === 'string') return validateColor(value, field);
  return gradient(value, field);
}

function gradient(value: unknown, field: string): KeyGradient {
  validateRecord(value, ['stops'], field);
  const { stops } = value as KeyGradient;
  if (!Array.isArray(stops) || stops.length < 2 || stops.length > 8) {
    throw new TypeError(`${field}.stops must be an array of 2–8 gradient stops`);
  }
  let previous = 0;
  const copy = Array.from({ length: stops.length }, (_, index) => {
    const stop: GradientStop = stops[index];
    const path = `${field}.stops[${index}]`;
    validateRecord(stop, ['offset', 'color'], path);
    const offset = validateNonnegative(stop.offset, `${path}.offset`, 1);
    if (offset < previous) throw new RangeError(`${field}.stops must be ordered by offset`);
    previous = offset;
    return Object.freeze({ offset, color: validateColor(stop.color, `${path}.color`) });
  });
  return Object.freeze({ stops: Object.freeze(copy) });
}

export function normalizeAppearance(
  patch: AppearanceOptions, previous: AppearanceOptions = {},
): AppearanceOptions {
  validateRecord(patch, Object.keys(minimalAppearance), 'appearance');
  const result: { -readonly [K in keyof AppearanceOptions]: AppearanceOptions[K] } = { ...previous };
  for (const field of Object.keys(patch) as (keyof AppearanceOptions)[]) {
    const value = patch[field];
    const path = `appearance.${field}`;
    if (value === undefined) {
      delete result[field];
    } else if (field === 'white' || field === 'black') {
      result[field] = paint(value, path);
    } else if (field === 'strokeWidth' || field === 'cornerRadius' || field === 'blackKeyShadow') {
      result[field] = validateNonnegative(value, path, field === 'blackKeyShadow' ? 1 : undefined);
    } else {
      result[field] = validateColor(value, path);
    }
  }
  return Object.freeze(result);
}

export function resolveAppearance(skin: SkinAppearance, overrides: AppearanceOptions): ResolvedAppearance {
  const selected = { ...skin, ...overrides };
  const edgeLighting = skin.edgeLighting && Object.freeze({
    white: overrides.white === undefined ? skin.edgeLighting.white : undefined,
    black: overrides.black === undefined ? skin.edgeLighting.black : undefined,
    pressed: overrides.pressed === undefined,
  });
  return Object.freeze({
    background: selected.background ?? minimalAppearance.background,
    white: selected.white ?? minimalAppearance.white,
    black: selected.black ?? minimalAppearance.black,
    boundary: selected.boundary ?? minimalAppearance.boundary,
    strokeWidth: selected.strokeWidth ?? minimalAppearance.strokeWidth,
    cornerRadius: selected.cornerRadius ?? minimalAppearance.cornerRadius,
    pressed: selected.pressed ?? minimalAppearance.pressed,
    blackKeyShadow: selected.blackKeyShadow ?? minimalAppearance.blackKeyShadow,
    ...(edgeLighting && { edgeLighting }),
  });
}
