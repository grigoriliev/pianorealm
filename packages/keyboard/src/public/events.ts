import type { Orientation } from '../config/normalize.js';

/** Committed visualization state delivered to keyboard subscribers. */
export interface KeyboardEventMap {
  readonly rangeChanged: Readonly<{ from: number; to: number }>;
  readonly orientationChanged: Orientation;
  readonly skinChanged: string;
  readonly pressedKeysChanged: readonly number[];
  readonly resized: Readonly<{ width: number; height: number }> | null;
  readonly destroyed: undefined;
}

type Listener<Event extends keyof KeyboardEventMap> = (value: KeyboardEventMap[Event]) => void;
type Subscription<Event extends keyof KeyboardEventMap> = { readonly listener: Listener<Event> };

export class KeyboardEvents {
  readonly #subscriptions: { [Event in keyof KeyboardEventMap]: Set<Subscription<Event>> } = {
    rangeChanged: new Set(),
    orientationChanged: new Set(),
    skinChanged: new Set(),
    pressedKeysChanged: new Set(),
    resized: new Set(),
    destroyed: new Set(),
  };
  #delivering = false;
  readonly #reportError: (error: unknown) => void;

  constructor(reportError: (error: unknown) => void) {
    this.#reportError = reportError;
  }

  requireIdle(): void {
    if (this.#delivering) throw new Error('Cannot mutate the keyboard during event delivery');
  }

  on<Event extends keyof KeyboardEventMap>(event: Event, listener: Listener<Event>): () => void {
    if (typeof event !== 'string' || !Object.hasOwn(this.#subscriptions, event)) {
      throw new TypeError('Unknown keyboard event');
    }
    if (typeof listener !== 'function') throw new TypeError('Keyboard listener must be a function');
    const subscriptions = this.#subscriptions[event];
    const subscription = { listener };
    subscriptions.add(subscription);
    return () => { subscriptions.delete(subscription); };
  }

  snapshot<Event extends keyof KeyboardEventMap>(event: Event): readonly Subscription<Event>[] {
    return [...this.#subscriptions[event]];
  }

  emit<Event extends keyof KeyboardEventMap>(
    event: Event, value: KeyboardEventMap[Event], subscriptions = this.snapshot(event),
  ): void {
    this.#delivering = true;
    try {
      for (const { listener } of subscriptions) this.invoke(() => listener(value));
    } finally {
      this.#delivering = false;
    }
  }

  invoke(callback: () => void): void {
    try {
      callback();
    } catch (error) {
      const reportError = this.#reportError;
      try {
        reportError(error);
      } catch {
        // A failing reporter cannot interrupt delivery or cleanup.
      }
    }
  }

  clear(): void {
    for (const subscriptions of Object.values(this.#subscriptions)) subscriptions.clear();
  }
}
