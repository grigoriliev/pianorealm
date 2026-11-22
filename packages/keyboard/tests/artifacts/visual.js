const Keyboard = Pianorealm.Keyboard;
const matrix = [
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
const main = document.querySelector('main');

window.visualFixture = matrix.map(({ title, full, ...variant }, index) => {
  const section = document.createElement('section');
  section.className = full ? 'full' : 'compact';
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
  const pressedKeys = ['F#3', 'A3', 'C4'];
  const dimensions = { width: container.clientWidth, height: container.clientHeight };
  const piano = new Keyboard({
    container, ...visuals, animation: { enabled: false },
    sizing: full ? { mode: 'container' } : { mode: 'fixed', ...dimensions },
  });
  piano.setPressedKeys(pressedKeys);
  const markup = Keyboard.renderToSVG({ ...visuals, sizing: dimensions, pressedKeys, idPrefix: `visual-${index}` });
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  return { piano, container, img, markup, full: Boolean(full) };
});
