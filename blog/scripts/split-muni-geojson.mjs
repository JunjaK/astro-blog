// 전국 시정촌 GeoJSON → 도도부현 코드별 파일.
//
// 원본: smartnews-smri/japan-topography  data/municipality/geojson/s0001/N03-21_210101.json
//       (국토수치정보 N03 행정구역 가공본, 간소화 0.1%, 1,897 features)
// 라이선스: 상용 포함 무상. 국토교통성 「国土数値情報（行政区域データ）」 크레딧 표기 의무.
//
// 1회성 스크립트다. 결과물(public/geo/muni/*.json)만 커밋하고 원본(.tmp/)은 커밋하지 않는다.
//
//   curl -fL -o .tmp/muni-japan.json <위 URL>
//   node scripts/split-muni-geojson.mjs
import fs from 'node:fs';
import path from 'node:path';
import { geoArea } from 'd3-geo';

const SRC = '.tmp/muni-japan.json';
const OUT = 'public/geo/muni';

// 일본 일주 diary 가 지나는 도도부현만 커밋한다. 전부 필요해지면 이 Set 을 비운다.
// (히로시마34 오카야마33 오사카27 교토26 후쿠이18 이시카와17 도야마16 아이치23
//  기후21 나가노20 니이가타15 아키타05 아오모리02 도쿄13 미야기04 치바12)
const KEEP = new Set(['02', '04', '05', '12', '13', '15', '16', '17', '18', '20', '21', '23', '26', '27', '33', '34']);

// d3-geo 의 winding 규약은 GeoJSON 스펙(RFC 7946)과 **반대**다.
// 스펙은 외곽 링을 CCW 로 요구하고 원본도 그렇게 돼 있는데, d3 는 그걸 「이 폴리곤 바깥 전부」로
// 읽는다 — geoArea 가 4π(지구 전체) 로 나오고 geoPath 는 화면을 덮는 덩어리를 그린다.
//
//   高山市 as-is    geoArea 12.566 sr (= 4π)
//   高山市 reversed geoArea 0.000053 sr ≈ 2,151 km²  ← 실제 면적과 일치
//
// 런타임에 고치면 소비자(TravelMap · playground 지도 · 검증 스크립트)가 전부 기억해야 하는
// 함정이 되므로 여기서 1회 고친다. 결과 파일은 「d3 전용」이고 RFC 7946 을 따르지 않는다.
// 면적으로 판정하므로 원본 winding 이 바뀌어도 자기교정된다.
function toD3Winding(geometry) {
  if (geoArea(geometry) <= 2 * Math.PI) return geometry;

  const flip = ring => [...ring].reverse();
  const coordinates = geometry.type === 'Polygon'
    ? geometry.coordinates.map(flip)
    : geometry.coordinates.map(poly => poly.map(flip));

  return { ...geometry, coordinates };
}

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// 「所属未定地」(치바·도쿄·오키나와 3건, 매립지 경계 미확정)는 N03_007 이 null 이다.
// 그냥 버리면 도쿄만 매립지에 구멍이 남으므로, 도도부현명으로 코드를 역인용해 살린다.
const codeByPref = new Map();
for (const f of src.features) {
  const c = f.properties?.N03_007?.slice(0, 2);
  if (c && !codeByPref.has(f.properties.N03_001)) codeByPref.set(f.properties.N03_001, c);
}

const byCode = new Map();
let missing = 0;

for (const f of src.features) {
  const code = f.properties?.N03_007?.slice(0, 2) ?? codeByPref.get(f.properties?.N03_001);
  if (!code) {
    missing += 1;
    continue;
  }
  if (KEEP.size && !KEEP.has(code)) continue;
  if (!byCode.has(code)) byCode.set(code, []);
  // 렌더에 쓰지 않는 property 는 버려 용량을 줄인다
  byCode.get(code).push({
    type: 'Feature',
    properties: { name: f.properties.N03_004 ?? f.properties.N03_003 ?? '' },
    geometry: toD3Winding(f.geometry),
  });
}

if (missing) console.warn(`⚠ N03_007 없는 feature ${missing}건 — 확인 필요`);

fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const code of [...byCode.keys()].sort()) {
  const features = byCode.get(code);
  const file = path.join(OUT, `${code}.json`);
  fs.writeFileSync(file, JSON.stringify({ type: 'FeatureCollection', features }));
  const kb = fs.statSync(file).size / 1024;
  total += kb;
  console.log(`${file}  ${String(features.length).padStart(3)} features  ${kb.toFixed(0)}KB`);
}
console.log(`\n${byCode.size} files, ${total.toFixed(0)}KB total`);

const wanted = [...KEEP].filter((c) => !byCode.has(c));
if (wanted.length) console.warn(`⚠ KEEP 에 있으나 원본에 없는 코드: ${wanted.join(', ')}`);
