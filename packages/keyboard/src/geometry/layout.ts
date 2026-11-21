import { validateKeyDimensions, validateOrientation } from '../config/normalize.js';
import type { KeyDimensions, Orientation } from '../config/normalize.js';
import { classifyNote } from '../notes/notation.js';
import type { KeyKind } from '../notes/notation.js';
import { validateMidiRange } from '../notes/ranges.js';
import type { MidiRange } from '../notes/ranges.js';

interface KeyBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface KeyLayout {
  readonly note: number;
  readonly kind: KeyKind;
  readonly bounds: KeyBounds;
}

export interface KeyboardLayout {
  readonly orientation: Orientation;
  readonly width: number;
  readonly height: number;
  /** Draw order, with each of the white and black layers in ascending MIDI order. */
  readonly keys: readonly KeyLayout[];
}

function rotateBounds(bounds: KeyBounds, pitchExtent: number): KeyBounds {
  const top = pitchExtent - (bounds.x + bounds.width);
  // Subtraction can round the top up, putting the bottom past the viewport.
  // In that case, move the top toward zero by one floating-point step.
  const y = top + bounds.width > pitchExtent ? top - top * (Number.EPSILON / 2) : top;
  return { x: bounds.y, y, width: bounds.height, height: bounds.width };
}

/** Place the inclusive MIDI range in intrinsic SVG user units. */
export function calculateLayout(
  range: MidiRange,
  orientation: Orientation,
  dimensions: KeyDimensions,
): KeyboardLayout {
  validateMidiRange(range);
  validateOrientation(orientation);
  validateKeyDimensions(dimensions);

  const { whiteKeyWidth, whiteKeyHeight, blackKeyWidth, blackKeyHeight } = dimensions;
  const blackHalfWidth = blackKeyWidth / 2;
  // Begin at the left edge of the first visible rectangle. A leading black key
  // extends left from seam zero, where its virtual lower white neighbor ends.
  const leadingOffset = classifyNote(range.from) === 'black' ? blackHalfWidth : 0;
  const whites: KeyLayout[] = [];
  const blacks: KeyLayout[] = [];
  let pitchExtent = 0;

  for (let note = range.from; note <= range.to; note++) {
    const kind = classifyNote(note);
    const isWhite = kind === 'white';
    const seam = whites.length * whiteKeyWidth;
    const x = seam + (isWhite ? leadingOffset : leadingOffset - blackHalfWidth);
    const width = isWhite ? whiteKeyWidth : blackKeyWidth;
    const height = isWhite ? whiteKeyHeight : blackKeyHeight;
    const layer = isWhite ? whites : blacks;
    layer.push({ note, kind, bounds: { x, y: 0, width, height } });
    pitchExtent = Math.max(pitchExtent, x + width);
  }
  if (!Number.isFinite(pitchExtent)) {
    throw new RangeError('The MIDI range and key dimensions exceed the finite layout extent');
  }

  const isHorizontal = orientation === 'horizontal';
  const keys = [...whites, ...blacks].map(({ note, kind, bounds }) => Object.freeze({
    note,
    kind,
    bounds: Object.freeze(isHorizontal ? bounds : rotateBounds(bounds, pitchExtent)),
  }));
  return Object.freeze({
    orientation,
    width: isHorizontal ? pitchExtent : whiteKeyHeight,
    height: isHorizontal ? whiteKeyHeight : pitchExtent,
    keys: Object.freeze(keys),
  });
}
