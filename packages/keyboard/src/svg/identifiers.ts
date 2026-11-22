import type { DefinitionSlot } from '../scene/build-scene.js';

const documentAllocator = Symbol.for('@pianorealm/keyboard/svg-identifiers');
type IdSlot = DefinitionSlot | 'description';
const slots: readonly IdSlot[] = [
  'description',
  'white-gradient', 'black-gradient', 'black-shadow',
  ...Array.from({ length: 128 }, (_, note): DefinitionSlot => `key-clip-${note}`),
];
let nextStaticId = 0;

interface DocumentAllocator {
  next: number;
  readonly namespace: string;
  readonly reserved: Set<string>;
}

export function reserveLivePrefix(container: HTMLElement): { prefix: string; release(): void } {
  const document = container.ownerDocument as Document & { [documentAllocator]?: DocumentAllocator };
  if (!Object.hasOwn(document, documentAllocator)) {
    // Distinct namespaces also make collisions unlikely when a host moves to another document.
    const namespace = globalThis.crypto?.randomUUID?.()
      ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const value: DocumentAllocator = { namespace, next: 0, reserved: new Set() };
    Object.defineProperty(document, documentAllocator, { value });
  }
  const allocator = document[documentAllocator]!;
  const tree = container.getRootNode() as Node & Partial<Pick<Document, 'getElementById'>>;
  let prefix: string;
  do {
    prefix = `pianorealm-live-${allocator.namespace}-${++allocator.next}`;
  } while (allocator.reserved.has(prefix) || slots.some(slot => {
    const id = definitionId(prefix, slot);
    return document.getElementById(id) || tree.getElementById?.(id);
  }));
  allocator.reserved.add(prefix);
  return { prefix, release: () => { allocator.reserved.delete(prefix); } };
}

export function staticPrefix(prefix: string | undefined): string {
  if (prefix === undefined) return `pianorealm-static-${++nextStaticId}`;
  if (typeof prefix !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(prefix)) {
    throw new TypeError('SVG idPrefix must start with an ASCII letter and contain up to 64 letters, digits, hyphens or underscores');
  }
  return prefix;
}

export function definitionId(prefix: string, slot: IdSlot): string {
  return `${prefix}-${slot}`;
}

export function definitionReference(prefix: string, slot: DefinitionSlot): string {
  return `url(#${definitionId(prefix, slot)})`;
}
