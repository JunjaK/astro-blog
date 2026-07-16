import { describe, expect, test } from 'bun:test';
import { computePage, Pager } from './Pager';

interface ElementLike {
  type: unknown;
  props: Record<string, unknown>;
}

describe('computePage', () => {
  test('happy path — slices to visibleCount, reports the rest as remaining', () => {
    const items = Array.from({ length: 78 }, (_, i) => i);
    const { visible, remaining } = computePage(items, 30);
    expect(visible).toHaveLength(30);
    expect(visible[0]).toBe(0);
    expect(visible[29]).toBe(29);
    expect(remaining).toBe(48);
  });

  test('edge — visibleCount already covers every item, remaining clamps to 0', () => {
    expect(computePage([1, 2, 3], 30)).toEqual({ visible: [1, 2, 3], remaining: 0 });
  });

  test('edge — empty list', () => {
    expect(computePage([], 30)).toEqual({ visible: [], remaining: 0 });
  });
});

describe('Pager component', () => {
  test('renders nothing once every item is already visible (remaining <= 0)', () => {
    expect(Pager({ remaining: 0, onMore: () => {} })).toBeNull();
    expect(Pager({ remaining: -1, onMore: () => {} })).toBeNull();
  });

  test('renders a 더 보기 button carrying the remaining count, testid, and click handler', () => {
    const onMore = () => {};
    const el = Pager({ remaining: 48, onMore }) as unknown as ElementLike;
    expect(el.props.className).toBe('sakes-more');
    const button = el.props.children as ElementLike;
    expect(button.props.variant).toBe('outline');
    expect(button.props['data-testid']).toBe('pager-more-button');
    expect(button.props.onClick).toBe(onMore);
    expect(JSON.stringify(button.props.children)).toContain('48');
  });
});
