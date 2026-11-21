import { validateRecord } from '../internal/validate-record.js';

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

export type BuiltInSkin = 'minimal' | 'classic';

export type ResolvedAppearance = {
  readonly [Field in keyof AppearanceOptions]-?: NonNullable<AppearanceOptions[Field]>;
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
  pressed: '#85502b',
  blackKeyShadow: 0.28,
});

export function findSkin(name: string, customSkins?: ReadonlyMap<string, AppearanceOptions>): AppearanceOptions | undefined {
  if (name === 'minimal') return minimalAppearance;
  if (name === 'classic') return classic;
  return customSkins?.get(name);
}

function color(value: unknown, field: string): AppearanceColor {
  if (typeof value !== 'string' || (value !== 'transparent' && !/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value))) {
    throw new TypeError(`${field} must be a hex color (#RGB, #RGBA, #RRGGBB or #RRGGBBAA) or "transparent"`);
  }
  return value;
}

function numberInRange(value: unknown, field: string, max = Number.MAX_VALUE): number {
  if (typeof value !== 'number') throw new TypeError(`${field} must be a number`);
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new RangeError(`${field} must be finite and non-negative${max === 1 ? ' and at most 1' : ''}`);
  }
  return value;
}

function paint(value: unknown, field: string): KeyPaint {
  if (typeof value === 'string') return color(value, field);
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
    const offset = numberInRange(stop.offset, `${path}.offset`, 1);
    if (offset < previous) throw new RangeError(`${field}.stops must be ordered by offset`);
    previous = offset;
    return Object.freeze({ offset, color: color(stop.color, `${path}.color`) });
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
      result[field] = numberInRange(value, path, field === 'blackKeyShadow' ? 1 : undefined);
    } else {
      result[field] = color(value, path);
    }
  }
  return Object.freeze(result);
}

export function resolveAppearance(skin: AppearanceOptions, overrides: AppearanceOptions): ResolvedAppearance {
  const selected = { ...skin, ...overrides };
  return Object.freeze({
    background: selected.background ?? minimalAppearance.background,
    white: selected.white ?? minimalAppearance.white,
    black: selected.black ?? minimalAppearance.black,
    boundary: selected.boundary ?? minimalAppearance.boundary,
    strokeWidth: selected.strokeWidth ?? minimalAppearance.strokeWidth,
    cornerRadius: selected.cornerRadius ?? minimalAppearance.cornerRadius,
    pressed: selected.pressed ?? minimalAppearance.pressed,
    blackKeyShadow: selected.blackKeyShadow ?? minimalAppearance.blackKeyShadow,
  });
}
