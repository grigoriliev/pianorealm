import { describeDefinitions } from './definitions.js';
import type { KeyboardScene, KeyPresentation, SceneDefinition, SceneKey } from '../scene/build-scene.js';
import {
  backgroundAttributes, fillAttribute, indicatorAttributes, keyAttributes, keyStyleAttributes,
  rootAttributes, SVG_NS, viewportAttributes,
} from './attributes.js';
import type { Viewport } from './attributes.js';

function applyAttributes(element: SVGElement, attributes: Readonly<Record<string, string | number>>): void {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
}

interface KeyNodes {
  readonly kind: SceneKey['kind'];
  readonly body: SVGRectElement;
  readonly indicator: SVGCircleElement;
}

function materializeDefinition(document: Document, node: ReturnType<typeof describeDefinitions>): SVGElement {
  const element = document.createElementNS(SVG_NS, node.name);
  applyAttributes(element, node.attributes);
  for (const child of node.children ?? []) element.appendChild(materializeDefinition(document, child));
  return element;
}

function buildDefs(document: Document, scene: KeyboardScene, prefix: string): SVGElement | undefined {
  if (scene.definitions.length) return materializeDefinition(document, describeDefinitions(scene.definitions, prefix));
}

export function buildSvg(document: Document, scene: KeyboardScene, prefix: string) {
  const root = document.createElementNS(SVG_NS, 'svg');
  applyAttributes(root, rootAttributes(scene));

  const defs = buildDefs(document, scene, prefix);
  if (defs) root.appendChild(defs);
  const background = document.createElementNS(SVG_NS, 'rect');
  applyAttributes(background, backgroundAttributes(scene));
  root.appendChild(background);

  const keys = new Map<number, KeyNodes>();
  for (const key of scene.keys) {
    const body = document.createElementNS(SVG_NS, 'rect');
    applyAttributes(body, keyAttributes(key, prefix));
    root.appendChild(body);
    const indicator = document.createElementNS(SVG_NS, 'circle');
    applyAttributes(indicator, indicatorAttributes(key));
    keys.set(key.note, { kind: key.kind, body, indicator });
  }
  for (const { indicator } of keys.values()) root.appendChild(indicator);
  return { root, keys, background, defs, definitions: scene.definitions };
}

function sameDefinition(a: SceneDefinition, b: SceneDefinition | undefined): boolean {
  if (!b || a.slot !== b.slot || a.horizontal !== b.horizontal) return false;
  if (a.kind === 'gradient') return b.kind === 'gradient' && a.stops === b.stops;
  return b.kind === 'shadow' && a.opacity === b.opacity;
}

export function updateSvg(
  drawing: ReturnType<typeof buildSvg>, scene: KeyboardScene, prefix: string, geometryChanged = false,
): void {
  if (scene.definitions.length !== drawing.definitions.length
    || !scene.definitions.every((definition, index) => sameDefinition(definition, drawing.definitions[index]))) {
    const defs = buildDefs(drawing.root.ownerDocument, scene, prefix);
    if (drawing.defs && defs) drawing.defs.replaceWith(defs);
    else if (defs) drawing.root.insertBefore(defs, drawing.background);
    else drawing.defs?.remove();
    drawing.defs = defs;
    drawing.definitions = scene.definitions;
  }

  if (geometryChanged) {
    drawing.root.setAttribute('viewBox', rootAttributes(scene).viewBox);
    applyAttributes(drawing.background, backgroundAttributes(scene));
  } else {
    drawing.background.setAttribute('fill', scene.background);
  }
  drawing.root.setAttribute('aria-label', scene.label);
  for (const key of scene.keys) {
    const nodes = drawing.keys.get(key.note)!;
    if (geometryChanged) {
      applyAttributes(nodes.body, keyAttributes(key, prefix));
      applyAttributes(nodes.indicator, indicatorAttributes(key));
    } else {
      applyAttributes(nodes.body, keyStyleAttributes(key, prefix));
    }
  }
}

export function updateKeyPresentation(nodes: KeyNodes, presentation: KeyPresentation, prefix: string): void {
  nodes.body.setAttribute('fill', fillAttribute(presentation, prefix));
  nodes.indicator.setAttribute('display', presentation.indicatorDisplay);
}

export function sizeSvg(root: SVGSVGElement, viewport: Viewport): void {
  applyAttributes(root, viewportAttributes(viewport));
}
