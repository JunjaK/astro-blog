# Lyrics Translation Series — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new `Music` blog category with stanza-toggleable lyrics (kanji-only by default; expand reveals furigana via native HTML ruby + Korean translation), an Apple Music embed card, and the first post (ツキヨミ — 世界の歩き方).

**Architecture:** A remark plugin (`remarkLyricsBlock`) transforms ` ```lyrics ` fenced code blocks at build time into a hydrated `<Lyrics client:visible stanzas={...} />` React island; a static `MusicCard.astro` wraps the Apple Music iframe and service link buttons; the blog content schema gains five optional `Music`-only fields.

**Tech Stack:** Astro 5, React 19, MDX (`@astrojs/mdx`), remark + `unist-util-visit`, framer-motion (already installed), Tailwind 4. No new npm dependencies.

**Spec:** `_docs/lyrics-translation-series-design.md`

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `src/content.config.ts` | modify | Add 5 optional `Music` fields to blog schema |
| `src/plugins/lyricsParser.mjs` | create | Pure parser: raw lyric text → `{ja, ko}[]` (HTML strings) |
| `src/plugins/lyricsParser.test.mjs` | create | `node --test` smoke tests for the parser |
| `src/plugins/remarkLyricsBlock.mjs` | create | remark plugin wrapping parser; emits `mdxJsxFlowElement` |
| `astro.config.mjs` | modify | Register `remarkLyricsBlock` in `markdown.remarkPlugins` |
| `src/components/Blog/Music/MusicCard.astro` | create | Apple Music iframe + service link buttons |
| `src/components/Blog/Music/Lyrics.tsx` | create | React island: stanza toggle + expand-all |
| `src/components/Blog/Music/lyrics.css` | create | Ruby/translation visibility, layout |
| `src/components/Blog/Music/index.ts` | create | Barrel export |
| `src/content/blog/music/sekai-no-arukikata.mdx` | create | First post |
| `e2e/blog-music.noauth.spec.ts` | create | Playwright smoke test for the post |

---

## Task 1: Extend blog content schema

**Files:**
- Modify: `src/content.config.ts:4-15`

- [ ] **Step 1: Add five optional Music fields to the blog schema**

Edit `src/content.config.ts`. Replace the existing `blog` definition with:

```ts
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    thumbnail: z.string().optional(),
    created: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    updated: z.coerce.date().optional(),
    description: z.string().optional(),
    artist: z.string().optional(),
    album: z.string().optional(),
    releaseYear: z.number().optional(),
    appleMusicUrl: z.string().url().optional(),
    youtubeMusicUrl: z.string().url().optional(),
  }),
});
```

- [ ] **Step 2: Verify all existing posts still validate**

Run: `bun astro sync`
Expected: succeeds. This regenerates content collection types and validates every existing post's frontmatter against the new schema. Any errors here mean an existing post is incompatible — investigate before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "feat(blog): add optional Music category fields to schema"
```

---

## Task 2: Implement the pure lyrics parser

**Files:**
- Create: `src/plugins/lyricsParser.mjs`
- Test: `src/plugins/lyricsParser.test.mjs`

The parser is a pure function. Splitting it from the remark plugin keeps it testable without a remark/mdast harness.

- [ ] **Step 1: Write the failing test**

Create `src/plugins/lyricsParser.test.mjs`:

```js
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { parseLyrics } from './lyricsParser.mjs';

test('parses single stanza with ruby and translation', () => {
  const input = `{歩|あゆ}き{始|はじ}めた
||
걷기 시작한`;
  const result = parseLyrics(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].ja, '<ruby>歩<rt>あゆ</rt></ruby>き<ruby>始<rt>はじ</rt></ruby>めた');
  assert.equal(result[0].ko, '걷기 시작한');
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
  assert.equal(result[0].ko, '걷는다');
  assert.equal(result[1].ko, '달린다');
});

test('preserves multi-line stanza with <br/>', () => {
  const input = `line1
line2
||
줄1
줄2`;
  const result = parseLyrics(input);
  assert.equal(result[0].ja, 'line1<br/>line2');
  assert.equal(result[0].ko, '줄1<br/>줄2');
});

test('preserves full-width spaces and punctuation', () => {
  const input = `どこまで{往|ゆ}くの　{何|なに}の{為|ため}
||
어디까지 가는 걸까`;
  const result = parseLyrics(input);
  assert.match(result[0].ja, /どこまで<ruby>往<rt>ゆ<\/rt><\/ruby>くの　<ruby>何<rt>なに<\/rt><\/ruby>の<ruby>為<rt>ため<\/rt><\/ruby>/);
});

test('honors backslash-escaped pipe', () => {
  const input = `a\\|b
||
ko`;
  const result = parseLyrics(input);
  assert.equal(result[0].ja, 'a|b');
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
  assert.equal(result[0].ja, '  a');
  assert.equal(result[0].ko, '  b');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/plugins/lyricsParser.test.mjs`
Expected: FAIL with `Cannot find module './lyricsParser.mjs'` or similar.

- [ ] **Step 3: Implement the parser**

Create `src/plugins/lyricsParser.mjs`:

```js
const ESCAPED_PIPE_PLACEHOLDER = ' ESC_PIPE ';

function applyRuby(ja) {
  const protectedJa = ja.replaceAll('\\|', ESCAPED_PIPE_PLACEHOLDER);

  let result = '';
  let i = 0;
  while (i < protectedJa.length) {
    const ch = protectedJa[i];
    if (ch === '{') {
      const close = protectedJa.indexOf('}', i);
      if (close === -1) {
        throw new Error('unclosed ruby annotation');
      }
      const inner = protectedJa.slice(i + 1, close);
      const sep = inner.indexOf('|');
      if (sep === -1 || inner.includes('{')) {
        throw new Error('unclosed ruby annotation');
      }
      const kanji = inner.slice(0, sep);
      const reading = inner.slice(sep + 1);
      result += `<ruby>${kanji}<rt>${reading}</rt></ruby>`;
      i = close + 1;
    }
    else {
      result += ch;
      i += 1;
    }
  }

  return result.replaceAll(ESCAPED_PIPE_PLACEHOLDER, '|');
}

function nlToBr(text) {
  return text.split('\n').join('<br/>');
}

export function parseLyrics(rawText) {
  const trimmed = rawText.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');
  const stanzaBlocks = trimmed.split(/\n\s*\n+/);
  const stanzas = [];

  for (const [index, block] of stanzaBlocks.entries()) {
    if (block.trim() === '')
      continue;

    const lines = block.split('\n');
    const sepIdx = lines.findIndex(line => line.trim() === '||');
    if (sepIdx === -1) {
      throw new Error(`stanza ${index + 1} missing || separator`);
    }

    const jaRaw = lines.slice(0, sepIdx).join('\n');
    const koRaw = lines.slice(sepIdx + 1).join('\n');

    const ja = nlToBr(applyRuby(jaRaw));
    const ko = nlToBr(koRaw);

    stanzas.push({ ja, ko });
  }

  return stanzas;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test src/plugins/lyricsParser.test.mjs`
Expected: PASS — all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/plugins/lyricsParser.mjs src/plugins/lyricsParser.test.mjs
git commit -m "feat(plugins): add pure lyrics parser with ruby + stanza handling"
```

---

## Task 3: Implement the remark plugin

**Files:**
- Create: `src/plugins/remarkLyricsBlock.mjs`

The plugin wraps the parser, emitting `mdxJsxFlowElement` AST nodes so Astro hydrates `<Lyrics>` as a client island.

- [ ] **Step 1: Implement the plugin**

Create `src/plugins/remarkLyricsBlock.mjs`:

```js
import { visit } from 'unist-util-visit';
import { parseLyrics } from './lyricsParser.mjs';

function remarkLyricsBlock() {
  return function transformer(tree, file) {
    visit(tree, 'code', (code, index, parent) => {
      if (index === null || parent === null)
        return;
      if (code.lang !== 'lyrics')
        return;

      const filename = file?.path || file?.history?.[file.history.length - 1] || '';
      if (filename && !filename.endsWith('.mdx')) {
        throw new Error(
          `[remarkLyricsBlock] \`\`\`lyrics blocks require .mdx (found in ${filename}). `
          + 'Rename the file to .mdx.',
        );
      }

      let stanzas;
      try {
        stanzas = parseLyrics(code.value);
      }
      catch (err) {
        throw new Error(`[remarkLyricsBlock] ${filename}: ${err.message}`);
      }

      const replacement = {
        type: 'mdxJsxFlowElement',
        name: 'Lyrics',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'stanzas',
            value: {
              type: 'mdxJsxAttributeValueExpression',
              value: JSON.stringify(stanzas),
            },
          },
          {
            type: 'mdxJsxAttribute',
            name: 'client:visible',
            value: null,
          },
        ],
        children: [],
      };

      parent.children.splice(index, 1, replacement);
    });
  };
}

export default remarkLyricsBlock;
```

- [ ] **Step 2: Smoke-check the plugin against a fake mdast tree**

Create a temporary check at `src/plugins/remarkLyricsBlock.smoke.mjs` (delete after step 4):

```js
import remarkLyricsBlock from './remarkLyricsBlock.mjs';

const tree = {
  type: 'root',
  children: [
    {
      type: 'code',
      lang: 'lyrics',
      value: '{歩|あゆ}く\n||\n걷는다',
    },
  ],
};

const file = { path: 'fake.mdx', history: ['fake.mdx'] };
const transform = remarkLyricsBlock();
transform(tree, file);

const node = tree.children[0];
console.log(JSON.stringify(node, null, 2));

if (node.type !== 'mdxJsxFlowElement') throw new Error('not mdxJsxFlowElement');
if (node.name !== 'Lyrics') throw new Error('wrong name');
const stanzasAttr = node.attributes.find(a => a.name === 'stanzas');
const visibleAttr = node.attributes.find(a => a.name === 'client:visible');
if (!stanzasAttr) throw new Error('missing stanzas attr');
if (!visibleAttr || visibleAttr.value !== null) throw new Error('missing client:visible');

console.log('OK');
```

- [ ] **Step 3: Run the smoke check**

Run: `node src/plugins/remarkLyricsBlock.smoke.mjs`
Expected: prints the AST node and `OK` on the last line.

- [ ] **Step 4: Delete the smoke check file**

Run: `rm src/plugins/remarkLyricsBlock.smoke.mjs`

- [ ] **Step 5: Commit**

```bash
git add src/plugins/remarkLyricsBlock.mjs
git commit -m "feat(plugins): add remarkLyricsBlock to convert lyrics code blocks to MDX JSX"
```

---

## Task 4: Register the plugin in astro.config.mjs

**Files:**
- Modify: `astro.config.mjs:23, 51`

- [ ] **Step 1: Add the import**

In `astro.config.mjs`, after the existing remark imports (line 23), add:

```js
import remarkLyricsBlock from './src/plugins/remarkLyricsBlock.mjs';
```

- [ ] **Step 2: Register the plugin**

Replace line 51:

```js
remarkPlugins: [remarkMermaidToHtml, remarkMath],
```

with:

```js
remarkPlugins: [remarkMermaidToHtml, remarkMath, remarkLyricsBlock],
```

- [ ] **Step 3: Verify the dev server starts without config errors**

Run: `bun dev`
Expected: dev server starts successfully (will probably warn about the missing `Lyrics` component until Task 6, but should not fail at config parse).
Stop the server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs
git commit -m "build(astro): register remarkLyricsBlock plugin"
```

---

## Task 5: Build the `MusicCard.astro` component

**Files:**
- Create: `src/components/Blog/Music/MusicCard.astro`

- [ ] **Step 1: Create the directory**

Run: `mkdir -p src/components/Blog/Music`

- [ ] **Step 2: Implement MusicCard**

Create `src/components/Blog/Music/MusicCard.astro`:

```astro
---
interface Props {
  appleMusicUrl: string;
  youtubeMusicUrl?: string;
  artist?: string;
  album?: string;
  releaseYear?: number;
}

const {
  appleMusicUrl,
  youtubeMusicUrl,
  artist,
  album,
  releaseYear,
} = Astro.props;

const embedSrc = appleMusicUrl.replace(
  /^https:\/\/music\.apple\.com\//,
  'https://embed.music.apple.com/',
);

const captionParts = [artist, album, releaseYear].filter(Boolean);
const caption = captionParts.join(' · ');
---

<div class="music-card my-8 flex flex-col gap-3">
  <div class="rounded-xl overflow-hidden border border-border">
    <iframe
      src={embedSrc}
      allow="autoplay *; encrypted-media *;"
      loading="lazy"
      width="100%"
      height="175"
      frameborder="0"
      title={`${artist ?? ''} ${album ?? ''} - Apple Music`}
    />
  </div>

  <div class="flex flex-wrap gap-2">
    <a
      class="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-sm"
      href={appleMusicUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      Apple Music ↗
    </a>

    {youtubeMusicUrl && (
      <a
        class="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-sm"
        href={youtubeMusicUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        YouTube Music ↗
      </a>
    )}
  </div>

  {caption && (
    <p class="text-sm text-muted-foreground">{caption}</p>
  )}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Blog/Music/MusicCard.astro
git commit -m "feat(blog): add MusicCard component with Apple Music embed"
```

---

## Task 6: Build the `Lyrics.tsx` React island

**Files:**
- Create: `src/components/Blog/Music/Lyrics.tsx`
- Create: `src/components/Blog/Music/lyrics.css`

- [ ] **Step 1: Create the CSS**

Create `src/components/Blog/Music/lyrics.css`:

```css
.lyrics-block {
  --lyrics-translation-color: var(--muted-foreground);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: 2rem 0;
}

.lyrics-toolbar {
  display: flex;
  justify-content: flex-end;
}

.lyrics-stanza {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
  outline: none;
}

.lyrics-stanza:hover,
.lyrics-stanza:focus-visible {
  background-color: color-mix(in oklab, var(--accent) 35%, transparent);
}

.lyrics-stanza .ja {
  line-height: 2;
  font-size: 1rem;
}

.lyrics-stanza .ja rt {
  display: none;
  font-size: 0.65em;
  color: var(--muted-foreground);
}

.lyrics-stanza.is-expanded .ja rt {
  display: revert;
}

.lyrics-stanza .ko {
  margin-top: 0.75rem;
  padding-left: 0.875rem;
  border-left: 2px solid var(--border);
  color: var(--lyrics-translation-color);
  line-height: 1.7;
  font-size: 0.95rem;
}

.lyrics-stanza .chevron {
  display: inline-flex;
  margin-left: 0.5rem;
  transition: transform 0.2s ease;
}

.lyrics-stanza.is-expanded .chevron {
  transform: rotate(180deg);
}

.lyrics-stanza-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
```

- [ ] **Step 2: Implement the React component**

Create `src/components/Blog/Music/Lyrics.tsx`:

```tsx
import type { KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import './lyrics.css';

type Stanza = {
  ja: string;
  ko: string;
};

type Props = {
  stanzas: Stanza[];
};

export default function Lyrics({ stanzas }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const allExpanded = stanzas.length > 0 && expanded.size === stanzas.length;

  const toggleStanza = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      }
      else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(stanzas.map((_, i) => i)));
  }, [stanzas]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleStanza(index);
    }
  };

  return (
    <div className="lyrics-block">
      <div className="lyrics-toolbar">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={allExpanded ? collapseAll : expandAll}
        >
          {allExpanded ? '전체 접기' : '전체 펼치기'}
        </Button>
      </div>

      {stanzas.map((stanza, index) => {
        const isOpen = expanded.has(index);
        return (
          <div
            key={index}
            className={`lyrics-stanza${isOpen ? ' is-expanded' : ''}`}
            role="button"
            aria-expanded={isOpen}
            tabIndex={0}
            onClick={() => toggleStanza(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <div className="lyrics-stanza-header">
              <div
                className="ja flex-1"
                dangerouslySetInnerHTML={{ __html: stanza.ja }}
              />
              <span className="chevron" aria-hidden="true">
                <Icon icon="mingcute:down-line" width={20} height={20} />
              </span>
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="ko"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="ko"
                    dangerouslySetInnerHTML={{ __html: stanza.ko }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
```

> **XSS posture note for the reviewer:** The `ja`/`ko` HTML strings are produced at build time by `remarkLyricsBlock` from `*.mdx` files committed to this repo. Output grammar is closed (`<ruby>`, `<rt>`, `<br/>`, plain text) — no user input pathway. CLAUDE.md's prohibition on raw-HTML rendering targets untrusted runtime input; this is a different threat model. Sanitizer not required.

- [ ] **Step 3: Commit**

```bash
git add src/components/Blog/Music/Lyrics.tsx src/components/Blog/Music/lyrics.css
git commit -m "feat(blog): add Lyrics React island with stanza toggle"
```

---

## Task 7: Add the barrel export

**Files:**
- Create: `src/components/Blog/Music/index.ts`

- [ ] **Step 1: Implement**

Create `src/components/Blog/Music/index.ts`:

```ts
export { default as Lyrics } from './Lyrics';
```

> Note: `MusicCard.astro` is intentionally not re-exported from `index.ts` because Astro components do not barrel-export reliably from a `.ts` file. Author MDX files import it directly from its `.astro` path (see Task 8).

- [ ] **Step 2: Commit**

```bash
git add src/components/Blog/Music/index.ts
git commit -m "feat(blog): add Music components barrel"
```

---

## Task 8: Author the first post

**Files:**
- Create: `src/content/blog/music/sekai-no-arukikata.mdx`

The lyric text and Korean translation come from the brainstorm input plus Claude-generated furigana + translation draft. The user reviews and edits after publish.

- [ ] **Step 1: Create the directory**

Run: `mkdir -p src/content/blog/music`

- [ ] **Step 2: Author the MDX file**

> **Copy-paste warning:** the example below is wrapped in a 4-backtick fence so the inner triple-backtick `lyrics` block survives. When you paste into the actual `.mdx` file, paste only the content between the outer 4-backtick fences — the inner ` ```lyrics ` and closing ` ``` ` are part of the file, but the surrounding 4-backtick fence is NOT.

Create `src/content/blog/music/sekai-no-arukikata.mdx`:

````mdx
---
title: 世界の歩き方
category: Music
created: 2026-04-29
artist: ツキヨミ
album: 世界の歩き方
releaseYear: 2024
appleMusicUrl: https://music.apple.com/jp/album/REPLACE_ME
youtubeMusicUrl: https://music.youtube.com/watch?v=REPLACE_ME
tags: ['music', 'lyrics', 'japanese', 'tsukiyomi']
description: ツキヨミ「世界の歩き方」 가사 한국어 번역
---

import MusicCard from '@/components/Blog/Music/MusicCard.astro';
import { Lyrics } from '@/components/Blog/Music';

<MusicCard
  appleMusicUrl={frontmatter.appleMusicUrl}
  youtubeMusicUrl={frontmatter.youtubeMusicUrl}
  artist={frontmatter.artist}
  album={frontmatter.album}
  releaseYear={frontmatter.releaseYear}
/>

## 곡을 만나고

(짧은 감상 — 만난 계기와 마음에 드는 부분. 사용자 본인이 작성)

## 가사

```lyrics
{歩|あゆ}き{始|はじ}めた{時|とき}から{今日|きょう}の{日|ひ}まで
{見|み}えない{何|なに}かを{追|お}いかけて
||
걷기 시작한 그 날부터 오늘에 이르기까지
보이지 않는 무언가를 좇아

どこまで{往|ゆ}くの　{何|なに}の{為|ため}{生|い}きるの
{言|い}えないままに{脚|あし}を{止|と}めた
ああ、
||
어디까지 가는 걸까, 무엇을 위해 살아가는 걸까
말하지 못한 채 발을 멈췄어
아아,

{完成形|かんせいけい}は{野放図|のほうず}で{感性|かんせい}と{食|く}い{違|ちが}ったり
だれも{理想|りそう}を{望|のぞ}む　{役|やく}も{酸素|さんそ}も{取|と}り{合|あ}う
あの{日|ひ}から{焼|や}き{付|つ}いて{消|き}えない
{モニター|モニター}の{先|さき}のなにか
||
완성된 모양은 종잡을 수 없고 감성과 어긋나기도 하며
누구나 이상을 바라고, 배역도 산소도 서로 빼앗아
그날부터 새겨진 채 사라지지 않는
모니터 너머의 무언가

{例|たと}えば{過去|かこ}に{戻|もど}ればどうしようか
どこかで{忘|わす}れた{夢|ゆめ}を{選|えら}んでみたら
{案外|あんがい}{上手|うま}くいって
でも{別|べつ}の{世界|せかい}の{君|きみ}は　{今|いま}の{君|きみ}になりたいかも
||
가령 과거로 돌아간다면 어떨까
어디선가 잊어버린 꿈을 골라본다면
의외로 잘 풀려서
하지만 다른 세계의 너는, 지금의 네가 되고 싶을지도 몰라

だれもが{識|し}らない{世界|せかい}の{歩|ある}き{方|かた}
{見|み}えない{答|こた}えを{追|お}いかけて
どこまで{往|ゆ}っても　{何|なに}の{為|ため}{生|い}きても
{癒|い}えない{傷|きず}は{増|ふ}えるけれど
{行|い}こう
||
누구도 알지 못하는 세계를 걷는 법
보이지 않는 답을 좇아
어디까지 가도, 무엇을 위해 살아도
아물지 않는 상처는 늘어가지만
가자

{大事|だいじ}に{握|にぎ}り{締|し}め{歪|ゆが}んでいた{希望|きぼう}
{高|たか}く{飛|と}ぼうとすれば{深|ふか}く{落|お}ちてしまう
{泥水|どろみず}を{啜|すす}っても{花|はな}になれない
{思|おも}い{通|どお}りじゃない
||
소중히 움켜쥐어 일그러져 있던 희망
높이 날아오르려 하면 깊이 떨어져 버려
흙탕물을 들이켜도 꽃이 될 수 없어
뜻대로 되지 않아

{夢|ゆめ}のまた{夢|ゆめ}のなか
なにを{綴|つづ}る？
「　　　　」
どこに{届|とど}く？
||
꿈속의 또 다른 꿈속에서
무엇을 엮어낼까?
「　　　　」
어디에 닿을까?

{夢|ゆめ}はまだ{夢|ゆめ}のまま{進|すす}む
{止|と}まらない{者|もの}は{転|ころ}ぶ　けれど{景色|けしき}は{変|か}わる
||
꿈은 아직 꿈인 채로 나아가
멈추지 않는 자는 넘어져, 그러나 풍경은 바뀐다

{今更|いまさら}わかった
{生|う}まれてきた{意味|いみ}が　{死|し}ねない{理由|りゆう}が
{下書|したが}きすらも{無|な}い{何|なに}かが{見|み}たいんだ
{思|おも}うまま{描|えが}き{出|だ}そう
{後書|あとが}きであれこれ{語|かた}ればいい
||
이제야 알았어
태어난 의미가, 죽지 못하는 이유가
밑그림조차 없는 무언가를 보고 싶은 거야
생각나는 대로 그려내자
후기에서 이런저런 이야기는 풀면 돼

{僕|ぼく}らは{識|し}っている{世界|せかい}の{歩|ある}き{方|かた}
だから{今日|きょう}ここまで{来|き}たろ？
{始|はじ}まりの{日|ひ}の{行|い}く{宛|あ}ても{願|ねが}いも
どれも{予定|よてい}と{違|ちが}うけれど
ほら、{声|こえ}がするの
「それでも」って
||
우리는 알고 있어, 세계를 걷는 법을
그래서 오늘 여기까지 온 거잖아?
시작하던 날의 행선지도 소원도
무엇 하나 예정대로는 아니지만
봐, 목소리가 들려
「그럼에도」 라고

あれからまだ{終|お}わらない{夢|ゆめ}の{途中|とちゅう}
||
그 뒤로 아직 끝나지 않은 꿈의 한가운데

{未来|みらい}の{日|ひ}の{過去|かこ}を{今|いま}{変|か}えてみせて
||
미래의 날의 과거를, 지금 바꿔 보여줘
```
````

> **Note for reviewer:** Furigana readings should be sanity-checked — particularly proper nouns (`ツキヨミ` is a stage name; readings like `往く=ゆく`, `識る=しる`, `歪んで=ゆがんで` need a final pass). The user will edit translation phrasing after publish.

- [ ] **Step 3: Commit**

```bash
git add src/content/blog/music/sekai-no-arukikata.mdx
git commit -m "feat(blog): add first Music post — ツキヨミ 世界の歩き方"
```

---

## Task 9: Manual verification with `bun dev`

**Files:**
- (no edits — verification only)

- [ ] **Step 1: Start the dev server**

Run: `bun dev`

- [ ] **Step 2: Visit the post**

Open: `http://localhost:4321/blog/music/sekai-no-arukikata`

- [ ] **Step 3: Verify the music card**

Confirm:
- Apple Music iframe loads (you will see the placeholder for the `REPLACE_ME` URL — that is expected; the user replaces it with the real URL after publish-time)
- Apple Music link button is visible and has visible border
- YouTube Music link button is visible and has visible border
- Caption "ツキヨミ · 世界の歩き方 · 2024" appears below buttons

- [ ] **Step 4: Verify the lyrics — collapsed state**

Confirm:
- Each stanza shows kanji text only (NO furigana visible above kanji)
- NO Korean translation visible
- Chevron icon points down on each stanza
- "전체 펼치기" button is shown (not "전체 접기")

- [ ] **Step 5: Verify single-stanza expansion**

Click on the first stanza. Confirm:
- Furigana (small text) appears above each kanji
- Korean translation appears below the Japanese, with a left border
- Chevron rotates to point up
- The animation is smooth (height expand)
- Other stanzas stay collapsed

Click on the same stanza again — it collapses back.

- [ ] **Step 6: Verify "전체 펼치기"**

Click "전체 펼치기". Confirm:
- All stanzas expand simultaneously
- Button label changes to "전체 접기"
- Chevrons all rotate up

Click "전체 접기" — all collapse.

- [ ] **Step 7: Verify keyboard accessibility**

Tab to a stanza (focus ring should appear). Press Enter — confirm it toggles.
Press Space on a focused collapsed stanza — confirm it toggles.

- [ ] **Step 8: Verify mobile responsiveness**

Open DevTools, switch to a mobile viewport (e.g., 390 × 844). Confirm:
- Stanzas remain readable, ruby renders correctly above kanji
- Tap toggles stanzas
- No horizontal overflow

- [ ] **Step 9: Verify no console errors**

Open the browser console. Confirm:
- No red errors
- No hydration warnings about mismatched markup

- [ ] **Step 10: Confirm with user, then stop the server**

Tell the user: "Manual verification on `/blog/music/sekai-no-arukikata` passed. Ready to add the Playwright e2e check?" Wait for the user to confirm, then stop the dev server with Ctrl+C.

---

## Task 10: Add a Playwright smoke test

**Files:**
- Create: `e2e/blog-music.noauth.spec.ts`

This follows the project's existing e2e pattern (see `e2e/diary-gallery.noauth.spec.ts`).

- [ ] **Step 1: Look at the existing pattern**

Run: `head -40 e2e/diary-gallery.noauth.spec.ts`
Note the imports, base URL handling, and `client:visible` hydration waiting pattern (CLAUDE.md memory: `scrollIntoViewIfNeeded()` + `waitForTimeout(2000)` for hydration).

- [ ] **Step 2: Author the spec**

Create `e2e/blog-music.noauth.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('blog/music — sekai-no-arukikata', () => {
  test('renders music card and lyrics with stanza toggle', async ({ page }) => {
    await page.goto('/blog/music/sekai-no-arukikata');

    const musicCard = page.locator('.music-card');
    await expect(musicCard).toBeVisible();
    await expect(page.getByRole('link', { name: /Apple Music/ })).toBeVisible();

    const lyrics = page.locator('.lyrics-block');
    await lyrics.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    await expect(lyrics).toBeVisible();

    const firstStanza = page.locator('.lyrics-stanza').first();
    await expect(firstStanza).toHaveAttribute('aria-expanded', 'false');

    await firstStanza.click();
    await expect(firstStanza).toHaveAttribute('aria-expanded', 'true');
    await expect(firstStanza).toHaveClass(/is-expanded/);

    const rtVisibility = await firstStanza.locator('rt').first().evaluate(
      el => window.getComputedStyle(el).display,
    );
    expect(rtVisibility).not.toBe('none');

    await expect(firstStanza.locator('.ko')).toBeVisible();

    await firstStanza.click();
    await expect(firstStanza).toHaveAttribute('aria-expanded', 'false');
  });

  test('expand-all toggles all stanzas at once', async ({ page }) => {
    await page.goto('/blog/music/sekai-no-arukikata');

    const lyrics = page.locator('.lyrics-block');
    await lyrics.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    const expandAllButton = page.getByRole('button', { name: '전체 펼치기' });
    await expandAllButton.click();

    const stanzas = page.locator('.lyrics-stanza');
    const count = await stanzas.count();
    for (let i = 0; i < count; i++) {
      await expect(stanzas.nth(i)).toHaveAttribute('aria-expanded', 'true');
    }

    await page.getByRole('button', { name: '전체 접기' }).click();
    for (let i = 0; i < count; i++) {
      await expect(stanzas.nth(i)).toHaveAttribute('aria-expanded', 'false');
    }
  });
});
```

- [ ] **Step 3: Run the test**

Run: `bunx playwright test e2e/blog-music.noauth.spec.ts --project=chromium`
Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add e2e/blog-music.noauth.spec.ts
git commit -m "test(e2e): add Playwright smoke test for blog/music"
```

---

## Task 11: Final verification — production build

**Files:**
- (no edits — verification only)

- [ ] **Step 1: Run a full production build**

Run: `bun run build`
Expected: build succeeds with no errors. Pagefind indexing runs over the new post without errors.

- [ ] **Step 2: Preview the built site**

Run: `bun run preview`
Open: `http://localhost:4321/blog/music/sekai-no-arukikata`

Confirm the page renders identically to dev mode and the lyrics toggle still works (this catches SSR/hydration mismatches that don't appear in dev).

- [ ] **Step 3: Stop the preview server**

Ctrl+C.

- [ ] **Step 4: Notify user**

Report: "Implementation complete. The post URL is `/blog/music/sekai-no-arukikata`. The user needs to fill in `appleMusicUrl` and `youtubeMusicUrl` (currently `REPLACE_ME`), review the auto-generated furigana and Korean translation, and write the personal commentary section."

---

## Out of Scope (do not implement)

- Other source languages
- Inline per-line annotation component
- Spotify / Melon integrations
- Multiple readings per kanji
- Auto-generated furigana via kuromoji or similar
- Pagefind hidden-content indexing changes
