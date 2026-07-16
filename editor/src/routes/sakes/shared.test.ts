import { describe, expect, test } from 'bun:test';
import { countLabel } from './shared';

// countLabel replaces the old inline `{list.data ? `(${items.length})` : ''}` header count —
// now must also show the filtered/total split once a search is applied (Phase 2 보정 3).
describe('countLabel — panel header count text', () => {
  test('not yet loaded (list.data undefined) — shows nothing', () => {
    expect(countLabel(false, 0, 0, false)).toBe('');
  });

  test('loaded, no applied query — shows total only', () => {
    expect(countLabel(true, 42, 42, false)).toBe('(42)');
  });

  test('loaded, applied query active — shows filtered/total', () => {
    expect(countLabel(true, 78, 3, true)).toBe('(3/78)');
  });

  test('loaded, applied query active but matches everything — still shows the split form', () => {
    expect(countLabel(true, 5, 5, true)).toBe('(5/5)');
  });
});
