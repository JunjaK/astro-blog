import { Extension, type Editor, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import tippy, { type Instance } from 'tippy.js';
import { api } from '../lib/api';

interface Ctx { editor: Editor; range: Range }
interface SlashItem {
  title: string;
  hint: string;
  types?: string[]; // category (lowercase) it belongs to; undefined = common/all
  run: (p: Ctx) => void;
}

const setNode = (type: string, attrs: object) => ({ editor, range }: Ctx) =>
  editor.chain().focus().deleteRange(range).setNode(type, attrs).run();
const toggle = (cmd: 'toggleBulletList' | 'toggleOrderedList' | 'toggleBlockquote' | 'toggleCodeBlock') => ({ editor, range }: Ctx) =>
  (editor.chain().focus().deleteRange(range) as never as Record<string, () => { run: () => void }>)[cmd]().run();
const insertRaw = (src: string) => ({ editor, range }: Ctx) =>
  editor.chain().focus().deleteRange(range).insertContent({ type: 'rawMdx', attrs: { src } }).run();
const insertGallery = (variant: 'carousel' | 'polaroid') => ({ editor, range }: Ctx) =>
  editor.chain().focus().deleteRange(range).insertContent({ type: 'gallery', attrs: { variant, items: [] } }).run();

async function runAI({ editor, range }: Ctx) {
  editor.chain().focus().deleteRange(range).run();
  const prompt = window.prompt('AI에게 요청:');
  if (!prompt) return;
  try {
    const { text } = await api.generate(prompt);
    editor.chain().focus().insertContent(text).run();
  } catch (e) {
    editor.chain().focus().insertContent(`「AI 오류: ${(e as Error).message}」`).run();
  }
}

const ITEMS: SlashItem[] = [
  { title: '제목 1', hint: 'H1', run: setNode('heading', { level: 1 }) },
  { title: '제목 2', hint: 'H2', run: setNode('heading', { level: 2 }) },
  { title: '제목 3', hint: 'H3', run: setNode('heading', { level: 3 }) },
  { title: '글머리 목록', hint: '•', run: toggle('toggleBulletList') },
  { title: '번호 목록', hint: '1.', run: toggle('toggleOrderedList') },
  { title: '인용', hint: '"', run: toggle('toggleBlockquote') },
  { title: '코드 블록', hint: '</>', run: toggle('toggleCodeBlock') },
  { title: '구분선', hint: '—', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
  // common components
  { title: '목차 (TOC)', hint: 'toc', run: insertRaw('<TableOfContents>\n\n</TableOfContents>') },
  { title: '다이어그램 (Mermaid)', hint: '▤', run: insertRaw('```mermaid\n\n```') },
  { title: '갤러리 · 캐러셀', hint: 'img', run: insertGallery('carousel') },
  { title: '갤러리 · 폴라로이드', hint: 'img', run: insertGallery('polaroid') },
  // music
  { title: '뮤직 카드', hint: '♪', types: ['music'], run: insertRaw('<MusicCard />') },
  { title: '가사 (lyrics)', hint: '♫', types: ['music'], run: insertRaw('```lyrics\n\n```') },
  { title: 'AI 작성', hint: '✨', run: runAI },
];

interface MenuProps { items: SlashItem[]; command: (i: SlashItem) => void }
export interface MenuRef { onKeyDown: (p: { event: KeyboardEvent }) => boolean }

const SlashMenu = forwardRef<MenuRef, MenuProps>(({ items, command }, ref) => {
  const [sel, setSel] = useState(0);
  useEffect(() => setSel(0), [items]);
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') { setSel((s) => (s + items.length - 1) % items.length); return true; }
      if (event.key === 'ArrowDown') { setSel((s) => (s + 1) % items.length); return true; }
      if (event.key === 'Enter') { if (items[sel]) command(items[sel]); return true; }
      return false;
    },
  }));
  if (!items.length) return null;
  return (
    <div className="slash-menu" role="listbox">
      {items.map((it, i) => (
        <button key={it.title} type="button" role="option" aria-selected={i === sel}
          className={i === sel ? 'slash-item active' : 'slash-item'}
          onMouseEnter={() => setSel(i)} onClick={() => command(it)}>
          <span>{it.title}</span><span className="slash-hint">{it.hint}</span>
        </button>
      ))}
    </div>
  );
});

export const SlashCommand = Extension.create<{ type: string }>({
  name: 'slashCommand',
  addOptions() {
    return { type: 'web' };
  },
  addProseMirrorPlugins() {
    const postType = (this.options.type || '').toLowerCase();
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        command: ({ editor, range, props }) => props.run({ editor, range }),
        items: ({ query }) =>
          ITEMS
            .filter((i) => !i.types || i.types.includes(postType))
            .filter((i) => i.title.toLowerCase().includes(query.toLowerCase())),
        render: () => {
          let component: ReactRenderer<MenuRef, MenuProps>;
          let popup: Instance;
          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, { props: { items: props.items, command: (i: SlashItem) => props.command(i) }, editor: props.editor });
              popup = tippy(document.body, {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body, content: component.element,
                showOnCreate: true, interactive: true, trigger: 'manual', placement: 'bottom-start',
              });
            },
            onUpdate: (props) => {
              component.updateProps({ items: props.items, command: (i: SlashItem) => props.command(i) });
              popup?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') { popup?.hide(); return true; }
              return component.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => { popup?.destroy(); component.destroy(); },
          };
        },
      }),
    ];
  },
});
