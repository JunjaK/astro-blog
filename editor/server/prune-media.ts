// Orphan report for uploaded media (MEDIA_DIR ← /files/media).
//
//   bun run prune:media                       # dry run — prints what WOULD go, deletes nothing
//   bun run prune:media -- --apply            # moves orphans into MEDIA_DIR/.trash/<stamp>/
//   bun run prune:media -- --days 30          # grace period (default 14, from file mtime)
//   bun run prune:media -- --inventory f.tsv --out orphans.txt
//                                             # report on a REMOTE listing (see /prune-media);
//                                             # never deletes — the move is the operator's step
//
// Deleting media is the only destructive operation in this codebase, and it is only as safe as
// the reference set is complete. Every source below is mandatory: if one can't be read the script
// ABORTS rather than reporting the files it couldn't find references for. An image uploaded but
// not yet saved has no references at all, which is what the grace period is for.
//
// --apply moves to trash, never unlinks: an over-broad reference miss stays recoverable.
import { readdir, stat, mkdir, rename, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { db } from './db';
import { IMG_URL_RE, variantBase, variantNames } from './images';

const MEDIA_DIR = process.env.MEDIA_DIR ?? './.media';
const BLOG_SRC = process.env.BLOG_SRC ?? '../blog/src';
const TRASH = join(MEDIA_DIR, '.trash');

const args = process.argv.slice(2);
const flag = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const inventoryFile = flag('--inventory'); // remote listing instead of scanning MEDIA_DIR
const outFile = flag('--out'); // orphan filenames (base + variants), one per line
const apply = args.includes('--apply');
const graceDays = Number(flag('--days')) || 14;

const fail = (msg: string): never => {
  console.error(`중단: ${msg}`);
  console.error('참조 소스를 하나라도 읽지 못하면 살아있는 이미지를 고아로 오판합니다.');
  process.exit(1);
};

/** Every /files/** filename mentioned in `text`, normalised to its base (variants → original). */
export function referencedNames(text: string): string[] {
  return [...text.matchAll(IMG_URL_RE)].map((m) => variantBase(basename(m[0])));
}

export interface MediaFile { name: string; bytes: number; mtimeMs: number }

/** `name\tbytes\tmtime-epoch-seconds` per line — what `find -printf '%f\t%s\t%T@\n'` emits. */
export function parseInventory(tsv: string): MediaFile[] {
  return tsv.split('\n').filter(Boolean).map((line) => {
    const [name, bytes, mtime] = line.split('\t');
    if (!name || !bytes || !mtime) fail(`인벤토리 형식 오류: ${JSON.stringify(line)}`);
    return { name, bytes: Number(bytes), mtimeMs: Number(mtime) * 1000 };
  });
}

async function readAll(dir: string, pattern: string): Promise<{ files: number; text: string }> {
  const parts: string[] = [];
  let files = 0;
  for await (const rel of new Bun.Glob(pattern).scan({ cwd: dir, onlyFiles: true })) {
    parts.push(await Bun.file(join(dir, rel)).text());
    files++;
  }
  return { files, text: parts.join('\n') };
}

async function collectReferences(): Promise<Set<string>> {
  const refs = new Set<string>();
  const add = (text: string) => referencedNames(text).forEach((n) => refs.add(n));

  // 1+2. editor DB — body AND frontmatter (thumbnail lives only in frontmatter). A torn copy of a
  // live DB would silently shrink the reference set, so refuse anything but a clean file.
  const ok = (db.query('PRAGMA integrity_check').get() as Record<string, string> | null);
  if (Object.values(ok ?? {})[0] !== 'ok') fail(`DB 무결성 검사 실패 (${process.env.DB_PATH ?? './.data/blog.db'})`);
  const rows = db.query('SELECT body, frontmatter FROM posts').all() as { body: string | null; frontmatter: string | null }[];
  for (const r of rows) add(`${r.body ?? ''}\n${r.frontmatter ?? ''}`);

  // 3. published / hand-written content — posts that never went through the editor live only here.
  if (!(await stat(join(BLOG_SRC, 'content')).catch(() => null))?.isDirectory())
    fail(`블로그 콘텐츠를 찾을 수 없습니다: ${join(BLOG_SRC, 'content')} (BLOG_SRC 로 지정)`);
  const content = await readAll(join(BLOG_SRC, 'content'), '**/*.{md,mdx}');
  if (content.files === 0) fail(`${join(BLOG_SRC, 'content')} 에 md/mdx 가 하나도 없습니다`);
  add(content.text);

  // 4. blog source — og images, default thumbnails, anything hardcoding a /files URL.
  const code = await readAll(BLOG_SRC, '**/*.{astro,ts,tsx,js,jsx,mjs,vue,svelte,json,yml,yaml,css,scss}');
  add(code.text);

  console.log(`참조 스캔: DB ${rows.length}건 · 콘텐츠 ${content.files}개 · 소스 ${code.files}개 → 참조 이미지 ${refs.size}개`);
  return refs;
}

/** Files in MEDIA_DIR (local) or in the supplied listing (remote), with their sizes. */
async function inventory(): Promise<{ all: Map<string, MediaFile>; source: string }> {
  if (inventoryFile) {
    const files = parseInventory(await Bun.file(inventoryFile).text());
    if (!files.length) fail(`인벤토리가 비어 있습니다: ${inventoryFile}`);
    return { all: new Map(files.map((f) => [f.name, f])), source: `인벤토리 ${inventoryFile}` };
  }
  if (!(await stat(MEDIA_DIR).catch(() => null))?.isDirectory()) fail(`미디어 디렉터리가 없습니다: ${MEDIA_DIR}`);
  const out = new Map<string, MediaFile>();
  for (const e of await readdir(MEDIA_DIR, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    const st = await stat(join(MEDIA_DIR, e.name));
    out.set(e.name, { name: e.name, bytes: st.size, mtimeMs: st.mtimeMs });
  }
  return { all: out, source: MEDIA_DIR };
}

async function main() {
  if (apply && inventoryFile) fail('--inventory 는 원격 리포트 전용입니다 (삭제는 운영자가 직접)');
  const { all, source } = await inventory();
  const refs = await collectReferences();

  // Originals only. Variants follow whatever happens to their base.
  const originals = [...all.values()].filter((f) => /\.(webp|png|jpe?g)$/i.test(f.name) && variantBase(f.name) === f.name);

  const cutoff = Date.now() - graceDays * 86_400_000;
  const orphans: { name: string; bytes: number; mtime: Date }[] = [];
  let referenced = 0;
  let tooYoung = 0;

  for (const f of originals) {
    if (refs.has(f.name)) { referenced++; continue; }
    if (f.mtimeMs > cutoff) { tooYoung++; continue; } // may be mid-edit, not yet saved anywhere
    const bytes = variantNames(f.name).reduce((s, v) => s + (all.get(v)?.bytes ?? 0), f.bytes);
    orphans.push({ name: f.name, bytes, mtime: new Date(f.mtimeMs) });
  }

  const mb = (n: number) => `${(n / 1_048_576).toFixed(2)} MB`;
  console.log(`대상: ${source}`);
  console.log(`\n원본 ${originals.length}개 = 참조됨 ${referenced} + 유예중 ${tooYoung}(${graceDays}일) + 고아 ${orphans.length}`);
  if (originals.length !== referenced + tooYoung + orphans.length) fail('집계가 맞지 않습니다');
  if (!orphans.length) { console.log('정리할 파일이 없습니다.'); return; }

  orphans.sort((a, b) => b.bytes - a.bytes);
  for (const o of orphans) console.log(`  ${o.name}  ${mb(o.bytes).padStart(9)}  ${o.mtime.toISOString().slice(0, 10)}`);
  console.log(`합계 ${orphans.length}개 · ${mb(orphans.reduce((s, o) => s + o.bytes, 0))} (변형 포함)`);

  if (outFile) {
    // base + only the variants that actually exist → the move step can't fail on a missing file
    const names = orphans.flatMap((o) => [o.name, ...variantNames(o.name).filter((v) => all.has(v))]);
    await writeFile(outFile, `${names.join('\n')}\n`);
    console.log(`\n파일 목록 ${names.length}줄 → ${outFile}`);
  }
  if (!apply) {
    console.log('\n드라이런입니다 — 목록을 확인한 뒤 --apply(로컬) 또는 /prune-media(운영) 로 진행하세요.');
    return;
  }
  const dest = join(TRASH, new Date().toISOString().replace(/[:.]/g, '-'));
  await mkdir(dest, { recursive: true });
  let moved = 0;
  for (const o of orphans) {
    for (const f of [o.name, ...variantNames(o.name)]) {
      if (await rename(join(MEDIA_DIR, f), join(dest, f)).then(() => true, () => false)) moved++;
    }
    db.run('DELETE FROM images WHERE path = ?', [`/files/media/${o.name}`]);
  }
  console.log(`\n${moved}개 파일을 ${dest} 로 옮겼습니다. 문제 없으면 이 디렉터리를 삭제하세요.`);
}

if (import.meta.main) await main(); // importable by the test without running the report
