import type { KeyboardScene } from '../scene/build-scene.js';
import {
  backgroundAttributes, indicatorAttributes, keyAttributes, rootAttributes, SVG_NS, viewportAttributes,
} from './attributes.js';
import type { Viewport } from './attributes.js';

function encodeAttribute(value: string | number): string {
  const text = String(value);
  for (const character of text) {
    const code = character.codePointAt(0)!;
    if ((code < 0x20 && character !== '\t' && character !== '\r' && character !== '\n')
      || (code >= 0xD800 && code <= 0xDFFF) || code === 0xFFFE || code === 0xFFFF) {
      throw new TypeError('SVG attribute contains an invalid XML character');
    }
  }
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll('\t', '&#9;').replaceAll('\n', '&#10;').replaceAll('\r', '&#13;');
}

function serializeAttributes(attributes: Readonly<Record<string, string | number>>): string {
  return Object.entries(attributes).map(([name, value]) => ` ${name}="${encodeAttribute(value)}"`).join('');
}

/** Phase 3 parity prototype. Only scenes built from validated layout and trusted paint are supported. */
export function serializeScene(scene: KeyboardScene, viewport: Viewport = scene): string {
  const root = { xmlns: SVG_NS, ...viewportAttributes(viewport), ...rootAttributes(scene) };
  const background = `<rect${serializeAttributes(backgroundAttributes(scene))}/>`;
  const keys = scene.keys.map(key => `<rect${serializeAttributes(keyAttributes(key))}/>`).join('');
  const indicators = scene.keys.map(key => `<circle${serializeAttributes(indicatorAttributes(key))}/>`).join('');
  return `<svg${serializeAttributes(root)}>${background}${keys}${indicators}</svg>`;
}
