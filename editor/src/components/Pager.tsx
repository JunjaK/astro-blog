import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface Page<T> {
  visible: T[];
  remaining: number;
}

// pure slicing math, kept separate from useState so it's testable without a React renderer.
export function computePage<T>(items: T[], visibleCount: number): Page<T> {
  return { visible: items.slice(0, visibleCount), remaining: Math.max(0, items.length - visibleCount) };
}

export interface PagerState<T> {
  visible: T[];
  remaining: number;
  more: () => void;
  reset: () => void;
}

export function usePager<T>(items: T[], pageSize = 30): PagerState<T> {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const { visible, remaining } = computePage(items, visibleCount);
  const more = () => setVisibleCount((count) => count + pageSize);
  const reset = () => setVisibleCount(pageSize);
  return { visible, remaining, more, reset };
}

export function Pager({ remaining, onMore }: { remaining: number; onMore: () => void }) {
  if (remaining <= 0) return null;
  return (
    <div className="sakes-more">
      <Button type="button" variant="secondary" onClick={onMore} data-testid="pager-more-button">
        더 보기 <span className="pager-more__count">{`(${remaining}개 남음)`}</span>
      </Button>
    </div>
  );
}
