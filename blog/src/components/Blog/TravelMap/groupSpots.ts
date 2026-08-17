import type { DiarySpot } from './types';

/** 묶는 단위. 지도 배경의 입도와 맞춘다 — 현 실루엣을 그리는 날은 마커도 현 단위다 */
export type GroupLevel = 'city' | 'prefecture';

export type SpotGroup = {
  /** 지도 라벨 겸 툴팁 제목. level 에 따라 도시명 또는 도도부현명 */
  label: string;
  city: string;
  prefecture: string;
  spots: DiarySpot[];
  /** 좌표를 가진 장소들의 중심 — 지도 마커 위치. 하나도 없으면 null 이라 지도에 못 찍는다 */
  lat: number | null;
  lng: number | null;
};

/** 지도에 찍을 수 있는 그룹. lat/lng 가 확정된 것만 통과한다 */
export type PlottableGroup = SpotGroup & { lat: number; lng: number };

export function isPlottable(group: SpotGroup): group is PlottableGroup {
  return group.lat !== null && group.lng !== null;
}

/**
 * 연속된 같은 단위를 한 그룹으로 묶는다. 지도 마커와 「방문한 곳」 목록이 같은 계산을 쓴다.
 *
 * **연속** 구간만 묶는 이유: 하루에 같은 도시를 두 번 들르면 그것도 동선이므로 순서를
 * 유지해야 지도의 번호와 목록이 어긋나지 않는다.
 *
 * 장소 단위로 마커를 찍지 않는 이유: 도도부현 축척에서 전부 겹친다(실측 — 장소 10곳이
 * 유니크 픽셀 7곳, 육안 구분은 3개. 보이지 않는데 Tab 으로는 포커스되는 접근성 결함).
 *
 * level='prefecture' 는 2개 이상 현에 걸친 날에 쓴다. 그 축척(수백 km)에서는 도시조차
 * 겹치기 때문이다 — 24_12-20 의 아사쿠사·시부야·신주쿠가 700km 축척에서 한 점이 됐다.
 * 도쿄만 특수처리하지 않고 배경 입도(현 실루엣)에 마커 입도를 맞추는 쪽으로 일반화했다.
 */
export function groupSpots(spots: DiarySpot[], level: GroupLevel = 'city'): SpotGroup[] {
  const groups: SpotGroup[] = [];
  const sameGroup = (group: SpotGroup, spot: DiarySpot) => (
    level === 'prefecture'
      ? group.prefecture === spot.prefecture
      : group.prefecture === spot.prefecture && group.city === spot.city
  );

  for (const spot of spots) {
    const last = groups.at(-1);
    if (last && sameGroup(last, spot)) {
      last.spots.push(spot);
      continue;
    }
    groups.push({
      label: level === 'prefecture' ? spot.prefecture : spot.city,
      city: spot.city,
      prefecture: spot.prefecture,
      spots: [spot],
      lat: null,
      lng: null,
    });
  }

  for (const group of groups) {
    const located = group.spots.filter(spot => spot.lat !== undefined && spot.lng !== undefined);
    if (located.length === 0) continue;

    group.lat = located.reduce((sum, spot) => sum + spot.lat!, 0) / located.length;
    group.lng = located.reduce((sum, spot) => sum + spot.lng!, 0) / located.length;
  }

  return groups;
}

/** 그룹 안에서 처음 만나는 anchor. 마커를 클릭했을 때 갈 곳이다. */
export function groupAnchor(group: SpotGroup) {
  return group.spots.find(spot => spot.anchor)?.anchor;
}
