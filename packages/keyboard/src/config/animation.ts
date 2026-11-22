import { validateRecord } from '../internal/validate-record.js';

const EASINGS = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'] as const;
export type AnimationEasing = typeof EASINGS[number];

export interface AnimationOptions {
  readonly enabled?: boolean | undefined;
  /** Transition duration in milliseconds, from 0 through 1000. */
  readonly duration?: number | undefined;
  readonly easing?: AnimationEasing | undefined;
}

export interface ResolvedAnimation {
  readonly enabled: boolean;
  readonly duration: number;
  readonly easing: AnimationEasing;
}

const EMPTY_ANIMATION = Object.freeze({});

export function normalizeAnimation(
  options: AnimationOptions | undefined, previous: AnimationOptions,
): AnimationOptions {
  if (options === undefined) return EMPTY_ANIMATION;
  validateRecord(options, ['enabled', 'duration', 'easing'], 'animation');
  const merged = { ...previous, ...options };
  const { enabled, duration, easing } = merged;
  if (enabled !== undefined && typeof enabled !== 'boolean') {
    throw new TypeError('Animation enabled must be a boolean');
  }
  if (duration !== undefined) {
    if (typeof duration !== 'number') throw new TypeError('Animation duration must be a number');
    if (!Number.isFinite(duration) || duration < 0 || duration > 1000) {
      throw new RangeError('Animation duration must be between 0 and 1000 ms');
    }
  }
  if (easing !== undefined && !EASINGS.includes(easing)) {
    throw new TypeError('Unsupported animation easing');
  }
  return Object.freeze(merged);
}

export function resolveAnimation(skin: string, options: AnimationOptions): ResolvedAnimation {
  const classic = skin === 'classic';
  return Object.freeze({
    enabled: options.enabled ?? true,
    duration: options.duration ?? (classic ? 160 : skin === 'modern' ? 150 : 120),
    easing: options.easing ?? (classic ? 'ease-in-out' : 'ease-out'),
  });
}
