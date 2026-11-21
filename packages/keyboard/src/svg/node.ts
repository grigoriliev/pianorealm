type SvgElementName =
  | 'defs' | 'linearGradient' | 'stop' | 'filter' | 'feDropShadow' | 'clipPath'
  | 'g' | 'rect' | 'circle' | 'text';

export type SvgAttributes = Readonly<Record<string, string | number>>;

/** Closed set of elements and adapter-owned attributes, with literal text content. */
export interface SvgNode {
  readonly name: SvgElementName;
  readonly attributes: SvgAttributes;
  readonly children?: readonly SvgNode[];
  readonly text?: string;
}
