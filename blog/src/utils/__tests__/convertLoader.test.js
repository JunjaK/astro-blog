import { describe, expect, it } from 'vitest';
import { convertFrontmatterThumb, convertToImageLoader, convertToVideoLoader } from '../convertLoader.js';

const FILE_PATH = 'src/content/blog/diary/japan-around-trip/26_12-22.mdx';
const CONV_PREFIX = '/files/blog/diary/japan-around-trip';

describe('convertToImageLoader', () => {
  it('converts relative assets/ path to ImageLoader', () => {
    const input = '![photo](assets/photo.webp)';
    const result = convertToImageLoader(input, FILE_PATH);
    expect(result).toBe(`<ImageLoader src="${CONV_PREFIX}/assets/photo.webp" alt="photo" />`);
  });

  it('converts relative ./assets/ path to ImageLoader', () => {
    const input = '![photo](./assets/photo.webp)';
    const result = convertToImageLoader(input, FILE_PATH);
    expect(result).toBe(`<ImageLoader src="${CONV_PREFIX}/assets/photo.webp" alt="photo" />`);
  });

  it('preserves absolute /files/ path as-is (no empty src)', () => {
    const input = '![루트](/files/blog/diary/japan-around-trip/assets/CleanShot.png)';
    const result = convertToImageLoader(input, FILE_PATH);
    expect(result).toBe(input);
    expect(result).not.toContain('src=""');
  });

  it('preserves external URL as-is', () => {
    const input = '![ext](https://example.com/img.png)';
    const result = convertToImageLoader(input, FILE_PATH);
    expect(result).toBe(input);
  });

  it('handles multiple images in one input', () => {
    const input = [
      '![a](assets/a.webp)',
      '![b](/files/blog/existing.png)',
      '![c](./assets/c.webp)',
    ].join('\n');
    const result = convertToImageLoader(input, FILE_PATH);
    expect(result).toContain(`<ImageLoader src="${CONV_PREFIX}/assets/a.webp" alt="a" />`);
    expect(result).toContain('![b](/files/blog/existing.png)');
    expect(result).toContain(`<ImageLoader src="${CONV_PREFIX}/assets/c.webp" alt="c" />`);
    expect(result).not.toContain('src=""');
  });
});

describe('convertToVideoLoader', () => {
  it('converts relative assets/ video to VideoLoader', () => {
    const input = '<video src="assets/video.mp4"></video>';
    const result = convertToVideoLoader(input, FILE_PATH);
    expect(result).toBe(`<VideoLoader src="${CONV_PREFIX}/assets/video.mp4" />`);
  });

  it('converts relative ./assets/ video to VideoLoader', () => {
    const input = '<video src="./assets/video.mp4"></video>';
    const result = convertToVideoLoader(input, FILE_PATH);
    expect(result).toBe(`<VideoLoader src="${CONV_PREFIX}/assets/video.mp4" />`);
  });

  it('preserves absolute /files/ video path as-is', () => {
    const input = '<video src="/files/blog/diary/video.mp4"></video>';
    const result = convertToVideoLoader(input, FILE_PATH);
    expect(result).toBe(input);
    expect(result).not.toContain('src=""');
  });
});

describe('convertFrontmatterThumb', () => {
  it('converts relative assets/ thumbnail', () => {
    const input = 'thumbnail: assets/thumb.webp';
    const result = convertFrontmatterThumb(input, FILE_PATH);
    expect(result).toBe(`thumbnail: ${CONV_PREFIX}/assets/thumb.webp`);
  });

  it('converts relative ./assets/ thumbnail', () => {
    const input = 'thumbnail: ./assets/thumb.webp';
    const result = convertFrontmatterThumb(input, FILE_PATH);
    expect(result).toBe(`thumbnail: ${CONV_PREFIX}/assets/thumb.webp`);
  });

  it('preserves absolute /files/ thumbnail as-is', () => {
    const input = 'thumbnail: /files/blog/diary/thumb-thumb.webp';
    const result = convertFrontmatterThumb(input, FILE_PATH);
    expect(result).toBe(input);
  });
});
