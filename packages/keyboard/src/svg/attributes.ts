import { clipSlot } from '../scene/key-decorations.js';
import type { DecorationLayer } from '../scene/key-decorations.js';
import type { SvgAttributes, SvgNode } from './node.js';
import { definitionId, definitionReference } from './identifiers.js';
import type { KeyboardScene, KeyPresentation, SceneKey } from '../scene/build-scene.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export function fixedViewport(intrinsicSize: Viewport, sizing: Partial<Viewport>): Viewport {
  return {
    width: sizing.width ?? intrinsicSize.width,
    height: sizing.height ?? intrinsicSize.height,
  };
}

export function viewportAttributes({ width, height }: Viewport) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError('SVG viewport dimensions must be positive and finite');
  }
  return { width, height };
}

// Only these closed attribute sets are materialized by the output adapters.
// Property order defines the serializer's attribute order.
export function rootAttributes(scene: KeyboardScene) {
  return {
    viewBox: `0 0 ${scene.width} ${scene.height}`,
    preserveAspectRatio: 'xMidYMid meet',
    display: 'block',
    overflow: 'hidden',
  };
}

export function accessibilityAttributes(scene: KeyboardScene, prefix: string): SvgAttributes {
  if (scene.decorative) return { 'aria-hidden': 'true' };
  return {
    role: 'img', 'aria-label': scene.label,
    ...(scene.description === undefined ? {} : { 'aria-describedby': definitionId(prefix, 'description') }),
  };
}

export const accessibilityAttributeNames = ['role', 'aria-label', 'aria-describedby', 'aria-hidden'] as const;

export function describeAccessibility(scene: KeyboardScene, prefix: string): SvgNode | undefined {
  if (scene.decorative || scene.description === undefined) return;
  return { name: 'desc', attributes: { id: definitionId(prefix, 'description') }, text: scene.description };
}

export function backgroundAttributes(scene: KeyboardScene) {
  return { x: 0, y: 0, width: scene.width, height: scene.height, fill: scene.background };
}

export function keyAttributes(key: SceneKey, prefix: string) {
  const { x, y, width, height } = key.bounds;
  return {
    'data-note': key.note,
    x, y, width, height,
    ...keyStyleAttributes(key, prefix),
  };
}

export function fillAttribute(key: KeyPresentation, prefix: string): string {
  return typeof key.fill === 'string' ? key.fill : definitionReference(prefix, key.fill.slot);
}

export function keyStyleAttributes(key: SceneKey, prefix: string) {
  return {
    fill: fillAttribute(key, prefix),
    stroke: key.stroke,
    'stroke-width': key.strokeWidth,
    rx: key.cornerRadius,
    filter: key.shadow ? definitionReference(prefix, 'black-shadow') : 'none',
  };
}

export function describeKeyEdge(key: SceneKey, prefix: string): SvgNode | undefined {
  if (!key.edgeSlot) return;
  return {
    name: 'rect',
    attributes: {
      ...key.bounds, rx: key.cornerRadius, fill: definitionReference(prefix, key.edgeSlot),
      display: key.edgeDisplay, 'pointer-events': 'none', 'aria-hidden': 'true', 'data-key-edge': '',
    },
  };
}

export function describeIndicator(key: SceneKey): SvgNode {
  const { cx, cy, r, shape, ...paint } = key.indicator;
  const common = {
    ...paint, display: key.indicatorDisplay, 'pointer-events': 'none',
    'aria-hidden': 'true', 'data-pressed-indicator': '',
  };
  return shape === 'circle'
    ? { name: 'circle', attributes: { cx, cy, r, ...common } }
    : { name: 'rect', attributes: { x: cx - r, y: cy - r, width: r * 2, height: r * 2, ...common } };
}

export function describeDecorationLayer(
  scene: KeyboardScene, layer: DecorationLayer, prefix: string,
): (SvgNode & { readonly children: readonly SvgNode[] }) | undefined {
  const keys = scene.keys.filter(key => key.decorations[layer].length).sort((a, b) => a.note - b.note);
  if (!keys.length) return;
  return {
    name: 'g',
    attributes: { 'data-layer': layer, 'pointer-events': 'none', 'aria-hidden': 'true' },
    children: keys.map(key => ({
      name: 'g',
      attributes: { 'data-decoration-note': key.note, 'clip-path': definitionReference(prefix, clipSlot(key.note)) },
      children: key.decorations[layer],
    })),
  };
}
