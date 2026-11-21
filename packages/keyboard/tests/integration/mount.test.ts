import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PianoKeyboard } from '../../src/index.js';
import type { KeyboardOptions, KeyboardOptionsPatch, NoteInput } from '../../src/index.js';
import { calculateLayout } from '../../src/geometry/layout.js';
import { normalizeConfig } from '../../src/config/normalize.js';
import { buildScene } from '../../src/scene/build-scene.js';
import { minimalAppearance } from '../../src/skins/appearance.js';
import { SVG_NS } from '../../src/svg/attributes.js';
import { serializeScene } from '../../src/svg/serialize.js';

let dom: JSDOM;
let container: HTMLElement;
let instances: PianoKeyboard[];

beforeEach(() => {
  dom = new JSDOM('<div id="host" style="color: red"><p>Host content</p></div><div id="other"></div>', {
    url: 'https://pianorealm.test/',
  });
  container = dom.window.document.getElementById('host')!;
  instances = [];
});

afterEach(() => {
  instances.forEach(piano => piano.destroy());
  dom.window.close();
});

function mount(options: Omit<KeyboardOptions, 'container'> = {}, host = container): PianoKeyboard {
  const piano = new PianoKeyboard({ container: host, ...options });
  instances.push(piano);
  return piano;
}

function setContentSize(width: number, height: number, padding = 0, border = 0, host = container): void {
  Object.defineProperties(host, {
    clientWidth: { configurable: true, value: Math.round(width + 2 * padding) },
    clientHeight: { configurable: true, value: Math.round(height + 2 * padding) },
    getClientRects: { configurable: true, value: () => ({ length: 1 }) },
  });
  Object.assign(host.style, {
    boxSizing: border ? 'border-box' : 'content-box',
    padding: `${padding}px`,
    border: `${border}px solid black`,
    width: `${width + (border ? 2 * (padding + border) : 0)}px`,
    height: `${height + (border ? 2 * (padding + border) : 0)}px`,
  });
}

function notes(root: Element): string[] {
  return Array.from(root.querySelectorAll('[data-note]'), node => node.getAttribute('data-note')!);
}

function svg(host = container): SVGSVGElement {
  return host.querySelector('svg')!;
}

function visiblePressed(root: Element, fill: string = minimalAppearance.pressed): number[] {
  return Array.from(root.querySelectorAll(`[data-note][fill="${fill}"]`),
    element => Number(element.getAttribute('data-note'))).sort((a, b) => a - b);
}

describe('mounted keyboard', () => {
  it('uses the default range and provides a named, namespaced display image', () => {
    mount({ sizing: { mode: 'fixed' } });
    const root = svg();
    expect(root.namespaceURI).toBe(SVG_NS);
    expect(Array.from(root.children).every(child => child.namespaceURI === SVG_NS)).toBe(true);
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('Horizontal piano keyboard, A0 to C8');
    expect(root.hasAttribute('tabindex')).toBe(false);
    expect(notes(root)).toHaveLength(88);
    expect(root.getAttribute('viewBox')).toBe('0 0 1040 100');
    expect(root.getAttribute('width')).toBe('1040');
    expect(root.getAttribute('height')).toBe('100');
    expect(root.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(root.getAttribute('overflow')).toBe('hidden');
  });

  it('stages atomic range and orientation updates and retains explicit fixed sizing axes', () => {
    const piano = mount({
      range: { from: 'C#4', to: 'D#4' },
      sizing: { mode: 'fixed', width: 100 },
      notation: { octaveOffset: 1 },
    });
    const before = svg();
    expect(notes(before)).toEqual(['50', '49', '51']);
    expect(before.getAttribute('viewBox')).toBe('0 0 32 100');
    expect(() => piano.setRange(61, 60)).toThrow(RangeError);
    expect(() => piano.setRange('H4', 'C4')).toThrow(TypeError);
    expect(() => piano.setOrientation('diagonal' as 'vertical')).toThrow(TypeError);
    expect(() => piano.setOrientation(undefined as unknown as 'vertical')).toThrow(TypeError);
    expect(svg()).toBe(before);

    piano.setRange(61, 63);
    expect(notes(svg())).toEqual(['62', '61', '63']);
    expect(svg().getAttribute('aria-label')).toBe('Horizontal piano keyboard, C#5 to D#5');
    piano.setOrientation('vertical');
    expect(notes(svg())).toEqual(['62', '61', '63']);
    expect(svg().getAttribute('viewBox')).toBe('0 0 100 32');
    expect(svg().getAttribute('width')).toBe('100');
    expect(svg().getAttribute('height')).toBe('32');
  });

  it('handles invalid construction, single ownership, cleanup and remount independently', () => {
    const child = container.firstElementChild;
    expect(() => new PianoKeyboard({ container: {} as HTMLElement })).toThrow(TypeError);
    expect(() => new PianoKeyboard({ container, sizing: { width: 100 } })).toThrow(RangeError);
    expect(() => new PianoKeyboard({ container, markup: '<script/>' } as KeyboardOptions)).toThrow(TypeError);
    expect(() => new PianoKeyboard({ container, sizing: { mode: 'fixed', width: NaN } }))
      .toThrow(RangeError);
    expect(container.children.length).toBe(1);

    const piano = mount({ sizing: { mode: 'fixed' } });
    const other = dom.window.document.getElementById('other')!;
    mount({ sizing: { mode: 'fixed' } }, other);
    const otherSvg = svg(other);
    expect(() => new PianoKeyboard({ container })).toThrow(/already has a mounted instance/);
    piano.setRange(61, 61);
    expect(svg(other)).toBe(otherSvg);
    piano.destroy();
    piano.destroy();
    expect(() => piano.setRange(60, 61)).toThrow(/destroyed/);
    expect(() => piano.setOrientation('vertical')).toThrow(/destroyed/);
    expect(() => piano.resize()).toThrow(/destroyed/);
    expect(svg(other)).toBe(otherSvg);
    expect(container.children.length).toBe(1);
    expect(container.firstElementChild).toBe(child);
    expect(container.getAttribute('style')).toBe('color: red');
    mount({ sizing: { mode: 'fixed' } });
    expect(svg()).toBeTruthy();
  });

  it('recovers from disconnected, unavailable and zero-size hosts without changing key geometry', () => {
    container.remove();
    setContentSize(100, 100);
    const piano = mount({ range: { from: 61, to: 63 } });
    expect(svg()).toBeNull();

    dom.window.document.body.appendChild(container);
    piano.resize();
    const root = svg();
    expect(root.getAttribute('width')).toBe('100');
    const keys = Array.from(root.children).map(child => child.outerHTML);
    setContentSize(150.5, 100.25, 5, 2);
    piano.resize();
    expect(svg()).toBe(root);
    expect(root.getAttribute('width')).toBe('150.5');
    expect(root.getAttribute('height')).toBe('100.25');
    expect(Array.from(root.children).map(child => child.outerHTML)).toEqual(keys);

    setContentSize(150.5, 100.25, 5);
    piano.resize();
    expect(root.getAttribute('width')).toBe('150.5');
    expect(root.getAttribute('height')).toBe('100.25');

    Object.defineProperty(container, 'getClientRects', { value: () => ({ length: 0 }) });
    piano.resize();
    expect(svg()).toBeNull();
    setContentSize(100, 0);
    piano.resize();
    expect(svg()).toBeNull();
    piano.setOrientation('vertical');
    setContentSize(100, 80);
    piano.resize();
    expect(svg().getAttribute('viewBox')).toBe('0 0 100 32');
    expect(svg().getAttribute('height')).toBe('80');
  });

  it('observes container changes when supported, skips redundant writes and disconnects on destroy', () => {
    let notify = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    dom.window.ResizeObserver = class {
      constructor(callback: () => void) { notify = callback; }
      observe = observe;
      disconnect = disconnect;
      unobserve() {}
    };
    const piano = mount();
    expect(observe).toHaveBeenCalledWith(container);
    expect(svg()).toBeNull();
    setContentSize(100, 100);
    notify();
    const root = svg();
    expect(root).toBeTruthy();
    const setAttribute = vi.spyOn(root, 'setAttribute');
    notify();
    expect(setAttribute).not.toHaveBeenCalled();
    setContentSize(40, 80);
    notify();
    expect(svg()).toBe(root);
    expect(root.getAttribute('width')).toBe('40');
    piano.destroy();
    piano.destroy();
    expect(disconnect).toHaveBeenCalledTimes(1);
    notify();
    expect(svg()).toBeNull();
  });

  it('coalesces observer bursts, deduplicates fractional sizes and cancels stale work', () => {
    const listeners: (() => void)[] = [];
    const frames: FrameRequestCallback[] = [];
    const cancelFrame = vi.fn();
    dom.window.requestAnimationFrame = vi.fn(callback => frames.push(callback));
    dom.window.cancelAnimationFrame = cancelFrame;
    dom.window.ResizeObserver = class {
      constructor(notify: () => void) { listeners.push(notify); }
      observe() {}
      disconnect() {}
      unobserve() {}
    };
    const measure = vi.spyOn(dom.window, 'getComputedStyle');
    const piano = mount({ range: { from: 61, to: 63 } });
    const notify = listeners[0]!;
    setContentSize(100, 100);
    notify();
    setContentSize(150.5, 100.25);
    notify();
    notify();
    expect(frames).toHaveLength(1);
    expect(measure).not.toHaveBeenCalled();
    frames[0]!(0);
    expect(measure).toHaveBeenCalledOnce();
    const root = svg();
    const firstKey = root.querySelector('[data-note]');
    expect(root.getAttribute('width')).toBe('150.5');
    const writes = vi.spyOn(root, 'setAttribute');

    setContentSize(150.50000001, 100.25);
    notify();
    frames[1]!(0);
    expect(writes).not.toHaveBeenCalled();
    setContentSize(0.125, 0.25);
    notify();
    piano.resize();
    expect(cancelFrame).toHaveBeenLastCalledWith(3);
    expect(root.getAttribute('width')).toBe('0.125');
    expect(root.getAttribute('height')).toBe('0.25');
    expect(root.querySelector('[data-note]')).toBe(firstKey);
    measure.mockClear();
    frames[2]!(0);
    expect(measure).not.toHaveBeenCalled();

    notify();
    piano.setOptions({ sizing: { mode: 'fixed', width: 200 } });
    expect(cancelFrame).toHaveBeenLastCalledWith(4);
    expect(svg()).toBe(root);
    expect(root.getAttribute('width')).toBe('200');
    notify();
    frames[3]!(0);
    expect(frames).toHaveLength(4);
    expect(measure).not.toHaveBeenCalled();

    piano.setOptions({ sizing: undefined });
    listeners[1]!();
    piano.destroy();
    expect(cancelFrame).toHaveBeenLastCalledWith(5);
    measure.mockClear();
    frames[4]!(0);
    listeners[1]!();
    expect(measure).not.toHaveBeenCalled();
    expect(svg()).toBeNull();
  });

  it('measures independent hosts without optional APIs and preserves keys through viewport changes', () => {
    const other = dom.window.document.getElementById('other')!;
    setContentSize(150.5, 100, 0, 0, other);
    setContentSize(80, 60);
    const piano = mount({
      range: { from: 61, to: 63 }, skin: 'classic', appearance: { pressed: '#097' },
    });
    mount({ range: { from: 61, to: 61 } }, other);
    piano.setPressedKeys([0, 61, 127]);
    const root = svg();
    const key = root.querySelector('[data-note="61"]');
    expect(root.getAttribute('width')).toBe('80');
    expect(svg(other).getAttribute('width')).toBe('150.5');
    piano.setOptions({ sizing: { mode: 'fixed', width: 122, height: 110 } });
    piano.setOptions({ sizing: { width: 122.0000001 } });
    expect(svg()).toBe(root);
    expect(root.getAttribute('width')).toBe('122.0000001');
    expect(root.getAttribute('height')).toBe('110');
    expect(root.querySelector('[data-note="61"]')).toBe(key);
    piano.setOptions({ sizing: undefined });
    expect(svg()).toBe(root);
    expect(root.getAttribute('width')).toBe('80');
    const dot = root.querySelector('circle');
    piano.setOrientation('vertical');
    expect(svg()).toBe(root);
    expect(root.getAttribute('viewBox')).toBe('0 0 100 32');
    expect(root.querySelector('[data-note="61"]')).toBe(key);
    expect(root.querySelector('circle')).toBe(dot);
    expect(key?.getAttribute('width')).toBe('60');
    expect(key?.getAttribute('y')).toBe('20');
    expect(root.querySelector('linearGradient')?.getAttribute('y2')).toBe('0');
    expect(visiblePressed(svg(), '#097')).toEqual([61]);
    expect(svg().querySelectorAll('linearGradient')).toHaveLength(2);
    piano.setOptions({
      sizing: { whiteKeyWidth: 24, whiteKeyHeight: 125, blackKeyWidth: 10, blackKeyHeight: 75 },
    });
    expect(root.getAttribute('viewBox')).toBe('0 0 125 34');
    expect(root.querySelector('[data-note="61"]')).toBe(key);
    expect(key?.getAttribute('width')).toBe('75');
    expect(key?.getAttribute('height')).toBe('10');
    expect(key?.getAttribute('fill')).toBe('#097');
    expect(piano.getPressedKeys()).toEqual([0, 61, 127]);
    piano.destroy();
    expect(svg(other).getAttribute('width')).toBe('150.5');
  });

  it('rolls back a failed observer setup and releases ownership for retry', () => {
    setContentSize(100, 100);
    const child = container.firstElementChild;
    const disconnect = vi.fn();
    dom.window.ResizeObserver = class {
      observe() { throw new Error('observer setup failed'); }
      disconnect = disconnect;
      unobserve() {}
    };
    expect(() => new PianoKeyboard({ container })).toThrow('observer setup failed');
    expect(disconnect).toHaveBeenCalledOnce();
    expect(container.children.length).toBe(1);
    expect(container.firstElementChild).toBe(child);
    mount({ sizing: { mode: 'fixed' } });
    expect(svg()).toBeTruthy();
  });

  it('keeps the mounted scene and config when a valid range overflows the layout extent', () => {
    const piano = mount({
      range: { from: 60, to: 60 },
      sizing: { mode: 'fixed', whiteKeyWidth: Number.MAX_VALUE },
    });
    const before = svg();
    expect(() => piano.setRange(60, 64)).toThrow(RangeError);
    expect(svg()).toBe(before);
    piano.setOrientation('vertical');
    expect(notes(svg())).toEqual(['60']);
  });
});

describe('programmatic pressed keys', () => {
  function key(root: Element, note: number): Element {
    return root.querySelector(`[data-note="${note}"]`)!;
  }

  function watchChanges(host: Element) {
    const observer = new dom.window.MutationObserver(() => {});
    observer.observe(host, { childList: true, attributes: true, subtree: true });
    return observer;
  }

  it('changes only the corresponding key bodies and indicators, keeping every node and its geometry', () => {
    const piano = mount({ sizing: { mode: 'fixed' }, range: { from: 60, to: 67 } });
    const root = svg();
    const children = Array.from(root.children);
    const bodies = Array.from(root.querySelectorAll('[data-note]'));
    const indicators = root.querySelectorAll('circle');
    const observer = watchChanges(container);

    function expectChanges(...changed: number[]) {
      const records = observer.takeRecords();
      expect(records.map(({ attributeName }) => attributeName))
        .toEqual(changed.flatMap(() => ['fill', 'display']));
      changed.forEach((note, index) => {
        const body = key(root, note);
        expect(records[index * 2].target).toBe(body);
        expect(records[index * 2 + 1].target).toBe(indicators[bodies.indexOf(body)]);
      });
      expect(svg()).toBe(root);
      expect(root.children).toHaveLength(children.length);
      children.forEach((child, index) => expect(root.children[index]).toBe(child));
      expect(root.querySelectorAll('circle[display="inline"]')).toHaveLength(visiblePressed(root).length);
    }

    expect(piano.getPressedKeys()).toEqual([]);
    piano.pressKey('C4');
    expect(visiblePressed(root)).toEqual([60]);
    expectChanges(60);
    piano.pressKey('B#3');
    piano.releaseKey(61);
    expectChanges();

    piano.setPressedKeys(['G4', 'B#3', 64, 'E4', 60]);
    expect(visiblePressed(root)).toEqual([60, 64, 67]);
    expect(piano.getPressedKeys()).toEqual([60, 64, 67]);
    piano.getPressedKeys().pop();
    expectChanges(67, 64);
    piano.setPressedKeys([64, 'C4', 67]);
    expectChanges();

    piano.setPressedKeys([60, 'Db4', 67]);
    expect(key(root, 64).getAttribute('fill')).toBe(minimalAppearance.white);
    expect(visiblePressed(root)).toEqual([60, 61, 67]);
    expectChanges(64, 61);
    piano.releaseKey('C#4');
    expect(key(root, 61).getAttribute('fill')).toBe(minimalAppearance.black);
    expectChanges(61);
    piano.clearPressedKeys();
    expect(visiblePressed(root)).toEqual([]);
    expect(piano.getPressedKeys()).toEqual([]);
    expectChanges(60, 67);
    piano.clearPressedKeys();
    expectChanges();
    observer.disconnect();
  });

  it('retains off-range notes without DOM writes and restores them through range, orientation and resize changes', () => {
    setContentSize(100, 100);
    const piano = mount({ range: { from: 60, to: 61 }, notation: { octaveOffset: 1 } });
    const root = svg();
    const observer = watchChanges(container);
    piano.pressKey(127);
    piano.pressKey(0);
    piano.pressKey('E5');
    expect(piano.getPressedKeys()).toEqual([0, 64, 127]);
    expect(observer.takeRecords()).toEqual([]);
    piano.pressKey('C5');
    expect(visiblePressed(root)).toEqual([60]);
    observer.takeRecords();
    piano.setPressedKeys([127, 64, 60]);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();

    piano.setRange('E5', 'E5');
    expect(visiblePressed(svg())).toEqual([64]);
    piano.setOrientation('vertical');
    const vertical = svg();
    expect(vertical.getAttribute('viewBox')).toBe('0 0 100 20');
    expect(visiblePressed(vertical)).toEqual([64]);
    setContentSize(220, 100);
    piano.resize();
    expect(svg()).toBe(vertical);
    expect(vertical.getAttribute('width')).toBe('220');
    expect(visiblePressed(vertical)).toEqual([64]);
    setContentSize(220, 0);
    piano.resize();
    expect(svg()).toBeNull();
    piano.releaseKey('E5');
    setContentSize(220, 100);
    piano.resize();
    expect(svg()).toBe(vertical);
    expect(visiblePressed(svg())).toEqual([]);

    piano.setRange(60, 127);
    expect(visiblePressed(svg())).toEqual([60, 127]);
    piano.setOrientation('horizontal');
    expect(visiblePressed(svg())).toEqual([60, 127]);
    expect(piano.getPressedKeys()).toEqual([60, 127]);
  });

  it('rejects invalid notes and batches before changing logical or visual state', () => {
    const piano = mount({ sizing: { mode: 'fixed' } });
    piano.setPressedKeys([60, 61]);
    const root = svg();
    const before = root.outerHTML;
    const observer = watchChanges(container);

    const invalidNotes = [
      ['H4', TypeError], ['60', TypeError], [null, TypeError], [true, TypeError], [{}, TypeError],
      [NaN, RangeError], [Infinity, RangeError], [60.5, RangeError], [-1, RangeError],
      [128, RangeError], ['C-2', RangeError],
    ] as const;
    for (const [value, error] of invalidNotes) {
      const note = value as NoteInput;
      expect(() => piano.pressKey(note)).toThrow(error);
      expect(() => piano.releaseKey(note)).toThrow(error);
      expect(() => piano.setPressedKeys([67, note])).toThrow(error);
    }
    for (const collection of ['C4', new Set([60]), { 0: 60, length: 1 }, null, undefined]) {
      expect(() => piano.setPressedKeys(collection as unknown as readonly NoteInput[])).toThrow(TypeError);
    }
    expect(() => piano.setPressedKeys(Array<NoteInput>(2))).toThrow(TypeError);
    expect(piano.getPressedKeys()).toEqual([60, 61]);
    expect(svg()).toBe(root);
    expect(root.outerHTML).toBe(before);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it('keeps instance registries independent and enforces lifecycle on every state method', () => {
    const options = { sizing: { mode: 'fixed' } } as const;
    const other = dom.window.document.getElementById('other')!;
    const first = mount(options);
    const second = mount(options, other);
    const otherRoot = svg(other);
    const observer = watchChanges(other);

    first.pressKey(60);
    expect(visiblePressed(otherRoot)).toEqual([]);
    expect(observer.takeRecords()).toEqual([]);
    second.pressKey(61);
    expect(visiblePressed(svg())).toEqual([60]);
    first.destroy();
    first.destroy();
    for (const operation of [
      () => first.pressKey(61), () => first.releaseKey(60), () => first.setPressedKeys([62]),
      () => first.clearPressedKeys(), () => first.getPressedKeys(),
    ]) {
      expect(operation).toThrow(/destroyed/);
    }
    const remounted = mount(options);
    expect(remounted.getPressedKeys()).toEqual([]);
    expect(visiblePressed(svg())).toEqual([]);
    expect(second.getPressedKeys()).toEqual([61]);
    expect(svg(other)).toBe(otherRoot);
    expect(visiblePressed(otherRoot)).toEqual([61]);
    observer.disconnect();
  });
});

describe('mounted appearance', () => {
  it('switches skins in place and keeps key geometry, off-range notes and targeted updates', () => {
    const piano = mount({ range: { from: 61, to: 65 }, orientation: 'vertical', sizing: { mode: 'fixed' } });
    piano.setPressedKeys([0, 61, 62, 127]);
    const root = svg();
    const minimal = root.outerHTML;
    const keys = Array.from(root.querySelectorAll('[data-note]'));
    const circles = Array.from(root.querySelectorAll('circle'));
    const shape = (key: Element) => ['data-note', 'x', 'y', 'width', 'height'].map(name => key.getAttribute(name));
    const bounds = keys.map(shape);
    const viewBox = root.getAttribute('viewBox');

    piano.setSkin('classic');
    expect(svg()).toBe(root);
    expect(root.getAttribute('viewBox')).toBe(viewBox);
    expect(Array.from(root.querySelectorAll('[data-note]')).every((node, index) => node === keys[index])).toBe(true);
    expect(Array.from(root.querySelectorAll('circle')).every((node, index) => node === circles[index])).toBe(true);
    expect(keys.map(shape)).toEqual(bounds);
    expect(visiblePressed(root, '#85502b')).toEqual([61, 62]);
    expect(piano.getPressedKeys()).toEqual([0, 61, 62, 127]);
    const black = root.querySelector('[data-note="61"]')!;
    const white = root.querySelector('[data-note="62"]')!;
    expect(black.getAttribute('fill')).toBe('#85502b');
    expect(white.getAttribute('fill')).toBe('#85502b');

    const observer = new dom.window.MutationObserver(() => {});
    observer.observe(root, { attributes: true, childList: true, subtree: true });
    piano.releaseKey(61);
    expect(black.getAttribute('fill')).toMatch(/^url\(#.*-black-gradient\)$/);
    expect(white.getAttribute('fill')).toBe('#85502b');
    expect(observer.takeRecords().map(record => [record.target, record.attributeName]))
      .toEqual([[black, 'fill'], [circles[keys.indexOf(black)], 'display']]);
    observer.disconnect();

    piano.pressKey(61);
    const classic = root.outerHTML;
    for (let index = 0; index < 3; index++) {
      piano.setSkin('minimal');
      expect(root.outerHTML).toBe(minimal);
      piano.setSkin('classic');
      expect(root.outerHTML).toBe(classic);
    }
    const id = root.querySelector('linearGradient')!.id;
    piano.setRange(126, 127);
    expect(svg().querySelector('linearGradient')?.id).toBe(id);
    expect(visiblePressed(svg(), '#85502b')).toEqual([127]);
  });

  it('validates updates atomically, preserves overrides across selection and resets merged fields', () => {
    const piano = mount({ skin: 'classic', sizing: { mode: 'fixed' }, appearance: { white: '#123' } });
    piano.setPressedKeys([0, 60, 127]);
    const root = svg();
    const markup = root.outerHTML;
    const observer = new dom.window.MutationObserver(() => {});
    observer.observe(root, { attributes: true, childList: true, subtree: true });
    expect(() => piano.setSkin('missing')).toThrow(/Unknown keyboard skin/);
    expect(() => piano.setSkin(undefined as unknown as string)).toThrow(TypeError);
    expect(() => piano.setOptions({
      skin: 'minimal', orientation: 'vertical', appearance: { background: 'transparent', white: 'url(#host)' },
    })).toThrow(/appearance.white/);
    expect(() => piano.setOptions({ container } as KeyboardOptionsPatch)).toThrow(/Unknown configuration field/);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
    expect(svg()).toBe(root);
    expect(root.outerHTML).toBe(markup);
    expect(piano.getPressedKeys()).toEqual([0, 60, 127]);

    const white = root.querySelector('[data-note="62"]')!;
    piano.setSkin('minimal');
    expect(white.getAttribute('fill')).toBe('#123');
    piano.setSkin('classic');
    const defs = root.querySelector('defs');
    piano.setOptions({ appearance: { strokeWidth: 0, background: 'transparent' } });
    expect(root.querySelector('defs')).toBe(defs);
    expect(white.getAttribute('fill')).toBe('#123');
    expect(white.getAttribute('stroke-width')).toBe('0');
    expect(root.querySelector('rect:not([data-note])')?.getAttribute('fill')).toBe('transparent');
    piano.setOptions({ appearance: { white: undefined } });
    expect(white.getAttribute('fill')).toMatch(/^url\(/);
    expect(white.getAttribute('stroke-width')).toBe('0');
    piano.setOptions({ skin: undefined, appearance: undefined });
    expect(white.getAttribute('fill')).toBe('#fafafa');
    expect(white.getAttribute('stroke-width')).toBe('1');
    expect(root.querySelector('defs')).toBeNull();
  });

  it('isolates registered tokens, definitions and cleanup across mounts and module copies', async () => {
    const stops = [{ offset: 0, color: '#123' }, { offset: 1, color: '#456' }];
    const options = { sizing: { mode: 'fixed' }, range: { from: 61, to: 63 } } as const;
    const warmup = mount({ ...options, skin: 'classic' });
    const collision = dom.window.document.createElement('span');
    collision.id = svg().querySelector('linearGradient')!.id.replace(/-1-white-gradient$/, '-2-white-gradient');
    warmup.destroy();
    container.append(collision);

    const first = mount(options);
    expect(() => first.registerSkin('classic', {})).toThrow(/already registered/);
    expect(() => first.registerSkin('Bad Name', {})).toThrow(TypeError);
    expect(() => first.registerSkin('studio', { white: 'red' })).toThrow(TypeError);
    first.registerSkin('studio', { white: { stops }, blackKeyShadow: 0.4 });
    expect(() => first.registerSkin('studio', {})).toThrow(/already registered/);
    stops[0].color = '#789';
    first.setOptions({ skin: 'studio' });
    const root = svg();
    const id = root.querySelector('linearGradient')!.id;
    expect(id).not.toBe(collision.id);
    expect(root.querySelector('stop')?.getAttribute('stop-color')).toBe('#123');
    expect(root.querySelector('[data-note="62"]')?.getAttribute('fill')).toBe(`url(#${id})`);

    const other = dom.window.document.getElementById('other')!;
    vi.resetModules();
    const { PianoKeyboard: SecondCopy } = await import('../../src/index.js');
    const second = new SecondCopy({ container: other, ...options, skin: 'classic' });
    instances.push(second);
    const otherRoot = svg(other);
    expect(() => second.setSkin('studio')).toThrow(/Unknown keyboard skin/);
    expect(otherRoot.querySelector('linearGradient')!.id).not.toBe(id);
    expect(otherRoot.querySelector('[data-note="62"]')?.getAttribute('fill'))
      .toBe(`url(#${otherRoot.querySelector('linearGradient')!.id})`);

    first.destroy();
    expect(dom.window.document.getElementById(id)).toBeNull();
    expect(svg(other)).toBe(otherRoot);
    for (const call of [() => first.setSkin('classic'), () => first.setOptions({}),
      () => first.registerSkin('studio', {})]) expect(call).toThrow(/destroyed/);
    const remount = mount({ ...options, skin: 'classic' });
    expect(svg().querySelector('linearGradient')?.id).not.toBe(id);
    expect(() => remount.setSkin('studio')).toThrow(/Unknown keyboard skin/);
  });

  it('reuses the observer for skin changes and rolls back a failed sizing-mode switch', () => {
    setContentSize(120, 90);
    const observe = vi.fn();
    const disconnect = vi.fn();
    dom.window.ResizeObserver = class {
      observe = observe;
      disconnect = disconnect;
      unobserve() {}
    };
    const piano = mount();
    const first = svg();
    piano.setSkin('classic');
    piano.setSkin('minimal');
    expect(svg()).toBe(first);
    expect(observe).toHaveBeenCalledOnce();
    expect(disconnect).not.toHaveBeenCalled();
    piano.setOptions({ sizing: { mode: 'fixed', width: 200 } });
    const fixed = svg();
    expect(fixed.getAttribute('width')).toBe('200');
    expect(disconnect).toHaveBeenCalledOnce();

    observe.mockImplementationOnce(() => { throw new Error('observe failed'); });
    expect(() => piano.setOptions({ sizing: undefined, skin: 'classic' })).toThrow('observe failed');
    expect(svg()).toBe(fixed);
    expect(fixed.querySelector('defs')).toBeNull();
    expect(disconnect).toHaveBeenCalledTimes(2);
    piano.setOptions({ sizing: undefined, skin: 'classic' });
    expect(svg().getAttribute('width')).toBe('120');
    expect(svg().querySelectorAll('defs')).toHaveLength(1);
    piano.destroy();
    expect(disconnect).toHaveBeenCalledTimes(3);
    expect(svg()).toBeNull();
  });
});

describe('mounted motion', () => {
  it('scopes motion to a single mount and resolves skin changes and option resets in place', () => {
    const other = dom.window.document.getElementById('other')!;
    const sizing = { mode: 'fixed' } as const;
    const piano = mount({ sizing, range: { from: 61, to: 63 } });
    mount({ sizing, animation: { enabled: true, duration: 90, easing: 'linear' } }, other);
    const root = svg();
    const key = root.querySelector('[data-note="61"]')!;
    const style = container.querySelector('style')!;
    const otherStyle = other.querySelector('style')!;
    const scope = root.getAttribute('data-pianorealm-motion');
    const otherScope = svg(other).getAttribute('data-pianorealm-motion');
    expect(scope).not.toBe(otherScope);
    expect(style.textContent).toContain(`[data-pianorealm-motion="${scope}"] > rect[data-note]`);
    expect(style.textContent).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(style.textContent).toContain('transition: fill 120ms ease-out');
    expect(style.textContent).toContain('transition: opacity 120ms ease-out');
    expect(otherStyle.textContent).toContain('90ms linear');
    expect(otherStyle.textContent).not.toContain(scope);
    expect(typeof dom.window.matchMedia).toBe('undefined');

    piano.pressKey(0);
    piano.pressKey(61);
    piano.releaseKey(61);
    piano.pressKey(61);
    piano.setSkin('classic');
    expect(style.textContent).toContain('160ms ease-in-out');
    piano.setOptions({ animation: { duration: 250, easing: 'ease-in' } });
    expect(style.textContent).toContain('250ms ease-in');
    piano.setOptions({ animation: { enabled: false } });
    piano.setSkin('minimal');
    expect(style.textContent).toBe('');
    piano.setOptions({ animation: { enabled: true } });
    expect(style.textContent).toContain('250ms ease-in');
    piano.setOptions({ animation: { duration: 0 } });
    expect(style.textContent).toBe('');
    piano.setOptions({ animation: undefined });
    expect(style.textContent).toContain('120ms ease-out');
    expect(piano.getPressedKeys()).toEqual([0, 61]);
    expect(svg()).toBe(root);
    expect(root.querySelector('[data-note="61"]')).toBe(key);
    expect(key.getAttribute('fill')).toBe(minimalAppearance.pressed);
    expect(root.querySelectorAll('circle[display="inline"]')).toHaveLength(1);
    piano.destroy();
    expect(container.querySelector('style')).toBeNull();
    expect(otherStyle.textContent).toContain('90ms linear');
  });

  it('leaves the mounted drawing and options intact after an invalid mixed update', () => {
    const piano = mount({ sizing: { mode: 'fixed' }, animation: { duration: 234 } });
    piano.pressKey(61);
    const before = container.innerHTML;
    expect(() => piano.setOptions({
      skin: 'classic', sizing: { width: 200 }, animation: { duration: 1001 },
    })).toThrow(RangeError);
    expect(container.innerHTML).toBe(before);
    expect(piano.getPressedKeys()).toEqual([61]);
    piano.setSkin('classic');
    expect(container.querySelector('style')?.textContent).toContain('234ms ease-in-out');
    expect(svg().getAttribute('width')).toBe('1040');
  });
});

function drawingAttributes(element: Element): [string, string][] {
  return Array.from(element.attributes, ({ name, value }): [string, string] => [name, value])
    .filter(([name]) => name !== 'xmlns' && name !== 'data-pianorealm-motion');
}

describe('static parity', () => {
  it.each([
    { from: 60, to: 71, orientation: 'horizontal' },
    { from: 61, to: 63, orientation: 'vertical' },
    { from: 61, to: 61, orientation: 'vertical' },
  ] as const)('matches the scene and mounted SVG for $from–$to, $orientation', ({ from, to, orientation }) => {
    const options = { range: { from, to }, orientation, sizing: { mode: 'fixed', height: 135 } } as const;
    const piano = mount(options);
    const config = normalizeConfig(options);
    const layout = calculateLayout(config.range, config.orientation, config.sizing);
    const scene = buildScene(config, layout, minimalAppearance);
    const domSvg = svg();
    const staticSvg = new dom.window.DOMParser().parseFromString(
      serializeScene(scene, { width: scene.width, height: 135 }), 'image/svg+xml',
    ).documentElement;

    const attributes = (element: Element) => Object.fromEntries(drawingAttributes(element));
    expect(staticSvg.namespaceURI).toBe(SVG_NS);
    expect(attributes(staticSvg)).toEqual(attributes(domSvg));
    expect(Array.from(staticSvg.children, attributes)).toEqual(Array.from(domSvg.children, attributes));
    expect(domSvg.firstElementChild?.getAttribute('fill')).toBe(minimalAppearance.background);
    expect(notes(staticSvg)).toEqual(layout.keys.map(key => String(key.note)));
    expect(staticSvg.querySelector('[id], style, script, [href], [tabindex]')).toBeNull();
    expect(staticSvg.hasAttribute('data-pianorealm-motion')).toBe(false);
    expect(domSvg.querySelector('[id], style, script, [href], [tabindex]')).toBeNull();

    piano.setPressedKeys([0, 61, 62]);
    const pressedScene = buildScene(config, layout, minimalAppearance, new Set(piano.getPressedKeys()));
    const pressedSvg = new dom.window.DOMParser().parseFromString(
      serializeScene(pressedScene, { width: scene.width, height: 135 }), 'image/svg+xml',
    ).documentElement;
    expect(Array.from(pressedSvg.children, attributes)).toEqual(Array.from(domSvg.children, attributes));
    expect(notes(pressedSvg)).toEqual(notes(staticSvg));
    expect(pressedSvg.querySelectorAll('circle[display="inline"]')).toHaveLength(from === to ? 1 : 2);
  });

  it.each(['horizontal', 'vertical'] as const)('matches Classic and its definitions in %s orientation', orientation => {
    const options = {
      range: { from: 61, to: 63 }, orientation, skin: 'classic',
      sizing: { mode: 'fixed', width: 150, height: 200 },
      appearance: { strokeWidth: 0.5, pressed: '#097' },
    } as const;
    const piano = mount({ ...options, orientation: 'horizontal' });
    piano.setPressedKeys([0, 61, 62, 127]);
    piano.setOrientation(orientation);
    const config = normalizeConfig(options);
    const layout = calculateLayout(config.range, config.orientation, config.sizing);
    const scene = buildScene(config, layout, config.appearance, new Set(piano.getPressedKeys()));
    const viewport = { width: 150, height: 200 };
    const markup = serializeScene(scene, viewport, 'printed');
    const parsed = new dom.window.DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
    const mounted = svg();
    const prefix = mounted.querySelector('linearGradient')!.id.replace(/-white-gradient$/, '');
    const describe = (element: Element, idPrefix: string): unknown => ({
      name: element.localName,
      namespace: element.namespaceURI,
      attributes: Object.fromEntries(drawingAttributes(element)
        .map(([name, value]) => [name, value.replaceAll(`${idPrefix}-`, 'keyboard-')])),
      children: Array.from(element.children, child => describe(child, idPrefix)),
    });
    expect(describe(parsed, 'printed')).toEqual(describe(mounted, prefix));
    expect(notes(parsed)).toEqual(['62', '61', '63']);
    expect(visiblePressed(parsed, '#097')).toEqual([61, 62]);
    expect(parsed.querySelectorAll('linearGradient')).toHaveLength(2);
    expect(parsed.querySelectorAll('feDropShadow')).toHaveLength(1);
    expect(parsed.querySelector('[data-note="63"]')?.getAttribute('fill')).toBe('url(#printed-black-gradient)');
    expect(parsed.querySelector('[data-note="63"]')?.getAttribute('filter')).toBe('url(#printed-black-shadow)');
    expect(serializeScene(scene, viewport, 'printed')).toBe(markup);
    expect(serializeScene(scene, viewport)).not.toBe(serializeScene(scene, viewport));
    expect(() => serializeScene(scene, viewport, 'bad")')).toThrow(/idPrefix/);
  });

  it('escapes XML attribute values and rejects invalid XML code points', () => {
    const config = normalizeConfig();
    const layout = calculateLayout(config.range, config.orientation, config.sizing);
    const scene = buildScene(config, layout, minimalAppearance);
    const label = '"><script href="evil"> & 🎹\t\r\n';
    // Exercise the root attribute encoding boundary directly.
    const markup = serializeScene({ ...scene, label });
    const root = new dom.window.DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
    expect(root.getAttribute('aria-label')).toBe(label);
    expect(root.querySelector('script')).toBeNull();
    for (const invalid of ['\u0000', '\uD800', '\uDC00', '\uFFFF']) {
      expect(() => serializeScene({ ...scene, label: invalid })).toThrow(TypeError);
    }
  });
});

describe('visual annotations', () => {
  const range = { from: 60, to: 63 };
  const fixed = { mode: 'fixed' } as const;
  const layer = (name: string) => svg().querySelector(`[data-layer="${name}"]`);
  const markers = () => svg().querySelectorAll('[data-pressed-indicator]');
  const shownMarkers = () => svg().querySelectorAll('[data-pressed-indicator][display="inline"]');

  it('switches modes while retaining all pressed notes and the unrelated layers', () => {
    const piano = mount({ range, sizing: fixed, highlights: { 60: '#fa0' }, labels: { mode: 'note' } });
    const root = svg();
    const white = root.querySelector('[data-note="60"]');
    const black = root.querySelector('[data-note="61"]');
    const highlight = layer('highlights')?.firstElementChild;
    const label = layer('labels')?.firstElementChild;
    piano.setPressedKeys([60, 61, 64]);
    expect(visiblePressed(root)).toEqual([60, 61]);
    expect(shownMarkers()).toHaveLength(2);

    piano.setOptions({ pressedMode: 'color' });
    expect(shownMarkers()).toHaveLength(0);
    expect(visiblePressed(root)).toEqual([60, 61]);
    piano.setOptions({ pressedMode: 'indicator', indicator: { shape: 'square', opacity: 0.6 } });
    expect(visiblePressed(root)).toEqual([]);
    expect(Array.from(shownMarkers(), node => [node.localName, node.getAttribute('fill'), node.getAttribute('opacity')]))
      .toEqual([['rect', '#171717', '0.6'], ['rect', '#ffffff', '0.6']]);
    expect(white?.getAttribute('fill')).toBe(minimalAppearance.white);
    expect(black?.getAttribute('fill')).toBe(minimalAppearance.black);
    expect(layer('highlights')?.firstElementChild).toBe(highlight);
    expect(layer('labels')?.firstElementChild).toBe(label);

    const marker = markers()[0];
    piano.releaseKey(60);
    expect(marker.getAttribute('display')).toBe('none');
    piano.pressKey(60);
    expect(marker.getAttribute('display')).toBe('inline');
    piano.setSkin('classic');
    piano.setOrientation('vertical');
    piano.resize();
    expect(svg()).toBe(root);
    expect(root.querySelector('[data-note="60"]')).toBe(white);
    expect(root.querySelector('[data-note="61"]')).toBe(black);
    expect(markers()[0]).toBe(marker);
    expect(white?.getAttribute('fill')).toMatch(/url\(#.*-white-gradient\)/);
    piano.setRange(62, 64);
    expect(piano.getPressedKeys()).toEqual([60, 61, 64]);
    expect(shownMarkers()).toHaveLength(1);
    piano.setRange(60, 64);
    expect(shownMarkers()).toHaveLength(3);
    piano.clearPressedKeys();
    expect(shownMarkers()).toHaveLength(0);
    piano.setOptions({ pressedMode: undefined, indicator: undefined });
    piano.pressKey(61);
    expect(shownMarkers()[0].localName).toBe('circle');
    expect(visiblePressed(svg(), '#85502b')).toEqual([61]);
  });

  it('replaces maps and preserves unaffected note groups, key nodes and canonical off-range assignments', () => {
    const piano = mount({
      range, sizing: fixed, notation: { octaveOffset: 1 },
      overlays: { Db5: [{ type: 'number', value: 7 }], C5: [{ type: 'circle' }], E5: [{ type: 'badge', text: 'IV' }] },
      labels: { custom: { E5: 'Mi' } },
      highlights: { E5: '#fa0' },
    });
    const root = svg();
    const keys = Array.from(root.querySelectorAll('[data-note]'));
    const overlayFor = (note: number) => layer('overlays')?.querySelector(`[data-decoration-note="${note}"]`);
    const untouched = overlayFor(61);
    expect(overlayFor(64)).toBeNull();
    piano.setOptions({ notation: undefined });
    piano.setSkin('classic');
    piano.setRange(60, 64);
    expect(overlayFor(64)?.textContent).toBe('IV');
    expect(layer('labels')?.textContent).toBe('Mi');
    expect(layer('highlights')?.querySelector('[fill="#fa0"]')).toBeTruthy();
    piano.setRange(60, 63);

    const current = svg();
    const bodies = Array.from(current.querySelectorAll('[data-note]'));
    const oldGroup = overlayFor(61);
    const overlays = [
      { type: 'circle', color: '#098' },
      { type: 'text', text: 'Do' },
      { type: 'number', value: 1 },
      { type: 'badge', text: 2, background: '#abc' },
    ] as const;
    const input = { 61: [{ type: 'number', value: 7 }] as const, C4: [...overlays] };
    piano.setKeyOverlays(input);
    expect(oldGroup).not.toBe(untouched);
    expect(overlayFor(61)).toBe(oldGroup);
    expect(Array.from(overlayFor(60)!.children, node => [node.localName, node.textContent]))
      .toEqual([['circle', ''], ['text', 'Do'], ['text', '1'], ['g', '2']]);
    expect(Array.from(layer('overlays')!.children, node => node.getAttribute('data-decoration-note'))).toEqual(['60', '61']);
    input.C4.length = 0;
    piano.setOrientation('vertical');
    expect(overlayFor(60)?.textContent).toBe('Do12');
    expect(Array.from(current.querySelectorAll('[data-note]')).every((node, index) => node === bodies[index])).toBe(true);
    expect(keys[0]).not.toBe(bodies[0]);

    piano.setKeyOverlays({ 60: [] });
    expect(layer('overlays')).toBeNull();
    expect(svg().querySelectorAll('clipPath')).toHaveLength(0);
    piano.setKeyOverlays({ 62: [{ type: 'circle' }] });
    piano.setKeyOverlays({});
    expect(layer('overlays')).toBeNull();
    expect(() => piano.setKeyOverlays(undefined as never)).toThrow(TypeError);
  });

  it('reserves clip IDs against existing host IDs before decorations are enabled', () => {
    const warmup = mount({ range, sizing: fixed, labels: { custom: { 60: 'Do' } } });
    const clip = svg().querySelector('clipPath')!;
    const collision = dom.window.document.createElement('span');
    collision.id = clip.id.replace(/-1-key-clip-60$/, '-2-key-clip-60');
    warmup.destroy();
    container.appendChild(collision);
    const piano = mount({ range, sizing: fixed });
    piano.setKeyOverlays({ 60: [{ type: 'circle' }] });
    const active = svg().querySelector('clipPath')!;
    expect(active.id).not.toBe(collision.id);
    expect(layer('overlays')?.querySelector('g[clip-path]')?.getAttribute('clip-path')).toBe(`url(#${active.id})`);
    expect(dom.window.document.getElementById(collision.id)).toBe(collision);
  });

  it('keeps clip definitions isolated across mounts and rejects mixed invalid updates without DOM writes', () => {
    const options = { range, sizing: fixed, overlays: { 60: [{ type: 'circle' }] } } as const;
    const piano = mount(options);
    const other = dom.window.document.getElementById('other')!;
    mount(options, other);
    const firstClip = svg().querySelector('clipPath')!.id;
    const otherClip = svg(other).querySelector('clipPath')!.id;
    expect(firstClip).not.toBe(otherClip);
    expect(layer('overlays')?.firstElementChild?.getAttribute('clip-path')).toBe(`url(#${firstClip})`);
    const otherMarkup = other.innerHTML;
    piano.setPressedKeys([60, 63]);
    const before = container.innerHTML;
    const observer = new dom.window.MutationObserver(() => {});
    observer.observe(container, { childList: true, subtree: true, attributes: true });
    expect(() => piano.setOptions({
      range: { from: 62, to: 63 }, notation: { octaveOffset: 1 }, skin: 'classic',
      labels: { custom: { C5: 'ok' } },
      overlays: { C5: [{ type: 'circle' }], D5: [{ type: 'text', text: '\uFFFF' }] },
    })).toThrow(TypeError);
    expect(() => piano.setKeyOverlays({ 'B#3': [], 60: [] })).toThrow(RangeError);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
    expect(container.innerHTML).toBe(before);
    expect(piano.getPressedKeys()).toEqual([60, 63]);
    piano.destroy();
    expect(container.querySelector('svg, style')).toBeNull();
    expect(other.innerHTML).toBe(otherMarkup);
    expect(() => piano.setKeyOverlays({})).toThrow(/destroyed/);
    mount({ range, sizing: fixed });
    expect(layer('overlays')).toBeNull();
  });

  it.each(['horizontal', 'vertical'] as const)('matches parsed static layers, text and clips in %s orientation', orientation => {
    const text = '<&"🎹\r';
    const options = {
      range: { from: 61, to: 63 }, orientation, sizing: { ...fixed, whiteKeyWidth: 34 },
      skin: 'classic', pressedMode: 'indicator', indicator: { shape: 'square', opacity: 0.8, stroke: '#fff' },
      labels: { mode: 'note', custom: { 62: text } },
      highlights: { 62: '#fa0' },
      overlays: { 62: [{ type: 'circle', depth: 0, pitch: 1 }, { type: 'badge', text: 4 }], 63: [{ type: 'number', value: 2 }] },
    } as const;
    const piano = mount({ ...options, orientation: 'horizontal', overlays: undefined });
    piano.setPressedKeys([61, 62, 127]);
    piano.setKeyOverlays(options.overlays);
    piano.setOrientation(orientation);
    const config = normalizeConfig(options);
    const layout = calculateLayout(config.range, config.orientation, config.sizing);
    const scene = buildScene(config, layout, config.appearance, new Set(piano.getPressedKeys()));
    const parsed = new dom.window.DOMParser().parseFromString(serializeScene(scene, scene, 'printed'), 'image/svg+xml').documentElement;
    const prefix = svg().getAttribute('data-pianorealm-motion')!;
    const describe = (element: Element, idPrefix: string): unknown => ({
      name: element.localName,
      attributes: Object.fromEntries(drawingAttributes(element)
        .map(([name, value]) => [name, value.replaceAll(`${idPrefix}-`, 'keyboard-')])),
      children: element.children.length
        ? Array.from(element.children, child => describe(child, idPrefix))
        : element.textContent,
    });
    expect(describe(parsed, 'printed')).toEqual(describe(svg(), prefix));
    expect(parsed.querySelector('[data-layer="labels"] [data-decoration-note="62"]')?.textContent).toBe(text);
    const layers = Array.from(parsed.children, node => node.getAttribute('data-layer')
      ?? (node.hasAttribute('data-pressed-indicator') ? 'indicator' : node.localName));
    expect(layers).toEqual(['defs', 'rect', 'rect', 'rect', 'rect', 'highlights', 'labels',
      'indicator', 'indicator', 'indicator', 'overlays']);
    expect(parsed.getAttribute('role')).toBe('img');
    expect(parsed.getAttribute('aria-label')).toMatch(/piano keyboard, C#4 to D#4/);
    expect(parsed.querySelector('[data-layer]:not([aria-hidden="true"]), [data-pressed-indicator]:not([aria-hidden="true"])'))
      .toBeNull();
    expect(parsed.querySelector('script, style, [onload], [href], [tabindex]')).toBeNull();
    const css = container.querySelector('style')?.textContent;
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(css).toContain('> [data-pressed-indicator]');
  });
});
