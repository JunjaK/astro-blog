import type { DiarySpot } from '@/components/Blog/TravelMap';

// 2024-12-10 — 다카야마 아침시장 → 히다 후루카와 → 히라유. 순서는 본문 「방문한 곳」 순.
//
// 좌표 출처 (전부 d3-geo geoContains 로 해당 시정촌 폴리곤 안에 있는지 확인함)
//   [저자]   저자가 직접 확인해 전달
//   [구글맵] 본문의 maps.app.goo.gl 단축 URL → scripts/resolve-map-urls.mjs (!3d!4d = 장소 정확 좌표)
//   [OSM]    Nominatim 조회. 일본어 명칭으로 찾고 결과의 주소·시정촌까지 대조했다
//
// 미확인 3곳은 주석으로 빼뒀다 — OSM 에 없고 본문에도 링크가 없다.
// 자리채우기 좌표는 넣지 않는다. 좌표가 생기면 주석을 풀면 되고, 위치가 방문 순서다.
//
// 원문 표기 차이: '미야가와 아침시장' → '다카야마 아침시장', '사쿠라 기념품 가게' → '사쿠라 물산관' (저자 정정)
export const spots: DiarySpot[] = [
  { name: '다카야마 아침시장', lat: 36.144704, lng: 137.2553717, city: '다카야마시', prefecture: '기후현' }, // [저자]

  { name: '시라카베 도죠가이', lat: 36.2346589, lng: 137.1846933, city: '히다후루카와시', prefecture: '기후현' }, // [저자]
  { name: '사쿠라 물산관', lat: 36.2386305, lng: 137.1835898, city: '히다후루카와시', prefecture: '기후현' }, // [저자]
  { name: '치요노마츠바라 공원', lat: 36.2320239, lng: 137.1835787, city: '히다후루카와시', prefecture: '기후현' }, // [OSM] 千代の松原公園
  { name: '아지도코로 후루카와', lat: 36.2357531, lng: 137.1852145, city: '히다후루카와시', prefecture: '기후현', mapUrl: 'https://maps.app.goo.gl/2s9GN7SjSA6RD8bDA' }, // [구글맵]
  // { name: '키타 공원', lat: ?, lng: ?, city: '히다후루카와시', prefecture: '기후현' },  ← 미확인. 北公園 으로 OSM 검색 실패
  { name: '케타와카미야 신사', lat: 36.2392502, lng: 137.1976293, city: '히다후루카와시', prefecture: '기후현' }, // [OSM] 気多若宮神社

  // { name: '히라유 신사', lat: ?, lng: ?, city: '오쿠히다 온센고 히라유', prefecture: '기후현' },  ← 미확인. 平湯神社 가 OSM 에 없음
  { name: '히라유 민속 박물관', lat: 36.1917699, lng: 137.5546927, city: '오쿠히다 온센고 히라유', prefecture: '기후현' }, // [OSM] 平湯民俗館
  { name: '히라유 노 유', lat: 36.1917482, lng: 137.554904, city: '오쿠히다 온센고 히라유', prefecture: '기후현' }, // [OSM] 平湯の湯
  // { name: '히라유 온센 아시유', lat: ?, lng: ?, city: '오쿠히다 온센고 히라유', prefecture: '기후현' },  ← 미확인. 足湯 검색 결과 없음
  { name: '카페 머스타체', lat: 36.1915519, lng: 137.5526242, city: '오쿠히다 온센고 히라유', prefecture: '기후현', mapUrl: 'https://maps.app.goo.gl/W8yyABrbZY4Q5X276' }, // [구글맵]
  { name: '라멘 사카바 야도라기', lat: 36.1921251, lng: 137.5524092, city: '오쿠히다 온센고 히라유', prefecture: '기후현', mapUrl: 'https://maps.app.goo.gl/34rMjTb9obrqvU5m9' }, // [구글맵]
];
