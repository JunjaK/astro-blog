import { groupSpots } from './groupSpots';
import type { DiarySpot } from './types';

import './travel-map.css';

/**
 * 본문에서 지운 「방문한 곳」 목록을 spots 에서 다시 만든다 (설계 스펙 결정 6-B).
 * spots 가 SSOT 이므로 중복도 손실도 없다.
 *
 * hook 을 쓰지 않는다 — 순수 표시라 `client:*` 없이 정적 HTML 로 렌더된다.
 * 지도 아일랜드 안에 넣으면 쓸데없이 하이드레이션되고, 자기 헤딩 아래에 놓을 수도 없다.
 */
export function VisitedList({ spots, className }: { spots: DiarySpot[]; className?: string }) {
  // 목록은 항상 도시 단위 — 지도가 현 단위로 물러나도 상세는 유지한다
  const groups = groupSpots(spots, 'city');

  if (groups.length === 0) return null;

  return (
    <ul className={`tm-visited ${className ?? ''}`}>
      {groups.map((group, i) => (
        <li key={`${group.prefecture}-${group.city}-${i}`}>
          {group.prefecture} {group.city}
          <ul>
            {group.spots.map(spot => (
              <li key={spot.name}>
                {spot.mapUrl
                  ? <a href={spot.mapUrl} target="_blank" rel="noreferrer">{spot.name}</a>
                  : spot.name}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
