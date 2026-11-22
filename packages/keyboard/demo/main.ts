import { normalizeNote, PianoKeyboard } from '../src/index.js';
import type {
  BuiltInSkin, IndicatorOptions, KeyboardEventMap, KeyboardOptions, KeyOverlays, LabelMode,
  Orientation, PressedMode, StaticKeyboardOptions,
} from '../src/index.js';

type SizingOptions = NonNullable<KeyboardOptions['sizing']>;
type DemoOptions = Omit<KeyboardOptions, 'container' | 'onCallbackError'> & { skin: BuiltInSkin };

const exampleOverlays = {
  C4: [
    { type: 'circle', color: '#167286', size: 7, depth: 0.25 },
    { type: 'badge', text: 1, depth: 0.48 },
  ],
  E4: [{ type: 'text', text: 'Mi' }],
  G4: [{ type: 'number', value: 5 }],
} satisfies KeyOverlays;

const ranges = {
  octaves: { from: 'C3', to: 'C5' },
  partial: { from: 'F#3', to: 'D#4' },
  full: { from: 'A0', to: 'C8' },
} satisfies Record<string, NonNullable<KeyboardOptions['range']>>;

function find<E extends HTMLElement>(selector: string): E {
  const element = document.querySelector<E>(selector);
  if (!element) throw new Error(`Missing playground element ${selector}`);
  return element;
}

const form = find<HTMLFormElement>('#controls');
const notes = find<HTMLInputElement>('#notes');
const error = find('#error');
const code = find<HTMLTextAreaElement>('#example');
const copyStatus = find('#copy-status');
const sizing = find<HTMLSelectElement>('#sizing');
const width = find<HTMLInputElement>('#width');
const height = find<HTMLInputElement>('#height');
const preview = find('#horizontal .keyboard-host');
const samples = [
  { name: 'horizontal', container: preview },
  {
    name: 'vertical', container: find('#vertical .keyboard-host'),
    layout: { orientation: 'vertical', range: ranges.octaves, sizing: { mode: 'fixed' } },
  },
  {
    name: 'full', container: find('#full .keyboard-host'),
    layout: { orientation: 'horizontal', range: ranges.full, sizing: { mode: 'fixed' } },
  },
] satisfies { name: string; container: HTMLElement; layout?: Partial<KeyboardOptions> }[];

let options: DemoOptions = {
  range: ranges.octaves, orientation: 'horizontal', sizing: { mode: 'container' }, skin: 'minimal',
};
const { width: initialWidth, height: initialHeight } = preview.getBoundingClientRect();
let previewViewport: KeyboardEventMap['resized'] = initialWidth && initialHeight
  ? { width: initialWidth, height: initialHeight }
  : null;
const keyboards = samples.map(({ container, layout }) => new PianoKeyboard({ container, ...options, ...layout }));
let pressedKeys: number[] = [];
let exportIndex = 0;
const exportNamespace = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function staticOptions(index: number, idPrefix: string): StaticKeyboardOptions {
  const { animation: _animation, sizing, ...visuals } = options;
  const sample = samples[index];
  const selectedSizing: SizingOptions | undefined = sample.layout?.sizing ?? sizing;
  return {
    ...visuals,
    orientation: sample.layout?.orientation ?? visuals.orientation,
    range: sample.layout?.range ?? visuals.range,
    sizing: selectedSizing?.mode === 'container'
      ? previewViewport ?? undefined
      : { width: selectedSizing?.width, height: selectedSizing?.height },
    pressedKeys,
    idPrefix,
  };
}

function updateCode(): void {
  copyStatus.textContent = '';
  const json = (value: unknown) => JSON.stringify(value, null, 2);
  if (find<HTMLSelectElement>('#example-api').value === 'static') {
    code.value = `import { PianoKeyboard } from '@pianorealm/keyboard';

// Use a distinct idPrefix for each inline copy.
const svg = PianoKeyboard.renderToSVG(${json(staticOptions(0, 'keyboard-example'))});`;
  } else {
    code.value = `import { PianoKeyboard } from '@pianorealm/keyboard';

// Give #piano a width and height when using container sizing.
const container = document.getElementById('piano');
const options = ${json(options)};
const keyboard = new PianoKeyboard({ ...options, container });
keyboard.setPressedKeys(${json(pressedKeys)});
// Call keyboard.destroy() when removing the host.`;
  }
}

function checked(id: string): boolean {
  return find<HTMLInputElement>(id).checked;
}

function optionalNumber(input: HTMLInputElement): number | undefined {
  if (!input.validity.valid) throw new RangeError(input.validationMessage);
  return input.value === '' ? undefined : input.valueAsNumber;
}

function apply(): void {
  const mode = sizing.value as NonNullable<SizingOptions['mode']>;
  width.disabled = height.disabled = mode !== 'fixed';
  let selection: number[];
  try {
    selection = notes.value.trim().split(/[\s,]+/).filter(Boolean)
      .map(note => normalizeNote(/^\d+$/.test(note) ? Number(note) : note));
    notes.removeAttribute('aria-invalid');
  } catch (problem) {
    notes.setAttribute('aria-invalid', 'true');
    error.textContent = problem instanceof Error ? problem.message : String(problem);
    return;
  }

  try {
    const annotations = checked('#show-annotations');
    const next: typeof options = {
      range: ranges[find<HTMLSelectElement>('#range').value as keyof typeof ranges],
      orientation: find<HTMLSelectElement>('#orientation').value as Orientation,
      sizing: {
        mode,
        width: mode === 'fixed' ? optionalNumber(width) : undefined,
        height: mode === 'fixed' ? optionalNumber(height) : undefined,
      },
      skin: find<HTMLSelectElement>('#skin').value as BuiltInSkin,
      appearance: {
        background: checked('#transparent-background') ? 'transparent' : undefined,
        strokeWidth: checked('#hide-borders') ? 0 : undefined,
      },
      animation: { enabled: checked('#animate-highlights'), duration: optionalNumber(find('#duration')) },
      labels: {
        mode: find<HTMLSelectElement>('#label-mode').value as LabelMode,
        emphasizeC: checked('#emphasize-c'),
        custom: annotations ? { C4: 'Do' } : undefined,
      },
      pressedMode: find<HTMLSelectElement>('#pressed-mode').value as PressedMode,
      indicator: { shape: find<HTMLSelectElement>('#indicator-shape').value as IndicatorOptions['shape'] },
      highlights: annotations ? { E4: '#e69534' } : undefined,
      overlays: annotations ? exampleOverlays : undefined,
    };
    preview.dataset.sizing = mode;
    preview.dataset.orientation = next.orientation;
    for (const [index, keyboard] of keyboards.entries()) {
      keyboard.setOptions({ ...next, ...samples[index].layout });
      keyboard.setPressedKeys(selection);
    }
    options = next;
    pressedKeys = keyboards[0].getPressedKeys();
    error.textContent = '';
    updateCode();
  } catch (problem) {
    error.textContent = problem instanceof Error ? problem.message : String(problem);
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  apply();
});
form.addEventListener('change', apply);
for (const [id, chord] of [
  ['highlight-chord', 'C4, E4, G4'],
  ['highlight-f-sharp-minor', 'F#3, A3, C#4'],
  ['clear-highlights', ''],
]) {
  find(`#${id}`).addEventListener('click', () => {
    notes.value = chord;
    apply();
  });
}

for (const [index, { name }] of samples.entries()) {
  find(`#${name} button`).addEventListener('click', () => {
    const xml = PianoKeyboard.renderToSVG(staticOptions(index, `keyboard-${exportNamespace}-${++exportIndex}`));
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyboard-${name}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

find('#example-api').addEventListener('change', updateCode);
find('#copy-example').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(code.value);
    copyStatus.textContent = 'Copied.';
  } catch {
    code.select();
    copyStatus.textContent = 'Code selected. Use your usual copy shortcut.';
  }
});
keyboards[0].on('resized', viewport => {
  previewViewport = viewport;
  if (find<HTMLSelectElement>('#example-api').value === 'static') updateCode();
});
apply();
if (!code.value) updateCode();
