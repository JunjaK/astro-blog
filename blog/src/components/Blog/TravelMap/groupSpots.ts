import type { DiarySpot } from './types';

export type SpotGroup = {
  city: string;
  prefecture: string;
  spots: DiarySpot[];
  /** 그룹 중심 — 지도 마커 좌표 */
  lat: number;
  lng: number;
};

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
      groups.push({ city: spot.city, prefecture: spot.prefecture, spots: [spot], lat: 0, lng: 0 });
  }

  for (const group of groups) {
    group.lat = group.spots.reduce((sum, spot) => sum + spot.lat, 0) / group.spots.length;
    group.lng = group.spots.reduce((sum, spot) => sum + spot.lng, 0) / group.spots.length;
  }

  return groups;
}

/** 그룹 안에서 처음 만나는 anchor. 도시 마커를 클릭했을 때 갈 곳이다. */
export function groupAnchor(group: SpotGroup) {
  return group.spots.find(spot => spot.anchor)?.anchor;
}
