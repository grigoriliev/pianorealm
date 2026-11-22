import type { normalizeConfig } from '../config/normalize.js';
import type { KeyboardLayout } from '../geometry/layout.js';
import { formatNote } from '../notes/notation.js';
import type { PressedMode } from '../config/decorations.js';
import { buildDecorations, buildIndicator, clipSlot, visibleFace } from './key-decorations.js';
import type { Bounds } from './key-decorations.js';
import type { KeyKind } from '../notes/notation.js';

import type { KeyGradient, ResolvedAppearance } from '../skins/appearance.js';

export type DefinitionSlot = 'white-gradient' | 'black-gradient' | 'black-shadow' | ReturnType<typeof clipSlot>;

const gradientSlots = { white: 'white-gradient', black: 'black-gradient' } as const;
type GradientSlot = typeof gradientSlots[KeyKind];
type ScenePaint = string | Readonly<{ slot: GradientSlot }>;

export type SceneDefinition = Readonly<
  | { slot: GradientSlot; kind: 'gradient'; horizontal: boolean; stops: KeyGradient['stops'] }
  | { slot: 'black-shadow'; kind: 'shadow'; horizontal: boolean; opacity: number }
  | { slot: ReturnType<typeof clipSlot>; kind: 'clip'; bounds: readonly Bounds[] }
>;

export interface KeyboardScene {
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly description: string | undefined;
  readonly decorative: boolean;
  readonly background: string;
  readonly definitions: readonly SceneDefinition[];
  readonly appearance: ResolvedAppearance;
  readonly pressedMode: PressedMode;
  readonly keys: readonly SceneKey[];
}

type LayoutKey = KeyboardLayout['keys'][number];

export type SceneKey = LayoutKey & Readonly<KeyPresentation> & {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly cornerRadius: number;
  readonly shadow: boolean;
  readonly indicator: ReturnType<typeof buildIndicator>;
  readonly decorations: ReturnType<typeof buildDecorations>;
};

export interface KeyPresentation {
  fill: ScenePaint;
  indicatorDisplay: 'inline' | 'none';
}

export function keyPresentation(
  kind: KeyKind, appearance: ResolvedAppearance, pressed: boolean, mode: PressedMode,
): KeyPresentation {
  const paint = appearance[kind];
  return {
    fill: pressed && mode !== 'indicator' ? appearance.pressed
      : typeof paint === 'string' ? paint : Object.freeze({ slot: gradientSlots[kind] }),
    indicatorDisplay: pressed && mode !== 'color' ? 'inline' : 'none',
  };
}

/** The frozen layout already supplies identity, bounds and stacking order. */
export function buildScene(
  config: ReturnType<typeof normalizeConfig>,
  layout: KeyboardLayout,
  appearance: ResolvedAppearance,
  pressed?: Pick<ReadonlySet<number>, 'has'>,
): KeyboardScene {
  const { from, to } = config.range;
  const first = formatNote(from, config.notation);
  const last = formatNote(to, config.notation);
  const notes = from === to ? first : `${first} to ${last}`;
  const horizontal = layout.orientation === 'horizontal';
  const definitions: SceneDefinition[] = [];
  for (const kind of ['white', 'black'] as const) {
    const paint = appearance[kind];
    if (typeof paint !== 'string') {
      definitions.push(Object.freeze({ slot: gradientSlots[kind], kind: 'gradient', horizontal, stops: paint.stops }));
    }
  }
  if (appearance.blackKeyShadow > 0) {
    definitions.push(Object.freeze({
      slot: 'black-shadow', kind: 'shadow', horizontal, opacity: appearance.blackKeyShadow,
    }));
  }

  const neighbors = new Map(layout.keys.map(key => [key.note, key]));
  const keys = layout.keys.map(key => Object.freeze({
    ...key,
    ...keyPresentation(key.kind, appearance, pressed?.has(key.note) ?? false, config.pressedMode),
    stroke: appearance.boundary,
    strokeWidth: appearance.strokeWidth,
    cornerRadius: appearance.cornerRadius,
    shadow: key.kind === 'black' && appearance.blackKeyShadow > 0,
    indicator: buildIndicator(key, config, horizontal),
    decorations: buildDecorations(key, config, horizontal),
  }));
  for (const key of keys) {
    const { decorations } = key;
    if (decorations.highlights.length || decorations.labels.length || decorations.overlays.length) {
      definitions.push(Object.freeze({ slot: clipSlot(key.note), kind: 'clip', bounds: visibleFace(key, neighbors, horizontal) }));
    }
  }

  return Object.freeze({
    width: layout.width,
    height: layout.height,
    label: config.accessibility.label ?? `${horizontal ? 'Horizontal' : 'Vertical'} piano keyboard, ${notes}`,
    description: config.accessibility.description,
    decorative: config.accessibility.decorative ?? false,
    background: appearance.background,
    appearance,
    pressedMode: config.pressedMode,
    definitions: Object.freeze(definitions),
    keys: Object.freeze(keys),
  });
}
