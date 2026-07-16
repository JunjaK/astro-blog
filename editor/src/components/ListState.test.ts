import { describe, expect, test } from 'bun:test';
import { ListState } from './ListState';

interface ElementLike {
  props: Record<string, unknown>;
}

const base = { isLoading: false, isError: false, total: 0, shown: 0, emptyText: '아직 없습니다.', query: '' };

describe('ListState — loading/error/whole-empty/search-empty branches (extracted from SakesPage)', () => {
  test('loading wins over every other state', () => {
    const el = ListState({ ...base, isLoading: true, isError: true, total: 5, shown: 5, query: 'x' }) as unknown as ElementLike;
    expect(el.props.children).toBe('불러오는 중…');
  });

  test('error wins over the empty states', () => {
    const el = ListState({ ...base, isError: true, total: 5, shown: 5 }) as unknown as ElementLike;
    expect(el.props.children).toBe('목록을 불러오지 못했습니다.');
  });

  test('whole-list empty (data-empty) shows the caller-provided emptyText', () => {
    const el = ListState({ ...base, emptyText: '사케가 없습니다.' }) as unknown as ElementLike;
    expect(el.props['data-empty']).toBe(true);
    expect(el.props.children).toBe('사케가 없습니다.');
  });

  test('search-empty (data-search-empty) when total>0 but the filtered result is 0', () => {
    const el = ListState({ ...base, total: 12, shown: 0, query: '獺祭' }) as unknown as ElementLike;
    expect(el.props['data-search-empty']).toBe(true);
    expect(el.props.children).toBe("'獺祭' 검색 결과가 없습니다.");
  });

  test('renders nothing once the list has visible rows', () => {
    expect(ListState({ ...base, total: 12, shown: 12 })).toBeUndefined();
  });
});
