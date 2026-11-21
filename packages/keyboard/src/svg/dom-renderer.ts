import type { KeyboardScene, KeyPresentation, SceneKey } from '../scene/build-scene.js';
import {
  backgroundAttributes, indicatorAttributes, keyAttributes, rootAttributes, SVG_NS, viewportAttributes,
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

export function buildSvg(document: Document, scene: KeyboardScene) {
  const root = document.createElementNS(SVG_NS, 'svg');
  applyAttributes(root, rootAttributes(scene));

  const background = document.createElementNS(SVG_NS, 'rect');
  applyAttributes(background, backgroundAttributes(scene));
  root.appendChild(background);

  const keys = new Map<number, KeyNodes>();
  for (const key of scene.keys) {
    const body = document.createElementNS(SVG_NS, 'rect');
    applyAttributes(body, keyAttributes(key));
    root.appendChild(body);
    const indicator = document.createElementNS(SVG_NS, 'circle');
    applyAttributes(indicator, indicatorAttributes(key));
    keys.set(key.note, { kind: key.kind, body, indicator });
  }
  for (const { indicator } of keys.values()) root.appendChild(indicator);
  return { root, keys };
}

export function updateKeyPresentation(nodes: KeyNodes, presentation: KeyPresentation): void {
  nodes.body.setAttribute('fill', presentation.fill);
  nodes.indicator.setAttribute('display', presentation.indicatorDisplay);
}

export function sizeSvg(root: SVGSVGElement, viewport: Viewport): void {
  applyAttributes(root, viewportAttributes(viewport));
}
