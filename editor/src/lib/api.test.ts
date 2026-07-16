import { describe, expect, test } from 'bun:test';
import { createPostErrorMessage, PostApiError, publishErrorMessage, SLUG_RE } from './api';

describe('SLUG_RE — mirrors server/posts.ts SLUG_RE exactly (Contract SSOT)', () => {
  test('accepts lowercase kebab-case ascii', () => {
    expect(SLUG_RE.test('my-post-slug')).toBe(true);
    expect(SLUG_RE.test('dassai-45')).toBe(true);
    expect(SLUG_RE.test('a')).toBe(true);
  });

  test('rejects uppercase, spaces, slashes, leading/trailing dash, double dash', () => {
    expect(SLUG_RE.test('My-Post')).toBe(false);
    expect(SLUG_RE.test('my post')).toBe(false);
    expect(SLUG_RE.test('my/post')).toBe(false);
    expect(SLUG_RE.test('-my-post')).toBe(false);
    expect(SLUG_RE.test('my-post-')).toBe(false);
    expect(SLUG_RE.test('my--post')).toBe(false);
    expect(SLUG_RE.test('')).toBe(false);
  });
});

describe('createPostErrorMessage — branches by server error string/status', () => {
  test('409 (duplicate id) → duplicate-path message', () => {
    expect(createPostErrorMessage(new PostApiError(409, 'id exists'))).toBe('같은 경로의 글이 이미 있습니다');
  });

  test('400 invalid slug → slug-specific message', () => {
    expect(createPostErrorMessage(new PostApiError(400, 'invalid slug'))).toBe('슬러그(URL)를 확인하세요');
  });

  test('other server errors (e.g. 400 invalid category, 500) → generic failure message', () => {
    expect(createPostErrorMessage(new PostApiError(400, 'invalid category'))).toBe('저장 실패');
    expect(createPostErrorMessage(new PostApiError(500, 'internal error'))).toBe('저장 실패');
  });

  test('non-PostApiError (network failure etc.) → generic failure message', () => {
    expect(createPostErrorMessage(new Error('network down'))).toBe('저장 실패');
    expect(createPostErrorMessage('not even an error')).toBe('저장 실패');
  });
});

describe('publishErrorMessage — branches by status only', () => {
  test('503 (BLOG_CONTENT missing — prod/RPi) → local-only message', () => {
    expect(publishErrorMessage(new PostApiError(503, 'content dir missing'))).toBe('로컬에서만 발행 가능');
  });

  test('other statuses (404, 500) → generic failure message', () => {
    expect(publishErrorMessage(new PostApiError(404, 'not found'))).toBe('발행 실패');
    expect(publishErrorMessage(new PostApiError(500, 'boom'))).toBe('발행 실패');
  });

  test('non-PostApiError → generic failure message', () => {
    expect(publishErrorMessage(new Error('network down'))).toBe('발행 실패');
  });
});

describe('PostApiError — carries status + server error string as .message', () => {
  test('constructs with status and message', () => {
    const err = new PostApiError(409, 'id exists');
    expect(err.status).toBe(409);
    expect(err.message).toBe('id exists');
    expect(err.name).toBe('PostApiError');
  });

  test('falls back to String(status) when no message given', () => {
    const err = new PostApiError(500);
    expect(err.message).toBe('500');
  });
});
