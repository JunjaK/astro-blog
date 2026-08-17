import type { PrefectureName } from './prefectures';

export type DiarySpot = {
  name: string;
  lat: number;
  lng: number;
  /** 도시/구역. 예: '다카야마시'. 「방문한 곳」 목록의 그룹 키이자 후속 playground 의 집계 키 */
  city: string;
  /** 배경 GeoJSON 선택과 좌표 검증(point-in-polygon)의 근거 */
  prefecture: PrefectureName;
  description?: string;
  /** 본문 헤딩 id. 대응되는 헤딩이 없으면 생략한다 — 클릭이 무동작이 된다 */
  anchor?: string;
  /** 원문 `방문한 곳` 에 있던 구글맵 단축 URL. 목록 렌더에서 링크로 살린다 */
  mapUrl?: string;
};

export type TravelMapProps = {
  spots: DiarySpot[];
  /** 대체 대상이던 구글맵 스크린샷. <details> 안에 보존한다 */
  originalImageSrc?: string;
  className?: string;
};
