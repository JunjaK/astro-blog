import type { DiarySpot } from '@/components/Blog/TravelMap';

// scripts/resolve-map-urls.mjs 14_12-10 로 생성한 초안.
// 좌표가 0 인 항목은 아직 미확인이다 — 사람이 채운다. anchor 도 사람이 붙인다.
export const spots: DiarySpot[] = [
  { name: '미야가와 아침시장', lat: 0, lng: 0, city: '다카야마시', prefecture: '기후현' },  // TODO 좌표 — 사람이 확인해 채울 것
  { name: '시라카베 도죠가이', lat: 0, lng: 0, city: '히다후루카와시', prefecture: '기후현' },  // TODO 좌표 — 사람이 확인해 채울 것
  { name: '사쿠라 기념품 가게', lat: 0, lng: 0, city: '히다후루카와시', prefecture: '기후현' },  // TODO 좌표 — 사람이 확인해 채울 것
  { name: '치요노마츠바라 공원', lat: 0, lng: 0, city: '히다후루카와시', prefecture: '기후현' },  // TODO 좌표 — 사람이 확인해 채울 것
  { name: '아지도코로 후루카와', lat: 36.2357531, lng: 137.1852145, city: '히다후루카와시', prefecture: '기후현', mapUrl: 'https://maps.app.goo.gl/2s9GN7SjSA6RD8bDA' },
  { name: '키타 공원, 케타와카미야 신사', lat: 0, lng: 0, city: '히다후루카와시', prefecture: '기후현' },  // TODO 좌표 — 사람이 확인해 채울 것
  { name: '히라유 신사', lat: 0, lng: 0, city: '오쿠히다 온센고 히라유', prefecture: '기후현' },  // TODO 좌표 — 사람이 확인해 채울 것
  { name: '히라유 민속 박물관', lat: 0, lng: 0, city: '오쿠히다 온센고 히라유', prefecture: '기후현' },  // TODO 좌표 — 사람이 확인해 채울 것
  { name: '히라유 노 유', lat: 0, lng: 0, city: '오쿠히다 온센고 히라유', prefecture: '기후현' },  // TODO 좌표 — 사람이 확인해 채울 것
  { name: '히라유 온센 아시유', lat: 0, lng: 0, city: '오쿠히다 온센고 히라유', prefecture: '기후현' },  // TODO 좌표 — 사람이 확인해 채울 것
  { name: '카페 머스타체', lat: 36.1915519, lng: 137.5526242, city: '오쿠히다 온센고 히라유', prefecture: '기후현', mapUrl: 'https://maps.app.goo.gl/W8yyABrbZY4Q5X276' },
  { name: '라멘 사카바 야도라기', lat: 36.1921251, lng: 137.5524092, city: '오쿠히다 온센고 히라유', prefecture: '기후현', mapUrl: 'https://maps.app.goo.gl/34rMjTb9obrqvU5m9' },
];
