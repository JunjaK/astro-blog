import type { DiarySpot } from '@/components/Blog/TravelMap';

// 2024-12-20 — 아오모리시 → 도쿄(아사쿠사 → 시부야 → 신주쿠).
// 원문이 도쿄의 지구를 상위 항목으로 두고 있어 그대로 도시 그룹이 된다.
export const spots: DiarySpot[] = [
  { name: '우토우 신사', lat: 40.8266592, lng: 140.7427279, city: '아오모리시', prefecture: '아오모리현', anchor: '아오모리-아침--우토우-신사-재방문' }, // [OSM] 善知鳥神社
  { name: '나가오 츄카소바 아오모리 에키마에', city: '아오모리시', prefecture: '아오모리현', anchor: '나가오-츄카소바' },

  { name: '센소지', lat: 35.7134032, lng: 139.7955265, city: '아사쿠사', prefecture: '도쿄도', anchor: '아사쿠사-센소지' }, // [OSM] 浅草寺
  { name: '산짱 요코쵸 홋피거리점', city: '아사쿠사', prefecture: '도쿄도', anchor: '홋피-거리--아사쿠사-지하' },

  { name: '스크럼블', lat: 35.6594951, lng: 139.7004982, city: '시부야', prefecture: '도쿄도', anchor: '시부야-스크럼블' }, // [OSM] 渋谷スクランブル交差点
  { name: '츠타야', city: '시부야', prefecture: '도쿄도', anchor: '시부야-츠타야' },

  { name: '하나조노 신사', lat: 35.6933128, lng: 139.7057555, city: '신주쿠', prefecture: '도쿄도', anchor: '신주쿠--하나조노-신사--골든가이' }, // [OSM] 花園神社
  { name: '골든가이 (BAR COO, 5Gallons)', city: '신주쿠', prefecture: '도쿄도' },
];
