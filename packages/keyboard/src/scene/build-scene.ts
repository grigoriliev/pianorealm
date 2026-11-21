import type { normalizeConfig } from '../config/normalize.js';
import type { KeyboardLayout } from '../geometry/layout.js';
import { formatNote } from '../notes/notation.js';

export const minimalAppearance = Object.freeze({
  background: '#e2e2e2',
  white: '#fafafa',
  black: '#242424',
  boundary: '#595959',
});

export interface KeyboardScene {
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly background: string;
  readonly keys: readonly SceneKey[];
}

export type SceneKey = KeyboardLayout['keys'][number] & {
  readonly fill: string;
  readonly stroke: string;
};

/** The frozen layout already supplies identity, bounds and stacking order. */
export function buildScene(
  config: ReturnType<typeof normalizeConfig>,
  layout: KeyboardLayout,
  appearance: typeof minimalAppearance,
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
    keys: Object.freeze(layout.keys.map(key => Object.freeze({
      ...key,
      fill: appearance[key.kind],
      stroke: appearance.boundary,
    }))),
  });
}
