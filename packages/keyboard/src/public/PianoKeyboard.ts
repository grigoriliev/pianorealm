import { CONFIG_FIELDS, normalizeConfig, validateOrientation } from '../config/normalize.js';
import type { ConfigOptions, Orientation } from '../config/normalize.js';
import { calculateLayout } from '../geometry/layout.js';
import { validateRecord } from '../internal/validate-record.js';
import { normalizeNote } from '../notes/notation.js';
import type { NoteInput } from '../notes/notation.js';
import { buildScene, minimalAppearance } from '../scene/build-scene.js';
import { PressedKeys } from '../state/pressed-keys.js';
import { MountedSvg, validateContainer } from '../svg/mount.js';

// Resolve the browser element type for mounted callers while keeping note-only
// TypeScript imports usable in projects without the DOM library.
type KeyboardContainer = typeof globalThis extends { HTMLElement: { prototype: infer Element } }
  ? Element
  : never;

export interface KeyboardOptions extends ConfigOptions {
  readonly container: KeyboardContainer;
}

const OPTION_FIELDS = ['container', ...CONFIG_FIELDS];

function prepareScene(config: ReturnType<typeof normalizeConfig>, pressed: PressedKeys) {
  const layout = calculateLayout(config.range, config.orientation, config.sizing);
  return buildScene(config, layout, minimalAppearance, pressed);
}

/** A display-only piano keyboard mounted in a caller-provided HTML element. */
export class PianoKeyboard {
  #config: ReturnType<typeof normalizeConfig>;
  #mount: MountedSvg | null;
  readonly #pressed = new PressedKeys();

  constructor(options: KeyboardOptions) {
    validateRecord(options, OPTION_FIELDS, 'keyboard options');
    const { container, ...configOptions } = options;
    validateContainer(container);
    this.#config = normalizeConfig(configOptions);
    this.#mount = new MountedSvg(container, prepareScene(this.#config, this.#pressed), this.#config.sizing);
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

  resize(): void {
    this.#requireMount().resize();
  }

  destroy(): void {
    const mount = this.#mount;
    this.#mount = null;
    mount?.destroy();
  }

  #replace(patch: ConfigOptions): void {
    const mount = this.#requireMount();
    const config = normalizeConfig(patch, this.#config);
    if (config.range.from === this.#config.range.from && config.range.to === this.#config.range.to
      && config.orientation === this.#config.orientation) {
      return;
    }
    mount.replace(prepareScene(config, this.#pressed));
    this.#config = config;
  }

  #requireMount(): MountedSvg {
    if (!this.#mount) {
      throw new Error('Keyboard has been destroyed');
    }
    return this.#mount;
  }
}
