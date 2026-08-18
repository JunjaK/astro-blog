// diarySpots 데이터와 마이그레이션된 MDX 를 검증한다.
//
//   bun scripts/check-diary-spots.ts
//
// bun 으로 돌리는 이유: 데이터가 .ts 라 앱과 **같은** groupSpots / PREFECTURES 를 그대로
// import 할 수 있다. 검증이 별도 구현을 갖게 되면 그 둘이 어긋나는 순간 검증이 거짓말을 한다.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { geoContains } from 'd3-geo';
import Slugger from 'github-slugger';

import { groupSpots } from '@/components/Blog/TravelMap/groupSpots';
import { PREFECTURES } from '@/components/Blog/TravelMap/prefectures';
import type { DiarySpot } from '@/components/Blog/TravelMap/types';

const DATA_DIR = 'src/data/diarySpots';
const DIARY_DIR = 'src/content/blog/diary/japan-around-trip';
const GEO_DIR = 'public/geo/muni';

/** 해안선이 s0001(간소화 0.1%)이라 해안 장소는 폴리곤 밖으로 떨어진다. 마쓰시마가 200m 밖이었다 */
const COAST_TOLERANCE_KM = 1.5;

const problems: string[] = [];
const fail = (where: string, message: string) => problems.push(`${where}: ${message}`);

// ─────────────────────── 지오메트리 ───────────────────────

type MuniFeature = { properties: { name: string }; geometry: { coordinates: unknown } };
type MuniCollection = { features: MuniFeature[] };

const geoCache = new Map<string, MuniCollection>();
function loadGeo(code: string) {
  let geo = geoCache.get(code);
  if (!geo) {
    geo = JSON.parse(fs.readFileSync(path.join(GEO_DIR, `${code}.json`), 'utf8')) as MuniCollection;
    geoCache.set(code, geo);
  }
  return geo;
}

/** 점에서 가장 가까운 feature 정점까지의 거리(km)와 그 feature 이름 */
function nearestVertex(geo: MuniCollection, lng: number, lat: number) {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = { name: '', km: Infinity };

  for (const feature of geo.features) {
    let min = Infinity;
    const walk = (node: unknown) => {
      if (Array.isArray(node) && typeof node[0] === 'number') {
        const d = Math.hypot((node[0] - lng) * cosLat * 111.32, ((node[1] as number) - lat) * 110.57);
        if (d < min) min = d;
        return;
      }
      if (Array.isArray(node)) node.forEach(walk);
    };
    walk(feature.geometry.coordinates);
    if (min < best.km) best = { name: feature.properties.name, km: min };
  }

  return best;
}

// ─────────────────────── 체크 8·9: 자산 ───────────────────────

const geoFiles = fs.readdirSync(GEO_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
// as const 로 좁혀진 리터럴 유니온을 넓혀둔다 — 파일명(string)과 비교하므로
const mappedCodes: string[] = Object.values(PREFECTURES).map(p => p.code);

for (const code of mappedCodes) {
  if (!geoFiles.includes(code))
    fail('자산', `PREFECTURES 에 code ${code} 가 있는데 ${GEO_DIR}/${code}.json 이 없다 (fetch 404 함정)`);
}
for (const code of geoFiles) {
  if (!mappedCodes.includes(code))
    fail('자산', `${GEO_DIR}/${code}.json 이 고아다 — PREFECTURES 에 대응 항목이 없다`);
}

// winding 회귀: 뒤집힌 폴리곤은 geoArea 가 4π 로 나오고 지도가 화면을 덮는 덩어리가 된다
const { geoArea } = await import('d3-geo');
for (const code of geoFiles) {
  const bad = loadGeo(code).features.filter(f => geoArea(f as never) > 1);
  if (bad.length > 0)
    fail('자산', `${code}.json 의 ${bad.length}개 feature 가 winding 반전 상태다 (toD3Winding 미적용)`);
}

// ─────────────────────── 편별 체크 ───────────────────────

const dataFiles = fs.readdirSync(DATA_DIR)
  .filter(f => f.endsWith('.ts') && !f.endsWith('.draft.ts'))
  .sort();

if (dataFiles.length === 0) fail('데이터', `${DATA_DIR} 에 데이터 파일이 없다`);

for (const file of dataFiles) {
  const slug = file.replace(/\.ts$/, '');
  const where = slug;
  const mod = await import(path.resolve(DATA_DIR, file)) as { spots?: DiarySpot[] };
  const spots = mod.spots;

  if (!Array.isArray(spots) || spots.length === 0) {
    fail(where, 'spots export 가 없거나 비어있다');
    continue;
  }

  // 1. 필수 필드
  for (const [i, spot] of spots.entries()) {
    if (!spot.name) fail(where, `spots[${i}] 에 name 이 없다`);
    if (!spot.city) fail(where, `spots[${i}] "${spot.name}" 에 city 가 없다`);
    if (!spot.prefecture) fail(where, `spots[${i}] "${spot.name}" 에 prefecture 가 없다`);
  }

  // 3. 도도부현이 매핑에 있는가
  for (const spot of spots) {
    if (spot.prefecture && !(spot.prefecture in PREFECTURES))
      fail(where, `"${spot.prefecture}" 는 PREFECTURES 에 없다 (원문 오타?)`);
  }

  // 2. 도시 그룹마다 좌표가 최소 1개 — 없으면 그 그룹이 지도에서 조용히 사라진다
  for (const group of groupSpots(spots, 'city')) {
    const hasCoords = group.spots.some(s => s.lat !== undefined && s.lng !== undefined);
    if (!hasCoords)
      fail(where, `도시 그룹 "${group.prefecture} ${group.city}" 에 좌표가 하나도 없다 — 지도에서 빠진다`);
  }

  // 4. 좌표가 해당 도도부현 안인가 (해안 허용오차 포함)
  for (const spot of spots) {
    if (spot.lat === undefined || spot.lng === undefined) continue;
    const entry = PREFECTURES[spot.prefecture];
    if (!entry) continue;

    const geo = loadGeo(entry.code);
    if (geo.features.some(f => geoContains(f as never, [spot.lng!, spot.lat!]))) continue;

    const near = nearestVertex(geo, spot.lng, spot.lat);
    if (near.km <= COAST_TOLERANCE_KM) continue;

    fail(where, `"${spot.name}" 좌표(${spot.lat}, ${spot.lng})가 ${spot.prefecture} 밖이다 `
      + `— 가장 가까운 경계 ${near.name} ${near.km.toFixed(2)}km`);
  }

  // 5·6. MDX 대조
  const mdxPath = path.join(DIARY_DIR, `${slug}.mdx`);
  if (!fs.existsSync(mdxPath)) {
    fail(where, `대응 MDX 가 없다 (${mdxPath})`);
    continue;
  }
  const mdx = fs.readFileSync(mdxPath, 'utf8');

  if (!mdx.includes(`@/data/diarySpots/${slug}`)) fail(where, 'MDX 가 spots 를 import 하지 않는다');
  if (!mdx.includes('<TravelMap')) fail(where, 'MDX 에 <TravelMap> 이 없다');
  if (!mdx.includes('<VisitedList')) fail(where, 'MDX 에 <VisitedList> 가 없다');

  // heading id 는 Astro 가 github-slugger 로 붙인다. 규칙을 흉내내지 말고 같은 라이브러리를 쓴다.
  const slugger = new Slugger();
  const ids = new Set(
    mdx.split('\n')
      .map(line => line.match(/^#{1,6}\s+(.*?)\s*$/)?.[1])
      .filter((t): t is string => Boolean(t))
      .map(text => slugger.slug(text)),
  );

  for (const spot of spots) {
    if (spot.anchor && !ids.has(spot.anchor))
      fail(where, `anchor "#${spot.anchor}" ("${spot.name}") 에 대응하는 헤딩이 MDX 에 없다`);
  }
}

// ─────────────────────── 리포트 ───────────────────────

console.log(`검사: 데이터 ${dataFiles.length}편, GeoJSON ${geoFiles.length}개`);

if (problems.length === 0) {
  console.log('✓ 문제 없음');
  process.exit(0);
}

console.error(`\n✗ ${problems.length}건`);
for (const problem of problems) console.error('  ' + problem);
process.exit(1);
