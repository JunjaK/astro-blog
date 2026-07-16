import { describe, expect, test } from 'bun:test';
import { buttonVariants } from './button';

// mobile(<640px) tap-target floor: text buttons must be >=44px tall on phones,
// but square icon buttons (dialog close / calendar arrows) must stay square.
describe('buttonVariants — mobile tap-target floor (min-h-11 sm:min-h-0)', () => {
  test('default size carries the floor', () => {
    expect(buttonVariants({ size: 'default' })).toContain('min-h-11 sm:min-h-0');
  });

  test('xs size carries the floor', () => {
    expect(buttonVariants({ size: 'xs' })).toContain('min-h-11 sm:min-h-0');
  });

  test('sm size carries the floor', () => {
    expect(buttonVariants({ size: 'sm' })).toContain('min-h-11 sm:min-h-0');
  });

  test('lg size carries the floor', () => {
    expect(buttonVariants({ size: 'lg' })).toContain('min-h-11 sm:min-h-0');
  });

  test('icon sizes stay square — no height floor (would deform dialog close / calendar arrows)', () => {
    for (const size of ['icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const) {
      expect(buttonVariants({ size })).not.toContain('min-h-11');
    }
  });
});
