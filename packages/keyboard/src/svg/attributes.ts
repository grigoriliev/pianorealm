import type { KeyboardScene, SceneKey } from '../scene/build-scene.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';

export interface Viewport {
  readonly width: number;
  readonly height: number;
}

export function viewportAttributes({ width, height }: Viewport) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new RangeError('SVG viewport dimensions must be positive and finite');
  }
  return { width, height };
}

// Only these closed attribute sets are materialized by the output adapters.
// Property order defines the prototype serializer's attribute order.
export function rootAttributes(scene: KeyboardScene) {
  return {
    viewBox: `0 0 ${scene.width} ${scene.height}`,
    preserveAspectRatio: 'xMidYMid meet',
    display: 'block',
    overflow: 'hidden',
    role: 'img',
    'aria-label': scene.label,
  };
}

export function backgroundAttributes(scene: KeyboardScene) {
  return { x: 0, y: 0, width: scene.width, height: scene.height, fill: scene.background };
}

export function keyAttributes(key: SceneKey) {
  const { x, y, width, height } = key.bounds;
  return {
    'data-note': key.note,
    x, y, width, height,
    fill: key.fill,
    stroke: key.stroke,
    'stroke-width': 1,
  };
}
