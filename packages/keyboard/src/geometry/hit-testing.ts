import type { KeyboardLayout } from './layout.js';

export function validatePoint(x: number, y: number): void {
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new TypeError('Point coordinates must be numbers');
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError('Point coordinates must be finite');
  }
}

/** Find the topmost key at a point in intrinsic SVG user units. */
export function findNoteAtPoint(layout: KeyboardLayout, x: number, y: number): number | null {
  validatePoint(x, y);
  if (x < 0 || x >= layout.width || y < 0 || y >= layout.height) {
    return null;
  }

  for (let index = layout.keys.length - 1; index >= 0; index--) {
    const { note, bounds } = layout.keys[index];
    if (x >= bounds.x && x < bounds.x + bounds.width &&
        y >= bounds.y && y < bounds.y + bounds.height) {
      return note;
    }
  }
  return null;
}
