import type { normalizeConfig } from '../config/normalize.js';
import type { IndicatorOptions, KeyOverlay } from '../config/decorations.js';
import type { KeyboardLayout } from '../geometry/layout.js';
import { formatNote } from '../notes/notation.js';
import type { SvgNode } from '../svg/node.js';

type Config = ReturnType<typeof normalizeConfig>;
type Key = KeyboardLayout['keys'][number];
export type Bounds = Key['bounds'];
type DecorationLayers = Readonly<Record<'highlights' | 'labels' | 'overlays', readonly SvgNode[]>>;
export type DecorationLayer = keyof DecorationLayers;
export const decorationLayers = ['highlights', 'labels', 'overlays'] as const;

export function clipSlot(note: number): `key-clip-${number}` {
  return `key-clip-${note}`;
}

function keyAxes({ x, y, width, height }: Bounds, horizontal: boolean) {
  const pitchWidth = horizontal ? width : height;
  const depthLength = horizontal ? height : width;
  return {
    pitchWidth, depthLength,
    point: (pitch: number, depth: number) => horizontal
      ? { x: x + pitch, y: y + depth }
      : { x: x + depth, y: y + (height - pitch) },
  };
}

/** Clip to the union of the key's uncovered rectangular regions. */
export function visibleFace(key: Key, neighbors: ReadonlyMap<number, Key>, horizontal: boolean): readonly Bounds[] {
  const { bounds } = key;
  if (key.kind === 'black') return [bounds];
  const lower = neighbors.get(key.note - 1);
  const upper = neighbors.get(key.note + 1);
  const lowBlack = lower?.kind === 'black' ? lower.bounds : undefined;
  const highBlack = upper?.kind === 'black' ? upper.bounds : undefined;
  const covered = lowBlack ?? highBlack;
  if (!covered) return [bounds];

  const { x, y, width, height } = bounds;
  if (horizontal) {
    const start = lowBlack ? lowBlack.x + lowBlack.width : x;
    const end = highBlack?.x ?? x + width;
    return [
      { x: start, y, width: Math.max(0, end - start), height: covered.height },
      { x, y: y + covered.height, width, height: height - covered.height },
    ].filter(rect => rect.width > 0 && rect.height > 0);
  }
  const start = highBlack ? highBlack.y + highBlack.height : y;
  const end = lowBlack?.y ?? y + height;
  return [
    { x, y: start, width: covered.width, height: Math.max(0, end - start) },
    { x: x + covered.width, y, width: width - covered.width, height },
  ].filter(rect => rect.width > 0 && rect.height > 0);
}

export function buildIndicator(key: Key, config: Config, horizontal: boolean) {
  const { pitchWidth, depthLength, point } = keyAxes(key.bounds, horizontal);
  const strip = key.kind === 'white' ? pitchWidth - config.sizing.blackKeyWidth : pitchWidth;
  const indicator: IndicatorOptions = config.indicator;
  const indicatorOnly = config.pressedMode === 'indicator';
  const fill = indicator.color ?? (indicatorOnly && key.kind === 'white' ? '#171717' : '#ffffff');
  const defaultStroke = indicatorOnly && key.kind === 'white' ? '#ffffff' : '#171717';
  const stroke = indicator.stroke ?? (indicatorOnly || indicator.strokeWidth !== undefined ? defaultStroke : undefined);
  // Reserve space for the stroke inside the safe center strip.
  const extent = Math.min(strip * 0.3, depthLength * 0.125, (indicator.size ?? Infinity) / 2);
  const strokeWidth = stroke === undefined ? 0 : Math.min(indicator.strokeWidth ?? 1, extent * 0.75);
  const r = extent - strokeWidth / 2;
  const offset = pitchWidth / 2 - strip / 2;
  const pitch = offset + Math.min(strip - extent, Math.max(extent, strip * (indicator.pitch ?? 0.5)));
  const depth = Math.min(depthLength - extent, Math.max(extent, depthLength * (indicator.depth ?? 0.75)));
  const { x, y } = point(pitch, depth);
  return Object.freeze({
    cx: x, cy: y, r, fill, shape: indicator.shape ?? 'circle', opacity: indicator.opacity ?? 1,
    ...(stroke === undefined ? {} : { stroke, 'stroke-width': strokeWidth }),
  });
}

function textNode(
  key: Key, text: string, x: number, y: number, size: number, color: string | undefined,
  emphasis = false, badge?: string, fitAnchor = false,
): SvgNode | undefined {
  const bounds = key.bounds;
  const { width, height } = bounds;
  // Use conservative glyph advances without requiring DOM font measurement.
  if (!text.length) return;
  const advance = Array.from(text).reduce((sum, character) => sum + (/^[A-Za-z0-9#-]$/.test(character) ? 0.8 : 1.2), 0);
  const paddedAdvance = advance + (badge ? 0.6 : 0);
  const fontSize = Math.min(size, height * 0.52, width * 0.85 / paddedAdvance);
  if (fontSize < 3) return;
  if (fitAnchor) {
    const halfAdvance = fontSize * paddedAdvance / 2;
    const halfHeight = fontSize * 0.75;
    x = bounds.x + Math.max(halfAdvance, Math.min(width - halfAdvance, x - bounds.x));
    y = bounds.y + Math.max(halfHeight, Math.min(height - halfHeight, y - bounds.y));
  }
  const whiteKey = key.kind === 'white';
  const label: SvgNode = {
    name: 'text',
    text,
    attributes: {
      x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-family': 'sans-serif', 'font-size': fontSize, 'font-weight': emphasis ? 700 : 400,
      fill: color ?? (whiteKey && !badge ? '#151515' : '#ffffff'),
      ...(badge || color !== undefined ? {} : {
        stroke: whiteKey ? '#ffffff' : '#151515', 'stroke-width': fontSize * 0.12, 'paint-order': 'stroke',
      }),
    },
  };
  if (!badge) return label;
  const badgeWidth = fontSize * paddedAdvance;
  const badgeHeight = fontSize * 1.5;
  return {
    name: 'g', attributes: {},
    children: [{
      name: 'rect',
      attributes: {
        x: x - badgeWidth / 2, y: y - badgeHeight / 2, width: badgeWidth, height: badgeHeight,
        rx: fontSize * 0.25, fill: badge,
      },
    }, label],
  };
}

function overlayNode(key: Key, overlay: KeyOverlay, horizontal: boolean): SvgNode | undefined {
  const { pitchWidth, depthLength, point } = keyAxes(key.bounds, horizontal);
  const { x, y } = point(pitchWidth * (overlay.pitch ?? 0.5), depthLength * (overlay.depth ?? 0.4));
  const { size, color } = overlay;
  if (overlay.type === 'circle') {
    const r = Math.min((size ?? 5) / 2, Math.min(pitchWidth, depthLength) / 2);
    return r > 0 ? { name: 'circle', attributes: { cx: x, cy: y, r, fill: color ?? '#167286' } } : undefined;
  }
  const text = String(overlay.type === 'number' ? overlay.value : overlay.text);
  const badge = overlay.type === 'badge' ? overlay.background ?? '#25344a' : undefined;
  return textNode(key, text, x, y, size ?? 8, color, false, badge);
}

export function buildDecorations(key: Key, config: Config, horizontal: boolean): DecorationLayers {
  const highlights: SvgNode[] = [];
  const labels: SvgNode[] = [];
  const overlays: SvgNode[] = [];
  const emphasis = config.labels.emphasizeC && key.note % 12 === 0;
  const highlight = config.highlights.get(key.note) ?? (emphasis ? '#167286' : undefined);
  if (highlight !== undefined) {
    const { x, y, width, height } = key.bounds;
    const thickness = (horizontal ? height : width) * 0.05;
    highlights.push({
      name: 'rect',
      attributes: horizontal
        ? { x, y: y + (height - thickness), width, height: thickness, fill: highlight }
        : { x: x + (width - thickness), y, width: thickness, height, fill: highlight },
    });
  }
  let text = config.labels.custom.get(key.note);
  if (text === undefined && config.labels.mode !== 'none') {
    if (config.labels.mode === 'midi') {
      text = String(key.note);
    } else {
      const name = formatNote(key.note, config.notation);
      text = config.labels.mode === 'note' ? name : name.replace(/^[A-G][#b]?/, '');
    }
  }
  if (text) {
    const { pitchWidth, depthLength, point } = keyAxes(key.bounds, horizontal);
    const { x, y } = point(pitchWidth / 2, depthLength * 0.87);
    const label = textNode(key, text, x, y, Math.min(9, depthLength * 0.16), undefined, emphasis, undefined, true);
    if (label) labels.push(label);
  }
  for (const overlay of config.overlays.get(key.note) ?? []) {
    const node = overlayNode(key, overlay, horizontal);
    if (node) overlays.push(node);
  }
  return { highlights, labels, overlays };
}
