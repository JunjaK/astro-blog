import type { ReactNode } from 'react';

// extracted verbatim from routes/SakesPage.tsx (formerly module-private) so PostsPage can
// reuse the same loading/error/whole-empty/search-empty branching — SakesPage now imports
// this shared component instead of keeping its own copy.
// 빈 상태 구분: data-empty(전량 0) ≠ data-search-empty(검색 결과 0). 로딩/에러 우선.
export function ListState({ isLoading, isError, total, shown, emptyText, query }: {
  isLoading: boolean;
  isError: boolean;
  total: number;
  shown: number;
  emptyText: string;
  query: string;
}): ReactNode {
  if (isLoading) return <p className="muted sakes-empty">불러오는 중…</p>;
  if (isError) return <p className="muted sakes-empty">목록을 불러오지 못했습니다.</p>;
  if (total === 0) return <p className="muted sakes-empty" data-empty>{emptyText}</p>;
  if (shown === 0) return <p className="muted sakes-empty" data-search-empty>{`'${query}' 검색 결과가 없습니다.`}</p>;
}
