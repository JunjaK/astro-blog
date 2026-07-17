import { describe, expect, test } from 'bun:test';
import { buttonVariants } from './button';

// claude design "Editor Redesign" superseded the earlier 44px WCAG floor with a denser,
// viewport-responsive height driven by --tap (38px desktop / 36px mobile, set in
// styles-custom.css's :root media query) — a deliberate single-user-tool density tradeoff
// the user confirmed explicitly, not a regression of the prior floor.
describe('buttonVariants — --tap responsive height (claude design)', () => {
  test('default size uses --tap', () => {
    expect(buttonVariants({ size: 'default' })).toContain('h-(--tap)');
  });

  test('sm size uses --tap (design has no separate small text-button height)', () => {
    expect(buttonVariants({ size: 'sm' })).toContain('h-(--tap)');
  });

  test('lg size uses --tap', () => {
    expect(buttonVariants({ size: 'lg' })).toContain('h-(--tap)');
  });

  test('xs stays a fixed small size — not tied to --tap', () => {
    expect(buttonVariants({ size: 'xs' })).not.toContain('h-(--tap)');
  });

  test('icon sizes stay square — no --tap (would deform dialog close / calendar arrows)', () => {
    for (const size of ['icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const) {
      expect(buttonVariants({ size })).not.toContain('--tap');
    }
  });
});
