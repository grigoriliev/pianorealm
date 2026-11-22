import * as keyboard from '@pianorealm/keyboard';
import type { StaticKeyboardOptions } from '@pianorealm/keyboard';

const options: StaticKeyboardOptions = {
  range: { from: 'C3', to: 'C5' },
  skin: 'classic',
  sizing: { width: 240 },
  idPrefix: 'node',
  pressedKeys: ['C4', keyboard.normalizeNote('E4'), 'G4'],
};
export const svg: string = keyboard.PianoKeyboard.renderToSVG(options);

// @ts-expect-error static sizing has no container to measure
const invalid: StaticKeyboardOptions = { sizing: { mode: 'container' } };
void invalid;

export const exports = Object.keys(keyboard);
export function importClassic(): Promise<unknown> {
  // @ts-expect-error standalone files are outside the package exports
  return import('@pianorealm/keyboard/dist/pianorealm-keyboard.umd.js');
}
