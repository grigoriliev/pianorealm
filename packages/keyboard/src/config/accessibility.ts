import { validateXmlText } from '../internal/xml-text.js';
import { validateRecord } from '../internal/validate-record.js';

export interface AccessibilityOptions {
  readonly label?: string | undefined;
  readonly description?: string | undefined;
  readonly decorative?: boolean | undefined;
}

export const defaultAccessibility: AccessibilityOptions = Object.freeze({});

export function normalizeAccessibility(
  patch: AccessibilityOptions | undefined, previous: AccessibilityOptions,
): AccessibilityOptions {
  if (patch === undefined) return defaultAccessibility;
  validateRecord(patch, ['label', 'description', 'decorative'], 'accessibility');
  const merged = { ...previous, ...patch };
  for (const field of ['label', 'description'] as const) {
    const text = merged[field];
    if (text === undefined) continue;
    if (typeof text !== 'string' || !text.trim()) {
      throw new TypeError(`Accessibility ${field} must be non-empty text`);
    }
    validateXmlText(text);
  }
  if (merged.decorative !== undefined && typeof merged.decorative !== 'boolean') {
    throw new TypeError('Accessibility decorative must be a boolean');
  }
  return Object.freeze(merged);
}
