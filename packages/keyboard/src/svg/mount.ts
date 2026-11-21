import type { ResolvedAnimation } from '../config/animation.js';
import { keyPresentation } from '../scene/build-scene.js';
import type { KeyboardScene } from '../scene/build-scene.js';
import type { Viewport } from './attributes.js';
import { buildSvg, sizeSvg, updateKeyPresentation, updateSvg } from './dom-renderer.js';
import { reserveLivePrefix } from './identifiers.js';
import { measureContainer } from './measure.js';
import { scopeMotion, updateMotion } from './motion.js';

interface MountSizing {
  readonly mode: 'container' | 'fixed';
  readonly width?: number;
  readonly height?: number;
}

// Share ownership across copies of the library, even if the host is adopted into another document.
const mountOwner = Symbol.for('@pianorealm/keyboard/mount-owner');

// Skip floating-point noise without rounding away real, even tiny, positive sizes.
function sameViewport(a: Viewport, b: Viewport | null, mode: MountSizing['mode']): boolean {
  if (!b) return false;
  if (mode === 'fixed') return a.width === b.width && a.height === b.height;
  return Math.abs(a.width - b.width) < 1e-6 && Math.abs(a.height - b.height) < 1e-6;
}

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
  #cancelFrame: (() => void) | undefined;
  readonly #ids: ReturnType<typeof reserveLivePrefix>;
  readonly #motionStyle: HTMLStyleElement;
  #appearance: KeyboardScene['appearance'];
  #pressedMode: KeyboardScene['pressedMode'];
  #drawing: ReturnType<typeof buildSvg>;
  #intrinsicSize: Viewport;
  #viewport: Viewport | null = null;
  #active = false;

  constructor(container: HTMLElement, scene: KeyboardScene, sizing: MountSizing, animation: ResolvedAnimation) {
    if (Object.hasOwn(container, mountOwner)) {
      throw new Error('Keyboard container already has a mounted instance');
    }

    this.#container = container;
    this.#sizing = sizing;
    this.#intrinsicSize = { width: scene.width, height: scene.height };
    this.#appearance = scene.appearance;
    this.#pressedMode = scene.pressedMode;
    this.#slot = this.#createSlot(sizing);
    this.#motionStyle = container.ownerDocument.createElement('style');
    this.#ids = reserveLivePrefix(container);
    try {
      this.#drawing = this.#buildDrawing(scene);
      this.#position(this.#drawing.root, sizing);
      this.setAnimation(animation);
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
      container.appendChild(this.#motionStyle);
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  #buildDrawing(scene: KeyboardScene): ReturnType<typeof buildSvg> {
    const drawing = buildSvg(this.#container.ownerDocument, scene, this.#ids.prefix);
    scopeMotion(drawing.root, this.#ids.prefix);
    return drawing;
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
      if (this.#active && this.#observer === observer) this.#queueResize();
    });
    try {
      observer.observe(this.#container);
    } catch (error) {
      observer.disconnect();
      throw error;
    }
    return observer;
  }

  #queueResize(): void {
    if (this.#cancelFrame) return;
    const view = this.#container.ownerDocument.defaultView;
    if (typeof view?.requestAnimationFrame !== 'function' || typeof view.cancelAnimationFrame !== 'function') {
      this.resize();
      return;
    }
    const frame = view.requestAnimationFrame(() => {
      if (this.#cancelFrame !== cancel) return;
      this.#cancelFrame = undefined;
      this.resize();
    });
    const cancel = () => view.cancelAnimationFrame(frame);
    this.#cancelFrame = cancel;
  }

  #cancelResize(): void {
    const cancel = this.#cancelFrame;
    this.#cancelFrame = undefined;
    cancel?.();
  }

  #position(root: SVGSVGElement, sizing: MountSizing): void {
    if (sizing.mode === 'container') {
      root.style.cssText = 'position:absolute;top:0;left:0';
    } else {
      root.removeAttribute('style');
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

  updateSizing(sizing: MountSizing, scene?: KeyboardScene): void {
    const keys = this.#drawing.keys;
    // MIDI fixes each key's layer and order. The same note set can be repositioned in place.
    const replacesKeys = scene && (scene.keys.length !== keys.size || scene.keys.some(key => !keys.has(key.note)));
    const drawing = replacesKeys ? this.#buildDrawing(scene) : this.#drawing;
    const intrinsicSize = scene ? { width: scene.width, height: scene.height } : this.#intrinsicSize;
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
      viewport = this.#measure(intrinsicSize, sizing);
    } catch (error) {
      if (detaching) this.#container.insertBefore(previousRoot, next);
      observer?.disconnect();
      throw error;
    }

    this.#cancelResize();
    if (replacesKeys || changesMode) this.#position(drawing.root, sizing);
    if (replacesKeys) {
      if (viewport && previousRoot.parentNode === slot) slot.replaceChild(drawing.root, previousRoot);
      else previousRoot.remove();
      this.#viewport = null;
    } else if (scene) {
      updateSvg(drawing, scene, this.#ids.prefix, true);
    }
    if (changesMode) {
      if (this.#slot !== this.#container) this.#slot.remove();
      if (slot !== this.#container) this.#container.insertBefore(slot, this.#container.firstChild);
      this.#observer?.disconnect();
      this.#observer = observer;
      this.#slot = slot;
    }

    this.#drawing = drawing;
    this.#sizing = sizing;
    this.#intrinsicSize = intrinsicSize;
    if (scene) {
      this.#appearance = scene.appearance;
      this.#pressedMode = scene.pressedMode;
    }
    this.#applyViewport(viewport);
  }

  setAnimation(animation: ResolvedAnimation): void {
    updateMotion(this.#motionStyle, this.#ids.prefix, animation);
  }

  restyle(scene: KeyboardScene): void {
    updateSvg(this.#drawing, scene, this.#ids.prefix);
    this.#appearance = scene.appearance;
    this.#pressedMode = scene.pressedMode;
  }

  setKeyPressed(note: number, pressed: boolean): void {
    const nodes = this.#drawing.keys.get(note);
    if (nodes) updateKeyPresentation(nodes, keyPresentation(nodes.kind, this.#appearance, pressed, this.#pressedMode), this.#ids.prefix);
  }

  resize(): void {
    this.#cancelResize();
    this.#applyViewport(this.#measure(this.#intrinsicSize, this.#sizing));
  }

  #applyViewport(viewport: Viewport | null): void {
    const { root } = this.#drawing;
    if (!viewport) {
      root.remove();
      this.#viewport = null;
    } else {
      if (!sameViewport(viewport, this.#viewport, this.#sizing.mode)) {
        sizeSvg(root, viewport);
        this.#viewport = viewport;
      }
      if (root.parentNode !== this.#slot) {
        this.#slot.appendChild(root);
      }
    }
  }

  destroy(): void {
    this.#active = false;
    try {
      this.#cancelResize();
      this.#observer?.disconnect();
    } finally {
      this.#ids.release();
      this.#drawing.root.remove();
      this.#motionStyle.remove();
      this.#drawing.keys.clear();
      if (this.#slot !== this.#container) this.#slot.remove();
      Reflect.deleteProperty(this.#container, mountOwner);
    }
  }
}
