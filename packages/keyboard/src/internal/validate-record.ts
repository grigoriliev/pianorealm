export function validateRecord(value: unknown, fields: readonly string[], name: string): void {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError(`${name} must be an options object`);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} must be an options object`);
  }

  for (const field of Reflect.ownKeys(value)) {
    if (typeof field !== 'string' || !fields.includes(field)) {
      throw new TypeError(`Unknown ${name} field: ${String(field)}`);
    }
  }
}
