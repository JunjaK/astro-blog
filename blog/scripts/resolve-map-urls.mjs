// diary 본문의 「방문한 곳」 을 파싱해 src/data/diarySpots/{slug}.ts 초안을 만든다.
//
//   node scripts/resolve-map-urls.mjs 14_12-10          # 초안 생성 (네트워크 사용)
//   node scripts/resolve-map-urls.mjs 14_12-10 --dry-run # 파싱 결과만 출력
//   node scripts/resolve-map-urls.mjs --all --dry-run    # 27편 파싱 커버리지 리포트
//
// 좌표는 「구글맵 단축 URL 이 붙은 항목」만 자동으로 채운다. 나머지는 lat/lng 0 으로
// 남기고 사람이 채운다 — 좌표를 추론하거나 생성하지 않는다. 0 은 검증 스크립트가 잡는다.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DIARY_DIR = 'src/content/blog/diary/japan-around-trip';
const OUT_DIR = 'src/data/diarySpots';
const SHORT_URL = /https:\/\/maps\.app\.goo\.gl\/\S+/;
const REQUEST_GAP_MS = 1200;

// ─────────────────────────────── 파싱 ───────────────────────────────

/** 「방문한 곳」 섹션을 헤딩 레벨 무관으로 잘라낸다. 02_11-28 만 `##` 라 `###` 로 좁히면 통째로 놓친다. */
function sliceSection(markdown) {
  const lines = markdown.split('\n');
  const start = lines.findIndex(line => /^#+\s*방문한 곳/.test(line));
  if (start === -1) return null;

  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => /^#{1,6}\s/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).map(line => line.replace(/\s+$/, ''));
}

/**
 * 세 가지 표기를 모두 받는다.
 *   ① 중첩:   `- {현} {시}` + `  - {장소} [url]`   (3단 이상은 2단으로 눌러 담는다)
 *   ② 인라인: `- {현} {시} — {A}, {B}, {C}`
 *   ③ 혼합
 */
function parseSection(lines) {
  const groups = [];
  const notes = [];

  for (const line of lines) {
    const bullet = line.match(/^(\s*)-\s+(.*)$/);
    if (!bullet) continue;

    const indent = bullet[1].length;
    const text = bullet[2].trim();
    if (!text) continue;

    if (indent === 0) {
      const [head, inline] = text.split(/\s+—\s+/, 2);
      const tokens = head.trim().split(/\s+/);
      const prefecture = tokens[0] ?? '';
      const city = tokens.slice(1).join(' ');

      if (tokens.length < 2) notes.push(`도도부현/도시 분리 불가: "${head}"`);

      const group = { prefecture, city, spots: [] };
      groups.push(group);

      // 인라인 표기는 `—` 뒤가 쉼표 구분 목록이라는 뜻이므로 여기서만 쉼표로 나눈다
      if (inline) {
        for (const piece of inline.split(',')) {
          const name = piece.trim();
          if (name) group.spots.push({ name, mapUrl: null });
        }
      }
      continue;
    }

    const group = groups.at(-1);
    if (!group) {
      notes.push(`상위 항목 없이 등장한 하위 항목: "${text}"`);
      continue;
    }

    const url = text.match(SHORT_URL)?.[0] ?? null;
    const name = text.replace(SHORT_URL, '').trim().replace(/[\s,]+$/, '');
    if (!name) continue;

    // 중첩 불릿 안의 쉼표는 자동으로 나누지 않는다 — 가게 이름에 쉼표가 들어갈 수 있다.
    // 사람이 판단하도록 표시만 남긴다.
    if (name.includes(',')) notes.push(`쉼표 포함 (사람이 나눌 것): "${name}"`);
    if (indent >= 4) notes.push(`3단 이상 중첩을 2단으로 눌러 담음: "${name}"`);

    group.spots.push({ name, mapUrl: url });
  }

  return { groups, notes };
}

// ─────────────────────────── 좌표 해석 ───────────────────────────

/** 단축 URL 의 리다이렉트를 따라가 좌표를 뽑는다. 못 뽑으면 null — 추측하지 않는다. */
async function resolveCoords(shortUrl) {
  const res = await fetch(shortUrl, {
    redirect: 'follow',
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
  });

  const url = res.url ?? '';
  // !3d!4d 가 장소의 정확한 좌표, @lat,lng 는 지도 중심이다. 앞을 우선한다.
  const precise = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (precise) return { lat: +precise[1], lng: +precise[2], source: '!3d!4d' };

  const center = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (center) return { lat: +center[1], lng: +center[2], source: '@center' };

  const body = await res.text();
  const embedded = body.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
  if (embedded) return { lat: +embedded[1], lng: +embedded[2], source: 'body' };

  return null;
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─────────────────────────── 출력 ───────────────────────────

const quote = value => `'${String(value).replace(/'/g, "\\'")}'`;

function renderFile(slug, groups) {
  const rows = groups.flatMap(group => group.spots.map((spot) => {
    const fields = [
      `name: ${quote(spot.name)}`,
      `lat: ${spot.lat ?? 0}`,
      `lng: ${spot.lng ?? 0}`,
      `city: ${quote(group.city)}`,
      `prefecture: ${quote(group.prefecture)}`,
    ];
    if (spot.mapUrl) fields.push(`mapUrl: ${quote(spot.mapUrl)}`);

    const todo = spot.lat ? '' : '  // TODO 좌표 — 사람이 확인해 채울 것';
    return `  { ${fields.join(', ')} },${todo}`;
  }));

  return `import type { DiarySpot } from '@/components/Blog/TravelMap';

// scripts/resolve-map-urls.mjs ${slug} 로 생성한 초안.
// 좌표가 0 인 항목은 아직 미확인이다 — 사람이 채운다. anchor 도 사람이 붙인다.
export const spots: DiarySpot[] = [
${rows.join('\n')}
];
`;
}

// ─────────────────────────── 실행 ───────────────────────────

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const slugs = all
  ? fs.readdirSync(DIARY_DIR).filter(f => f.endsWith('.mdx')).map(f => f.replace(/\.mdx$/, '')).sort()
  : args.filter(a => !a.startsWith('--'));

if (slugs.length === 0) {
  console.error('사용법: node scripts/resolve-map-urls.mjs <slug> [--dry-run] | --all --dry-run');
  process.exit(1);
}

let totalSpots = 0;
let totalUrls = 0;
let totalResolved = 0;

for (const slug of slugs) {
  const file = path.join(DIARY_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) {
    console.error(`✗ ${slug}: 파일 없음 (${file})`);
    continue;
  }

  const section = sliceSection(fs.readFileSync(file, 'utf8'));
  if (!section) {
    console.log(`- ${slug}: 「방문한 곳」 섹션 없음 (01_intro 는 정상)`);
    continue;
  }

  const { groups, notes } = parseSection(section);
  const spots = groups.flatMap(g => g.spots);
  const withUrl = spots.filter(s => s.mapUrl);
  totalSpots += spots.length;
  totalUrls += withUrl.length;

  console.log(`\n■ ${slug} — 도시 ${groups.length}, 장소 ${spots.length}, URL ${withUrl.length}`);
  for (const group of groups)
    console.log(`  ${group.prefecture} ${group.city}: ${group.spots.map(s => s.name).join(' / ')}`);
  for (const note of notes) console.log(`  ⚠ ${note}`);

  if (dryRun) continue;

  for (const spot of withUrl) {
    try {
      const coords = await resolveCoords(spot.mapUrl);
      if (coords) {
        spot.lat = coords.lat;
        spot.lng = coords.lng;
        totalResolved += 1;
        console.log(`  ✓ ${spot.name} → ${coords.lat}, ${coords.lng} (${coords.source})`);
      }
      else {
        console.log(`  ✗ ${spot.name} → 좌표를 찾지 못함. 사람이 채울 것`);
      }
    }
    catch (error) {
      console.log(`  ✗ ${spot.name} → 요청 실패: ${error.message}`);
    }
    await sleep(REQUEST_GAP_MS);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const target = path.join(OUT_DIR, `${slug}.ts`);
  // 사람이 채운 좌표를 절대 덮지 않는다
  const out = fs.existsSync(target) ? path.join(OUT_DIR, `${slug}.draft.ts`) : target;
  fs.writeFileSync(out, renderFile(slug, groups));
  console.log(`  → ${out}`);
}

console.log(`\n합계: 장소 ${totalSpots}, URL ${totalUrls}${dryRun ? '' : `, 좌표 해석 ${totalResolved}`}`);
