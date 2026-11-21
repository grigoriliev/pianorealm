import { keyPresentation, minimalAppearance } from '../scene/build-scene.js';
import type { KeyboardScene } from '../scene/build-scene.js';
import type { Viewport } from './attributes.js';
import { buildSvg, sizeSvg, updateKeyPresentation } from './dom-renderer.js';
import { measureContainer } from './measure.js';

interface MountSizing {
  readonly mode: 'container' | 'fixed';
  readonly width?: number;
  readonly height?: number;
}

// Share ownership across copies of the library, even if the host is adopted into another document.
const mountOwner = Symbol.for('@pianorealm/keyboard/mount-owner');

export function validateContainer(container: HTMLElement): void {
  const ElementClass = container?.ownerDocument?.defaultView?.HTMLElement
    ?? (typeof HTMLElement === 'undefined' ? undefined : HTMLElement);
  if (!ElementClass || !(container instanceof ElementClass)) {
    throw new TypeError('Keyboard container must be an HTML element');
  }
}

export class MountedSvg {
  readonly #container: HTMLElement;
  readonly #sizing: MountSizing;
  readonly #slot: HTMLElement;
  #observer?: ResizeObserver;
  #drawing: ReturnType<typeof buildSvg>;
  #intrinsicSize: Viewport;
  #viewport: Viewport | null = null;
  #active = false;

  constructor(container: HTMLElement, scene: KeyboardScene, sizing: MountSizing) {
    if (Object.hasOwn(container, mountOwner)) {
      throw new Error('Keyboard container already has a mounted instance');
    }

    this.#container = container;
    this.#sizing = sizing;
    this.#intrinsicSize = { width: scene.width, height: scene.height };
    const document = container.ownerDocument;
    this.#drawing = buildSvg(document, scene);
    this.#slot = container;
    if (sizing.mode === 'container') {
      // Keep the rendered SVG out of host sizing so it cannot sustain a stale height
      // or grow a content-sized host on every ResizeObserver notification.
      this.#slot = document.createElement('div');
      this.#slot.style.cssText = 'position:relative;display:block;width:0;height:0';
    }
    this.#position(this.#drawing.root);

    Object.defineProperty(container, mountOwner, { value: true, configurable: true });
    this.#active = true;
    try {
      this.resize();
      if (this.#slot !== container) {
        container.insertBefore(this.#slot, container.firstChild);
        const Observer = document.defaultView?.ResizeObserver;
        if (typeof Observer === 'function') {
          this.#observer = new Observer(() => {
            if (this.#active) this.resize();
          });
          this.#observer.observe(container);
        }
      }
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  #position(root: SVGSVGElement): void {
    if (this.#sizing.mode === 'container') {
      root.style.cssText = 'position:absolute;top:0;left:0';
    }
  }

  #measure(intrinsicSize: Viewport): Viewport | null {
    if (this.#sizing.mode === 'container') {
      return measureContainer(this.#container);
    }
    return {
      width: this.#sizing.width ?? intrinsicSize.width,
      height: this.#sizing.height ?? intrinsicSize.height,
    };
  }

  replace(scene: KeyboardScene): void {
    const drawing = buildSvg(this.#container.ownerDocument, scene);
    const { root } = drawing;
    const previousRoot = this.#drawing.root;
    this.#position(root);
    const viewport = this.#measure(scene);
    if (viewport) {
      sizeSvg(root, viewport);
      if (previousRoot.parentNode === this.#slot) {
        this.#slot.replaceChild(root, previousRoot);
      } else {
        this.#slot.appendChild(root);
      }
    } else {
      previousRoot.remove();
    }

    this.#drawing = drawing;
    this.#intrinsicSize = { width: scene.width, height: scene.height };
    this.#viewport = viewport;
  }

  setKeyPressed(note: number, pressed: boolean): void {
    const nodes = this.#drawing.keys.get(note);
    if (nodes) updateKeyPresentation(nodes, keyPresentation(nodes.kind, minimalAppearance, pressed));
  }

  resize(): void {
    const viewport = this.#measure(this.#intrinsicSize);
    const { root } = this.#drawing;
    if (!viewport) {
      root.remove();
    } else {
      if (viewport.width !== this.#viewport?.width || viewport.height !== this.#viewport?.height) {
        sizeSvg(root, viewport);
      }
      if (root.parentNode !== this.#slot) {
        this.#slot.appendChild(root);
      }
    }
    this.#viewport = viewport;
  }

  destroy(): void {
    this.#active = false;
    try {
      this.#observer?.disconnect();
    } finally {
      this.#drawing.root.remove();
      this.#drawing.keys.clear();
      if (this.#slot !== this.#container) this.#slot.remove();
      Reflect.deleteProperty(this.#container, mountOwner);
    }
  }
}
