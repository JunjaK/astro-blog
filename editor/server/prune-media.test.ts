import { describe, expect, test } from 'bun:test';
import { isVariant, variantBase, variantNames } from './images';
import { parseInventory, referencedNames } from './prune-media';

describe('variantBase', () => {
  test('변형 접미사를 원본으로 되돌린다', () => {
    expect(variantBase('a1b2.webp')).toBe('a1b2.webp');
    expect(variantBase('a1b2-480.webp')).toBe('a1b2.webp');
    expect(variantBase('a1b2-960.webp')).toBe('a1b2.webp');
    expect(variantBase('a1b2-1600.webp')).toBe('a1b2.webp');
    expect(variantBase('a1b2-thumb.webp')).toBe('a1b2.webp');
  });

  test('우리 접미사가 아닌 이름은 원본으로 취급 (isVariant 와 동일 규칙)', () => {
    for (const n of ['photo-2.webp', 'photo-4096.webp', 'photo-960.png']) {
      expect(variantBase(n)).toBe(n);
      expect(isVariant(n)).toBe(false);
    }
  });
});

test('variantNames 는 서버가 실제로 쓰는 3종을 돌려준다', () => {
  expect(variantNames('a1b2.webp')).toEqual(['a1b2-480.webp', 'a1b2-960.webp', 'a1b2-1600.webp']);
});

describe('referencedNames', () => {
  test('MDX 본문 · 프론트매터 thumbnail · srcset 변형을 모두 원본 이름으로 모은다', () => {
    const doc = [
      '---',
      'thumbnail: /files/media/thumb1.webp',
      '---',
      '<ImageLoader src="/files/media/body1.webp" alt="x" />',
      '![md](/files/blog/legacy2.png)',
      '<img srcset="/files/media/body2-480.webp 480w, /files/media/body2-960.webp 960w">',
    ].join('\n');
    expect(new Set(referencedNames(doc))).toEqual(
      new Set(['thumb1.webp', 'body1.webp', 'legacy2.png', 'body2.webp']),
    );
  });

  test('참조가 없으면 빈 배열 — 오탐으로 지우지 않도록 정확히 0건', () => {
    expect(referencedNames('그냥 텍스트 /files 아님 image.webp')).toEqual([]);
  });
});

test("parseInventory 는 find -printf '%f\\t%s\\t%T@' 출력을 그대로 읽는다", () => {
  expect(parseInventory('a.webp\t1024\t1750000000.1234\nb-480.webp\t512\t1750000001\n')).toEqual([
    { name: 'a.webp', bytes: 1024, mtimeMs: 1750000000123.4 },
    { name: 'b-480.webp', bytes: 512, mtimeMs: 1750000001000 },
  ]);
});
