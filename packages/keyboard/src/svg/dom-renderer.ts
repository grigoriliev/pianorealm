import type { KeyboardScene } from '../scene/build-scene.js';
import { backgroundAttributes, keyAttributes, rootAttributes, SVG_NS, viewportAttributes } from './attributes.js';
import type { Viewport } from './attributes.js';

function applyAttributes(element: SVGElement, attributes: Readonly<Record<string, string | number>>): void {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
}

export function buildSvg(document: Document, scene: KeyboardScene): SVGSVGElement {
  const root = document.createElementNS(SVG_NS, 'svg');
  applyAttributes(root, rootAttributes(scene));

  const background = document.createElementNS(SVG_NS, 'rect');
  applyAttributes(background, backgroundAttributes(scene));
  root.appendChild(background);

  for (const key of scene.keys) {
    const rect = document.createElementNS(SVG_NS, 'rect');
    applyAttributes(rect, keyAttributes(key));
    root.appendChild(rect);
  }
  return root;
}

export function sizeSvg(root: SVGSVGElement, viewport: Viewport): void {
  applyAttributes(root, viewportAttributes(viewport));
}
