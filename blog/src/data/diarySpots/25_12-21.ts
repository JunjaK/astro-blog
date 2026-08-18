import type { DiarySpot } from '@/components/Blog/TravelMap';

// 2024-12-21 — 도쿄 시내: 아사쿠사 → 아키하바라 → 나카메구로 → 아자부다이 힐즈 → 신바시.
//
// 구조 정정 (저자 확인): 원문은 「도쿄도 도쿄」 하나 아래에 지구를 하위 항목으로 두고 있어
// 그대로 두면 도쿄 한복판에 마커가 1개만 찍히고 그날 동선이 지도에 안 나타난다.
// 24_12-20 은 지구가 상위 항목이므로, 그 구조에 맞춰 지구를 도시 그룹으로 올렸다.
export const spots: DiarySpot[] = [
  { name: '아사쿠사', lat: 35.7134032, lng: 139.7955265, city: '아사쿠사', prefecture: '도쿄도', anchor: '아사쿠사' }, // [OSM] 浅草寺

  { name: '간다 신사', lat: 35.6988944, lng: 139.7740416, city: '아키하바라', prefecture: '도쿄도', anchor: '간다-신사' }, // [OSM] 秋葉原駅
  { name: '아키하바라 거리', city: '아키하바라', prefecture: '도쿄도', anchor: '아키하바라' },

  { name: '스게카리 공원', lat: 35.644021, lng: 139.6997313, city: '나카메구로', prefecture: '도쿄도', anchor: '나카메구로' }, // [OSM] 中目黒駅
  { name: '사이고우야마 공원', city: '나카메구로', prefecture: '도쿄도' },
  { name: '스타벅스 리저브', city: '나카메구로', prefecture: '도쿄도', anchor: '스타벅스-리저브-로스터리' },

  { name: '아자부다이 힐즈', lat: 35.6614747, lng: 139.7408267, city: '아자부다이 힐즈', prefecture: '도쿄도', anchor: '아자부다이-힐즈' }, // [OSM] 麻布台ヒルズ

  { name: '타바코 천국', lat: 35.6660175, lng: 139.7601297, city: '신바시', prefecture: '도쿄도' }, // [OSM] 新橋駅
  { name: '카니지고쿠', city: '신바시', prefecture: '도쿄도', anchor: '카니지고쿠' },
];
