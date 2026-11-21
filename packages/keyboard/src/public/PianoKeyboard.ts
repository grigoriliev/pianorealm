import { CONFIG_FIELDS, normalizeConfig, validateOrientation } from '../config/normalize.js';
import type { ConfigOptions, Orientation } from '../config/normalize.js';
import { calculateLayout } from '../geometry/layout.js';
import { validateRecord } from '../internal/validate-record.js';
import type { NoteInput } from '../notes/notation.js';
import { buildScene, minimalAppearance } from '../scene/build-scene.js';
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

function prepareScene(config: ReturnType<typeof normalizeConfig>) {
  const layout = calculateLayout(config.range, config.orientation, config.sizing);
  return buildScene(config, layout, minimalAppearance);
}

/** A display-only piano keyboard mounted in a caller-provided HTML element. */
export class PianoKeyboard {
  #config: ReturnType<typeof normalizeConfig>;
  #mount: MountedSvg | null;

  constructor(options: KeyboardOptions) {
    validateRecord(options, OPTION_FIELDS, 'keyboard options');
    const { container, ...configOptions } = options;
    validateContainer(container);
    this.#config = normalizeConfig(configOptions);
    this.#mount = new MountedSvg(container, prepareScene(this.#config), this.#config.sizing);
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
    mount.replace(prepareScene(config));
    this.#config = config;
  }

  #requireMount(): MountedSvg {
    if (!this.#mount) {
      throw new Error('Keyboard has been destroyed');
    }
    return this.#mount;
  }
}
