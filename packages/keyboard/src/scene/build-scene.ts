import type { normalizeConfig } from '../config/normalize.js';
import type { KeyboardLayout } from '../geometry/layout.js';
import { formatNote } from '../notes/notation.js';
import type { KeyKind } from '../notes/notation.js';

import type { KeyGradient, ResolvedAppearance } from '../skins/appearance.js';

export type DefinitionSlot = 'white-gradient' | 'black-gradient' | 'black-shadow';

const gradientSlots = { white: 'white-gradient', black: 'black-gradient' } as const;
type GradientSlot = typeof gradientSlots[KeyKind];
type ScenePaint = string | Readonly<{ slot: GradientSlot }>;

export type SceneDefinition = Readonly<
  | { slot: GradientSlot; kind: 'gradient'; horizontal: boolean; stops: KeyGradient['stops'] }
  | { slot: 'black-shadow'; kind: 'shadow'; horizontal: boolean; opacity: number }
>;

export interface KeyboardScene {
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly background: string;
  readonly definitions: readonly SceneDefinition[];
  readonly appearance: ResolvedAppearance;
  readonly keys: readonly SceneKey[];
}

type LayoutKey = KeyboardLayout['keys'][number];

export type SceneKey = LayoutKey & Readonly<KeyPresentation> & {
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly cornerRadius: number;
  readonly shadow: boolean;
  readonly indicator: Readonly<{ cx: number; cy: number; r: number; fill: string }>;
};

export interface KeyPresentation {
  fill: ScenePaint;
  indicatorDisplay: 'inline' | 'none';
}

export function keyPresentation(kind: KeyKind, appearance: ResolvedAppearance, pressed: boolean): KeyPresentation {
  const paint = appearance[kind];
  return {
    fill: pressed ? appearance.pressed
      : typeof paint === 'string' ? paint : Object.freeze({ slot: gradientSlots[kind] }),
    indicatorDisplay: pressed ? 'inline' : 'none',
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

  return Object.freeze({
    width: layout.width,
    height: layout.height,
    label: `${layout.orientation === 'horizontal' ? 'Horizontal' : 'Vertical'} piano keyboard, ${notes}`,
    background: appearance.background,
    appearance,
    definitions: Object.freeze(definitions),
    keys: Object.freeze(layout.keys.map(key => {
      const { x, y, width, height } = key.bounds;
      const pitchWidth = horizontal ? width : height;
      const depth = horizontal ? height : width;
      // The center strip stays clear of adjacent black keys, even at equal depth.
      const visibleWidth = key.kind === 'white' ? pitchWidth - config.sizing.blackKeyWidth : pitchWidth;
      return Object.freeze({
        ...key,
        ...keyPresentation(key.kind, appearance, pressed?.has(key.note) ?? false),
        stroke: appearance.boundary,
        strokeWidth: appearance.strokeWidth,
        cornerRadius: appearance.cornerRadius,
        shadow: key.kind === 'black' && appearance.blackKeyShadow > 0,
        indicator: Object.freeze({
          cx: x + width * (horizontal ? 0.5 : 0.75),
          cy: y + height * (horizontal ? 0.75 : 0.5),
          r: Math.min(visibleWidth * 0.3, depth * 0.125),
          fill: '#ffffff',
        }),
      });
    })),
  });
}
