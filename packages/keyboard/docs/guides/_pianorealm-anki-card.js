(() => {
  const cards = document.querySelectorAll('.pr-chord-card');
  const preceding = document.currentScript?.previousElementSibling;
  const card = preceding?.matches('.pr-chord-card') ? preceding : cards[cards.length - 1];
  if (!card) return;

  const owner = Symbol.for('anki-template/pianorealm-chord-card');
  const state = window[owner] ??= { active: [], load: undefined, card: undefined };
  for (const piano of state.active.splice(0)) piano.destroy();
  state.card = card;
  const status = card.querySelector('.pr-status');
  status.textContent = '';

  function loadKeyboard() {
    const installed = window.Pianorealm?.Keyboard;
    if (typeof installed?.renderToSVG === 'function') return Promise.resolve(installed);
    return state.load ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '_pianorealm-keyboard.umd.min.js';
      script.onload = () => {
        script.remove();
        const Keyboard = window.Pianorealm?.Keyboard;
        if (typeof Keyboard?.renderToSVG === 'function') resolve(Keyboard);
        else reject(new Error('The keyboard script did not initialize'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error('Missing keyboard media or scripts are blocked'));
      };
      document.head.appendChild(script);
    }).catch(error => {
      state.load = undefined;
      throw error;
    });
  }

  // A ticket also distinguishes repeated initialization of the same DOM element.
  const ticket = {};
  state.ticket = ticket;
  loadKeyboard().then(Keyboard => {
    if (state.ticket !== ticket || state.card !== card || !card.isConnected) return;
    const data = card.querySelector('.pr-notes').textContent.trim();
    const notes = data ? data.split(/[\s,]+/) : [];
    if (!notes.length || notes.length > 12 || notes.some(note =>
      !/^(?:[A-Ga-g][#b♯♭]?-?[0-9]{1,2}|[0-9]{1,3})$/.test(note)
    )) throw new Error('Enter 1–12 note names or MIDI numbers');
    const chord = notes.map(note => /^\d+$/.test(note) ? Number(note) : note);
    const dark = card.dataset.theme === 'dark'
      || (card.dataset.theme !== 'light' && Boolean(card.closest('.nightMode')));
    const active = [];
    try {
      for (const host of card.querySelectorAll('.pr-keyboard')) {
        const vertical = host.dataset.orientation === 'vertical';
        const piano = new Keyboard({
          container: host,
          range: { from: 'C3', to: 'C5' },
          orientation: vertical ? 'vertical' : 'horizontal',
          skin: dark ? 'minimal' : 'classic',
          ...(dark ? { appearance: { background: 'transparent', pressed: '#175d9c' } } : {}),
          animation: { enabled: false },
          sizing: vertical ? { mode: 'fixed', width: 92, height: 276 } : { mode: 'container' },
        });
        active.push(piano);
        piano.setPressedKeys(chord);
        if (typeof window.ResizeObserver !== 'function') piano.resize();
      }
      state.active = active;
    } catch (error) {
      for (const piano of active) piano.destroy();
      throw error;
    }
  }).catch(error => {
    if (state.ticket === ticket && card.isConnected) status.textContent = error.message;
  });
})();
