import { PianoKeyboard } from '../src/index.js';
import type { KeyboardOptions } from '../src/index.js';

const samples = {
  horizontal: { range: { from: 'C3', to: 'C5' }, orientation: 'horizontal' },
  vertical: { range: { from: 'C3', to: 'C5' }, orientation: 'vertical' },
  full: { range: { from: 'A0', to: 'C8' }, orientation: 'horizontal' },
} satisfies Record<string, Pick<KeyboardOptions, 'range' | 'orientation'>>;

const keyboards = Object.entries(samples).map(([name, options]) => {
  const section = document.getElementById(name);
  const container = section?.querySelector<HTMLElement>('.keyboard-host');
  const button = section?.querySelector('button');
  if (!container || !button) {
    throw new Error(`Missing demo markup for ${name}`);
  }

  const piano = new PianoKeyboard({ container, ...options, sizing: { mode: 'fixed' } });
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
  return piano;
});

document.getElementById('highlight-chord')?.addEventListener('click', () => {
  for (const piano of keyboards) piano.setPressedKeys(['C4', 'E4', 'G4']);
});
document.getElementById('highlight-f-sharp-minor')?.addEventListener('click', () => {
  for (const piano of keyboards) piano.setPressedKeys(['F#3', 'A3', 'C#4']);
});
document.getElementById('clear-highlights')?.addEventListener('click', () => {
  for (const piano of keyboards) piano.clearPressedKeys();
});
