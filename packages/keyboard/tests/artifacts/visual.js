const Keyboard = Pianorealm.Keyboard;
const original = [
  { title: 'Minimal · both', skin: 'minimal', pressedMode: 'both' },
  { title: 'Classic · color', skin: 'classic', pressedMode: 'color', orientation: 'vertical' },
  { title: 'Modern · indicator', skin: 'modern', pressedMode: 'indicator' },
  { title: 'Neon · both', skin: 'neon', pressedMode: 'both', orientation: 'vertical' },
  { title: 'Dark · color', skin: 'dark', pressedMode: 'color' },
  { title: 'High contrast · indicator', skin: 'high-contrast', pressedMode: 'indicator', orientation: 'vertical' },
  {
    title: 'Custom Modern · full range',
    skin: 'modern',
    range: { from: 'A0', to: 'C8' },
    appearance: { background: '#efdbce', white: '#fff6ef', pressed: '#a04a29' },
    full: true,
  },
];
const octaves = { from: 'C3', to: 'C5' };
const realistic = [
  { title: 'Classic · C3–C5', skin: 'classic', range: octaves, pressed: [], wide: true },
  { title: 'Realistic · C3–C5', skin: 'realistic', range: octaves, pressed: [], wide: true },
  { title: 'Realistic · horizontal · both', skin: 'realistic', pressedMode: 'both' },
  { title: 'Realistic · vertical · indicator', skin: 'realistic', pressedMode: 'indicator', orientation: 'vertical' },
  { title: 'Realistic · A0–C8', skin: 'realistic', range: { from: 'A0', to: 'C8' }, wide: true },
];
const matrix = location.search === '?realistic' ? realistic : original;
const main = document.querySelector('main');

window.visualFixture = matrix.map(({ title, full, wide, pressed, ...variant }, index) => {
  const section = document.createElement('section');
  section.className = full ? 'full' : wide ? 'wide' : 'compact';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const row = document.createElement('div');
  row.className = 'pair';
  const container = document.createElement('div');
  container.className = 'mounted';
  const img = document.createElement('img');
  img.alt = title;
  section.append(heading, row);
  row.append(container, img);
  main.append(section);
  const visuals = {
    range: { from: 'F#3', to: 'D#4' },
    labels: { mode: 'note', emphasizeC: true },
    accessibility: { label: title, description: 'F sharp, A and C are marked.' },
    overlays: { C4: [{ type: 'badge', text: 1, depth: 0.52 }, { type: 'circle', color: '#ad5332' }] },
    ...variant,
  };
  if (wide) {
    delete visuals.labels;
    delete visuals.overlays;
    if (pressed?.length === 0) delete visuals.accessibility.description;
    else visuals.accessibility.description = 'C, E and G are marked.';
  }
  const pressedKeys = pressed ?? (wide ? ['C4', 'E4', 'G4'] : ['F#3', 'A3', 'C4']);
  const dimensions = { width: container.clientWidth, height: container.clientHeight };
  const piano = new Keyboard({
    container, ...visuals, animation: { enabled: false },
    sizing: full ? { mode: 'container' } : { mode: 'fixed', ...dimensions },
  });
  piano.setPressedKeys(pressedKeys);
  const markup = Keyboard.renderToSVG({ ...visuals, sizing: dimensions, pressedKeys, idPrefix: `visual-${index}` });
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  const count = visuals.range.from === 'A0' ? 88 : visuals.range === octaves ? 25 : 10;
  return { piano, container, img, markup, count };
});
