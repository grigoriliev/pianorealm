import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createContext, Script } from 'node:vm';
import { JSDOM } from 'jsdom';
import ts from 'typescript';
import { PianoKeyboard } from '@pianorealm/keyboard';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dist = join(root, 'dist');
const manifest = readFileSync(join(root, 'package.json'));
const { version } = JSON.parse(manifest);
const buildMarker = Symbol.for('@pianorealm/keyboard/standalone-version');
const render = PianoKeyboard.renderToSVG;

test('built ESM and declarations work for an external consumer without DOM or source files', async () => {
  const consumer = mkdtempSync(join(tmpdir(), 'pianorealm-consumer-'));
  const browserGlobals = ['window', 'document', 'HTMLElement', 'DOMParser', 'ResizeObserver'];
  try {
    const dependency = join(consumer, 'node_modules/@pianorealm/keyboard');
    mkdirSync(dependency, { recursive: true });
    writeFileSync(join(dependency, 'package.json'), manifest);
    cpSync(dist, join(dependency, 'dist'), { recursive: true });
    const fixture = join(consumer, 'consumer.mts');
    cpSync(join(root, 'tests/artifacts/consumer.mts'), fixture);
    const program = ts.createProgram([fixture], {
      strict: true, exactOptionalPropertyTypes: true, types: [],
      target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts'], module: ts.ModuleKind.NodeNext,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: name => name, getCurrentDirectory: () => consumer, getNewLine: () => '\n',
    }));
    assert.equal(program.emit().emitSkipped, false);
    for (const name of browserGlobals) {
      assert.ok(!Object.hasOwn(globalThis, name));
      Object.defineProperty(globalThis, name, { configurable: true, get() { assert.fail('Accessed ' + name); } });
    }
    const { exports, svg, importClassic } = await import(pathToFileURL(join(consumer, 'consumer.mjs')));
    assert.deepEqual(exports, ['PianoKeyboard', 'classifyNote', 'formatNote', 'normalizeNote']);
    assert.match(svg, /<svg .*role="img"/);
    assert.match(svg, /url\(#node-white-gradient\)/);
    assert.equal(globalThis.Pianorealm, undefined);
    await assert.rejects(importClassic, { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
  } finally {
    for (const name of browserGlobals) delete globalThis[name];
    rmSync(consumer, { recursive: true, force: true });
  }
});

const dom = new JSDOM();
after(() => dom.window.close());

function parse(xml) {
  const { documentElement: svg } = new dom.window.DOMParser().parseFromString(xml, 'image/svg+xml');
  assert.equal(svg.localName, 'svg', svg.textContent);
  assert.equal(svg.namespaceURI, 'http://www.w3.org/2000/svg');
  return svg;
}

for (const orientation of ['horizontal', 'vertical']) {
  for (const [from, to, count, pitch] of [
    ['C3', 'C5', 25, 300], ['A0', 'C8', 88, 1040], ['C#4', 'D#4', 3, 32], ['F#4', 'F#4', 1, 12],
  ]) {
    test(`static SVG renders ${from}–${to} in ${orientation} orientation`, () => {
      const svg = parse(render({ range: { from, to }, orientation, pressedKeys: [from] }));
      const [width, height] = orientation === 'horizontal' ? [pitch, 100] : [100, pitch];
      assert.equal(svg.getAttribute('viewBox'), `0 0 ${width} ${height}`);
      assert.equal(svg.getAttribute('width'), String(width));
      assert.equal(svg.getAttribute('height'), String(height));
      assert.equal(svg.getAttribute('role'), 'img');
      assert.equal(svg.querySelectorAll('[data-note]').length, count);
      assert.equal(svg.querySelectorAll('circle[data-pressed-indicator][display="inline"]').length, 1);
      assert.equal(svg.querySelectorAll('[data-pressed-indicator][display="none"]').length, count - 1);
    });
  }
}

test('static SVG safely resolves definitions, overlays and accessibility metadata', () => {
  const literal = '<&"\r🎹';
  const options = Object.freeze({
    range: Object.freeze({ from: 'C4', to: 'D5' }),
    skin: 'classic',
    sizing: Object.freeze({ width: 160, whiteKeyWidth: 40 }),
    pressedKeys: Object.freeze(['C4', 'E4', 'G4']),
    appearance: Object.freeze({ pressed: '#241a52' }),
    labels: Object.freeze({ custom: Object.freeze({ C4: literal }) }),
    highlights: Object.freeze({ E4: '#fa0' }),
    overlays: Object.freeze({ C4: Object.freeze([Object.freeze({ type: 'text', text: literal })]) }),
  });
  const markup = render({ ...options, idPrefix: 'card-a' });
  const svg = parse(markup);
  assert.equal(svg.getAttribute('width'), '160');
  assert.equal(svg.getAttribute('height'), '100');
  assert.equal(svg.getAttribute('aria-label'), 'Horizontal piano keyboard, C4 to D5');
  assert.match(markup, /&lt;&amp;"&#13;🎹/);
  assert.deepEqual([...svg.querySelectorAll('text')].map(node => node.textContent), [literal, literal]);
  assert.equal(svg.querySelectorAll('[data-note][fill="#241a52"]').length, 3);
  assert.ok(svg.querySelector('linearGradient'));
  assert.ok(svg.querySelector('filter'));
  assert.ok(svg.querySelector('clipPath'));
  assert.equal(svg.querySelector('script, style, image, foreignObject, [href], [onload], [tabindex]'), null);
  const ids = [...svg.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(id => id.startsWith('card-a-')));
  const references = [...markup.matchAll(/url\(#([\w-]+)\)/g)].map(match => match[1]);
  assert.ok(references.length > 0 && references.every(id => ids.includes(id)));
  assert.doesNotMatch(markup.replace('http://www.w3.org/2000/svg', ''), /https?:|url\((?!#)/);
  assert.equal(render({ ...options, pressedKeys: [67, 64, 60, 'B#3'], idPrefix: 'card-a' }), markup);
  assert.equal(render({ ...options, idPrefix: 'card-b' }), markup.replaceAll('card-a-', 'card-b-'));
  const combined = parse(`<svg xmlns="http://www.w3.org/2000/svg">${render(options)}${render(options)}</svg>`);
  const combinedIds = [...combined.querySelectorAll('[id]')].map(node => node.id);
  assert.equal(combinedIds.length, ids.length * 2);
  assert.equal(new Set(combinedIds).size, combinedIds.length);
});

test('static SVG rejects invalid options and does not affect later rendering', () => {
  const options = { skin: 'classic', idPrefix: 'stable' };
  const baseline = render(options);
  for (const [patch, reason] of [
    [{ appearance: { white: 'url(https://pianorealm.invalid/asset)' } }, /color/i],
    [{ overlays: { C4: [{ type: 'circle', onload: 'alert(1)' }] } }, /onload/],
    [{ overlays: { C4: [{ type: 'svg', html: '<script/>' }] } }, /overlay/i],
    [{ labels: { custom: { C4: '\u0000' } } }, /XML character/],
    [{ labels: { custom: { C4: '\ud800' } } }, /XML character/],
    [{ idPrefix: 'a\n' }, /idPrefix/],
    [{ idPrefix: 'a"><script/>' }, /idPrefix/],
    [{ idPrefix: null }, /idPrefix/],
    [{ sizing: { mode: 'container' } }, /fixed sizing/],
    [{ sizing: { width: Infinity } }, /width/],
    [{ animation: {} }, /animation/],
    [{ container: {} }, /container/],
    [{ skin: 'unregistered' }, /skin/],
    [{ pressedKeys: 'C4' }, /array/],
    [{ pressedKeys: ['C4', 128] }, /MIDI/],
    [{ range: { from: 'C5', to: 'C4' } }, /range/i],
  ]) {
    assert.throws(() => render({ ...options, ...patch }), reason);
    assert.equal(render(options), baseline);
  }
});

const classicNames = ['pianorealm-keyboard.umd.js', 'pianorealm-keyboard.umd.min.js'];
const classic = classicNames.map(name => {
  const code = readFileSync(join(dist, name), 'utf8');
  assert.ok(code.length > 0, name);
  return new Script(code, { filename: name });
});

for (const [index, script] of classic.entries()) {
  const filename = classicNames[index];
  test(`${filename} installs once, preserves siblings and exposes static SVG`, () => {
    const empty = createContext();
    script.runInContext(empty);
    assert.equal(typeof empty.Pianorealm.Keyboard, 'function');
    assert.ok(!Object.hasOwn(empty, 'PianorealmKeyboard'));
    assert.deepEqual(Object.getOwnPropertyDescriptor(empty.Pianorealm.Keyboard, buildMarker), {
      value: version, writable: false, enumerable: false, configurable: false,
    });

    const sibling = {};
    const namespace = Object.assign(Object.create(null), { Midi: sibling });
    const context = createContext({ Pianorealm: namespace });
    script.runInContext(context);
    const Keyboard = namespace.Keyboard;
    assert.strictEqual(context.Pianorealm, namespace);
    assert.strictEqual(namespace.Midi, sibling);
    Object.freeze(namespace);
    for (const duplicate of classic) duplicate.runInContext(context);
    assert.strictEqual(namespace.Keyboard, Keyboard);
    const options = { skin: 'classic', idPrefix: 'classic-script', pressedKeys: ['C4'] };
    // Options and the standalone bundle share a realm in a classic-script host.
    context.optionsJSON = JSON.stringify(options);
    assert.equal(new Script('Pianorealm.Keyboard.renderToSVG(JSON.parse(optionsJSON))').runInContext(context), render(options));
  });

  test(`${filename} rejects collisions without changing bindings`, () => {
    function OldKeyboard() {}
    Object.defineProperty(OldKeyboard, buildMarker, { value: version + '-old' });
    const cases = [
      [{ Keyboard: OldKeyboard }, /version/],
      [{ Keyboard: Object.create({ [buildMarker]: version }) }, /occupied/],
      [{ Keyboard: class extends OldKeyboard {} }, /occupied/],
      [Object.create({ Keyboard: OldKeyboard }), /occupied/],
      [Object.defineProperty({}, 'Keyboard', { value: undefined }), /occupied/],
      [Object.defineProperty({}, 'Keyboard', { get() { assert.fail('Keyboard getter read'); } }), /occupied/],
      [Object.freeze({ Midi: {} }), /cannot be extended/],
      [undefined, /namespace/],
      [null, /namespace/],
      [42, /namespace/],
      [[], /namespace/],
    ];
    for (const [namespace, reason] of cases) {
      const context = createContext({ Pianorealm: namespace });
      const globalDescriptor = Object.getOwnPropertyDescriptor(context, 'Pianorealm');
      const descriptors = namespace && Object.getOwnPropertyDescriptors(namespace);
      assert.throws(() => script.runInContext(context), reason);
      assert.deepEqual(Object.getOwnPropertyDescriptor(context, 'Pianorealm'), globalDescriptor);
      assert.deepEqual(namespace && Object.getOwnPropertyDescriptors(namespace), descriptors);
    }
    const locked = createContext(Object.defineProperty({}, 'Pianorealm', {
      get() { assert.fail('Pianorealm getter read'); },
    }));
    assert.throws(() => script.runInContext(locked), /namespace/);
  });
}

