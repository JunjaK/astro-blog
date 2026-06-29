import { Extension, type Editor, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import tippy, { type Instance } from 'tippy.js';
import { api } from '../lib/api';

interface SlashItem {
  title: string;
  hint: string;
  run: (p: { editor: Editor; range: Range }) => void;
}

async function runAI({ editor, range }: { editor: Editor; range: Range }) {
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
  { title: '제목 1', hint: 'H1', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run() },
  { title: '제목 2', hint: 'H2', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run() },
  { title: '제목 3', hint: 'H3', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run() },
  { title: '글머리 목록', hint: '•', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
  { title: '번호 목록', hint: '1.', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
  { title: '인용', hint: '"', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
  { title: '코드 블록', hint: '</>', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  { title: '구분선', hint: '—', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run() },
  { title: '갤러리 · 캐러셀', hint: 'img', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: 'gallery', attrs: { variant: 'carousel', items: [] } }).run() },
  { title: '갤러리 · 폴라로이드', hint: 'img', run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({ type: 'gallery', attrs: { variant: 'polaroid', items: [] } }).run() },
  { title: 'AI 작성', hint: '✨', run: runAI },
];

interface MenuProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}
export interface MenuRef {
  onKeyDown: (p: { event: KeyboardEvent }) => boolean;
}

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
        <button
          key={it.title}
          type="button"
          role="option"
          aria-selected={i === sel}
          className={i === sel ? 'slash-item active' : 'slash-item'}
          onMouseEnter={() => setSel(i)}
          onClick={() => command(it)}
        >
          <span>{it.title}</span>
          <span className="slash-hint">{it.hint}</span>
        </button>
      ))}
    </div>
  );
});

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        command: ({ editor, range, props }) => props.run({ editor, range }),
        items: ({ query }) => ITEMS.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())),
        render: () => {
          let component: ReactRenderer<MenuRef, MenuProps>;
          let popup: Instance;
          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, { props: { items: props.items, command: (item: SlashItem) => props.command(item) }, editor: props.editor });
              popup = tippy(document.body, {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },
            onUpdate: (props) => {
              component.updateProps({ items: props.items, command: (item: SlashItem) => props.command(item) });
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
