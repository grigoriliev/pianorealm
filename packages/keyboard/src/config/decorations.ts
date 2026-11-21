import { validateRecord } from '../internal/validate-record.js';
import { validateXmlText } from '../internal/xml-text.js';
import { normalizeNote } from '../notes/notation.js';
import type { NotationOptions } from '../notes/notation.js';
import { validateColor, validateNonnegative } from '../skins/appearance.js';
import type { AppearanceColor } from '../skins/appearance.js';

export type NoteMap<Value> = Readonly<Record<string, Value>>;
export type LabelMode = 'none' | 'note' | 'midi' | 'octave';
export type PressedMode = 'color' | 'indicator' | 'both';

export interface LabelOptions {
  readonly mode?: LabelMode | undefined;
  readonly emphasizeC?: boolean | undefined;
  readonly custom?: NoteMap<string> | undefined;
}

export interface IndicatorOptions {
  readonly shape?: 'circle' | 'square' | undefined;
  readonly color?: AppearanceColor | undefined;
  readonly stroke?: AppearanceColor | undefined;
  readonly strokeWidth?: number | undefined;
  readonly size?: number | undefined;
  readonly pitch?: number | undefined;
  readonly depth?: number | undefined;
  readonly opacity?: number | undefined;
}

interface OverlayPlacement {
  readonly pitch?: number;
  readonly depth?: number;
  readonly size?: number;
  readonly color?: AppearanceColor;
}

export type KeyOverlay = OverlayPlacement & (
  | { readonly type: 'circle' }
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'number'; readonly value: number }
  | { readonly type: 'badge'; readonly text: string | number; readonly background?: AppearanceColor }
);
export type KeyOverlays = NoteMap<readonly KeyOverlay[]>;

interface ResolvedLabels {
  readonly mode: LabelMode;
  readonly emphasizeC: boolean;
  readonly custom: ReadonlyMap<number, string>;
}

const labelFields = ['mode', 'emphasizeC', 'custom'] as const;
const indicatorFields = ['shape', 'color', 'stroke', 'strokeWidth', 'size', 'pitch', 'depth', 'opacity'] as const;
const placementFields = ['type', 'pitch', 'depth', 'size', 'color'] as const;
const overlayFields = {
  circle: placementFields,
  text: [...placementFields, 'text'],
  number: [...placementFields, 'value'],
  badge: [...placementFields, 'text', 'background'],
} as const;

const emptyNotes: ReadonlyMap<number, never> = new Map<number, never>();
const defaultLabels: ResolvedLabels = Object.freeze({ mode: 'none', emphasizeC: false, custom: emptyNotes });

export function noteMap<Value>(
  input: NoteMap<Value> | undefined, notation: NotationOptions, name: string,
  validate: (value: Value, name: string) => Value,
): ReadonlyMap<number, Value> {
  if (input === undefined) return emptyNotes;
  if (typeof input !== 'object' || input === null) throw new TypeError(`${name} must be a note map`);
  const fields = Reflect.ownKeys(input);
  if (fields.length > 128) throw new RangeError(`${name} accepts at most 128 entries`);
  const names = fields.filter((field): field is string => typeof field === 'string');
  validateRecord(input, names, name);
  const notes = new Map<number, Value>();
  for (const key of names) {
    const note = normalizeNote(/^(?:0|[1-9][0-9]*)$/.test(key) ? Number(key) : key, notation);
    if (notes.has(note)) throw new RangeError(`${name} contains multiple entries for MIDI ${note}`);
    notes.set(note, validate(input[key], name));
  }
  return notes;
}

function labelText(value: unknown, name: string): string {
  if (typeof value !== 'string') throw new TypeError(`${name} must be text`);
  if (value.length > 128 || Array.from(value).length > 64) {
    throw new RangeError(`${name} accepts at most 64 characters`);
  }
  validateXmlText(value);
  return value;
}

export function normalizeLabels(
  patch: LabelOptions | undefined, previous: ResolvedLabels, notation: NotationOptions,
): ResolvedLabels {
  if (patch === undefined) return defaultLabels;
  validateRecord(patch, labelFields, 'labels');
  const { mode = 'none', emphasizeC = false } = { ...previous, ...patch };
  if (mode !== 'none' && mode !== 'note' && mode !== 'midi' && mode !== 'octave') {
    throw new TypeError('Label mode must be "none", "note", "midi" or "octave"');
  }
  if (typeof emphasizeC !== 'boolean') throw new TypeError('Label emphasizeC must be boolean');
  const custom = Object.hasOwn(patch, 'custom') ? noteMap(patch.custom, notation, 'Custom labels', labelText) : previous.custom;
  return Object.freeze({ mode, emphasizeC, custom });
}

export function normalizeIndicator(
  patch: IndicatorOptions | undefined, previous: IndicatorOptions,
): IndicatorOptions {
  if (patch === undefined) return Object.freeze({});
  validateRecord(patch, indicatorFields, 'indicator');
  const copy = { ...patch };
  const { shape, color, stroke, strokeWidth, size, pitch, depth, opacity } = copy;
  if (shape !== undefined && shape !== 'circle' && shape !== 'square') {
    throw new TypeError('Indicator shape must be "circle" or "square"');
  }
  if (color !== undefined) validateColor(color, 'Indicator color');
  if (stroke !== undefined) validateColor(stroke, 'Indicator stroke');
  if (strokeWidth !== undefined) validateNonnegative(strokeWidth, 'Indicator strokeWidth');
  if (size !== undefined) validateNonnegative(size, 'Indicator size');
  if (pitch !== undefined) validateNonnegative(pitch, 'Indicator pitch', 1);
  if (depth !== undefined) validateNonnegative(depth, 'Indicator depth', 1);
  if (opacity !== undefined) validateNonnegative(opacity, 'Indicator opacity', 1);
  return Object.freeze({ ...previous, ...copy });
}

function overlayNumber(value: unknown): number {
  if (typeof value !== 'number') throw new TypeError('Overlay number must be numeric');
  if (!Number.isFinite(value)) throw new RangeError('Overlay number must be finite');
  return value;
}

export function normalizeOverlays(entries: readonly KeyOverlay[]): readonly KeyOverlay[] {
  if (!Array.isArray(entries)) throw new TypeError('Per-note overlays must be arrays');
  if (entries.length > 16) throw new RangeError('A key accepts at most 16 overlays');
  return Object.freeze(Array.from({ length: entries.length }, (_, index) => {
    const entry: KeyOverlay = entries[index];
    if (!entry || typeof entry !== 'object') throw new TypeError('Overlay must be an options object');
    const overlay = { ...entry };
    if (typeof overlay.type !== 'string' || !Object.hasOwn(overlayFields, overlay.type)) throw new TypeError('Unsupported overlay type');
    const fields = overlayFields[overlay.type];
    validateRecord(entry, fields, 'overlay');
    const { pitch, depth, size, color } = overlay;
    if (pitch !== undefined) validateNonnegative(pitch, 'Overlay pitch', 1);
    if (depth !== undefined) validateNonnegative(depth, 'Overlay depth', 1);
    if (size !== undefined) validateNonnegative(size, 'Overlay size');
    if (color !== undefined) validateColor(color, 'Overlay color');
    if (overlay.type === 'text') labelText(overlay.text, 'Overlay text');
    if (overlay.type === 'number') overlayNumber(overlay.value);
    if (overlay.type === 'badge') {
      if (typeof overlay.text === 'number') overlayNumber(overlay.text);
      else labelText(overlay.text, 'Badge text');
      if (overlay.background !== undefined) validateColor(overlay.background, 'Badge background');
    }
    return Object.freeze(overlay);
  }));
}

export interface DecorationConfig {
  readonly labels: ResolvedLabels;
  readonly highlights: ReadonlyMap<number, AppearanceColor>;
  readonly indicator: IndicatorOptions;
  readonly pressedMode: PressedMode;
  readonly overlays: ReadonlyMap<number, readonly KeyOverlay[]>;
}

export const defaultDecorations: DecorationConfig = Object.freeze({
  labels: defaultLabels,
  highlights: emptyNotes,
  indicator: Object.freeze({}),
  pressedMode: 'both',
  overlays: emptyNotes,
});
