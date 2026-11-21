import { defaultDecorations, normalizeIndicator, normalizeLabels, normalizeOverlays, noteMap } from './decorations.js';
import type { DecorationConfig, IndicatorOptions, KeyOverlays, LabelOptions, NoteMap, PressedMode } from './decorations.js';
import { findSkin, minimalAppearance, normalizeAppearance, resolveAppearance, validateColor } from '../skins/appearance.js';
import type { AppearanceColor, AppearanceOptions, ResolvedAppearance } from '../skins/appearance.js';
import { validateRecord } from '../internal/validate-record.js';
import { defaultNotation, validateNotation } from '../notes/notation.js';
import type { NotationOptions } from '../notes/notation.js';
import { normalizeRange } from '../notes/ranges.js';
import type { MidiRange, NoteRange } from '../notes/ranges.js';
import { normalizeAnimation, resolveAnimation } from './animation.js';
import type { AnimationOptions, ResolvedAnimation } from './animation.js';

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
  readonly skin?: string | undefined;
  readonly appearance?: AppearanceOptions | undefined;
  readonly animation?: AnimationOptions | undefined;
  readonly labels?: LabelOptions | undefined;
  readonly highlights?: NoteMap<AppearanceColor> | undefined;
  readonly pressedMode?: PressedMode | undefined;
  readonly indicator?: IndicatorOptions | undefined;
  readonly overlays?: KeyOverlays | undefined;
}

interface ConfigSnapshot extends DecorationConfig {
  readonly range: MidiRange;
  readonly orientation: Orientation;
  readonly notation: ReturnType<typeof validateNotation>;
  readonly sizing: ResolvedSizing;
  readonly skin: string;
  readonly overrides: AppearanceOptions;
  readonly appearance: ResolvedAppearance;
  readonly animationOverrides: AnimationOptions;
  readonly animation: ResolvedAnimation;
}

const DEFAULT_RANGE = Object.freeze({ from: 21, to: 108 });
const DEFAULT_SIZING = Object.freeze({
  mode: 'container',
  whiteKeyWidth: 20,
  whiteKeyHeight: 100,
  blackKeyWidth: 12,
  blackKeyHeight: 60,
} satisfies ResolvedSizing);

export const CONFIG_FIELDS = ['range', 'orientation', 'notation', 'sizing', 'skin', 'appearance', 'animation', 'labels', 'highlights', 'pressedMode', 'indicator', 'overlays'] as const;

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

const EMPTY_OVERRIDES = Object.freeze({});

const DEFAULT_CONFIG: ConfigSnapshot = Object.freeze({
  ...defaultDecorations,
  range: DEFAULT_RANGE,
  orientation: 'horizontal',
  notation: defaultNotation,
  sizing: DEFAULT_SIZING,
  skin: 'minimal',
  overrides: EMPTY_OVERRIDES,
  appearance: minimalAppearance,
  animationOverrides: EMPTY_OVERRIDES,
  animation: resolveAnimation('minimal', EMPTY_OVERRIDES),
});

export function validateOrientation(orientation: Orientation): void {
  if (orientation !== 'horizontal' && orientation !== 'vertical') {
    throw new TypeError('Orientation must be "horizontal" or "vertical"');
  }
}

/** Validate a configuration patch and return a new snapshot. Commit it only after success. */
export function normalizeConfig(
  patch: ConfigOptions = {}, previous = DEFAULT_CONFIG, customSkins?: ReadonlyMap<string, AppearanceOptions>,
): ConfigSnapshot {
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

  const skin = Object.hasOwn(patch, 'skin')
    ? (patch.skin === undefined ? DEFAULT_CONFIG.skin : patch.skin)
    : previous.skin;
  if (typeof skin !== 'string') throw new TypeError('Skin must be a name');
  const tokens = findSkin(skin, customSkins);
  if (!tokens) throw new TypeError(`Unknown keyboard skin: "${skin}"`);
  let overrides = previous.overrides;
  if (Object.hasOwn(patch, 'appearance')) {
    overrides = patch.appearance === undefined ? EMPTY_OVERRIDES : normalizeAppearance(patch.appearance, overrides);
  }
  const appearance = skin === previous.skin && overrides === previous.overrides
    ? previous.appearance
    : resolveAppearance(tokens, overrides);

  const animationOverrides = Object.hasOwn(patch, 'animation')
    ? normalizeAnimation(patch.animation, previous.animationOverrides)
    : previous.animationOverrides;
  const animation = skin === previous.skin && animationOverrides === previous.animationOverrides
    ? previous.animation : resolveAnimation(skin, animationOverrides);

  const pressedMode = Object.hasOwn(patch, 'pressedMode') ? (patch.pressedMode === undefined ? 'both' : patch.pressedMode) : previous.pressedMode;
  if (pressedMode !== 'color' && pressedMode !== 'indicator' && pressedMode !== 'both') {
    throw new TypeError('Pressed mode must be "color", "indicator" or "both"');
  }
  const labels = Object.hasOwn(patch, 'labels')
    ? normalizeLabels(patch.labels, previous.labels, notation) : previous.labels;
  const indicator = Object.hasOwn(patch, 'indicator')
    ? normalizeIndicator(patch.indicator, previous.indicator) : previous.indicator;
  const highlights = Object.hasOwn(patch, 'highlights')
    ? noteMap(patch.highlights, notation, 'Highlights', validateColor) : previous.highlights;
  const overlays = Object.hasOwn(patch, 'overlays')
    ? noteMap(patch.overlays, notation, 'Overlays', normalizeOverlays) : previous.overlays;
  return Object.freeze({
    orientation, notation, range, sizing, skin, overrides, appearance, animationOverrides, animation,
    pressedMode, labels, indicator, highlights, overlays,
  });
}
