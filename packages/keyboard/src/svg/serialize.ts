import { validateXmlText } from '../internal/xml-text.js';
import type { DecorationLayer } from '../scene/key-decorations.js';
import type { SvgNode } from './node.js';
import { describeDefinitions } from './definitions.js';
import { staticPrefix } from './identifiers.js';
import type { KeyboardScene } from '../scene/build-scene.js';
import {
  accessibilityAttributes, backgroundAttributes, describeAccessibility, describeDecorationLayer, describeIndicator, keyAttributes, rootAttributes, SVG_NS, viewportAttributes,
} from './attributes.js';
import type { Viewport } from './attributes.js';

function encodeAttribute(value: string | number): string {
  const text = String(value);
  validateXmlText(text);
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll('\t', '&#9;').replaceAll('\n', '&#10;').replaceAll('\r', '&#13;');
}

function serializeAttributes(attributes: Readonly<Record<string, string | number>>): string {
  return Object.entries(attributes).map(([name, value]) => ` ${name}="${encodeAttribute(value)}"`).join('');
}

function serializeNode(node: SvgNode): string {
  const start = `<${node.name}${serializeAttributes(node.attributes)}`;
  if (node.text !== undefined) {
    validateXmlText(node.text);
    const text = node.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('\r', '&#13;');
    return `${start}>${text}</${node.name}>`;
  }
  return node.children
    ? `${start}>${node.children.map(serializeNode).join('')}</${node.name}>`
    : `${start}/>`;
}

/** Private serializer for validated scenes. Explicit prefixes enable reproducible SVG bytes. */
export function serializeScene(scene: KeyboardScene, viewport: Viewport = scene, idPrefix?: string): string {
  const prefix = scene.definitions.length || (scene.description && !scene.decorative) || idPrefix !== undefined ? staticPrefix(idPrefix) : '';
  const defs = scene.definitions.length ? serializeNode(describeDefinitions(scene.definitions, prefix)) : '';
  const root = { xmlns: SVG_NS, ...viewportAttributes(viewport), ...rootAttributes(scene), ...accessibilityAttributes(scene, prefix) };
  const description = describeAccessibility(scene, prefix);
  const background = `<rect${serializeAttributes(backgroundAttributes(scene))}/>`;
  const keys = scene.keys.map(key => `<rect${serializeAttributes(keyAttributes(key, prefix))}/>`).join('');
  const layer = (name: DecorationLayer) => {
    const node = describeDecorationLayer(scene, name, prefix);
    return node ? serializeNode(node) : '';
  };
  const indicators = scene.keys.map(key => serializeNode(describeIndicator(key))).join('');
  return `<svg${serializeAttributes(root)}>${description ? serializeNode(description) : ''}${defs}${background}${keys}${layer('highlights')}${layer('labels')}${indicators}${layer('overlays')}</svg>`;
}
