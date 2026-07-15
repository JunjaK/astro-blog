import { randomBytes } from 'node:crypto';
import { db } from './db';
import { PREFECTURES } from './prefectures';

// 蔵元 마스터 시드. data/breweries-seed.json = 리뷰된 SSOT, 이 스크립트는 그걸 DB에 반영만 한다.
// 재실행 가능(name_norm 기준 find → UPDATE / INSERT). Run: bun run seed:breweries
//
// COALESCE 가 아니라 명시적 UPDATE 인 이유: 이건 큐레이션된 마스터라 자기가 주는 필드에 대해
// authoritative 하다. COALESCE 면 기존의 잘못된 값(예: prefecture 에 주소가 통째로 들어간 행)을
// 영원히 못 고친다. 대신 seed 가 주지 않는 필드는 건드리지 않는다.

interface SeedBrewery {
  name: string;
  yomigana: string | null;
  prefecture: string;
  address: string | null;
  brands: string[]; // 代表銘柄. 브랜드 요미가나는 조사 안 했으므로 null 로 들어간다(환각 금지)
  officialUrl: string | null;
}

const SEED = process.env.BREWERY_SEED ?? `${import.meta.dir}/data/breweries-seed.json`;
const newId = () => randomBytes(6).toString('base64url');
const normalizeName = (s: string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const now = () => new Date().toISOString();

// note 엔 공식 URL 만 남긴다 — 代表銘柄는 이제 문자열이 아니라 brands 행이다.
const buildNote = (b: SeedBrewery): string | null => b.officialUrl ?? null;

const file = await Bun.file(SEED).json() as { breweries: SeedBrewery[] };
const rows = file.breweries;

// ── 투입 전 게이트: 하나라도 걸리면 아무것도 쓰지 않는다 ──
// 잘못된 prefecture 는 조용히 죽는다(47개 옵션에 없으면 Select 가 빈칸으로 렌더 → 다음 저장 때 소실).
// 그래서 부분 투입을 허용하지 않고 전량 거부한다.
const valid = new Set<string>(PREFECTURES);
const problems: string[] = [];
const seen = new Map<string, string>();

for (const b of rows) {
  if (!normalizeName(b.name ?? '')) problems.push(`name 없음: ${JSON.stringify(b)}`);
  if (!valid.has(b.prefecture)) problems.push(`${b.name}: prefecture 「${b.prefecture}」 는 47 도도부현에 없음`);
  if (b.yomigana && !/^[぀-ゟー ]+$/.test(b.yomigana)) {
    problems.push(`${b.name}: yomigana 「${b.yomigana}」 가 히라가나가 아님`);
  }
  // breweries.name_norm 은 UNIQUE — 중복이 있으면 INSERT 가 던지거나 앞 행을 덮어쓴다.
  const norm = normalizeName(b.name ?? '');
  const dup = seen.get(norm);
  if (dup) problems.push(`name_norm 중복: 「${b.name}」 ↔ 「${dup}」`);
  else seen.set(norm, b.name);

  // brands: UNIQUE(brewery_id, name_norm) 이므로 한 蔵元 안에서 중복이면 INSERT 가 던진다.
  if (!Array.isArray(b.brands)) problems.push(`${b.name}: brands 가 배열이 아님`);
  else {
    const bs = new Set<string>();
    for (const n of b.brands) {
      const bn = normalizeName(n ?? '');
      if (!bn) problems.push(`${b.name}: 빈 브랜드명`);
      else if (bs.has(bn)) problems.push(`${b.name}: 브랜드 중복 「${n}」`);
      else bs.add(bn);
    }
  }
}

if (problems.length) {
  console.error(`시드 거부 — ${problems.length}건:`);
  for (const p of problems) console.error(`  · ${p}`);
  process.exit(1);
}

// ── 반영 (한 트랜잭션: 전량 성공 아니면 전량 롤백) ──
const apply = db.transaction((list: SeedBrewery[]) => {
  let inserted = 0;
  let updated = 0;
  let brandsAdded = 0;
  for (const b of list) {
    const name = b.name.trim();
    const norm = normalizeName(name);
    const note = buildNote(b);
    const hit = db.query('SELECT id FROM breweries WHERE name_norm = ?').get(norm) as { id: string } | null;
    let breweryId: string;
    if (hit) {
      breweryId = hit.id;
      db.run(
        'UPDATE breweries SET name = ?, yomigana = ?, prefecture = ?, address = ?, note = ?, updated_at = ? WHERE id = ?',
        [name, b.yomigana ?? null, b.prefecture, b.address ?? null, note, now(), breweryId],
      );
      updated++;
    } else {
      breweryId = newId();
      const t = now();
      db.run(
        `INSERT INTO breweries (id, name, name_norm, yomigana, prefecture, address, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [breweryId, name, norm, b.yomigana ?? null, b.prefecture, b.address ?? null, note, t, t],
      );
      inserted++;
    }

    // 브랜드는 name 만 authoritative. yomigana 는 건드리지 않는다 — 조사한 적이 없어서 시드가 줄 게
    // 없고, 사용자/AI 가 나중에 채운 읽기를 재실행 때 null 로 덮으면 안 된다.
    for (const bn of b.brands) {
      const bname = bn.trim();
      const bnorm = normalizeName(bname);
      const bhit = db.query('SELECT id FROM brands WHERE brewery_id = ? AND name_norm = ?')
        .get(breweryId, bnorm) as { id: string } | null;
      if (bhit) {
        db.run('UPDATE brands SET name = ?, updated_at = ? WHERE id = ?', [bname, now(), bhit.id]);
      } else {
        const t = now();
        db.run(
          'INSERT INTO brands (id, name, name_norm, yomigana, brewery_id, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?)',
          [newId(), bname, bnorm, breweryId, t, t],
        );
        brandsAdded++;
      }
    }
  }
  return { inserted, updated, brandsAdded };
});

const { inserted, updated, brandsAdded } = apply(rows);
const total = db.query('SELECT count(*) AS c FROM breweries').get() as { c: number };
const byPref = db.query(
  'SELECT prefecture, count(*) AS c FROM breweries GROUP BY prefecture ORDER BY c DESC',
).all() as { prefecture: string | null; c: number }[];

const brandTotal = db.query('SELECT count(*) AS c FROM brands').get() as { c: number };
console.log(`seeded breweries — inserted ${inserted} · updated ${updated} · total ${total.c}`);
console.log(`         brands — added ${brandsAdded} · total ${brandTotal.c}`);
for (const r of byPref) console.log(`  ${r.prefecture ?? '(미지정)'}: ${r.c}`);

// 시드는 절대 지우지 않는다(사용자가 에디터에서 직접 넣은 蔵元을 날리면 안 되므로). 그 대가로
// 데이터 파일에서 항목을 빼도 DB엔 유령이 남는다 → 조용한 괴리 대신 이름을 찍어 보고만 한다.
const known = new Set(rows.map((b) => normalizeName(b.name)));
const strays = (db.query('SELECT name, prefecture FROM breweries').all() as { name: string; prefecture: string | null }[])
  .filter((r) => !known.has(normalizeName(r.name)));
if (strays.length) {
  console.log(`\n시드 목록에 없는 기존 행 ${strays.length}건 (지우지 않음 — 확인 후 직접 처리):`);
  for (const s of strays) console.log(`  · ${s.name} (${s.prefecture ?? '미지정'})`);
}
