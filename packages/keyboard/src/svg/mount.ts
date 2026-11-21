import { keyPresentation } from '../scene/build-scene.js';
import type { KeyboardScene } from '../scene/build-scene.js';
import type { Viewport } from './attributes.js';
import { buildSvg, sizeSvg, updateKeyPresentation, updateSvgAppearance } from './dom-renderer.js';
import { reserveLivePrefix } from './identifiers.js';
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
  #sizing: MountSizing;
  #slot: HTMLElement;
  #observer: ResizeObserver | undefined;
  readonly #ids: ReturnType<typeof reserveLivePrefix>;
  #appearance: KeyboardScene['appearance'];
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
    this.#appearance = scene.appearance;
    this.#slot = this.#createSlot(sizing);
    this.#ids = reserveLivePrefix(container);
    try {
      this.#drawing = buildSvg(container.ownerDocument, scene, this.#ids.prefix);
      this.#position(this.#drawing.root, sizing);
      Object.defineProperty(container, mountOwner, { value: true, configurable: true });
    } catch (error) {
      this.#ids.release();
      throw error;
    }

    this.#active = true;
    try {
      this.resize();
      if (this.#slot !== container) {
        container.insertBefore(this.#slot, container.firstChild);
        this.#observer = this.#observe();
      }
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  #createSlot(sizing: MountSizing): HTMLElement {
    if (sizing.mode === 'fixed') return this.#container;

    // A zero-footprint slot prevents the drawing from contributing to host size.
    const slot = this.#container.ownerDocument.createElement('div');
    slot.style.cssText = 'position:relative;display:block;width:0;height:0';
    return slot;
  }

  #observe(): ResizeObserver | undefined {
    const Observer = this.#container.ownerDocument.defaultView?.ResizeObserver;
    if (typeof Observer !== 'function') return;
    const observer = new Observer(() => {
      if (this.#active && this.#observer === observer) this.resize();
    });
    try {
      observer.observe(this.#container);
    } catch (error) {
      observer.disconnect();
      throw error;
    }
    return observer;
  }

  #position(root: SVGSVGElement, sizing: MountSizing): void {
    if (sizing.mode === 'container') {
      root.style.cssText = 'position:absolute;top:0;left:0';
    }
  }

  #measure(intrinsicSize: Viewport, sizing: MountSizing): Viewport | null {
    if (sizing.mode === 'container') {
      return measureContainer(this.#container);
    }
    return {
      width: sizing.width ?? intrinsicSize.width,
      height: sizing.height ?? intrinsicSize.height,
    };
  }

  replace(scene: KeyboardScene, sizing: MountSizing): void {
    const drawing = buildSvg(this.#container.ownerDocument, scene, this.#ids.prefix);
    const { root } = drawing;
    this.#position(root, sizing);
    const previousRoot = this.#drawing.root;
    const changesMode = sizing.mode !== this.#sizing.mode;
    const slot = changesMode ? this.#createSlot(sizing) : this.#slot;
    const observer = changesMode && sizing.mode === 'container' ? this.#observe() : undefined;
    let viewport: Viewport | null;
    // Measure container mode without the old fixed SVG contributing to host size.
    const detaching = changesMode && sizing.mode === 'container' && previousRoot.parentNode === this.#container;
    const next = previousRoot.nextSibling;
    if (detaching) previousRoot.remove();
    try {
      viewport = this.#measure(scene, sizing);
      if (viewport) sizeSvg(root, viewport);
    } catch (error) {
      if (detaching) this.#container.insertBefore(previousRoot, next);
      observer?.disconnect();
      throw error;
    }

    if (viewport) {
      if (previousRoot.parentNode === slot) slot.replaceChild(root, previousRoot);
      else slot.appendChild(root);
    }
    previousRoot.remove();
    if (changesMode) {
      if (this.#slot !== this.#container) this.#slot.remove();
      if (slot !== this.#container) this.#container.insertBefore(slot, this.#container.firstChild);
      this.#observer?.disconnect();
      this.#observer = observer;
      this.#slot = slot;
    }

    this.#drawing = drawing;
    this.#sizing = sizing;
    this.#appearance = scene.appearance;
    this.#intrinsicSize = { width: scene.width, height: scene.height };
    this.#viewport = viewport;
  }

  restyle(scene: KeyboardScene): void {
    updateSvgAppearance(this.#drawing, scene, this.#ids.prefix);
    this.#appearance = scene.appearance;
  }

  setKeyPressed(note: number, pressed: boolean): void {
    const nodes = this.#drawing.keys.get(note);
    if (nodes) updateKeyPresentation(nodes, keyPresentation(nodes.kind, this.#appearance, pressed), this.#ids.prefix);
  }

  resize(): void {
    const viewport = this.#measure(this.#intrinsicSize, this.#sizing);
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
      this.#ids.release();
      this.#drawing.root.remove();
      this.#drawing.keys.clear();
      if (this.#slot !== this.#container) this.#slot.remove();
      Reflect.deleteProperty(this.#container, mountOwner);
    }
  }
}
