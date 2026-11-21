import { PianoKeyboard } from '../src/index.js';
import type { KeyboardOptions } from '../src/index.js';

const samples = {
  horizontal: { range: { from: 'C3', to: 'C5' }, orientation: 'horizontal' },
  vertical: { range: { from: 'C3', to: 'C5' }, orientation: 'vertical' },
  full: { range: { from: 'A0', to: 'C8' }, orientation: 'horizontal' },
} satisfies Record<string, Pick<KeyboardOptions, 'range' | 'orientation'>>;

for (const [name, options] of Object.entries(samples)) {
  const section = document.getElementById(name);
  const container = section?.querySelector<HTMLElement>('.keyboard-host');
  const button = section?.querySelector('button');
  if (!container || !button) {
    throw new Error(`Missing demo markup for ${name}`);
  }

  new PianoKeyboard({ container, ...options, sizing: { mode: 'fixed' } });
  button.addEventListener('click', () => {
    // Each demo host contains a single drawing. Export the whole SVG as mounted.
    const svg = container.querySelector('svg');
    if (!svg) return;

    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyboard-${name}-${options.range.from}-${options.range.to}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
