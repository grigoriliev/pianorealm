import type { KeyboardScene } from '../scene/build-scene.js';
import type { Viewport } from './attributes.js';
import { buildSvg, sizeSvg } from './dom-renderer.js';
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
  #root: SVGSVGElement;
  #scene: KeyboardScene;
  #viewport: Viewport | null = null;
  #active = false;

  constructor(container: HTMLElement, scene: KeyboardScene, sizing: MountSizing) {
    if (Object.hasOwn(container, mountOwner)) {
      throw new Error('Keyboard container already has a mounted instance');
    }

    this.#container = container;
    this.#sizing = sizing;
    this.#scene = scene;
    const document = container.ownerDocument;
    this.#root = buildSvg(document, scene);
    this.#slot = container;
    if (sizing.mode === 'container') {
      // Keep the rendered SVG out of host sizing so it cannot sustain a stale height
      // or grow a content-sized host on every ResizeObserver notification.
      this.#slot = document.createElement('div');
      this.#slot.style.cssText = 'position:relative;display:block;width:0;height:0';
    }
    this.#position(this.#root);

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

  #measure(scene: KeyboardScene): Viewport | null {
    if (this.#sizing.mode === 'container') {
      return measureContainer(this.#container);
    }
    return {
      width: this.#sizing.width ?? scene.width,
      height: this.#sizing.height ?? scene.height,
    };
  }

  replace(scene: KeyboardScene): void {
    const root = buildSvg(this.#container.ownerDocument, scene);
    this.#position(root);
    const viewport = this.#measure(scene);
    if (viewport) {
      sizeSvg(root, viewport);
      if (this.#root.parentNode === this.#slot) {
        this.#slot.replaceChild(root, this.#root);
      } else {
        this.#slot.appendChild(root);
      }
    } else {
      this.#root.remove();
    }

    this.#root = root;
    this.#scene = scene;
    this.#viewport = viewport;
  }

  resize(): void {
    const viewport = this.#measure(this.#scene);
    if (!viewport) {
      this.#root.remove();
    } else {
      if (viewport.width !== this.#viewport?.width || viewport.height !== this.#viewport?.height) {
        sizeSvg(this.#root, viewport);
      }
      if (this.#root.parentNode !== this.#slot) {
        this.#slot.appendChild(this.#root);
      }
    }
    this.#viewport = viewport;
  }

  destroy(): void {
    this.#active = false;
    try {
      this.#observer?.disconnect();
    } finally {
      this.#root.remove();
      if (this.#slot !== this.#container) this.#slot.remove();
      Reflect.deleteProperty(this.#container, mountOwner);
    }
  }
}
