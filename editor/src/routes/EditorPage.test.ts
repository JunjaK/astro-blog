import { describe, expect, test } from 'bun:test';
import { canSaveNewPost } from './EditorPage';

const valid = { title: '제목', category: 'Web', created: '2026-07-17' };

describe('canSaveNewPost — gates the NewPost 저장 button (mirrors server/posts.ts required-field + slug checks)', () => {
  test('happy path — all fields present + slug matches SLUG_RE', () => {
    expect(canSaveNewPost(valid, 'my-post-slug')).toBe(true);
  });

  test('edge — title is only whitespace', () => {
    expect(canSaveNewPost({ ...valid, title: '   ' }, 'my-post-slug')).toBe(false);
  });

  test('edge — category missing', () => {
    expect(canSaveNewPost({ ...valid, category: '' }, 'my-post-slug')).toBe(false);
  });

  test('edge — created missing', () => {
    expect(canSaveNewPost({ ...valid, created: '' }, 'my-post-slug')).toBe(false);
  });

  test('error — slug fails SLUG_RE (uppercase, spaces, empty)', () => {
    expect(canSaveNewPost(valid, 'My Post')).toBe(false);
    expect(canSaveNewPost(valid, '')).toBe(false);
    expect(canSaveNewPost(valid, '-leading-dash')).toBe(false);
  });
});
