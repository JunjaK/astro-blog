import type { PolaroidImage } from '../types';

export type { PolaroidImage };

/** Deterministic pseudo-random in [0,1) so SSR and client agree. */
export function seeded(seed: number): number {
  const x = Math.sin(seed * 63.117) * 15731.743;
  return x - Math.floor(x);
}

export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Mirror the scrapbook thumb resolution so v3 can share the same MDX data. */
export function resolveThumb(item: PolaroidImage): string {
  if (typeof item.thumb === 'string') return item.thumb;
  if (item.thumb === true) return item.src.replace(/\.[^./]+$/, '-thumb.webp');
  return item.src;
}

export function wrapIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}
