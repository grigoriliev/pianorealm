import { describeDefinitions } from './definitions.js';
import { staticPrefix } from './identifiers.js';
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

function serializeDefinition(node: ReturnType<typeof describeDefinitions>): string {
  const start = `<${node.name}${serializeAttributes(node.attributes)}`;
  return node.children
    ? `${start}>${node.children.map(serializeDefinition).join('')}</${node.name}>`
    : `${start}/>`;
}

/** Private serializer for validated scenes. Explicit prefixes enable reproducible SVG bytes. */
export function serializeScene(scene: KeyboardScene, viewport: Viewport = scene, idPrefix?: string): string {
  const prefix = scene.definitions.length || idPrefix !== undefined ? staticPrefix(idPrefix) : '';
  const defs = scene.definitions.length ? serializeDefinition(describeDefinitions(scene.definitions, prefix)) : '';
  const root = { xmlns: SVG_NS, ...viewportAttributes(viewport), ...rootAttributes(scene) };
  const background = `<rect${serializeAttributes(backgroundAttributes(scene))}/>`;
  const keys = scene.keys.map(key => `<rect${serializeAttributes(keyAttributes(key, prefix))}/>`).join('');
  const indicators = scene.keys.map(key => `<circle${serializeAttributes(indicatorAttributes(key))}/>`).join('');
  return `<svg${serializeAttributes(root)}>${defs}${background}${keys}${indicators}</svg>`;
}
