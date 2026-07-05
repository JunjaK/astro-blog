import { describe, expect, it } from 'bun:test';
import { stripNulls } from './index';

// stripNulls is the AI-autofill hallucination guard: the strict json_schema forces the model to
// return every field (nullable), and the server drops null / '' / [] so only *confident* keys reach
// the client (augment-only). A naive truthy check would wrongly drop legit zeros — hence these tests.
describe('stripNulls (autofill hallucination guard)', () => {
  it('drops null, empty-string, and empty-array keys; keeps the rest', () => {
    expect(stripNulls({ seimaiBuai: null, brewery: '', flavorTags: [], amakara: 1 })).toEqual({ amakara: 1 });
  });

  it('keeps zero and negative numbers (a truthy check would wrongly drop these)', () => {
    // amakara/noutan 中央 = 0, nihonshuDo can be 0 or negative (SMV) — all are real, confident values.
    expect(stripNulls({ amakara: 0, noutan: -2, nihonshuDo: 0 })).toEqual({ amakara: 0, noutan: -2, nihonshuDo: 0 });
  });

  it('keeps non-empty strings and non-empty arrays', () => {
    expect(stripNulls({ brewery: '旭酒造', riceType: ['山田錦'] })).toEqual({ brewery: '旭酒造', riceType: ['山田錦'] });
  });

  it('returns an empty object when every value is null', () => {
    expect(stripNulls({ brewery: null, seimaiBuai: null, flavorTags: null })).toEqual({});
  });

  it('returns an empty object for an empty input', () => {
    expect(stripNulls({})).toEqual({});
  });

  it('does not mutate the input', () => {
    const raw = { brewery: '旭酒造', seimaiBuai: null };
    stripNulls(raw);
    expect(raw).toEqual({ brewery: '旭酒造', seimaiBuai: null });
  });
});
