import { describe, expect, test } from 'bun:test';
import { IMPORTS, isManagedImport, manageImports, segmentMdx } from './mdx';

// CANONICAL serialize wiring re-emitted by TastingNoteCardNode.serialize (plan SSOT).
// All props are frontmatter.X — the body node is a fieldless positional marker.
const TASTING_CANONICAL = `<TastingNoteCard
  drinkKind={frontmatter.drinkKind}
  brewery={frontmatter.brewery}
  prefecture={frontmatter.prefecture}
  tokuteiMeisho={frontmatter.tokuteiMeisho}
  riceType={frontmatter.riceType}
  seimaiBuai={frontmatter.seimaiBuai}
  alcohol={frontmatter.alcohol}
  nihonshuDo={frontmatter.nihonshuDo}
  sando={frontmatter.sando}
  amakara={frontmatter.amakara}
  noutan={frontmatter.noutan}
  flavorTags={frontmatter.flavorTags}
/>`;

const MUSIC_CANONICAL = `<MusicCard
  appleMusicUrl={frontmatter.appleMusicUrl}
  youtubeMusicUrl={frontmatter.youtubeMusicUrl}
  artist={frontmatter.artist}
  album={frontmatter.album}
  releaseYear={frontmatter.releaseYear}
/>`;

describe('segmentMdx — TastingNoteCard', () => {
  test('models a fully-wired <TastingNoteCard .../> as a fieldless marker', () => {
    const segs = segmentMdx(TASTING_CANONICAL);
    expect(segs).toHaveLength(1);
    expect(segs[0].kind).toBe('raw');
    expect(segs[0].node).toEqual({ name: 'TastingNoteCard' });
    // byte-preserved slice of the original source
    expect(segs[0].src).toBe(TASTING_CANONICAL);
  });

  test('models a bare <TastingNoteCard /> too (fieldless marker, attrs irrelevant)', () => {
    const segs = segmentMdx('<TastingNoteCard />');
    expect(segs).toHaveLength(1);
    expect(segs[0].node).toEqual({ name: 'TastingNoteCard' });
  });

  test('lifts a TastingNoteCard sandwiched between prose without merging it into md runs', () => {
    const body = `# 시음 노트\n\n어느 날의 한 잔.\n\n${TASTING_CANONICAL}\n\n맛있었다.`;
    const segs = segmentMdx(body);
    const marker = segs.find((s) => s.node?.name === 'TastingNoteCard');
    expect(marker).toBeDefined();
    expect(marker?.kind).toBe('raw');
    // prose on both sides survives as md segments
    expect(segs.some((s) => s.kind === 'md' && s.src.includes('한 잔'))).toBe(true);
    expect(segs.some((s) => s.kind === 'md' && s.src.includes('맛있었다'))).toBe(true);
  });
});

describe('manageImports — TastingNoteCard', () => {
  test('IMPORTS entry matches the plan contract path byte-for-byte', () => {
    expect(IMPORTS.TastingNoteCard).toBe(
      "import TastingNoteCard from '@/components/Blog/TastingNote/TastingNoteCard.astro';",
    );
  });

  test('injects the TastingNoteCard import exactly once when the component is used', () => {
    const out = manageImports(TASTING_CANONICAL);
    expect(out.startsWith(IMPORTS.TastingNoteCard)).toBe(true);
    const occurrences = out.split(IMPORTS.TastingNoteCard).length - 1;
    expect(occurrences).toBe(1);
  });

  test('does NOT inject the import when the component is absent', () => {
    const out = manageImports('# Hello\n\nplain prose, no cards.');
    expect(out).not.toContain('TastingNoteCard');
  });

  test('strips a stale managed TastingNoteCard import when the component is gone', () => {
    const body = `${IMPORTS.TastingNoteCard}\n\n# no component here`;
    const out = manageImports(body);
    expect(out).not.toContain('TastingNoteCard');
  });

  test('isManagedImport recognizes the TastingNoteCard import line', () => {
    expect(isManagedImport(IMPORTS.TastingNoteCard)).toBe(true);
  });
});

describe('MusicCard regression (same lift/import code path)', () => {
  test('still models <MusicCard .../> as a fieldless marker', () => {
    const segs = segmentMdx(MUSIC_CANONICAL);
    expect(segs).toHaveLength(1);
    expect(segs[0].node).toEqual({ name: 'MusicCard' });
  });

  test('still injects the MusicCard import when used, not when absent', () => {
    expect(manageImports(MUSIC_CANONICAL)).toContain(IMPORTS.MusicCard);
    expect(manageImports('# prose only')).not.toContain(IMPORTS.MusicCard);
  });
});
