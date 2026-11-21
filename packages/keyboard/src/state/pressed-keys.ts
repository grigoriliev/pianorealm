/** Holds canonical MIDI notes independently of the displayed range. */
export class PressedKeys {
  #notes = new Set<number>();

  has(note: number): boolean {
    return this.#notes.has(note);
  }

  press(note: number): boolean {
    if (this.#notes.has(note)) return false;
    this.#notes.add(note);
    return true;
  }

  release(note: number): boolean {
    return this.#notes.delete(note);
  }

  /** Replace with validated notes and return only the changed MIDI identities. */
  replace(notes: ReadonlySet<number>): number[] {
    const changed: number[] = [];
    for (const note of this.#notes) {
      if (!notes.has(note)) changed.push(note);
    }
    for (const note of notes) {
      if (!this.#notes.has(note)) changed.push(note);
    }
    if (changed.length > 0) this.#notes = new Set(notes);
    return changed;
  }

  snapshot(): number[] {
    return [...this.#notes].sort((a, b) => a - b);
  }
}
