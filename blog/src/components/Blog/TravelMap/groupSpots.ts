import type { DiarySpot } from './types';

export type SpotGroup = {
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
 * 연속된 같은 도시를 한 그룹으로 묶는다. 지도 마커와 「방문한 곳」 목록이 같은 계산을 쓴다.
 *
 * 도시로 합치지 않고 **연속** 구간만 묶는 이유: 하루에 같은 도시를 두 번 들르면 그것도
 * 동선이므로 순서를 유지해야 지도의 번호와 목록이 어긋나지 않는다.
 *
 * 마커를 장소 단위로 찍으면 도도부현 축척에서 전부 겹친다(실측: 10곳이 유니크 위치 7곳,
 * 육안 구분은 3개). 그래서 지도는 도시 단위로 찍고 상세 장소는 목록이 담당한다.
 */
export function groupSpotsByCity(spots: DiarySpot[]): SpotGroup[] {
  const groups: SpotGroup[] = [];

  for (const spot of spots) {
    const last = groups.at(-1);
    if (last && last.city === spot.city && last.prefecture === spot.prefecture)
      last.spots.push(spot);
    else
      groups.push({ city: spot.city, prefecture: spot.prefecture, spots: [spot], lat: null, lng: null });
  }

  for (const group of groups) {
    const located = group.spots.filter(spot => spot.lat !== undefined && spot.lng !== undefined);
    if (located.length === 0) continue;

    group.lat = located.reduce((sum, spot) => sum + spot.lat!, 0) / located.length;
    group.lng = located.reduce((sum, spot) => sum + spot.lng!, 0) / located.length;
  }

  return groups;
}

/** 그룹 안에서 처음 만나는 anchor. 도시 마커를 클릭했을 때 갈 곳이다. */
export function groupAnchor(group: SpotGroup) {
  return group.spots.find(spot => spot.anchor)?.anchor;
}
