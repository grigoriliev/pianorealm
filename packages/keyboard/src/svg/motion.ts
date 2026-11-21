import type { ResolvedAnimation } from '../config/animation.js';

const MOTION_SCOPE = 'data-pianorealm-motion';

export function scopeMotion(root: SVGSVGElement, prefix: string): void {
  root.setAttribute(MOTION_SCOPE, prefix);
}

export function updateMotion(style: HTMLStyleElement, prefix: string, animation: ResolvedAnimation): void {
  const root = `[${MOTION_SCOPE}="${prefix}"]`;
  const timing = `${animation.duration}ms ${animation.easing}`;
  // A positive media query keeps motion off in browsers without this CSS feature.
  // Keep display as the shared final-state attribute for SVG serialized without this sheet.
  const css = animation.enabled && animation.duration > 0 ? `
@media (prefers-reduced-motion: no-preference) {
  ${root} > rect[data-note] { transition: fill ${timing}; }
  ${root} > circle { display: inline; opacity: 1; transition: opacity ${timing}; }
  ${root} > circle[display="none"] { opacity: 0; }
}` : '';
  if (style.textContent !== css) style.textContent = css;
}
