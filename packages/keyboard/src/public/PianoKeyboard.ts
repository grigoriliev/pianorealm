import type { KeyOverlays } from '../config/decorations.js';
import { CONFIG_FIELDS, normalizeConfig, validateOrientation } from '../config/normalize.js';
import type { ConfigOptions, Orientation } from '../config/normalize.js';
import { calculateLayout } from '../geometry/layout.js';
import { validateRecord } from '../internal/validate-record.js';
import { normalizeNote } from '../notes/notation.js';
import type { NoteInput } from '../notes/notation.js';
import { buildScene } from '../scene/build-scene.js';
import { findSkin, normalizeAppearance } from '../skins/appearance.js';
import type { AppearanceOptions } from '../skins/appearance.js';
import { PressedKeys } from '../state/pressed-keys.js';
import { MountedSvg, validateContainer } from '../svg/mount.js';

// Resolve the browser element type for mounted callers while keeping note-only
// TypeScript imports usable in projects without the DOM library.
type KeyboardContainer = typeof globalThis extends { HTMLElement: { prototype: infer Element } }
  ? Element
  : never;

export type KeyboardOptionsPatch = ConfigOptions;

export interface KeyboardOptions extends KeyboardOptionsPatch {
  readonly container: KeyboardContainer;
}

const OPTION_FIELDS = ['container', ...CONFIG_FIELDS];

function layoutFor(config: ReturnType<typeof normalizeConfig>) {
  return calculateLayout(config.range, config.orientation, config.sizing);
}

/** A display-only piano keyboard mounted in a caller-provided HTML element. */
export class PianoKeyboard {
  #config: ReturnType<typeof normalizeConfig>;
  #mount: MountedSvg | null;
  #layout: ReturnType<typeof calculateLayout>;
  readonly #skins = new Map<string, AppearanceOptions>();
  readonly #pressed = new PressedKeys();

  constructor(options: KeyboardOptions) {
    validateRecord(options, OPTION_FIELDS, 'keyboard options');
    const { container, ...configOptions } = options;
    validateContainer(container);
    this.#config = normalizeConfig(configOptions);
    this.#layout = layoutFor(this.#config);
    const scene = buildScene(this.#config, this.#layout, this.#config.appearance, this.#pressed);
    this.#mount = new MountedSvg(container, scene, this.#config.sizing, this.#config.animation);
  }

  /** Atomically replace the visually pressed notes, including those outside the displayed range. */
  setPressedKeys(keys: readonly NoteInput[]): void {
    const mount = this.#requireMount();
    if (!Array.isArray(keys)) {
      throw new TypeError('Pressed keys must be an array of notes');
    }
    const notes = new Set<number>();
    const count = keys.length;
    for (let index = 0; index < count; index++) {
      notes.add(normalizeNote(keys[index], this.#config.notation));
    }
    for (const note of this.#pressed.replace(notes)) {
      mount.setKeyPressed(note, this.#pressed.has(note));
    }
  }

  pressKey(key: NoteInput): void {
    const mount = this.#requireMount();
    const note = normalizeNote(key, this.#config.notation);
    if (this.#pressed.press(note)) mount.setKeyPressed(note, true);
  }

  releaseKey(key: NoteInput): void {
    const mount = this.#requireMount();
    const note = normalizeNote(key, this.#config.notation);
    if (this.#pressed.release(note)) mount.setKeyPressed(note, false);
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
    this.#requireMount();
    validateOrientation(orientation);
    this.#replace({ orientation });
  }

  setSkin(skin: string): void {
    this.#requireMount();
    if (typeof skin !== 'string') throw new TypeError('Skin must be a name');
    this.#replace({ skin });
  }

  /** Register a validated skin for this instance. Registration does not select it. */
  registerSkin(name: string, appearance: AppearanceOptions): void {
    this.#requireMount();
    if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) {
      throw new TypeError('Skin name must start with a lowercase ASCII letter and contain only lowercase letters, digits or hyphens');
    }
    if (findSkin(name, this.#skins)) throw new TypeError(`Keyboard skin "${name}" is already registered`);
    this.#skins.set(name, normalizeAppearance(appearance));
  }

  /** Merge validated configuration fields. Explicit undefined resets an optional field. */
  setOptions(patch: KeyboardOptionsPatch): void {
    this.#requireMount();
    validateRecord(patch, CONFIG_FIELDS, 'configuration');
    this.#replace(patch);
  }

  /** Replace the complete per-note overlay map. Pass an empty object to clear it. */
  setKeyOverlays(overlays: KeyOverlays): void {
    this.#requireMount();
    if (overlays === undefined) throw new TypeError('Overlays must be a note map');
    this.#replace({ overlays });
  }

  resize(): void {
    this.#requireMount().resize();
  }

  destroy(): void {
    const mount = this.#mount;
    this.#mount = null;
    this.#skins.clear();
    if (mount) {
      this.#config = normalizeConfig();
      mount.destroy();
    }
  }

  #replace(patch: ConfigOptions): void {
    const mount = this.#requireMount();
    const previous = this.#config;
    const config = normalizeConfig(patch, previous, this.#skins);
    const { range, orientation, sizing, notation, appearance } = config;
    const oldSizing = previous.sizing;
    const changesLayout = range.from !== previous.range.from || range.to !== previous.range.to
      || orientation !== previous.orientation || sizing.whiteKeyWidth !== oldSizing.whiteKeyWidth
      || sizing.whiteKeyHeight !== oldSizing.whiteKeyHeight || sizing.blackKeyWidth !== oldSizing.blackKeyWidth
      || sizing.blackKeyHeight !== oldSizing.blackKeyHeight;
    const changesViewport = sizing.mode !== oldSizing.mode || sizing.width !== oldSizing.width
      || sizing.height !== oldSizing.height;
    const changesPresentation = notation !== previous.notation || appearance !== previous.appearance
      || config.pressedMode !== previous.pressedMode || config.indicator !== previous.indicator
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
  }

  #requireMount(): MountedSvg {
    if (!this.#mount) {
      throw new Error('Keyboard has been destroyed');
    }
    return this.#mount;
  }
}
