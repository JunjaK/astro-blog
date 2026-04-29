import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { parseLyrics } from './lyricsParser.mjs';

test('parses single stanza with ruby and translation', () => {
  const input = `{歩|あゆ}き{始|はじ}めた
||
걷기 시작한`;
  const result = parseLyrics(input);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].ja, [[
    { k: '歩', r: 'あゆ' },
    'き',
    { k: '始', r: 'はじ' },
    'めた',
  ]]);
  assert.deepEqual(result[0].ko, ['걷기 시작한']);
});

test('splits multiple stanzas on blank lines', () => {
  const input = `{歩|あゆ}く
||
걷는다

{走|はし}る
||
달린다`;
  const result = parseLyrics(input);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].ko, ['걷는다']);
  assert.deepEqual(result[1].ko, ['달린다']);
});

test('preserves multi-line stanza as line arrays', () => {
  const input = `line1
line2
||
줄1
줄2`;
  const result = parseLyrics(input);
  assert.deepEqual(result[0].ja, [['line1'], ['line2']]);
  assert.deepEqual(result[0].ko, ['줄1', '줄2']);
});

test('preserves full-width spaces and punctuation', () => {
  const input = `どこまで{往|ゆ}くの　{何|なに}の{為|ため}
||
어디까지 가는 걸까`;
  const result = parseLyrics(input);
  assert.deepEqual(result[0].ja, [[
    'どこまで',
    { k: '往', r: 'ゆ' },
    'くの　',
    { k: '何', r: 'なに' },
    'の',
    { k: '為', r: 'ため' },
  ]]);
});

test('honors backslash-escaped pipe', () => {
  const input = `a\\|b
||
ko`;
  const result = parseLyrics(input);
  assert.deepEqual(result[0].ja, [['a|b']]);
});

test('throws on stanza missing || separator', () => {
  const input = `{歩|あゆ}く
걷는다`;
  assert.throws(() => parseLyrics(input), /missing.*\|\|/i);
});

test('throws on unclosed ruby annotation', () => {
  const input = `{歩|あゆ
||
걷기`;
  assert.throws(() => parseLyrics(input), /unclosed ruby/i);
});

test('skips empty stanzas from extra blank lines', () => {
  const input = `a
||
b



c
||
d`;
  const result = parseLyrics(input);
  assert.equal(result.length, 2);
});

test('trims leading and trailing whitespace', () => {
  const input = `\n\n  a\n||\n  b\n\n`;
  const result = parseLyrics(input);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].ja, [['  a']]);
  assert.deepEqual(result[0].ko, ['  b']);
});
