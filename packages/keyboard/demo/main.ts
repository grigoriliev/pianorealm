import { PianoKeyboard } from '../src/index.js';
import type { IndicatorOptions, KeyboardOptions, KeyOverlays, LabelMode, PressedMode } from '../src/index.js';

const exampleOverlays = {
  C4: [
    { type: 'circle', color: '#167286', size: 7, depth: 0.25 },
    { type: 'badge', text: 1, depth: 0.48 },
  ],
  E4: [{ type: 'text', text: 'Mi' }],
  G4: [{ type: 'number', value: 5 }],
} satisfies KeyOverlays;

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
    // The mounted transition sheet is outside the SVG. Export its final-state attributes.
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

const skin = document.querySelector<HTMLSelectElement>('#skin');
skin?.addEventListener('change', () => {
  for (const piano of keyboards) piano.setSkin(skin.value);
});

const transparent = document.querySelector<HTMLInputElement>('#transparent-background');
transparent?.addEventListener('change', () => {
  for (const piano of keyboards) {
    piano.setOptions({ appearance: { background: transparent.checked ? 'transparent' : undefined } });
  }
});

const hideBorders = document.querySelector<HTMLInputElement>('#hide-borders');
hideBorders?.addEventListener('change', () => {
  for (const piano of keyboards) {
    piano.setOptions({ appearance: { strokeWidth: hideBorders.checked ? 0 : undefined } });
  }
});

const animate = document.querySelector<HTMLInputElement>('#animate-highlights');
animate?.addEventListener('change', () => {
  for (const piano of keyboards) {
    piano.setOptions({ animation: { enabled: animate.checked } });
  }
});

const labelMode = document.querySelector<HTMLSelectElement>('#label-mode');
labelMode?.addEventListener('change', () => {
  for (const piano of keyboards) piano.setOptions({ labels: { mode: labelMode.value as LabelMode } });
});

const emphasizeC = document.querySelector<HTMLInputElement>('#emphasize-c');
emphasizeC?.addEventListener('change', () => {
  for (const piano of keyboards) piano.setOptions({ labels: { emphasizeC: emphasizeC.checked } });
});

const pressedMode = document.querySelector<HTMLSelectElement>('#pressed-mode');
pressedMode?.addEventListener('change', () => {
  for (const piano of keyboards) piano.setOptions({ pressedMode: pressedMode.value as PressedMode });
});

const indicatorShape = document.querySelector<HTMLSelectElement>('#indicator-shape');
indicatorShape?.addEventListener('change', () => {
  const shape = indicatorShape.value as IndicatorOptions['shape'];
  for (const piano of keyboards) piano.setOptions({ indicator: { shape } });
});

const showAnnotations = document.querySelector<HTMLInputElement>('#show-annotations');
showAnnotations?.addEventListener('change', () => {
  const enabled = showAnnotations.checked;
  for (const piano of keyboards) {
    piano.setOptions({
      labels: { custom: enabled ? { C4: 'Do' } : undefined },
      highlights: enabled ? { E4: '#e69534' } : undefined,
    });
    piano.setKeyOverlays(enabled ? exampleOverlays : {});
  }
});
