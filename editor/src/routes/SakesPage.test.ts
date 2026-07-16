import { describe, expect, test } from 'bun:test';
import { isSakeKind } from './SakesPage';

// invalid/missing `:kind` must redirect to /sakes/sake (route-based edit rework) — gate function
// kept pure + exported so the redirect condition is testable without a router harness.
describe('isSakeKind — /sakes/:kind param gate', () => {
  test('accepts the three known kinds', () => {
    expect(isSakeKind('sake')).toBe(true);
    expect(isSakeKind('brand')).toBe(true);
    expect(isSakeKind('brewery')).toBe(true);
  });

  test('rejects unknown kind', () => {
    expect(isSakeKind('nope')).toBe(false);
  });

  test('rejects undefined (param missing)', () => {
    expect(isSakeKind(undefined)).toBe(false);
  });
});
