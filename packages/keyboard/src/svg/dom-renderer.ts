import { describeDefinitions } from './definitions.js';
import type { KeyboardScene, KeyPresentation, SceneKey } from '../scene/build-scene.js';
import { decorationLayers } from '../scene/key-decorations.js';
import type { DecorationLayer } from '../scene/key-decorations.js';
import {
  accessibilityAttributes, accessibilityAttributeNames, backgroundAttributes, describeAccessibility, describeDecorationLayer, describeIndicator, describeKeyEdge, fillAttribute, keyAttributes, keyStyleAttributes,
  rootAttributes, SVG_NS, viewportAttributes,
} from './attributes.js';
import type { Viewport } from './attributes.js';
import type { SvgAttributes, SvgNode } from './node.js';

function setAttribute(element: SVGElement, name: string, value: string | number): void {
  const text = String(value);
  if (element.getAttribute(name) !== text) element.setAttribute(name, text);
}

function applyAttributes(element: SVGElement, attributes: SvgAttributes): void {
  for (const [name, value] of Object.entries(attributes)) setAttribute(element, name, value);
}

interface KeyNodes {
  readonly kind: SceneKey['kind'];
  readonly body: SVGRectElement;
  edge: SVGElement | undefined;
  indicator: SVGElement;
  indicatorAttributes: SvgAttributes;
}

function materialize(document: Document, node: SvgNode): SVGElement {
  const element = document.createElementNS(SVG_NS, node.name);
  applyAttributes(element, node.attributes);
  if (node.text !== undefined) element.appendChild(document.createTextNode(node.text));
  for (const child of node.children ?? []) element.appendChild(materialize(document, child));
  return element;
}

function buildDefs(document: Document, scene: KeyboardScene, prefix: string): SVGElement | undefined {
  if (scene.definitions.length) return materialize(document, describeDefinitions(scene.definitions, prefix));
}

interface DecorationNodes {
  readonly group: SVGElement;
  readonly keys: Map<number, { element: SVGElement; node: SvgNode }>;
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
    const edgeDescriptor = describeKeyEdge(key, prefix);
    const edge = edgeDescriptor && materialize(document, edgeDescriptor);
    if (edge) root.appendChild(edge);
    const descriptor = describeIndicator(key);
    const indicator = materialize(document, descriptor);
    keys.set(key.note, { kind: key.kind, body, edge, indicator, indicatorAttributes: descriptor.attributes });
  }
  for (const { indicator } of keys.values()) root.appendChild(indicator);
  const drawing = { root, keys, background, defs, definitions: scene.definitions, layers: new Map<DecorationLayer, DecorationNodes>() };
  updateAccessibility(root, scene, prefix);
  updateDecorations(drawing, scene, prefix);
  return drawing;
}

function updateAccessibility(root: SVGSVGElement, scene: KeyboardScene, prefix: string): void {
  const attributes = accessibilityAttributes(scene, prefix);
  for (const name of accessibilityAttributeNames) {
    if (Object.hasOwn(attributes, name)) setAttribute(root, name, attributes[name]);
    else if (root.hasAttribute(name)) root.removeAttribute(name);
  }

  const current = root.firstElementChild;
  const description = describeAccessibility(scene, prefix);
  if (current?.localName === 'desc') {
    if (!description) current.remove();
    else if (current.textContent !== description.text) current.textContent = description.text ?? '';
  } else if (description) {
    root.prepend(materialize(root.ownerDocument, description));
  }
}

function sameNode(a: SvgNode, b: SvgNode): boolean {
  if (a.name !== b.name || a.text !== b.text) return false;
  const names = Object.keys(a.attributes);
  const children = a.children ?? [];
  const otherChildren = b.children ?? [];
  return names.length === Object.keys(b.attributes).length && names.every(name => a.attributes[name] === b.attributes[name])
    && children.length === otherChildren.length && children.every((child, index) => sameNode(child, otherChildren[index]));
}

function updateDecorations(drawing: ReturnType<typeof buildSvg>, scene: KeyboardScene, prefix: string): void {
  const { root, layers, keys } = drawing;
  for (const layer of decorationLayers) {
    const descriptor = describeDecorationLayer(scene, layer, prefix);
    let current = layers.get(layer);
    if (!descriptor) {
      current?.group.remove();
      layers.delete(layer);
      continue;
    }
    if (!current) {
      const group = materialize(root.ownerDocument, { name: descriptor.name, attributes: descriptor.attributes });
      const firstIndicator = keys.values().next().value?.indicator ?? null;
      const before = layer === 'overlays' ? null : layer === 'highlights'
        ? layers.get('labels')?.group ?? firstIndicator : firstIndicator;
      root.insertBefore(group, before);
      current = { group, keys: new Map() };
      layers.set(layer, current);
    }
    const next = new Map<number, { element: SVGElement; node: SvgNode }>();
    // Work backward so each insertion has a stable reference sibling.
    let sibling: SVGElement | null = null;
    for (let index = descriptor.children.length - 1; index >= 0; index--) {
      const node = descriptor.children[index];
      const note = Number(node.attributes['data-decoration-note']);
      const old = current.keys.get(note);
      const element = old && sameNode(node, old.node) ? old.element : materialize(root.ownerDocument, node);
      if (old && element !== old.element) old.element.remove();
      if (element.parentNode !== current.group) current.group.insertBefore(element, sibling);
      next.set(note, { element, node });
      sibling = element;
    }
    for (const [note, { element }] of current.keys) {
      if (!next.has(note)) element.remove();
    }
    layers.set(layer, { group: current.group, keys: next });
  }
}

export function updateSvg(
  drawing: ReturnType<typeof buildSvg>, scene: KeyboardScene, prefix: string, geometryChanged = false,
): void {
  if (scene.definitions !== drawing.definitions) {
    const current = describeDefinitions(drawing.definitions, prefix);
    const next = describeDefinitions(scene.definitions, prefix);
    if (!sameNode(current, next)) {
      const defs = buildDefs(drawing.root.ownerDocument, scene, prefix);
      if (drawing.defs && defs) drawing.defs.replaceWith(defs);
      else if (defs) drawing.root.insertBefore(defs, drawing.background);
      else drawing.defs?.remove();
      drawing.defs = defs;
    }
    drawing.definitions = scene.definitions;
  }

  if (geometryChanged) {
    setAttribute(drawing.root, 'viewBox', rootAttributes(scene).viewBox);
    applyAttributes(drawing.background, backgroundAttributes(scene));
  } else {
    setAttribute(drawing.background, 'fill', scene.background);
  }
  updateAccessibility(drawing.root, scene, prefix);
  for (const key of scene.keys) {
    const nodes = drawing.keys.get(key.note)!;
    applyAttributes(nodes.body, geometryChanged ? keyAttributes(key, prefix) : keyStyleAttributes(key, prefix));
    const edge = describeKeyEdge(key, prefix);
    if (edge && nodes.edge) {
      applyAttributes(nodes.edge, edge.attributes);
    } else if (edge) {
      nodes.edge = materialize(drawing.root.ownerDocument, edge);
      nodes.body.after(nodes.edge);
    } else if (nodes.edge) {
      nodes.edge.remove();
      nodes.edge = undefined;
    }
    const indicator = describeIndicator(key);
    if (nodes.indicator.localName !== indicator.name) {
      const replacement = materialize(drawing.root.ownerDocument, indicator);
      nodes.indicator.replaceWith(replacement);
      nodes.indicator = replacement;
    } else {
      for (const name of Object.keys(nodes.indicatorAttributes)) {
        if (!Object.hasOwn(indicator.attributes, name)) nodes.indicator.removeAttribute(name);
      }
      applyAttributes(nodes.indicator, indicator.attributes);
    }
    nodes.indicatorAttributes = indicator.attributes;
  }
  updateDecorations(drawing, scene, prefix);
}

export function updateKeyPresentation(nodes: KeyNodes, presentation: KeyPresentation, prefix: string): void {
  setAttribute(nodes.body, 'fill', fillAttribute(presentation, prefix));
  if (nodes.edge) setAttribute(nodes.edge, 'display', presentation.edgeDisplay);
  setAttribute(nodes.indicator, 'display', presentation.indicatorDisplay);
}

export function sizeSvg(root: SVGSVGElement, viewport: Viewport): void {
  applyAttributes(root, viewportAttributes(viewport));
}
