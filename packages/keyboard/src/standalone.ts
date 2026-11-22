import { PianoKeyboard } from './public/PianoKeyboard.js';

declare const __PIANOREALM_KEYBOARD_VERSION__: string;

const marker = Symbol.for('@pianorealm/keyboard/standalone-version');
const version = __PIANOREALM_KEYBOARD_VERSION__;

function installKeyboard(global: typeof globalThis): void {
  const namespace = Object.getOwnPropertyDescriptor(global, 'Pianorealm');
  if (!namespace) {
    if ('Pianorealm' in global) throw new Error('Pianorealm namespace must be an own property');
    Object.defineProperty(global, 'Pianorealm', {
      value: { Keyboard: PianoKeyboard }, writable: true, configurable: true, enumerable: true,
    });
    return;
  }

  const target: unknown = namespace.value;
  if (typeof target !== 'object' || target === null || Array.isArray(target)) {
    throw new Error('Incompatible Pianorealm namespace');
  }
  const keyboard = Object.getOwnPropertyDescriptor(target, 'Keyboard');
  if (keyboard) {
    const installed: unknown = keyboard.value;
    if (typeof installed === 'function') {
      const build = Object.getOwnPropertyDescriptor(installed, marker);
      if (build?.value === version) return;
      if (build && 'value' in build) throw new Error('Incompatible Pianorealm.Keyboard version');
    }
    throw new Error('Pianorealm.Keyboard is already occupied');
  }
  if ('Keyboard' in target) throw new Error('Pianorealm.Keyboard is already occupied');
  if (!Object.isExtensible(target)) throw new Error('Pianorealm namespace cannot be extended to install Keyboard');
  Object.defineProperty(target, 'Keyboard', {
    value: PianoKeyboard, writable: true, configurable: true, enumerable: true,
  });
}

Object.defineProperty(PianoKeyboard, marker, { value: version });
installKeyboard(globalThis);
