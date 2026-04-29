# Lyrics Translation Series — Design Spec

**Date:** 2026-04-29
**First post:** ツキヨミ — 世界の歩き方
**Status:** Approved, ready for implementation plan

## 1. Goal

Add a new blog category `Music` for hand-translated Japanese song lyrics. Each post combines (1) an Apple Music embed with secondary service links, (2) a free-form personal commentary section, and (3) a stanza-toggleable lyrics block where the default view is original kanji only and expanding reveals furigana (yomigana, rendered as native HTML ruby above each kanji) plus the Korean translation.

Audio files are not uploaded due to copyright; playback is delegated to embedded streaming services.

## 2. Non-Goals

- Other source languages (English, etc.) — defer until series is stable
- Inline per-line annotation/commentary component
- Spotify/Melon and other streaming integrations beyond Apple Music + YouTube Music
- Multiple readings per kanji or alternate-character forms (`{歩|あゆ}` is single-pair only)
- Boosting search visibility for translation text — translation is intentionally hidden until expanded; Pagefind indexing of hidden DOM is acceptable as-is

## 3. Scope Summary

```
src/
├── content.config.ts                              # +5 optional fields on blog schema
├── content/blog/music/
│   └── sekai-no-arukikata.mdx                     # First post
├── plugins/
│   └── remarkLyricsBlock.mjs                      # ```lyrics → <Lyrics> JSX
├── components/Blog/Music/
│   ├── MusicCard.astro                            # Apple Music iframe + service buttons
│   ├── Lyrics.tsx                                 # React island, stanza toggle
│   └── index.ts                                   # barrel export
astro.config.mjs                                   # Register remarkLyricsBlock
```

No new pages or routes. The existing `pages/blog/[...slug].astro` dynamic route renders music posts unchanged.

## 4. Schema (`src/content.config.ts`)

Extend the `blog` collection schema with five optional fields. They are populated only for `category: Music` posts but, being optional, do not affect existing posts.

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
    // Music category
    artist: z.string().optional(),
    album: z.string().optional(),
    releaseYear: z.number().optional(),
    appleMusicUrl: z.string().url().optional(),
    youtubeMusicUrl: z.string().url().optional(),
  }),
});
```

`category` remains a free string; the new category uses `Music` (capitalized to match existing `Web` style).

## 5. Lyrics Authoring Format

Lyrics live inside an MDX fenced code block with language `lyrics`:

````mdx
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
```
````

### Grammar

| Construct | Meaning |
|-----------|---------|
| Blank line | Stanza separator |
| `||` on its own line | Within a stanza, separates Japanese block (above) from Korean block (below) |
| `{kanji|reading}` | Ruby annotation; `kanji` rendered with `reading` as furigana above |
| `\|` | Literal `|` character (escape) |
| All other text | Preserved verbatim, including full-width spaces, punctuation, `「」`, etc. |

### Build-Time Validation

The remark plugin emits errors that surface as Astro build failures:

- Stanza missing `||` separator → `"<file>: stanza N missing '||' separator"`
- Unclosed `{...|...}` → `"<file>: unclosed ruby annotation at line N"`
- Empty stanza (consecutive blank lines) → silently skipped
- Trailing/leading whitespace inside the code block → trimmed

## 6. `remarkLyricsBlock.mjs`

A remark plugin following the same pattern as the existing `remarkMermaidToHtml.mjs`.

### Behavior

1. Visit `code` nodes in the MDX AST.
2. For nodes with `lang === 'lyrics'`:
   1. Split `value` on blank lines → array of stanza strings.
   2. For each stanza, split on a line containing only `||` → `[jaBlock, koBlock]`.
      - Validate exactly one `||` line per stanza; throw `vfile` error otherwise.
   3. In `jaBlock`, replace `{K|R}` (where neither `K` nor `R` contains `{`, `|`, or `}`) with `<ruby>K<rt>R</rt></ruby>`. Honor `\|` as literal pipe.
   4. Convert remaining newlines in both `jaBlock` and `koBlock` to `<br/>`.
   5. Build a `Stanza` object: `{ ja: <html string>, ko: <html string> }`.
3. Replace the `code` node with an `mdxJsxFlowElement` of name `Lyrics` carrying:
   - `stanzas` attribute — an expression with the JSON-stringified stanza array
   - `client:visible` attribute — boolean (`value: null`), so the rendered JSX hydrates as an Astro client island
4. The MDX file must `import { Lyrics } from '@/components/Blog/Music';` at the top — the plugin does not auto-inject imports (matches existing project convention where authors import components explicitly).
5. The plugin only operates correctly inside `.mdx` files. In a plain `.md` file, the AST has no `mdxJsxFlowElement` node type, so emission would fall back to plain HTML and `Lyrics` would not hydrate. Lyrics blocks must therefore live in `.mdx`. The plugin guards against this: if the host file's extension is `.md`, throw a build error pointing the author at the right format.

### Output AST Sketch

```js
{
  type: 'mdxJsxFlowElement',
  name: 'Lyrics',
  attributes: [
    {
      type: 'mdxJsxAttribute',
      name: 'stanzas',
      value: {
        type: 'mdxJsxAttributeValueExpression',
        value: JSON.stringify(stanzaArray),
      },
    },
    {
      type: 'mdxJsxAttribute',
      name: 'client:visible',
      value: null,
    },
  ],
  children: [],
}
```

### Dependencies

- `unist-util-visit` (already installed via `remarkMermaidToHtml.mjs` toolchain)
- No new npm packages required

### Registration (`astro.config.mjs`)

```js
import remarkLyricsBlock from './src/plugins/remarkLyricsBlock.mjs';

// inside markdown.remarkPlugins, alongside existing plugins:
remarkPlugins: [
  remarkMath,
  remarkMermaidToHtml,
  remarkLyricsBlock,
]
```

## 7. Components

### 7.1 `MusicCard.astro`

A static `.astro` component (no React island — no interaction needed; smaller bundle).

**Props**

```ts
interface Props {
  appleMusicUrl: string;
  youtubeMusicUrl?: string;
  artist?: string;
  album?: string;
  releaseYear?: number;
}
```

**Layout (vertical stack)**

1. Apple Music iframe
   - Source URL transform: replace `music.apple.com` host with `embed.music.apple.com` in the user-supplied `appleMusicUrl`.
   - Attributes: `allow="autoplay *; encrypted-media *;"`, `loading="lazy"`, `width="100%"`, `height="175"` (compact single-track layout).
   - Wrapper class: `rounded-xl overflow-hidden border border-border`.
2. Service link button row
   - "Apple Music" — outline button, `simple-icons:applemusic` icon, `target="_blank" rel="noopener noreferrer"`.
   - "YouTube Music" — same pattern; rendered only if `youtubeMusicUrl` is present.
   - Buttons use the existing `components/ui/button` `outline` variant. CLAUDE.md button rules: outline (border) variant satisfies the "must have visible background or border" requirement.
3. Optional metadata caption (small text, muted): `{artist} · {album} · {releaseYear}`, omitting absent fields.

**Styling tokens**: existing CSS variables (`--background`, `--foreground`, `--muted-foreground`, `--border`). No new tokens.

### 7.2 `Lyrics.tsx` (React)

Stanza-level toggleable display. Hydration directive (`client:visible`) is injected by `remarkLyricsBlock` at build time — authors do not add it manually since they don't write the `<Lyrics>` JSX directly (they write the ` ```lyrics ` code block).

**Props**

```ts
type Stanza = { ja: string; ko: string };  // HTML strings, build-time generated
type Props = { stanzas: Stanza[] };
```

**State**

```ts
const [expanded, setExpanded] = useState<Set<number>>(new Set());
const allExpanded = expanded.size === stanzas.length;
```

**Code Order** (per CLAUDE.md TypeScript Base):

1. (no framework hooks, no stores)
2. Local state: `expanded`
3. Derived: `allExpanded`
4. Handlers: `toggleStanza`, `expandAll`, `collapseAll`
5. Return / JSX

**Top bar**

- Single button that toggles between "전체 펼치기" and "전체 접기" based on `allExpanded`. Uses `outline` variant + `tabler:layout-list` icon.

**Stanza element**

- Container is a `<div>` with `role="button"`, `aria-expanded={isOpen}`, `tabIndex={0}`, click + `Enter`/`Space` handlers.
- Inner Japanese line: rendered via React's raw-HTML escape hatch (the only available API for injecting build-time-prepared HTML into JSX).
- Inner Korean line: rendered via the same escape hatch — wrapped in a framer-motion height-auto container.
- Right-aligned chevron: `tabler:chevron-down` rotated 180° when open (CSS transition).

**Toggle visuals (CSS-only for ruby)**

```css
.lyrics-stanza rt { display: none; }              /* default: hide furigana */
.lyrics-stanza.is-expanded rt { display: revert; } /* expanded: show */
.lyrics-stanza .ko { display: none; }
.lyrics-stanza.is-expanded .ko {
  display: block;
  border-left: 2px solid var(--border);
  padding-left: 0.75rem;
  margin-top: 0.75rem;
  color: var(--muted-foreground);
}
```

**Animation**

- framer-motion `<motion.div animate={{ height: 'auto' }} initial={{ height: 0 }}>` wrapping the Korean translation, for smooth expand/collapse. Already a project dependency.
- Chevron rotation: CSS `transition: transform 0.2s`.

**Accessibility / SEO note**

- Furigana and translation are intentionally hidden until expanded. Screen readers and search engines see only the kanji line by default. This is the deliberate UX, accepted as a trade-off for the toggle interaction.

**Trust posture for the raw-HTML injection**

- The `ja` / `ko` HTML strings injected into the DOM are author-controlled, produced at build time by `remarkLyricsBlock` from `*.mdx` files committed to this repository. There is no user-generated content path into these strings. The plugin emits a closed grammar (`<ruby>`, `<rt>`, `<br/>`, plain text), so even an authoring mistake cannot escalate to script injection. CLAUDE.md's prohibition on raw-HTML rendering targets untrusted runtime input — a different threat model from build-time author content. No sanitizer (e.g., DOMPurify) is needed.

### 7.3 `components/Blog/Music/index.ts`

```ts
export { default as MusicCard } from './MusicCard.astro';
export { default as Lyrics } from './Lyrics';
```

> Note: re-exporting `.astro` from `index.ts` works in Astro project tooling, but if barrel-exporting Astro components causes type friction, callers can import `MusicCard` directly from its `.astro` path. Decision deferred to implementation.

## 8. First Post (`sekai-no-arukikata.mdx`)

### Frontmatter

```yaml
---
title: 世界の歩き方
category: Music
created: 2026-04-29
artist: ツキヨミ
album: 世界の歩き方
releaseYear: 2024                                 # confirm at write time
appleMusicUrl: https://music.apple.com/jp/...     # to fill in
youtubeMusicUrl: https://music.youtube.com/...    # to fill in (optional)
tags: ['music', 'lyrics', 'japanese', 'tsukiyomi']
description: ツキヨミ「世界の歩き方」 가사 한국어 번역
thumbnail: /files/blog/music/sekai-no-arukikata/cover-thumb.webp  # optional
---
```

### Body Skeleton

```mdx
import { MusicCard, Lyrics } from '@/components/Blog/Music';

<MusicCard
  appleMusicUrl={frontmatter.appleMusicUrl}
  youtubeMusicUrl={frontmatter.youtubeMusicUrl}
  artist={frontmatter.artist}
  album={frontmatter.album}
  releaseYear={frontmatter.releaseYear}
/>

## 곡을 만나고

(짧은 감상 — 만난 계기와 마음에 드는 부분)

## 가사

​```lyrics
…stanzas (Claude drafts both Japanese ruby breakdown and Korean translation;
user reviews and edits)…
​```
```

### Translation Authoring

Claude generates the full first draft for both:

1. The `{kanji|reading}` ruby breakdown for the entire Japanese lyric (provided by the user in the brainstorm input).
2. The Korean translation, line-aligned with the Japanese stanzas.

User reviews and edits in place. Ruby readings should be sanity-checked against a dictionary; uncommon readings will need correction.

## 9. Build Sequence

The implementation plan should follow this order:

1. **Schema** — extend `content.config.ts` (no consumers yet, safe addition).
2. **Plugin** — `remarkLyricsBlock.mjs` with a tiny fixture MDX that exercises parsing + ruby substitution + AST output as a smoke test.
3. **Registration** — wire the plugin into `astro.config.mjs`.
4. **Components** — `MusicCard.astro`, `Lyrics.tsx`, `index.ts`, supporting CSS.
5. **First post** — `sekai-no-arukikata.mdx` (must be `.mdx`, not `.md`) with frontmatter, MusicCard, commentary placeholder, full lyric block.
6. **Manual verification** — `bun dev`, open `/blog/music/sekai-no-arukikata`, confirm:
   - Apple Music iframe loads and plays
   - Lyrics render kanji-only by default
   - Clicking a stanza reveals furigana above kanji + Korean translation below
   - "전체 펼치기/접기" button toggles every stanza
   - Keyboard (Enter/Space) and mobile tap both work
   - No console errors; no SSR/hydration warnings

## 10. Risk Notes

- **Apple Music URL → embed URL transform**: relies on simple host substitution. If Apple ever changes the embed domain pattern, the transform breaks. Acceptable; obvious to fix.
- **Pagefind indexing of hidden translation text**: Pagefind reads the rendered HTML; `display: none` content is typically excluded from its index. Translations will not be searchable via Pagefind. Acceptable per non-goals.
- **MDX `frontmatter` variable availability**: Astro exposes `frontmatter` to MDX content natively. If for any reason this is unavailable in this project's content-collection setup, fall back to literal props in the MDX (`<MusicCard appleMusicUrl="..." ... />`) — values then live only in the MDX, frontmatter retains them only for SEO/listing. Implementation step verifies before committing to either form.
- **Ruby readings accuracy**: Claude-generated furigana may be wrong for personal-name readings or rare kanji. User review is mandatory before publish.
