import type { KeyOverlays } from '../config/decorations.js';
import { CONFIG_FIELDS, normalizeConfig, validateOrientation } from '../config/normalize.js';
import type { ConfigOptions, Orientation } from '../config/normalize.js';
import { findNoteAtPoint, validatePoint } from '../geometry/hit-testing.js';
import { calculateLayout } from '../geometry/layout.js';
import { validateRecord } from '../internal/validate-record.js';
import { normalizeNote } from '../notes/notation.js';
import type { NoteInput } from '../notes/notation.js';
import { buildScene } from '../scene/build-scene.js';
import { findSkin, normalizeAppearance } from '../skins/appearance.js';
import type { AppearanceOptions, BuiltInSkin } from '../skins/appearance.js';
import { PressedKeys } from '../state/pressed-keys.js';
import { fixedViewport } from '../svg/attributes.js';
import type { Viewport } from '../svg/attributes.js';
import { MountedSvg, validateContainer } from '../svg/mount.js';
import { serializeScene } from '../svg/serialize.js';
import { KeyboardEvents } from './events.js';
import type { KeyboardEventMap } from './events.js';

// Resolve the browser element type for mounted callers while keeping note-only
// TypeScript imports usable in projects without the DOM library.
type KeyboardContainer = typeof globalThis extends { HTMLElement: { prototype: infer Element } }
  ? Element
  : never;

export type KeyboardOptionsPatch = ConfigOptions;

export interface KeyboardOptions extends KeyboardOptionsPatch {
  readonly container: KeyboardContainer;
  readonly onCallbackError?: (error: unknown) => void;
}

export interface StaticKeyboardOptions extends Omit<ConfigOptions, 'animation' | 'sizing' | 'skin'> {
  readonly sizing?: (Omit<NonNullable<ConfigOptions['sizing']>, 'mode'> & {
    readonly mode?: 'fixed' | undefined;
  }) | undefined;
  readonly skin?: BuiltInSkin | undefined;
  readonly pressedKeys?: readonly NoteInput[] | undefined;
  readonly idPrefix?: string | undefined;
}

/** Synchronously set up a visualization extension and optionally return its cleanup. */
export type KeyboardExtension = (keyboard: PianoKeyboard) => void | (() => void);

const OPTION_FIELDS = ['container', 'onCallbackError', ...CONFIG_FIELDS];
const STATIC_FIELDS = [...CONFIG_FIELDS.filter(field => field !== 'animation'), 'pressedKeys', 'idPrefix'];
const STATIC_DEFAULTS = normalizeConfig({ sizing: { mode: 'fixed' } });

function layoutFor(config: ReturnType<typeof normalizeConfig>) {
  return calculateLayout(config.range, config.orientation, config.sizing);
}

function normalizePressedKeys(keys: readonly NoteInput[], notation: ReturnType<typeof normalizeConfig>['notation']): Set<number> {
  if (!Array.isArray(keys)) throw new TypeError('Pressed keys must be an array of notes');
  const notes = new Set<number>();
  const count = keys.length;
  for (let index = 0; index < count; index++) {
    notes.add(normalizeNote(keys[index], notation));
  }
  return notes;
}

/** A display-only piano keyboard mounted in a caller-provided HTML element. */
export class PianoKeyboard {
  #config: ReturnType<typeof normalizeConfig>;
  #mount: MountedSvg | null;
  #layout: ReturnType<typeof calculateLayout>;
  readonly #skins = new Map<string, AppearanceOptions>();
  readonly #pressed = new PressedKeys();
  readonly #events: KeyboardEvents;
  readonly #extensionDisposers = new Set<() => void>();

  /** Render the final visual state to standalone SVG without mounting a keyboard. */
  static renderToSVG(options: StaticKeyboardOptions = {}): string {
    validateRecord(options, STATIC_FIELDS, 'static keyboard options');
    const { pressedKeys = [], idPrefix, ...configOptions } = options;
    // Omission keeps the static defaults. The shared reset uses the mounted defaults.
    if (configOptions.sizing === undefined) delete configOptions.sizing;
    const config = normalizeConfig(configOptions, STATIC_DEFAULTS);
    if (config.sizing.mode !== 'fixed') throw new TypeError('Static SVG requires fixed sizing');
    const pressed = normalizePressedKeys(pressedKeys, config.notation);
    const layout = layoutFor(config);
    const scene = buildScene(config, layout, config.appearance, pressed);
    return serializeScene(scene, fixedViewport(layout, config.sizing), idPrefix);
  }

  constructor(options: KeyboardOptions) {
    validateRecord(options, OPTION_FIELDS, 'keyboard options');
    const { container, onCallbackError, ...configOptions } = options;
    validateContainer(container);
    if (onCallbackError !== undefined && typeof onCallbackError !== 'function') {
      throw new TypeError('onCallbackError must be a function');
    }
    const hostConsole = container.ownerDocument.defaultView?.console ?? console;
    this.#events = new KeyboardEvents(onCallbackError ?? (error => hostConsole.error(error)));
    this.#config = normalizeConfig(configOptions);
    this.#layout = layoutFor(this.#config);
    const scene = buildScene(this.#config, this.#layout, this.#config.appearance, this.#pressed);
    this.#mount = new MountedSvg(container, scene, this.#config.sizing, this.#config.animation, () => this.resize());
  }

  /** Subscribe to a visualization event and return an idempotent unsubscribe function. */
  on<Event extends keyof KeyboardEventMap>(
    event: Event, handler: (value: KeyboardEventMap[Event]) => void,
  ): () => void {
    this.#requireMount();
    return this.#events.on(event, handler);
  }

  /** Install a synchronous extension and return its idempotent removal handle. */
  use(extension: KeyboardExtension): () => void {
    this.#requireMutableMount();
    if (typeof extension !== 'function') throw new TypeError('Keyboard extension must be a function');
    let cleanup = extension(this);
    if (cleanup === undefined) return () => {};
    if (typeof cleanup !== 'function') throw new TypeError('Keyboard extension must return a cleanup function or undefined');

    const remove = () => {
      const callback = cleanup;
      cleanup = undefined;
      if (!callback) return;
      this.#extensionDisposers.delete(remove);
      this.#events.invoke(callback);
    };
    if (this.#mount) this.#extensionDisposers.add(remove);
    else remove();
    return remove;
  }

  /** Resolve a viewport point in CSS pixels to the topmost key's MIDI note. */
  getNoteAtPoint(clientX: number, clientY: number): number | null {
    const mount = this.#requireMount();
    validatePoint(clientX, clientY);
    const point = mount.toLayoutPoint(clientX, clientY);
    return point ? findNoteAtPoint(this.#layout, point.x, point.y) : null;
  }

  /** Atomically replace the visually pressed notes, including those outside the displayed range. */
  setPressedKeys(keys: readonly NoteInput[]): void {
    const mount = this.#requireMutableMount();
    const changed = this.#pressed.replace(normalizePressedKeys(keys, this.#config.notation));
    for (const note of changed) {
      mount.setKeyPressed(note, this.#pressed.has(note));
    }
    if (changed.length) this.#emitPressed();
  }

  pressKey(key: NoteInput): void {
    const mount = this.#requireMutableMount();
    const note = normalizeNote(key, this.#config.notation);
    if (this.#pressed.press(note)) {
      mount.setKeyPressed(note, true);
      this.#emitPressed();
    }
  }

  releaseKey(key: NoteInput): void {
    const mount = this.#requireMutableMount();
    const note = normalizeNote(key, this.#config.notation);
    if (this.#pressed.release(note)) {
      mount.setKeyPressed(note, false);
      this.#emitPressed();
    }
  }

  clearPressedKeys(): void {
    this.setPressedKeys([]);
  }

  /** Return a detached ascending MIDI array, including notes outside the displayed range. */
  getPressedKeys(): number[] {
    this.#requireMount();
    return this.#pressed.snapshot();
  }

  setRange(from: NoteInput, to: NoteInput): void {
    this.#replace({ range: { from, to } });
  }

  setOrientation(orientation: Orientation): void {
    this.#requireMutableMount();
    validateOrientation(orientation);
    this.#replace({ orientation });
  }

  setSkin(skin: string): void {
    this.#requireMutableMount();
    if (typeof skin !== 'string') throw new TypeError('Skin must be a name');
    this.#replace({ skin });
  }

  /** Register a validated skin for this instance. Registration does not select it. */
  registerSkin(name: string, appearance: AppearanceOptions): void {
    this.#requireMutableMount();
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new TypeError('Skin name must start with a lowercase ASCII letter and contain only lowercase letters, digits or hyphens');
    }
    if (findSkin(name, this.#skins)) throw new TypeError(`Keyboard skin "${name}" is already registered`);
    this.#skins.set(name, normalizeAppearance(appearance));
  }

  /** Merge validated configuration fields. Explicit undefined resets an optional field. */
  setOptions(patch: KeyboardOptionsPatch): void {
    this.#requireMutableMount();
    validateRecord(patch, CONFIG_FIELDS, 'configuration');
    this.#replace(patch);
  }

  /** Replace the complete per-note overlay map. Pass an empty object to clear it. */
  setKeyOverlays(overlays: KeyOverlays): void {
    this.#requireMutableMount();
    if (overlays === undefined) throw new TypeError('Overlays must be a note map');
    this.#replace({ overlays });
  }

  resize(): void {
    const mount = this.#requireMutableMount();
    const previous = mount.viewport;
    mount.resize();
    this.#emitResize(previous, mount.viewport);
  }

  destroy(): void {
    this.#events.requireIdle();
    const mount = this.#mount;
    if (!mount) return;
    const listeners = this.#events.snapshot('destroyed');
    this.#events.invoke(() => {
      try {
        mount.stopObserving();
      } finally {
        this.#mount = null;
      }
    });
    this.#skins.clear();
    this.#config = normalizeConfig();
    for (const remove of [...this.#extensionDisposers].reverse()) remove();
    this.#events.invoke(() => mount.destroy());
    try {
      this.#events.emit('destroyed', undefined, listeners);
    } finally {
      this.#events.clear();
    }
  }

  #emitPressed(): void {
    this.#events.emit('pressedKeysChanged', Object.freeze(this.#pressed.snapshot()));
  }

  #emitResize(previous: Viewport | null, viewport: Viewport | null): void {
    if (previous?.width !== viewport?.width || previous?.height !== viewport?.height) {
      this.#events.emit('resized', viewport);
    }
  }

  #replace(patch: ConfigOptions): void {
    const mount = this.#requireMutableMount();
    const previousViewport = mount.viewport;
    const previous = this.#config;
    const config = normalizeConfig(patch, previous, this.#skins);
    const { range, orientation, sizing, notation, appearance } = config;
    const oldSizing = previous.sizing;
    const changesRange = range.from !== previous.range.from || range.to !== previous.range.to;
    const changesOrientation = orientation !== previous.orientation;
    const changesLayout = changesRange || changesOrientation || sizing.whiteKeyWidth !== oldSizing.whiteKeyWidth
      || sizing.whiteKeyHeight !== oldSizing.whiteKeyHeight || sizing.blackKeyWidth !== oldSizing.blackKeyWidth
      || sizing.blackKeyHeight !== oldSizing.blackKeyHeight;
    const changesViewport = sizing.mode !== oldSizing.mode || sizing.width !== oldSizing.width
      || sizing.height !== oldSizing.height;
    const changesPresentation = notation !== previous.notation || appearance !== previous.appearance
      || config.accessibility !== previous.accessibility || config.pressedMode !== previous.pressedMode || config.indicator !== previous.indicator
      || config.labels !== previous.labels || config.highlights !== previous.highlights || config.overlays !== previous.overlays;
    const layout = changesLayout ? layoutFor(config) : this.#layout;
    const scene = changesLayout || changesPresentation ? buildScene(config, layout, appearance, this.#pressed) : undefined;
    if (changesLayout || changesViewport) mount.updateSizing(sizing, changesLayout ? scene : undefined);
    if (!changesLayout && scene) mount.restyle(scene);
    if (config.animation !== previous.animation) {
      mount.setAnimation(config.animation);
    }
    this.#layout = layout;
    this.#config = config;
    if (changesRange) this.#events.emit('rangeChanged', range);
    if (changesOrientation) this.#events.emit('orientationChanged', orientation);
    if (config.skin !== previous.skin) this.#events.emit('skinChanged', config.skin);
    this.#emitResize(previousViewport, mount.viewport);
  }

  #requireMutableMount(): MountedSvg {
    this.#events.requireIdle();
    return this.#requireMount();
  }

  #requireMount(): MountedSvg {
    if (!this.#mount) {
      throw new Error('Keyboard has been destroyed');
    }
    return this.#mount;
  }
}
