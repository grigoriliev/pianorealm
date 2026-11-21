import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PianoKeyboard } from '../../src/index.js';
import type { KeyboardOptions } from '../../src/index.js';
import { calculateLayout } from '../../src/geometry/layout.js';
import { normalizeConfig } from '../../src/config/normalize.js';
import { buildScene, minimalAppearance } from '../../src/scene/build-scene.js';
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

function setContentSize(width: number, height: number, padding = 0, border = 0): void {
  Object.defineProperties(container, {
    clientWidth: { configurable: true, value: Math.round(width + 2 * padding) },
    clientHeight: { configurable: true, value: Math.round(height + 2 * padding) },
    getClientRects: { configurable: true, value: () => ({ length: 1 }) },
  });
  Object.assign(container.style, {
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

describe('static parity', () => {
  it.each([
    { from: 60, to: 71, orientation: 'horizontal' },
    { from: 61, to: 63, orientation: 'vertical' },
    { from: 61, to: 61, orientation: 'vertical' },
  ] as const)('matches the scene and mounted SVG for $from–$to, $orientation', ({ from, to, orientation }) => {
    const options = { range: { from, to }, orientation, sizing: { mode: 'fixed', height: 135 } } as const;
    mount(options);
    const config = normalizeConfig(options);
    const layout = calculateLayout(config.range, config.orientation, config.sizing);
    const scene = buildScene(config, layout, minimalAppearance);
    const domSvg = svg();
    const staticSvg = new dom.window.DOMParser().parseFromString(
      serializeScene(scene, { width: scene.width, height: 135 }), 'image/svg+xml',
    ).documentElement;

    const attributes = (element: Element) => Object.fromEntries(
      Array.from(element.attributes, ({ name, value }) => [name, value]).filter(([name]) => name !== 'xmlns'),
    );
    expect(staticSvg.namespaceURI).toBe(SVG_NS);
    expect(attributes(staticSvg)).toEqual(attributes(domSvg));
    expect(Array.from(staticSvg.children, attributes)).toEqual(Array.from(domSvg.children, attributes));
    expect(domSvg.firstElementChild?.getAttribute('fill')).toBe(minimalAppearance.background);
    expect(notes(staticSvg)).toEqual(layout.keys.map(key => String(key.note)));
    expect(staticSvg.querySelector('[id], style, script, [href], [tabindex]')).toBeNull();
    expect(domSvg.querySelector('[id], style, script, [href], [tabindex]')).toBeNull();
  });

  it('escapes XML attribute values and rejects invalid XML code points', () => {
    const config = normalizeConfig();
    const layout = calculateLayout(config.range, config.orientation, config.sizing);
    const scene = buildScene(config, layout, minimalAppearance);
    const label = '"><script href="evil"> & 🎹\t\r\n';
    // Exercise the encoding boundary directly. Current public options have no user-text field.
    const markup = serializeScene({ ...scene, label });
    const root = new dom.window.DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
    expect(root.getAttribute('aria-label')).toBe(label);
    expect(root.querySelector('script')).toBeNull();
    for (const invalid of ['\u0000', '\uD800', '\uDC00', '\uFFFF']) {
      expect(() => serializeScene({ ...scene, label: invalid })).toThrow(TypeError);
    }
  });
});
