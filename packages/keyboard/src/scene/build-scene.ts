import type { normalizeConfig } from '../config/normalize.js';
import type { KeyboardLayout } from '../geometry/layout.js';
import { formatNote } from '../notes/notation.js';
import type { KeyKind } from '../notes/notation.js';

export const minimalAppearance = Object.freeze({
  background: '#e2e2e2',
  white: '#fafafa',
  black: '#242424',
  boundary: '#595959',
  pressed: '#3978bd',
  indicator: '#ffffff',
});

export interface KeyboardScene {
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly background: string;
  readonly keys: readonly SceneKey[];
}

type LayoutKey = KeyboardLayout['keys'][number];

export type SceneKey = LayoutKey & Readonly<KeyPresentation> & {
  readonly stroke: string;
  readonly indicator: Readonly<{ cx: number; cy: number; r: number; fill: string }>;
};

export interface KeyPresentation {
  fill: string;
  indicatorDisplay: 'inline' | 'none';
}

export function keyPresentation(kind: KeyKind, appearance: typeof minimalAppearance, pressed: boolean): KeyPresentation {
  return {
    fill: pressed ? appearance.pressed : appearance[kind],
    indicatorDisplay: pressed ? 'inline' : 'none',
  };
}

/** The frozen layout already supplies identity, bounds and stacking order. */
export function buildScene(
  config: ReturnType<typeof normalizeConfig>,
  layout: KeyboardLayout,
  appearance: typeof minimalAppearance,
  pressed?: Pick<ReadonlySet<number>, 'has'>,
): KeyboardScene {
  const { from, to } = config.range;
  const first = formatNote(from, config.notation);
  const last = formatNote(to, config.notation);
  const notes = from === to ? first : `${first} to ${last}`;
  return Object.freeze({
    width: layout.width,
    height: layout.height,
    label: `${layout.orientation === 'horizontal' ? 'Horizontal' : 'Vertical'} piano keyboard, ${notes}`,
    background: appearance.background,
    keys: Object.freeze(layout.keys.map(key => {
      const { x, y, width, height } = key.bounds;
      const horizontal = layout.orientation === 'horizontal';
      const pitchWidth = horizontal ? width : height;
      const depth = horizontal ? height : width;
      // The center strip stays clear of adjacent black keys, even at equal depth.
      const visibleWidth = key.kind === 'white' ? pitchWidth - config.sizing.blackKeyWidth : pitchWidth;
      return Object.freeze({
        ...key,
        ...keyPresentation(key.kind, appearance, pressed?.has(key.note) ?? false),
        stroke: appearance.boundary,
        indicator: Object.freeze({
          cx: x + width * (horizontal ? 0.5 : 0.75),
          cy: y + height * (horizontal ? 0.75 : 0.5),
          r: Math.min(visibleWidth * 0.3, depth * 0.125),
          fill: appearance.indicator,
        }),
      });
    })),
  });
}
