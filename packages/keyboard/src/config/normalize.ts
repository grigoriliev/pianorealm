import { validateRecord } from '../internal/validate-record.js';
import { defaultNotation, validateNotation } from '../notes/notation.js';
import type { NotationOptions } from '../notes/notation.js';
import { normalizeRange } from '../notes/ranges.js';
import type { MidiRange, NoteRange } from '../notes/ranges.js';

export type Orientation = 'horizontal' | 'vertical';
type SizingMode = 'container' | 'fixed';

interface SizingOptions {
  readonly mode?: SizingMode | undefined;
  readonly whiteKeyWidth?: number | undefined;
  readonly whiteKeyHeight?: number | undefined;
  readonly blackKeyWidth?: number | undefined;
  readonly blackKeyHeight?: number | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
}

export interface KeyDimensions {
  readonly whiteKeyWidth: number;
  readonly whiteKeyHeight: number;
  readonly blackKeyWidth: number;
  readonly blackKeyHeight: number;
}

interface ResolvedSizing extends KeyDimensions {
  readonly mode: SizingMode;
  readonly width?: number;
  readonly height?: number;
}

export interface ConfigOptions {
  readonly range?: NoteRange | undefined;
  readonly orientation?: Orientation | undefined;
  readonly notation?: NotationOptions | undefined;
  readonly sizing?: SizingOptions | undefined;
}

interface ConfigSnapshot {
  readonly range: MidiRange;
  readonly orientation: Orientation;
  readonly notation: ReturnType<typeof validateNotation>;
  readonly sizing: ResolvedSizing;
}

const DEFAULT_RANGE = Object.freeze({ from: 21, to: 108 });
const DEFAULT_SIZING = Object.freeze({
  mode: 'container',
  whiteKeyWidth: 20,
  whiteKeyHeight: 100,
  blackKeyWidth: 12,
  blackKeyHeight: 60,
} satisfies ResolvedSizing);

export const CONFIG_FIELDS = ['range', 'orientation', 'notation', 'sizing'] as const;

const SIZING_FIELDS = [...Object.keys(DEFAULT_SIZING), 'width', 'height'];

function positiveDimension(value: number, name: string): number {
  if (typeof value !== 'number') {
    throw new TypeError(`Sizing ${name} must be a number`);
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`Sizing ${name} must be positive and finite`);
  }
  return value;
}

export function validateKeyDimensions(dimensions: KeyDimensions): void {
  const { whiteKeyWidth, whiteKeyHeight, blackKeyWidth, blackKeyHeight } = dimensions;
  positiveDimension(whiteKeyWidth, 'whiteKeyWidth');
  positiveDimension(whiteKeyHeight, 'whiteKeyHeight');
  positiveDimension(blackKeyWidth, 'blackKeyWidth');
  positiveDimension(blackKeyHeight, 'blackKeyHeight');
  if (blackKeyWidth >= whiteKeyWidth || blackKeyHeight > whiteKeyHeight) {
    throw new RangeError('Black keys must be narrower than white keys and at most as deep');
  }
}

function resolveSizing(options: SizingOptions): ResolvedSizing {
  const {
    mode = DEFAULT_SIZING.mode,
    whiteKeyWidth = DEFAULT_SIZING.whiteKeyWidth,
    whiteKeyHeight = DEFAULT_SIZING.whiteKeyHeight,
    blackKeyWidth = DEFAULT_SIZING.blackKeyWidth,
    blackKeyHeight = DEFAULT_SIZING.blackKeyHeight,
    width, height,
  } = options;
  if (mode !== 'container' && mode !== 'fixed') {
    throw new TypeError('Sizing mode must be "container" or "fixed"');
  }
  validateKeyDimensions({ whiteKeyWidth, whiteKeyHeight, blackKeyWidth, blackKeyHeight });
  if (mode === 'container' && (width !== undefined || height !== undefined)) {
    throw new RangeError('Viewport width and height require fixed sizing');
  }
  return Object.freeze({
    mode, whiteKeyWidth, whiteKeyHeight, blackKeyWidth, blackKeyHeight,
    ...(width === undefined ? {} : { width: positiveDimension(width, 'width') }),
    ...(height === undefined ? {} : { height: positiveDimension(height, 'height') }),
  });
}

const DEFAULT_CONFIG: ConfigSnapshot = Object.freeze({
  range: DEFAULT_RANGE,
  orientation: 'horizontal',
  notation: defaultNotation,
  sizing: DEFAULT_SIZING,
});

export function validateOrientation(orientation: Orientation): void {
  if (orientation !== 'horizontal' && orientation !== 'vertical') {
    throw new TypeError('Orientation must be "horizontal" or "vertical"');
  }
}

/** Validate a configuration patch and return a new snapshot. Commit it only after success. */
export function normalizeConfig(patch: ConfigOptions = {}, previous = DEFAULT_CONFIG): ConfigSnapshot {
  validateRecord(patch, CONFIG_FIELDS, 'configuration');
  const orientation = Object.hasOwn(patch, 'orientation')
    ? (patch.orientation === undefined ? DEFAULT_CONFIG.orientation : patch.orientation)
    : previous.orientation;
  validateOrientation(orientation);

  let notation = previous.notation;
  if (Object.hasOwn(patch, 'notation')) {
    if (patch.notation === undefined) {
      notation = defaultNotation;
    } else {
      validateRecord(patch.notation, ['accidentalPreference', 'octaveOffset'], 'notation');
      notation = validateNotation({ ...previous.notation, ...patch.notation });
    }
  }

  let range = previous.range;
  if (Object.hasOwn(patch, 'range')) {
    range = patch.range === undefined ? DEFAULT_RANGE : normalizeRange(patch.range, notation);
  }

  let sizing = previous.sizing;
  if (Object.hasOwn(patch, 'sizing')) {
    if (patch.sizing === undefined) {
      sizing = DEFAULT_SIZING;
    } else {
      validateRecord(patch.sizing, SIZING_FIELDS, 'sizing');
      sizing = resolveSizing({ ...previous.sizing, ...patch.sizing });
    }
  }

  return Object.freeze({ orientation, notation, range, sizing });
}
