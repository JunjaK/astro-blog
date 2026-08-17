// 한글 표기 → { 행정구역코드 2자리, 일본어 표기 }.
//
// code 는 public/geo/muni/{code}.json 파일명이다 (scripts/split-muni-geojson.mjs 산출물).
// ja 는 이 기능에서는 쓰지 않지만, 후속 japan-trip-map 의 전국 도도부현 레이어가
// GeoJSON 의 N03_001(일본어)과 이름 매칭을 해야 해서 같이 둔다 — 매핑을 두 벌 만들지 않는다.
//
// 여기 있는 이름은 반드시 public/geo/muni/{code}.json 이 커밋돼 있어야 한다 (현재 16곳, 일치).
// 쓰지도 않을 현을 미리 넣으면 타입은 통과하는데 fetch 가 404 나는 함정이 생긴다.
// 새 현이 필요하면 split-muni-geojson.mjs 의 KEEP 에 코드를 넣고 재실행한 뒤 여기 한 줄 추가한다.
//
// 원문 `방문한 곳` 에는 `이시키와현` 같은 오타가 4건 있는데, 여기 없는 이름은 타입 에러로 걸린다.
export const PREFECTURES = {
  아오모리현: { code: '02', ja: '青森県' },
  미야기현: { code: '04', ja: '宮城県' },
  아키타현: { code: '05', ja: '秋田県' },
  치바현: { code: '12', ja: '千葉県' },
  도쿄도: { code: '13', ja: '東京都' },
  니이가타현: { code: '15', ja: '新潟県' },
  도야마현: { code: '16', ja: '富山県' },
  이시카와현: { code: '17', ja: '石川県' },
  후쿠이현: { code: '18', ja: '福井県' },
  나가노현: { code: '20', ja: '長野県' },
  기후현: { code: '21', ja: '岐阜県' },
  아이치현: { code: '23', ja: '愛知県' },
  교토부: { code: '26', ja: '京都府' },
  오사카부: { code: '27', ja: '大阪府' },
  오카야마현: { code: '33', ja: '岡山県' },
  히로시마현: { code: '34', ja: '広島県' },
} as const;

export type PrefectureName = keyof typeof PREFECTURES;

/** 중복을 제거한 행정구역코드 목록. 한 편이 여러 현을 지나면 그만큼 GeoJSON 을 받는다. */
export function prefectureCodes(names: readonly PrefectureName[]) {
  return [...new Set(names.map(name => PREFECTURES[name].code))];
}
