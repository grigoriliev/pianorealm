import type { Viewport } from './attributes.js';

function pixels(value: string): number {
  return value.endsWith('px') ? Number.parseFloat(value) : 0;
}

function contentExtent(cssExtent: string, clientExtent: number, padding: number, cssInsets: number): number {
  const clientContent = clientExtent - padding;
  const content = cssExtent.endsWith('px') ? pixels(cssExtent) - cssInsets : clientContent;
  // Prefer fractional CSS sizes unless the client box lost space to a scrollbar.
  return content > clientContent + 1 ? clientContent : content;
}

export function measureContainer(container: HTMLElement): Viewport | null {
  if (!container.isConnected || container.getClientRects().length === 0) {
    return null;
  }
  const style = container.ownerDocument.defaultView?.getComputedStyle(container);
  if (!style) {
    return null;
  }

  const paddingWidth = pixels(style.paddingLeft) + pixels(style.paddingRight);
  const paddingHeight = pixels(style.paddingTop) + pixels(style.paddingBottom);
  const borderBox = style.boxSizing === 'border-box';
  const horizontalInsets = borderBox ? paddingWidth + pixels(style.borderLeftWidth) + pixels(style.borderRightWidth) : 0;
  const verticalInsets = borderBox ? paddingHeight + pixels(style.borderTopWidth) + pixels(style.borderBottomWidth) : 0;
  const width = contentExtent(style.width, container.clientWidth, paddingWidth, horizontalInsets);
  const height = contentExtent(style.height, container.clientHeight, paddingHeight, verticalInsets);
  return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    ? { width, height }
    : null;
}
