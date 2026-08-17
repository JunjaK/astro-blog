import type { PrefectureName } from './prefectures';

export type DiarySpot = {
  name: string;
  /**
   * 좌표는 선택이다. 지도 마커는 **도시 그룹** 단위로 찍히고 그 좌표는 그룹에 속한
   * 장소들의 중심점이므로, 그룹마다 대표 장소 하나만 있으면 지도가 성립한다.
   * 장소 단위로 전수 조사하는 것은 지금 아무도 쓰지 않는 데이터를 모으는 일이다.
   * 나중에 더 채우면 중심점이 그만큼 정밀해진다.
   */
  lat?: number;
  lng?: number;
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
