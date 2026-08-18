import type { DiarySpot } from '@/components/Blog/TravelMap';

// 2024-12-22 — 우에노에서 센다이로 이동, 닛카 미야기쿄 증류소.
// 원문 정정: 「미야기현 센다이 시」 → 센다이시 (다른 편의 표기와 통일)
export const spots: DiarySpot[] = [
  { name: '센다이역', lat: 38.2597526, lng: 140.8800249, city: '센다이시', prefecture: '미야기현', anchor: '우에노역에서-센다이' }, // [OSM] 仙台駅
  { name: '오야도 노노 (숙소)', city: '센다이시', prefecture: '미야기현' },
  { name: '닛카 미야기쿄 증류소', city: '센다이시', prefecture: '미야기현', anchor: '닛카-미야기쿄-증류소-도착' },
  { name: '스시 요시카네', city: '센다이시', prefecture: '미야기현', anchor: '스시-요시카네---사키즈케--스이모노' },
];
